# WarRoom OTP and deployment architecture

This file describes the implementation paths in the repository. It is not evidence of a live Supabase connection, a working IPPanel account, successful SMS delivery, or a completed deployment. Database migrations are reviewed statically and must be reviewed against the target schema by an operator before any separate migration change is approved.

## Active runtime

- The only Node production entry point is `server_node/src/index.js`. `server_node/package.json` starts it with `node src/index.js`; `server_node/Dockerfile` runs `npm start`; Compose builds that Dockerfile with the repository root as its context. `server_node/src/package.json` sets the `src/` ESM boundary.
- The active OTP router is `server_node/src/routes/otp.js`, mounted at `/api/otp`. The current tree has no `server_node/routes/otpRoutes.js`; the route is not imported or started by any runtime command.
- The API is limited to OTP, rate limiting, and health. Registration and login remain frontend-to-Supabase RPC calls (`warroom_register_user` and `warroom_verify_login`); this Node service is not a general user-management API.
- `SUPABASE_SERVICE_ROLE_KEY` is loaded only by the private Node process. The browser build receives only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.

## Browser, Nginx, and Docker paths

- Browser OTP calls use the same-origin paths `/api/otp/send`, `/api/otp/verify`, and `/api/otp/resend`; the client has no absolute API URL.
- Nginx gives those three OTP POST paths and `GET /api/health` dedicated locations. A final `/api/` fallback proxies remaining API paths (sessions, registration, password reset, admin - including the read-only `POST /api/admin/otp/sms-status`) to the same private `warroom-api:4010` service; only that web container is published, on `127.0.0.1:3100`. The OTP location uses a 15-second proxy read timeout, above the SMS adapter's own 15-second outbound timeout.
- The Node service has no published host port. It is reachable only on the private Compose network from Nginx. The web container binds to `127.0.0.1:3100` on the host for an external TLS reverse proxy.
- Development Vite proxies `/api/otp` and `/api/health` to `process.env.WARROOM_API_TARGET`; its local-only default is `http://127.0.0.1:4010`. This value belongs to the Vite development server configuration, not the browser bundle.
- Static IP attribution caveat: Nginx currently sets `X-Forwarded-For` to its own `$remote_addr`, deliberately not trusting an incoming client header. Behind the host TLS reverse proxy and Docker port mapping, that address may identify the proxy/gateway rather than each browser. The database's 12-per-15-minute IP limit and Express's in-memory 80-per-15-minute limit could therefore be shared by all clients and throttle legitimate traffic. Verify and configure a trusted proxy chain before relying on per-client IP throttling; do not forward caller-supplied X-Forwarded-For blindly.
- Compose and the CI Docker build use `context: .` / `docker build ... .`, so `server_node/Dockerfile` copies `server_node/package*.json` and `server_node/src` from the repository root.

## OTP contract and lifecycle

- The server generates six decimal digits with Node's `node:crypto` `randomInt`; the verify route accepts exactly six ASCII, Persian, or Arabic-Indic digits and normalizes them before hashing.
- `OTP_TTL_SECONDS` defaults to **120** seconds and is validated from 60 through 900 seconds. One absolute deadline is calculated for the Supabase `expires_at` and the challenge JWT `exp`. The IPPanel message states that same configured number of seconds from issuance. The API answers with both `expiresIn` (remaining whole seconds after provider acceptance) and `expiresAt` (the absolute ISO deadline) plus `resendAvailableIn` (the cooldown in seconds); the React modal counts down from `expiresAt` and only falls back to `expiresIn`, so closing and reopening the window can never extend the life of a code. Verification rejects a code whose deadline has passed in the token layer (JWT `exp`) and again in `warroom_verify_otp` (`expires_at > now()`).
- A successful send answers `deliveryStatus: "accepted"` only: IPPanel queued the request. The provider's message id is stored on the challenge row (`sms_message_id`) so the documented delivery report can be read later; see [otp-sms-delivery.md](./otp-sms-delivery.md).
- OTP rows contain an HMAC-SHA256 digest, a UUID challenge, user and national-code bindings, phone, attempt limits, expiry, usage state, IP hash, and the accepted SMS outbox ID. A challenge token contains the user ID, challenge UUID, and an HMAC binding to the national code; it does not contain the national code in plaintext.
- Resending runs the same guarded handler as the initial send, for both purposes: `purpose=login` requires the password again (`warroom_verify_login` runs before any SMS is sent, with one uniform `401 INVALID_CREDENTIALS` answer), `purpose=registration` only works while an unexpired pending registration exists, and the per-IP, per-national-code and resend-cooldown counters all stay in force (`429 OTP_RESEND_COOLDOWN` carries `retryAfterSeconds` and `Retry-After`). A successful resend invalidates earlier unused challenges before creating a replacement; closing the browser modal invalidates nothing, so a user may always request a new code later. The verification RPC checks expiry, increments failed attempts under a row lock, locks after the configured maximum, and consumes a correct challenge. The route returns a minimal `{ id, otpProof }` identity only after the RPC reports a valid result; a challenge that was replaced or locked answers `OTP_EXPIRED` while a genuinely consumed code answers `OTP_PROOF_REUSED`.
- Rate-limit state is persisted by `warroom_hit_otp_rate_limit`; its database errors are treated as failures, not as permission to send or verify.

## Supabase contract (static review only)

