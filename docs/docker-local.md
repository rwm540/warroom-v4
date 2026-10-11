# WarRoom V4 - Docker Local Development

## Overview
Production-like local setup with 3 services:
- `web`: React/Vite + Nginx (SPA + /api/* proxy) - listens 8080 internally (non-root), mapped to host 3100
- `api`: Node.js OTP/Registration/Password-Reset/Session API (port 4010 internal)
- `redis`: Redis 7 with auth, AOF persistence, noeviction policy, healthcheck via REDISCLI_AUTH (no password leak)

Network: `warroom-private` bridge, internal DNS via service names `api`, `redis`.
Only `web` publishes port to host: `127.0.0.1:3100:8080` (no external exposure for api/redis).

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
# - REDIS_PASSWORD: strong password >=16 chars, REQUIRED, no default (previously warroom_local_redis_pass is now rejected)
# - SESSION_SECRET: optional, falls back to OTP_CHALLENGE_SECRET
# - IPPANEL_API_KEY etc. optional for mock mode
```

**Public vs Private:**
- `VITE_*` = embedded in browser bundle at build time (public, anon only)
- Others = runtime only, server side, never baked into image, never `VITE_`

Secrets are runtime injected via `environment:` in compose, not `ARG` except `VITE_*`.

**Important changes from previous version:**
- `REDIS_PASSWORD` is now REQUIRED - compose fails with `:?` if missing, no default insecure password
- Redis `maxmemory-policy` changed from `allkeys-lru` to `noeviction` to prevent silent eviction of rate limit counters (fail-closed on memory full)
- Healthcheck uses `REDISCLI_AUTH` env var, not `-a` arg, to avoid password leak in `ps`
- Nginx listens 8080 (non-root compatible) instead of 80, mapped via `WEB_PORT=127.0.0.1:3100:8080`
- `web` does NOT depend on `redis` - architecture separation (web only needs api)

## Build & Run
```bash
# Validate compose config (no secrets leaked in output - passwords are interpolated but not logged)
docker compose config

# Build and start all services
docker compose up --build

# Detached mode
docker compose up --build -d

# Logs (no secrets in logs)
docker compose logs -f
docker compose logs -f api
docker compose logs -f web
docker compose logs -f redis

# Health checks
curl http://127.0.0.1:3100/api/health
curl http://127.0.0.1:3100/health
curl -I http://127.0.0.1:3100/

# Redis connectivity test (from api container)
docker compose exec api node -e "import('./src/lib/redis.js').then(m=>m.checkRedisHealth().then(console.log))"
```

## Architecture Details

### Dockerfile.web
- Multi-stage: node:22-alpine build -> nginx:alpine runtime
- `npm ci --ignore-scripts` for locked deps (checked: build works without postinstall, sharp optional)
- Non-root user `warroom`, writable dirs /var/cache/nginx, /var/run, /var/log/nginx
- Listens 8080 (non-root), not 80
- Security headers + CSP in nginx.conf
- SPA fallback `try_files $uri $uri/ /index.html`, no-cache for index.html, 1y for /assets/
- Proxies all /api/* to `api:4010` via Docker DNS
  - `/api/health` -> `api:4010`
  - `/api/otp/*` -> `api:4010`
  - `/api/registration/*` -> `api:4010`
  - `/api/password-reset/*` -> `api:4010`
  - `/api/session/*` -> `api:4010`
  - `/api/*` fallback

### Dockerfile.api
- node:22-alpine, `npm ci --omit=dev --ignore-scripts`
- Non-root `warroom`, exposes 4010 internally
- No secrets baked, only runtime env
- Healthcheck via `fetch('http://127.0.0.1:4010/api/health')`
- Graceful shutdown: SIGINT/SIGTERM closes Redis, server
- CORS configured for allowed origins, credentials include for HttpOnly cookies
- Session management with HttpOnly, Secure, SameSite cookies

### Redis
- Image `redis:7-alpine`
- Auth via `REDIS_PASSWORD` REQUIRED (no default), AOF persistence
- Volume `redis_data` for AOF (ephemeral counters, hashed PII keys only, no sensitive data)
- No host port, internal only, network `warroom-private`
- Healthcheck: `redis-cli --raw ping` with `REDISCLI_AUTH` env (no `-a` arg leak)
- `maxmemory 256mb`, `maxmemory-policy noeviction` - prevents silent counter eviction, writes fail when full and we fail-closed (deny requests) rather than bypass limits
- Rate limiting: atomic Lua script `INCR` + `EXPIRE` (previously separate commands, now atomic via EVAL)
  - Key format `warroom:rl:*`, TTL bounded
  - PII keys hashed with HMAC(OTP_SECRET) - no raw national_code/phone in Redis
  - Lua: `current=INCR key; if current==1 then EXPIRE key ttl; return current`
  - This prevents race where EXPIRE is lost and key lives forever

### Responsibility: Redis vs DB
- **Redis (primary, fast, ephemeral)**: high-throughput counters, atomic Lua, in-memory, TTL
- **DB (fallback, persistent, slower)**: `warroom_hit_otp_rate_limit` RPC with Postgres upsert, survives Redis restart
- **Fail-closed**: if both unavailable, throw 503 `RATE_LIMIT_STORE_FAILED`, never silent bypass
- **Switching**: both use same hashed keys, same max/window, so switching doesn't bypass limit
- **Documentation**: in `server_node/src/lib/redis.js` and here

### Session Security
- HttpOnly, Secure (in prod), SameSite Strict/Lax cookies
- OTP proof (challenge_id) is short-lived (5 min after verification), one-time use via `warroom_security_kv` tracking
- Consumed proofs cannot be reused - `warroom_consume_otp_proof` RPC atomically checks and marks consumed
- Sessions stored hashed in `warroom_refresh_tokens`, revocable
- Auto-revocation on user block/deactivation via trigger `trg_auto_revoke_on_security`
- Logout clears cookie and revokes token
- CSRF protection via SameSite and Origin check

## Security Fixes Implemented
- Registration pending flow, no fallback to direct user creation (secure)
- OTP activation only for pending users, blocked users stay blocked (trigger prevents reactivation)
- RLS hardened for all tables: chat_rooms, submissions, tickets, kv, etc. (see migrations)
- `warroom_users` insert blocked direct, only via RPC, update own or admin, delete admin only, prevent role escalation via trigger
- `warroom_verify_login` respects is_blocked and is_active
- OTP proof one-time consumption via `warroom_security_kv`
- Anti-enumeration for password-reset (generic response, delay)
- No sensitive storage in IndexedDB/localStorage: blocked tables, sensitive keys, old DBs deleted on upgrade
- Frontend `src/lib/redisClient.ts` is no-op, never bundles `redis` or `REDIS_URL`
- Redis URL validation rejects placeholders and insecure defaults, password required
- Session via HttpOnly cookies, not localStorage

## Testing
```bash
# Frontend
npm run lint
npm test
npm run build

# Backend
npm --prefix server_node test

# Docker (if Docker available)
docker compose config
docker build -f Dockerfile.web -t warroom-web:test .
docker build -f Dockerfile.api -t warroom-api:test .
# If Docker not available, report as "not executed" - do not fake success
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
- `REDIS_PASSWORD is required` -> set in .env, no default allowed
- `SUPABASE_URL is required` -> missing .env
- Redis auth fail -> check REDIS_PASSWORD matches in REDIS_URL
- Web 502 -> api not healthy, check `docker compose logs api`
- Frontend env not applied -> rebuild web (`--build`) after changing VITE_*
- Health shows redis configured=false -> REDIS_URL not set or invalid format
- Health shows redis available=false -> redis down or auth fail, check logs
- `warroom_local_redis_pass` rejected -> old default insecure, set strong password
- Nginx 80 permission denied -> fixed, now listens 8080
- `allkeys-lru` evicted counters -> fixed, now `noeviction` fail-closed

## Production Notes (Not in this task)
- No deploy, no merge to main, no workflow changes
- Real deployment uses external managed Redis with TLS `rediss://`
- Secrets via secret manager, not .env file
- Nginx additional hardening: rate limit zones, WAF, mTLS
- Session secret rotation, refresh token rotation
- Monitoring for Redis memory, rate limit hits, failed logins
```

