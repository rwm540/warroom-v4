# WarRoom Auth and Deployment

This document describes the current intended architecture. No deployment or database migration is run automatically by this repository.

## Runtime architecture

- Vite serves the React app on port `3000` in development. Its `/api` proxy targets `http://127.0.0.1:4010` by default; set `WARROOM_API_TARGET` only when the local API uses a different address.
- The single API implementation is ESM under `server_node/src/`. `server_node/package.json` remains CommonJS at its root; `server_node/src/package.json` establishes the ESM boundary. `npm start` and `npm run dev` both use this API.
- Production browser requests use same-origin `/api/...` URLs. Nginx proxies `/api/` to `warroom-api:4010`; the Node container has no host-published port.
- Docker Compose publishes Nginx only on `127.0.0.1:3100`. A host-level TLS reverse proxy should route the production domain to that port.
- Session cookies are `HttpOnly`, `SameSite=Lax`, and `Secure` in production. Access JWTs are bound to a refresh-token row; protected requests reject revoked sessions. Browser localStorage contains only a UI cache and is not proof of identity.

## Required private environment

Set these on the Node service or in the deployment environment, never in `VITE_*` variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET` (at least 32 random characters)
- `OTP_SECRET` (a different 32+ character random secret)
- `IPPANEL_API_KEY`
- `IPPANEL_FROM_NUMBER` (a sender verified with IPPanel)
- `CORS_ORIGINS` (comma-separated exact origins if cross-origin calls are intentionally enabled)
- `ADMIN_BOOTSTRAP_TOKEN` (optional, 32+ random characters; remove it immediately after first-admin setup)

Optional private settings include `IPPANEL_API_URL`, `PORT` (default `4010`), `HOST` (default `0.0.0.0`), `OTP_TTL_SECONDS` (default `300`), `OTP_MAX_SEND_PER_15MIN`, `OTP_RESEND_COOLDOWN_SECONDS`, `OTP_MAX_VERIFY_ATTEMPTS`, `JWT_ACCESS_TTL`, and `JWT_REFRESH_TTL`.

The frontend build needs only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for non-auth application data. Never use a service-role key as a Vite variable. The public key is not an authorization boundary; production RLS still matters.

The reserved admin profile has no seeded password. The hardening migration invalidates administrator credentials unless they already use `scrypt-v1`, preserving account rows while requiring a new scrypt credential. To provision the first password, temporarily set `ADMIN_BOOTSTRAP_TOKEN` to a random value of at least 32 characters, POST to `/api/auth/admin/bootstrap` with that value in `X-Admin-Bootstrap-Token` and a password of at least 16 characters in the JSON body, then remove the token and restart the API. The route refuses to run after an administrator credential exists. Normal login still requires SMS OTP.

Copy `.env.example` to a private environment file for the deployment host and replace every placeholder. Do not commit `.env` files. Rotate any provider or signing secret that was previously committed or exposed; this repository cannot revoke provider credentials.

## Database migration procedure

The former root files `Query.sql` and `query.sql` were byte-identical in this workspace. Their current contents, including the pre-existing workspace edits, were copied to the canonical baseline migration:

1. `supabase/migrations/20261011000000_warroom_schema.sql`
2. `supabase/migrations/20261011001000_lock_auth_secrets.sql`

Before applying to the existing Supabase project, an operator must compare the baseline with the live schema and review the complete SQL, especially legacy policies and triggers. Apply the hardening migration only after confirming the baseline objects/columns exist. Neither migration is run by Docker, CI, or this assistant. `supabase-fix-permissions.sql` is read-only privilege verification; it does not grant access.

The hardening migration closes client access to credentials, OTPs, OTP rate limits, and refresh tokens and adds atomic server-only RPCs. Other application tables still have legacy direct-client policies in the baseline; review those against the app's existing data flows before production. Do not treat the development-era broad policies on non-auth tables as a production security approval.

## Local development

1. Configure `server_node/.env` from `server_node/.env.example` with private test credentials.
2. Start the API with `npm start` or `npm run dev` from `server_node/`.
3. Start Vite with `npm run dev` from the repository root. The browser uses relative `/api` routes and does not need an API URL variable.
4. API health is available at `http://localhost:4010/health`; through Vite use `http://localhost:3000/api/health`.

SMS tests use a mocked fetch adapter. No automated test should send real messages.

## Docker deployment

1. Configure the root deployment environment with the public Vite URL/key and the private Node variables above. Compose intentionally fails configuration for missing Supabase URL/service-role key/JWT/OTP secrets.
2. Build and start the Compose stack from the repository root on the deployment host.
3. Configure the host TLS reverse proxy to the Nginx host binding at `127.0.0.1:3100`.
4. Confirm the Node health check and Nginx `/health` route are healthy, then manually validate Supabase privileges and the provider sender configuration.

The API container can reach Supabase and IPPanel over outbound networking, is reachable from Nginx on the Compose bridge, and is not published directly to the host.

## GitHub Actions deployment

`.github/workflows/deploy.yml` validates frontend type checking/build, backend unit tests, an API health smoke check without external credentials, and the API Docker image. Deploy depends on successful validation and uses a self-hosted Linux x64 runner with Docker Compose access. That runner must have `/opt/apps/warroom-v4` writable and a private `.env` in that directory. Configure repository protections and runner access before enabling production deploys.

The workflow run previously linked by the project owner could not be retrieved from this workspace, so its original failing step is not claimed here. The updated workflow defines future validation; no workflow was triggered as part of this work.
