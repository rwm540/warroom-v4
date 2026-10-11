# WarRoom V4 — Post-Merge Auth/Session Security Audit & Remediation

Base: `main` @ `58c2248fc81bdb154443c5c7792976473fd39d6e` (merge commit under review).
Method: every claim below comes from reading the current sources and from behaviour tests that
were added in this change; no finding is taken from earlier reports. Nothing was taken on trust.

Delivery: the remediation lives on the session branch `arena/349b3f8f-warroom-v4`
(this session is pinned to that branch) and is submitted as a **Draft** pull request against
`main`. The requested branch name `fix/post-merge-auth-session-security` could not be used.

> No migration was executed. No database (production, staging or local) was connected to or
> modified. No real SMS was sent (all flows were exercised with a fake SMS gateway). Nothing was
> deployed; `main` was not touched; no PR was merged/closed; `.github/workflows/**` was not changed.

---

## 1. Findings

| # | Severity | File(s) | Cause | Remediation |
|---|----------|---------|-------|-------------|
| C1 | Critical | `server_node/src/routes/session.js` (`/api/session/revoke-all`) | Endpoint trusted `req.body.userId` and had no session check – any anonymous caller could revoke **any** user's sessions (IDOR). | Requires a live HttpOnly session, DB-side session row and DB role; self-revocation is bound to the session identity; revoking *another* user requires the DB-confirmed `admin` role **plus** a fresh single-use admin OTP proof bound to the operation (`admin:session:revoke-all`). `clientIp` limiting removed from the authorization path. |
| C2 | Critical | `server_node/src/routes/session.js`, `supabase/migrations/20261013000000_final_hardening_and_session.sql`, `server_node/src/lib/store.js`, migration `20261014000000_post_merge_auth_session_security.sql` | OTP proofs were consumed with a non-atomic read-then-write; two concurrent `/session/create` calls could both win, and the proof was not bound to purpose/operation. | `store.consumeOtpProof()` now performs a single atomic exchange (`warroom_consume_otp_proof(uuid,text)`): the winner is decided by a unique insert into `warroom_security_kv` (`otp_proof_consumed:<challenge>:<purpose>`), losers fail explicitly (`PROOF_ALREADY_CONSUMED` → HTTP 409), proofs are bound to purpose (`login`/`registration`/`admin:*`) and expire 5 min after verification (`OTP_PROOF_EXPIRED`). No write error is swallowed. |
| C3 | Critical | `src/lib/backendApi.ts`, `src/lib/secureApi.ts`, `src/lib/authApi.ts`, `src/lib/otpApi.ts`, `src/components/AuthView.tsx`, `src/App.tsx` | Login state lived in module memory (`activeUser`/`activeOtpProof`) and the admin panel used a *login* OTP proof as its authorization token; role came from the client. | Real server session created after OTP verification (`POST /api/session/create`, HttpOnly cookie); identity/role come from `POST /api/session/validate` only; boot-time restore from the server; logout revokes server-side; no session/refresh token or OTP proof is ever written to `localStorage`/`sessionStorage`. Admin operations use the DB-confirmed role plus a fresh `admin:` OTP proof held in memory (`src/components/AdminOtpGate.tsx`). |
| C4 | Critical | `server_node/src/lib/auth-middleware.js`, `server_node/src/app.js`, `server_node/src/routes/*` | No CSRF or Origin validation existed for cookie-authenticated requests. | Session-bound CSRF token (HMAC over the session id) delivered in a readable cookie and required as `X-CSRF-Token` for every state-changing cookie call; Origin allow-list enforced; CORS restricted to configured origins with credentials. |
| C5 | Critical | `server_node/src/config.js`, `server_node/src/lib/session.js`, `server_node/src/index.js` | Session/proof signatures reused OTP secrets; `SESSION_SECRET` was never used; production secret validation only logged. | Session tokens/CSRF are signed with an independent `SESSION_SECRET`; `collectConfigProblems()`/`assertRequiredSecrets()` now **abort startup in production** when required secrets are missing (development keeps a clear warning). Verified: production boot without secrets exits with `FATAL: configuration problems: …`. |
| C6 | Critical | `server_node/src/routes/registration.js`, `server_node/src/routes/otp.js`, `server_node/src/routes/session.js`, migration `20261014000000_*` | Registration OTPs were not tied to a pending registration, and a verified OTP could (re)activate a legacy account that an admin had deactivated; duplicates were not refused server-side. | Registration OTPs carry `pending_id`; `warroom_finalize_registration()` is idempotent per challenge, refuses `USER_ALREADY_EXISTS`/`ACCOUNT_BLOCKED`, forces `role='user'`, stores the credential hash and clears the pending hash; `warroom_activate_user_after_otp()` is gated to explicitly-pending users so it can never revive admins' deactivated accounts. |
| H1 | High | `server_node/src/lib/redis.js`, `server_node/src/lib/rateLimit.js`, `server_node/src/config.js` | Insecure fallbacks: HMAC key `fallback-not-secure`, non-atomic `INCR`+`EXPIRE` path, and limits that reset when Redis/DB were mixed. | Lua-only atomic counters, Redis is **deny-only** (it can reject earlier but never grant more), the database counter is authoritative and survives Redis outages/restarts; Redis or DB failure yields a fail-closed `503 RATE_LIMIT_STORE_FAILED` instead of allowing traffic. |
| H2 | High | `server_node/src/index.js`, `server_node/src/app.js` | Health/readiness leaked configuration intent and sensitive infra state. | `/api/ready` returns `503` with a generic reason when dependencies are unavailable; no URLs, secrets or PII are included. Error logs never contain request bodies, OTP codes or passwords (verified by tests around the OTP failure path). |
| H3 | High | `src/lib/backendApi.ts` | Admin operations could fall back to direct Supabase table access / legacy RPCs, and `adminUpdateUser` made client-side role decisions. | The frontend contains **no** `rpc(` calls: all auth/admin traffic goes to the Node API, which re-validates session, role and (for destructive operations) a fresh OTP proof. |
| M1 | Medium | `server_node/src/routes/registration.js`, `src/lib/backendApi.ts` | `/api/registration/check-national` returned `{ exists }`, enabling account enumeration. | Uniform response (`{ success, checked }`) with no existence lookup and per-IP/per-code rate limits; the frontend helper no longer consumes existence data. |
| M2 | Medium | `server_node/src/routes/*`, `server_node/src/lib/*` | Legacy code logged request bodies and raw provider errors. | Central safe error mapping (`SAFE_ERROR_MESSAGES`) and logging that redacts secrets, tokens and bodies. |
| M3 | Medium | `supabase/migrations/20261012000000_harden_rls_and_auth.sql` | `warroom_admin_update_user`, `warroom_admin_revoke_sessions` and `warroom_register_user` were granted to `anon`, so any visitor holding a 30-minute OTP proof uuid could call administrative RPCs. | Superseded by the new migration: service-role-only `*_service` RPCs (`warroom_admin_update_user_service`, `warroom_admin_set_user_password_service`, `warroom_admin_create_user_service`, `warroom_admin_list_password_resets_service`, `warroom_admin_update_password_reset_service`, `warroom_change_password_service`) and `REVOKE EXECUTE … FROM anon, authenticated` on the legacy RPCs. **Only verifiable on a test database.** |

