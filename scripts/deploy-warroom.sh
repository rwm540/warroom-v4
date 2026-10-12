#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="/opt/apps/warroom-v4"
BRANCH="main"
LOCK_FILE="/run/lock/deploy-warroom.lock"
HEALTH_URL="http://127.0.0.1:3100/api/health"

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

# The production Compose file requires this origin. Do not print .env values.
if ! grep -Eq '^ALLOWED_ORIGINS=.+$' .env; then
  if grep -q '^ALLOWED_ORIGINS=' .env; then
    sed -i 's|^ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=https://tanoryazd.com|' .env
  else
    printf '\nALLOWED_ORIGINS=https://tanoryazd.com\n' >> .env
  fi
fi
chmod 600 .env

# Fail early without disclosing secret values.
for key in REDIS_PASSWORD SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY OTP_CHALLENGE_SECRET OTP_SECRET SESSION_SECRET VITE_SUPABASE_URL VITE_SUPABASE_PUBLISHABLE_KEY IPPANEL_API_KEY; do
  if ! grep -Eq "^\${key}=.+" .env; then
    echo "ERROR: required environment variable is missing or empty: $key" >&2
    exit 1
  fi
done

echo "[2/7] Switching source to target commit..."
git reset --hard "$TARGET_COMMIT"

echo "[3/7] Validating Compose configuration..."
if ! docker compose config -q; then
  echo "ERROR: Compose configuration failed; restoring source revision." >&2
  git reset --hard "$PREVIOUS_COMMIT"
  exit 1
fi

echo "[4/7] Building images before touching the running site..."
if ! docker compose build --pull; then
  echo "ERROR: image build failed; current containers were not intentionally stopped." >&2
  git reset --hard "$PREVIOUS_COMMIT"
  exit 1
fi

# Release port 3100 from the legacy frontend only after the new images build.
if docker ps --format '{{.Names}}' | grep -Fxq 'warroom-v4'; then
  echo "Stopping legacy frontend container..."
  if ! docker stop warroom-v4 >/dev/null; then
    echo "ERROR: could not stop the legacy frontend; restoring source revision." >&2
    git reset --hard "$PREVIOUS_COMMIT"
    exit 1
  fi
fi

rollback_deployment() {
  echo "Deployment health check failed; rolling back to $PREVIOUS_COMMIT." >&2
  git reset --hard "$PREVIOUS_COMMIT" || true
  docker rm -f warroom-web warroom-api warroom-redis >/dev/null 2>&1 || true
  docker compose up -d --remove-orphans || true
  docker compose ps || true
}

echo "[5/7] Starting updated services..."
if ! docker compose up -d --remove-orphans; then
  docker compose logs --tail=80 api web >&2 || true
  rollback_deployment
  exit 1
fi

echo "[6/7] Waiting for the API health endpoint through Nginx..."
READY=0
for attempt in $(seq 1 30); do
  content_type="$(curl --connect-timeout 2 --max-time 4 -fsS -o /tmp/warroom-api-health.json -w '%{content_type}' "$HEALTH_URL" 2>/dev/null || true)"
  if [[ "$content_type" == application/json* ]] &&
     grep -Eq '"ok"[[:space:]]*:[[:space:]]*true' /tmp/warroom-api-health.json 2>/dev/null; then
    READY=1
    break
  fi
  sleep 2
done

if [[ "$READY" -ne 1 ]]; then
  docker compose ps >&2 || true
  docker compose logs --tail=80 api web >&2 || true
  rollback_deployment
  exit 1
fi

echo "[7/7] Deployment successful."
docker compose ps
echo "Commit: $(git rev-parse --short HEAD)"
cat /tmp/warroom-api-health.json
echo