The migrations currently define `warroom_otp_codes` and `warroom_otp_rate_limits`. The OTP table includes the columns used by the service: `challenge_id`, `user_id`, `national_code`, `phone`, `code_hash`, `sms_message_id`, `attempt_count`, `max_attempts`, `verified`, `expires_at`, `is_used`, `used_at`, `ip_hash`, and `created_at`. The rate-limit RPC parameters are `p_id`, `p_max`, and `p_window_seconds`. The verification RPC is `warroom_verify_otp(p_challenge_id uuid, p_national_code text, p_code_hash text)` and returns `result`, `user_id`, and `phone`; the Node call uses those exact names.

The migrations revoke client access to OTP and rate-limit tables, grant the required table and RPC privileges to `service_role`, and do not add an open `USING (true)` policy to those OTP tables. This is a repository-level comparison only; no migration was executed and no live schema was inspected.

**Separate existing RLS blocker:** the baseline migration still grants direct `anon`/`authenticated` access to `warroom_users` and defines broad `policy_users_select`, `policy_users_insert`, `policy_users_update`, and `policy_users_delete` policies using `true`. That table contains private profile fields such as national code and phone; the current frontend also has direct Supabase reads/writes for users. This work does not claim those policies are safe or change them, because doing so requires a coordinated redesign of those existing client data paths (not a Node user-management API). The exposure must be resolved and reviewed before Production; OTP-table isolation alone is not an overall RLS approval.

**Registration/OTP validation mismatch:** the frontend and Node OTP API enforce the Iranian national-code checksum. The statically inspected `warroom_register_user` RPC is granted to `anon` but checks only for ten numeric digits and rejects the explicit dummy `0012345678`; a direct RPC caller can therefore register a checksum-invalid value which Node later refuses for OTP. The normal UI validates first, but the public RPC contract and any existing records still need a reviewed alignment/inventory before relying on OTP registration end to end. Separately, the existing login/registration RPCs key their rate-limit rows with unkeyed SHA-256 digests of national codes; the table is client-revoked by the auth-lock migration, but the hash remains susceptible to offline guessing if a database dump is exposed. No SQL or migration was edited or executed.

**Password/OTP binding blocker:** the React login path calls `warroom_verify_login` before requesting OTP, but the public Node `/api/otp/send` and `/api/otp/resend` endpoints accept only a national code and do not verify or cryptographically bind a password-authenticated result. The statically inspected admin RPCs accept a consumed verified OTP proof for an admin as authorization for 30 minutes; they are granted to `anon`. A caller with access to an admin phone can therefore request/verify OTP directly without proving the password and use that proof for those RPCs. This patch does not redesign the auth contract; a trusted password-to-OTP binding and reviewed RPC policy are required before claiming two-factor enforcement or Production safety.

## IPPanel contract

The OTP sender uses only [IPPanel's official Edge Pattern API](https://ippanelcom.github.io/Edge-Document/docs/send/pattern/): `POST https://edge.ippanel.com/v1/api/send`, with `sending_type: "pattern"`, server-only `IPPANEL_PATTERN_CODE` as outer `code`, the authorized E.164 recipient and the six-digit OTP string as `params.code`. There is no webservice fallback. HTTP success, `meta.status === true` and a valid outbox ID prove acceptance, not delivery. See [otp-pattern-rollout.md](./otp-pattern-rollout.md) for the required database migration and open 25-character conflict.

Delivery of one specific message is read from the documented reports `GET /v1/api/report/by_bulk?messages_outbox_id=<id>` and `GET /v1/api/report/recipients?bulk_id=<id>` (per-recipient `message_status`: 0 sent to operator, 1 operator received, 2 delivered, 3 not delivered, 4 blacklisted). Two read-only paths expose this safely: `node server_node/scripts/check-sms-status.mjs <id|--challenge <uuid>>` and the admin-only `POST /api/admin/otp/sms-status`. Both return masked recipients only. The full procedure, the failure-diagnosis table and the manual deployment/rollback steps are in [otp-sms-delivery.md](./otp-sms-delivery.md).

## Health semantics

`GET /api/health` reports process liveness only (`ok`, `service`, `version`, `env`). `GET /api/ready` reports dependency readiness: it probes the database and the schema, reports the SMS gateway state from the real adapter (`configured` plus a safe `provider` label such as `ippanel`/`none`, never a key or sender value) and returns `503` while the database, the schema or the SMS configuration is unusable. Neither endpoint contacts IPPanel, so neither may be read as a provider-availability or delivery check; use the report endpoints described in [otp-sms-delivery.md](./otp-sms-delivery.md) for delivery.

## Private environment values

Required by the Compose API service:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OTP_CHALLENGE_SECRET` (at least 32 random characters)
- `OTP_SECRET` (a different secret, at least 32 random characters)

OTP defaults are `OTP_TTL_SECONDS=120`, `OTP_MAX_SEND_PER_15MIN=3`, `OTP_RESEND_COOLDOWN_SECONDS=120`, and `OTP_MAX_VERIFY_ATTEMPTS=5`. The SMS service additionally uses `IPPANEL_API_KEY`, `IPPANEL_FROM_NUMBER`, `IPPANEL_PATTERN_CODE`, and `IPPANEL_API_URL`. Keep all private values outside the frontend and out of Git. The sample files contain placeholders only.

## Validation and rollout

The API lockfile exists in this checkout. Apply and review the new migration in staging **before** rolling out the API; do not deploy automatically. See [otp-pattern-rollout.md](./otp-pattern-rollout.md) for rollback and remaining staging/Provider checks.
