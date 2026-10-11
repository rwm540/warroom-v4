# WarRoom OTP and deployment architecture

This file describes the implementation paths in the repository. It is not evidence of a live Supabase connection, a working IPPanel account, successful SMS delivery, or a completed deployment. Database migrations are reviewed statically and must be reviewed against the target schema by an operator before any separate migration change is approved.

## Active runtime

- The only Node production entry point is `server_node/src/index.js`. `server_node/package.json` starts it with `node src/index.js`; `server_node/Dockerfile` runs `npm start`; Compose builds that Dockerfile with the repository root as its context. `server_node/src/package.json` sets the `src/` ESM boundary.
- The active OTP router is `server_node/src/routes/otp.js`, mounted at `/api/otp`. The current tree has no `server_node/routes/otpRoutes.js`; the route is not imported or started by any runtime command.
- The API is limited to OTP, rate limiting, and health. Registration and login remain frontend-to-Supabase RPC calls (`warroom_register_user` and `warroom_verify_login`); this Node service is not a general user-management API.
- `SUPABASE_SERVICE_ROLE_KEY` is loaded only by the private Node process. The browser build receives only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.

## Browser, Nginx, and Docker paths

- Browser OTP calls use the same-origin paths `/api/otp/send`, `/api/otp/verify`, and `/api/otp/resend`; the client has no absolute API URL.
- Nginx sends only those three POST paths to `warroom-api:4010`. Other `/api/` paths return 404. `GET /api/health` is the single health endpoint. Its OTP proxy read timeout is 30 seconds, above the SMS adapter's 15-second outbound timeout.
- The Node service has no published host port. It is reachable only on the private Compose network from Nginx. The web container binds to `127.0.0.1:3100` on the host for an external TLS reverse proxy.
- Development Vite proxies `/api/otp` and `/api/health` to `process.env.WARROOM_API_TARGET`; its local-only default is `http://127.0.0.1:4010`. This value belongs to the Vite development server configuration, not the browser bundle.
- Static IP attribution caveat: Nginx currently sets `X-Forwarded-For` to its own `$remote_addr`, deliberately not trusting an incoming client header. Behind the host TLS reverse proxy and Docker port mapping, that address may identify the proxy/gateway rather than each browser. The database's 12-per-15-minute IP limit and Express's in-memory 80-per-15-minute limit could therefore be shared by all clients and throttle legitimate traffic. Verify and configure a trusted proxy chain before relying on per-client IP throttling; do not forward caller-supplied X-Forwarded-For blindly.
- Compose and the CI Docker build use `context: .` / `docker build ... .`, so `server_node/Dockerfile` copies `server_node/package*.json` and `server_node/src` from the repository root.

## OTP contract and lifecycle

- The server generates six decimal digits with Node's `node:crypto` `randomInt`; the verify route accepts exactly six ASCII, Persian, or Arabic-Indic digits and normalizes them before hashing.
- `OTP_TTL_SECONDS` defaults to **300** seconds and is validated from 60 through 900 seconds. One absolute deadline is calculated for the Supabase `expires_at` and the challenge JWT `exp`. The IPPanel message states that same configured number of seconds from issuance. The API's `expiresIn` is the remaining whole seconds after provider acceptance; the React modal uses that response for its countdown and accepts only an integer from 1 through 900.
- OTP rows contain an HMAC-SHA256 digest, a UUID challenge, user and national-code bindings, phone, attempt limits, expiry, usage state, IP hash, and the accepted SMS outbox ID. A challenge token contains the user ID, challenge UUID, and an HMAC binding to the national code; it does not contain the national code in plaintext.
- Resending invalidates earlier unused challenges before creating a replacement. The verification RPC checks expiry, increments failed attempts under a row lock, locks after the configured maximum, and consumes a correct challenge. The route returns a minimal `{ id, otpProof }` identity only after the RPC reports a valid result.
- Rate-limit state is persisted by `warroom_hit_otp_rate_limit`; its database errors are treated as failures, not as permission to send or verify.

## Supabase contract (static review only)

The migrations currently define `warroom_otp_codes` and `warroom_otp_rate_limits`. The OTP table includes the columns used by the service: `challenge_id`, `user_id`, `national_code`, `phone`, `code_hash`, `sms_message_id`, `attempt_count`, `max_attempts`, `verified`, `expires_at`, `is_used`, `used_at`, `ip_hash`, and `created_at`. The rate-limit RPC parameters are `p_id`, `p_max`, and `p_window_seconds`. The verification RPC is `warroom_verify_otp(p_challenge_id uuid, p_national_code text, p_code_hash text)` and returns `result`, `user_id`, and `phone`; the Node call uses those exact names.

The migrations revoke client access to OTP and rate-limit tables, grant the required table and RPC privileges to `service_role`, and do not add an open `USING (true)` policy to those OTP tables. This is a repository-level comparison only; no migration was executed and no live schema was inspected.

