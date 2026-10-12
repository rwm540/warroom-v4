#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="/opt/apps/warroom-v4"
BRANCH="main"
LOCK_FILE="/run/lock/deploy-warroom.lock"
HEALTH_URL="http://127.0.0.1:3100/api/ready"
HEALTH_FILE="/tmp/warroom-api-ready.json"

echo
echo "========================================"
echo "      WARROOM DIRECT SERVER DEPLOY"
echo "========================================"

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "Another deployment is already running; this invocation will exit."
  exit 0
fi

cd "$APP_DIR"

if [[ ! -d .git ]]; then
  echo "ERROR: Git repository not found: $APP_DIR" >&2
  exit 1
fi
if [[ ! -f .env ]]; then
  echo "ERROR: .env not found in $APP_DIR" >&2
  exit 1
fi

# Never overwrite tracked local work silently. Untracked backup files are preserved.
if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
  echo "ERROR: tracked local changes detected; deployment stopped." >&2
  git status --short
  exit 1
fi

echo "[1/7] Fetching main from GitHub..."
git fetch --prune origin "$BRANCH"

PREVIOUS_COMMIT="$(git rev-parse HEAD)"
TARGET_COMMIT="$(git rev-parse "origin/$BRANCH")"

echo "Current commit: $PREVIOUS_COMMIT"
echo "Target commit : $TARGET_COMMIT"

if [[ "$PREVIOUS_COMMIT" == "$TARGET_COMMIT" ]]; then
  echo "Already up to date; nothing to deploy."
  exit 0
fi

# Ensure the production website origin is allowed by the API.
if ! grep -Eq '^ALLOWED_ORIGINS=.+$' .env; then
  if grep -q '^ALLOWED_ORIGINS=' .env; then
    sed -i 's|^ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=https://tanoryazd.com|' .env
  else
    printf '\nALLOWED_ORIGINS=https://tanoryazd.com\n' >> .env
  fi
fi
chmod 600 .env

# Fail early without disclosing environment values.
for key in REDIS_PASSWORD SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY OTP_CHALLENGE_SECRET OTP_SECRET SESSION_SECRET VITE_SUPABASE_URL VITE_SUPABASE_PUBLISHABLE_KEY IPPANEL_API_KEY; do
  if ! grep -Eq "^${key}=.+" .env; then
    echo "ERROR: required environment variable is missing or empty: $key" >&2
    exit 1
  fi
done

# Save the currently deployed image IDs and tags BEFORE building new images.
# This lets rollback restore exact old images even after Docker tags are replaced.
CURRENT_SERVICES="$(docker compose config --services)"
if grep -Fxq 'web' <<< "$CURRENT_SERVICES" && grep -Fxq 'api' <<< "$CURRENT_SERVICES"; then
  PREVIOUS_MODE="compose"
  for name in warroom-web warroom-api warroom-redis; do
    if ! docker inspect "$name" >/dev/null 2>&1 ||
       [[ "$(docker inspect -f '{{.State.Running}}' "$name")" != "true" ]]; then
      echo "ERROR: current deployment container $name is not running; refusing an unsafe update." >&2
      exit 1
    fi
  done
  PREVIOUS_WEB_IMAGE_ID="$(docker inspect -f '{{.Image}}' warroom-web)"
  PREVIOUS_WEB_IMAGE_REF="$(docker inspect -f '{{.Config.Image}}' warroom-web)"
  PREVIOUS_API_IMAGE_ID="$(docker inspect -f '{{.Image}}' warroom-api)"
  PREVIOUS_API_IMAGE_REF="$(docker inspect -f '{{.Config.Image}}' warroom-api)"
  PREVIOUS_REDIS_IMAGE_ID="$(docker inspect -f '{{.Image}}' warroom-redis)"
  PREVIOUS_REDIS_IMAGE_REF="$(docker inspect -f '{{.Config.Image}}' warroom-redis)"
else
  PREVIOUS_MODE="legacy"
  if ! docker inspect warroom-v4 >/dev/null 2>&1; then
    echo "ERROR: legacy rollback container warroom-v4 is missing; refusing an unsafe first deployment." >&2
    exit 1
  fi
  PREVIOUS_LEGACY_IMAGE_ID="$(docker inspect -f '{{.Image}}' warroom-v4)"
  PREVIOUS_LEGACY_IMAGE_REF="$(docker inspect -f '{{.Config.Image}}' warroom-v4)"