## 2. Evidence — commands and results (all run locally, no DB, no SMS)

| Command | Result |
|---------|--------|
| `cd server_node && npm test` | **60 passed / 0 failed** (legacy 23 + `session-security` 14 + `otp-registration` 13 + `rate-limit-and-session-lib` 10) |
| `npm run lint` (`tsc --noEmit`) | exit 0 (clean) |
| `npm test` (`vitest run`) | **23 passed / 0 failed** in 5 files (includes the storage/static checks in `src/lib/session.test.ts`) |
| `npm run build` (`vite build`) | success |
| `NODE_ENV=production node server_node/src/index.js` (no secrets) | aborts with `FATAL: configuration problems: SUPABASE_URL, …` (fail-closed) |
| Development boot smoke (`/api/health`, `/api/ready`) | `200` health, `503` ready without a database (fail-closed readiness) |

Required scenarios covered by the behavioural tests: unauthenticated `/revoke-all`; cross-user
revocation attempts; invalid/expired/revoked/blocked-user sessions; concurrent OTP-proof race
(exactly one winner); full pending-registration → session flow with a mock DB; no token/OTP in Web
Storage (static + grep); CSRF/Origin enforcement for cookie operations; rate limiting under
Redis outage; enumeration-safe registration responses.

## 3. Cannot be verified in this environment (needs a test database / Docker)

* Applying migration `20261014000000_post_merge_auth_session_security.sql` and re-testing: RLS and
  `GRANT/REVOKE` outcomes, `SECURITY DEFINER`/`search_path` behaviour, and true SQL-level atomicity
  of `warroom_consume_otp_proof` / `warroom_finalize_registration` under real concurrency.
* bcrypt-based password change and the `*_service` admin RPCs against real Supabase.
* Triggers that read `auth.jwt()` (`trg_prevent_blocked_reactivation`, `trg_auto_revoke_on_security`).
* Docker Compose / nginx / image validation — **not run**: no Docker binary in this environment
  (static review only).

## 4. Residual notes

* `src/components/SquadManagementModal.tsx` still caches a **profile snapshot**
  (`warroom_current_user_data`) in `localStorage` for offline display. It contains no session
  token, refresh token or OTP proof; `offlineStorage.ts` treats the key as sensitive and removes it
  on upgrade.
* `ADMIN_OTP_REQUIRED_FOR_DESTRUCTIVE_OPS` defaults to `true`; the admin UI now provides an
  in-memory OTP gate (`AdminOtpGate`) so destructive operations can satisfy it.
* Until the new migration is applied, the legacy anon-granted RPCs listed in M3 still exist in the
  database; the application no longer calls them.