**Separate existing RLS blocker:** the baseline migration still grants direct `anon`/`authenticated` access to `warroom_users` and defines broad `policy_users_select`, `policy_users_insert`, `policy_users_update`, and `policy_users_delete` policies using `true`. That table contains private profile fields such as national code and phone; the current frontend also has direct Supabase reads/writes for users. This work does not claim those policies are safe or change them, because doing so requires a coordinated redesign of those existing client data paths (not a Node user-management API). The exposure must be resolved and reviewed before Production; OTP-table isolation alone is not an overall RLS approval.

**Registration/OTP validation mismatch:** the frontend and Node OTP API enforce the Iranian national-code checksum. The statically inspected `warroom_register_user` RPC is granted to `anon` but checks only for ten numeric digits and rejects the explicit dummy `0012345678`; a direct RPC caller can therefore register a checksum-invalid value which Node later refuses for OTP. The normal UI validates first, but the public RPC contract and any existing records still need a reviewed alignment/inventory before relying on OTP registration end to end. Separately, the existing login/registration RPCs key their rate-limit rows with unkeyed SHA-256 digests of national codes; the table is client-revoked by the auth-lock migration, but the hash remains susceptible to offline guessing if a database dump is exposed. No SQL or migration was edited or executed.

**Password/OTP binding blocker:** the React login path calls `warroom_verify_login` before requesting OTP, but the public Node `/api/otp/send` and `/api/otp/resend` endpoints accept only a national code and do not verify or cryptographically bind a password-authenticated result. The statically inspected admin RPCs accept a consumed verified OTP proof for an admin as authorization for 30 minutes; they are granted to `anon`. A caller with access to an admin phone can therefore request/verify OTP directly without proving the password and use that proof for those RPCs. This patch does not redesign the auth contract; a trusted password-to-OTP binding and reviewed RPC policy are required before claiming two-factor enforcement or Production safety.

## IPPanel contract

The SMS adapter uses the current IPPanel Edge Webservice endpoint documented at [IPPanel's official Webservice SMS page](https://ippanelcom.github.io/Edge-Document/docs/send/webservice/): `POST https://edge.ippanel.com/v1/api/send`, raw API token in `Authorization`, JSON with `sending_type: "webservice"`, an E.164 `from_number`, `message`, and `params.recipients` containing an E.164 recipient. It accepts a response only when HTTP succeeds, `meta.status === true`, and `data.message_outbox_ids` contains a valid non-zero ID. The request has a 15-second timeout. No credentials or provider response bodies are logged, and there is no fake success fallback.

Configure only the server-side `IPPANEL_API_KEY`, `IPPANEL_FROM_NUMBER` (E.164, assigned to the account), and `IPPANEL_API_URL` (the documented Edge send URL). Missing or malformed provider configuration returns a safe error. A successful API response means IPPanel accepted the request; it does not prove delivery to a handset.

## Health semantics

`GET /api/health` reports process liveness and whether the database and SMS settings appear configured. For both dependencies it reports `connectivity: "not_checked"`; it does not contact Supabase or IPPanel and must not be read as a provider-availability or delivery check.

## Private environment values

Required by the Compose API service:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OTP_CHALLENGE_SECRET` (at least 32 random characters)
- `OTP_SECRET` (a different secret, at least 32 random characters)

OTP defaults are `OTP_TTL_SECONDS=300`, `OTP_MAX_SEND_PER_15MIN=3`, `OTP_RESEND_COOLDOWN_SECONDS=60`, and `OTP_MAX_VERIFY_ATTEMPTS=5`. The SMS service additionally uses `IPPANEL_API_KEY`, `IPPANEL_FROM_NUMBER`, and `IPPANEL_API_URL`. Keep all private values outside the frontend and out of Git. The sample files contain placeholders only.

## Lockfile and workflow status

The repository has a root `package-lock.json` matching the root package manifest's declared dependency sections. **`server_node/package-lock.json` is absent.** `server_node/.gitignore` no longer excludes that filename, but the API workflow's `npm ci --prefix server_node` and API Dockerfile's `npm ci --omit=dev` cannot be confirmed or pass without a valid lock generated from the current API manifest. A lock was not fabricated; generating one with npm is outside the explicitly permitted actions for this review. The API install, CI validation, and API image build therefore remain blocked until maintainers generate and commit that valid lock through an approved dependency-update process.

The deployment workflow runs on pushes to `main` or manual dispatch, not on pull requests. Its current CI health smoke test still probes the legacy `/health` path even though the active Node API exposes only `/api/health`; after the missing API lockfile is resolved, that step needs correction to avoid a guaranteed health-check failure. The workflow source was left unchanged in this patch. This review did not trigger the workflow or a deployment.