fi

restore_previous_image_tags() {
  if [[ "$PREVIOUS_MODE" == "compose" ]]; then
    docker tag "$PREVIOUS_WEB_IMAGE_ID" "$PREVIOUS_WEB_IMAGE_REF"
    docker tag "$PREVIOUS_API_IMAGE_ID" "$PREVIOUS_API_IMAGE_REF"
    docker tag "$PREVIOUS_REDIS_IMAGE_ID" "$PREVIOUS_REDIS_IMAGE_REF"
  else
    docker tag "$PREVIOUS_LEGACY_IMAGE_ID" "$PREVIOUS_LEGACY_IMAGE_REF"
  fi
}

rollback_deployment() {
  echo "Deployment failed; attempting rollback to $PREVIOUS_COMMIT." >&2
  set +e
  git reset --hard "$PREVIOUS_COMMIT"

  # Restore exact previous image tags before recreating containers.
  restore_previous_image_tags

  # Remove only named application containers, never volumes. Redis data remains persisted.
  docker rm -f warroom-web warroom-api warroom-redis >/dev/null 2>&1
  docker compose up -d --remove-orphans
  docker compose ps
  set -e
}

echo "[2/7] Switching source to target commit..."
git reset --hard "$TARGET_COMMIT"

echo "[3/7] Validating Compose configuration..."
if ! docker compose config -q; then
  echo "ERROR: Compose configuration failed; restoring source and image tags." >&2
  git reset --hard "$PREVIOUS_COMMIT"
  restore_previous_image_tags
  exit 1
fi

echo "[4/7] Building images before touching the running site..."
if ! docker compose build --pull; then
  echo "ERROR: image build failed; running containers remain untouched. Restoring source and image tags." >&2
  git reset --hard "$PREVIOUS_COMMIT"
  restore_previous_image_tags
  exit 1
fi

# Release port 3100 from the legacy frontend only after successful image builds.
if [[ "$PREVIOUS_MODE" == "legacy" ]] &&
   docker ps --format '{{.Names}}' | grep -Fxq 'warroom-v4'; then
  echo "Stopping legacy frontend container..."
  if ! docker stop warroom-v4 >/dev/null; then
    echo "ERROR: could not stop the legacy frontend; restoring source and image tags." >&2
    git reset --hard "$PREVIOUS_COMMIT"
    restore_previous_image_tags
    exit 1
  fi
fi

echo "[5/7] Starting updated services..."
if ! docker compose up -d --remove-orphans; then
  docker compose logs --tail=80 api web >&2 || true
  rollback_deployment
  exit 1
fi

echo "[6/7] Waiting for API, database, Redis, and schema readiness..."
READY=0
for attempt in $(seq 1 30); do
  content_type="$(curl --connect-timeout 2 --max-time 4 -sS -o "$HEALTH_FILE" -w '%{content_type}' "$HEALTH_URL" 2>/dev/null || true)"
  if [[ "$content_type" == application/json* ]]; then
    if python3 - "$HEALTH_FILE" <<'PY'
import json
import sys
try:
    with open(sys.argv[1], encoding="utf-8") as fh:
        data = json.load(fh)
    deps = data.get("dependencies") or {}
    ok = (
        data.get("ready") is True
        and (deps.get("database") or {}).get("reachable") is True
        and (deps.get("redis") or {}).get("available") is True
        and (deps.get("schema") or {}).get("ready") is True
    )
    sys.exit(0 if ok else 1)
except Exception:
    sys.exit(1)
PY
    then
      READY=1
      break
    fi
  fi
  sleep 2
done

if [[ "$READY" -ne 1 ]]; then
  echo "ERROR: readiness did not pass. The deployment will be rolled back." >&2
  docker compose ps >&2 || true
  docker compose logs --tail=80 api web >&2 || true
  rollback_deployment
  exit 1
fi

echo "[7/7] Deployment successful."
docker compose ps
echo "Commit: $(git rev-parse --short HEAD)"
cat "$HEALTH_FILE"
echo
