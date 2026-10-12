#!/usr/bin/env bash
set -Eeuo pipefail

# Run directly on the server. This script does not use GitHub Actions.
# Initial production install expects the existing app to have been cut over
# and this Compose project to publish web on 127.0.0.1:3100.
APP_DIR="${APP_DIR:-/opt/apps/warroom-v4-staging}"
cd "$APP_DIR"

if [[ ! -d .git ]]; then
  echo "ERROR: APP_DIR is not a Git checkout: $APP_DIR" >&2
  exit 1
fi
if [[ ! -f .env ]]; then
  echo "ERROR: missing $APP_DIR/.env" >&2
  exit 1
fi

# Required public origin. Do not overwrite an explicitly configured non-empty value.
if ! grep -Eq '^ALLOWED_ORIGINS=.+$' .env; then
  sed -i '/^ALLOWED_ORIGINS=/d' .env
  printf '\nALLOWED_ORIGINS=https://tanoryazd.com\n' >> .env
fi
if ! grep -Eq '^WEB_PORT=.+$' .env; then
  printf '\nWEB_PORT=127.0.0.1:3100:8080\n' >> .env
fi
chmod 600 .env

PREVIOUS_SHA="$(git rev-parse HEAD)"
git fetch origin main
TARGET_SHA="$(git rev-parse origin/main)"

if [[ "$TARGET_SHA" == "$PREVIOUS_SHA" ]]; then
  echo "Already at origin/main ($TARGET_SHA); no deployment needed."
  exit 0
fi

echo "Deploying $TARGET_SHA (rollback target: $PREVIOUS_SHA)"
git reset --hard "$TARGET_SHA"

rollback() {
  echo "Deployment failed; restoring $PREVIOUS_SHA" >&2
  git reset --hard "$PREVIOUS_SHA" || true
  docker compose build --pull || true
  docker compose up -d || true
}

if ! docker compose config -q; then
  git reset --hard "$PREVIOUS_SHA"
  echo "ERROR: Compose configuration is invalid; no containers were changed." >&2
  exit 1
fi

if ! docker compose build --pull; then
  rollback
  exit 1
fi

if ! docker compose up -d; then
  rollback
  exit 1
fi

for attempt in $(seq 1 30); do
  content_type="$(curl -sS -o /tmp/warroom-api-health.json -w '%{content_type}' http://127.0.0.1:3100/api/health || true)"
  if [[ "$content_type" == application/json* ]] && grep -q '"ok":[[:space:]]*true' /tmp/warroom-api-health.json; then
    echo "Deployment successful: $TARGET_SHA"
    cat /tmp/warroom-api-health.json
    exit 0
  fi
  sleep 2
done

docker compose logs --tail=80 api web >&2 || true
rollback
exit 1
