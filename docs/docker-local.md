# WarRoom V4 - Docker Local Development

## Overview
Production-like local setup with 3 services:
- `web`: React/Vite + Nginx (SPA + /api/* proxy)
- `api`: Node.js OTP/Registration/Password-Reset API (port 4010 internal)
- `redis`: Redis 7 with auth, AOF persistence, healthcheck (internal only)

Network: `warroom-private` bridge, internal DNS via service names `api`, `redis`.
Only `web` publishes port to host: `127.0.0.1:3100:80` (no external exposure for api/redis).

## Prerequisites
- Docker Engine >= 24, Docker Compose v2
- `.env` file created from `.env.example` with real secrets (see below)

## Environment Setup
```bash
cp .env.example .env
# Edit .env:
# - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (from Supabase dashboard, service_role)
# - VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY (anon/publishable)
# - OTP_CHALLENGE_SECRET, OTP_SECRET: openssl rand -base64 32 (must differ, >=32 chars)
# - REDIS_PASSWORD: strong password >=16 chars
# - IPPANEL_API_KEY etc. optional for mock mode
```

**Public vs Private:**
- `VITE_*` = embedded in browser bundle at build time (public, anon only)
- Others = runtime only, server side, never baked into image, never `VITE_`

Secrets are runtime injected via `environment:` in compose, not `ARG` except `VITE_*`.

## Build & Run
```bash
# Validate compose config (no secrets leaked)
docker compose config

# Build and start all services
docker compose up --build

# Detached mode
docker compose up --build -d

# Logs
docker compose logs -f
docker compose logs -f api
docker compose logs -f web
docker compose logs -f redis

# Health checks
curl http://127.0.0.1:3100/api/health
curl http://127.0.0.1:3100/health
# Frontend
curl -I http://127.0.0.1:3100/
```

## Architecture Details

### Dockerfile.web
- Multi-stage: node:22-alpine build -> nginx:alpine runtime
- Non-root user `warroom`
- Security headers + CSP in nginx.conf
- SPA fallback `try_files $uri $uri/ /index.html`
- Proxies:
  - `/api/health` -> `api:4010`
  - `/api/otp/*` -> `api:4010`
  - `/api/registration/*` -> `api:4010`
  - `/api/password-reset/*` -> `api:4010`
  - `/api/*` fallback

### Dockerfile.api
- node:22-alpine, `npm ci --omit=dev`
- Non-root `warroom`, exposes 4010 internally
- No secrets baked, only runtime env
- Healthcheck via `fetch('http://127.0.0.1:4010/api/health')`
- Graceful shutdown: SIGINT/SIGTERM closes Redis, Supabase, server

### Redis
- Image `redis:7-alpine`
- Auth via `REDIS_PASSWORD`, AOF persistence
- Volume `redis_data` for AOF (ephemeral counters, hashed PII keys, no sensitive data)
- No host port by default, internal only
- Healthcheck: `redis-cli -a $REDIS_PASSWORD ping`
- Rate limiting: atomic `INCR` + `EXPIRE`, key format `warroom:rl:*`
- PII keys hashed with HMAC(OTP_SECRET) to avoid plaintext national_code/phone in Redis

### Responsibility: Redis vs DB
- **Redis (primary)**: ephemeral rate limit counters, high throughput, atomic INCR+TTL
- **DB (fallback)**: `warroom_hit_otp_rate_limit` RPC with Postgres advisory logic
- If both down: fail-closed `503 RATE_LIMIT_STORE_FAILED`, never silent bypass

## Security Fixes Implemented
- Registration pending flow, OTP activation same as registration
- Blocked user re-activation prevention
- RLS all migrations, short-lived single-use server OTP RPCs
- Anti-enumeration for password-reset
- No sensitive storage in IndexedDB/localStorage/queue/cache/log
- Frontend `src/lib/redisClient.ts` is no-op, never bundles `redis` or `REDIS_URL`
- Redis URL validation rejects placeholders, must start `redis://` or `rediss://`

## Testing
```bash
# Frontend
npm run lint
npm test
npm run build

# Backend
npm --prefix server_node test

# Docker
docker compose config
docker build -f Dockerfile.web -t warroom-web:test .
docker build -f Dockerfile.api -t warroom-api:test .
```

## Stop & Cleanup
```bash
# Stop without deleting volumes (preserves Redis AOF)
docker compose down

# Stop and remove volumes (WARNING: deletes rate limit history)
# Only use when you want full reset, never in prod without backup
docker compose down -v

# Remove images
docker compose down --rmi local
```

## Troubleshooting
- `SUPABASE_URL is required` -> missing .env or variable
- Redis auth fail -> check REDIS_PASSWORD matches in REDIS_URL
- Web 502 -> api not healthy, check `docker compose logs api`
- Frontend env not applied -> rebuild web (`--build`) after changing VITE_*
- Health shows redis configured=false -> REDIS_URL not set or invalid format
- Health shows redis available=false -> redis down or auth fail, check logs

## Production Notes (Not in this task)
- No deploy, no merge to main, no workflow changes
- Real deployment uses external managed Redis with TLS `rediss://`
- Secrets via secret manager, not .env file
- Nginx additional hardening: rate limit zones, WAF
