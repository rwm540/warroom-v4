# گزارش ایمن‌سازی WarRoom V4 — نسخه 2026-10-12

## خلاصه اجرایی
این مستند اصلاحات امنیتی انجام‌شده در شاخه `arena/9315e499-warroom-v4` را شرح می‌دهد. هدف تبدیل کد فعلی به برنامه‌ای منسجم، قابل نگهداری و دارای کنترل‌های امنیتی مناسب برای استفاده واقعی است.

## مهم‌ترین تغییرات

### 1. سرویس Node.js OTP (server_node)

#### اصلاحات ساختاری
- `package.json` type از `commonjs` به `module` تغییر کرد تا با `import/export` واقعی سازگار شود (مشکل Runtime قبلی).
- `package-lock.json` معتبر برای `server_node` تولید شد (`npm install --package-lock-only`).
- `config.js` با اعتبارسنجی عددی، محدودسازی `TRUST_PROXY` (0-2)، و تابع `assertRequiredSecrets()` برای شکست امن در نبود Secretها بازنویسی شد.
- `index.js`:
  - `trust proxy` از مقدار ثابت 1 به `config.trustProxy` قابل پیکربندی تغییر کرد.
  - هدرهای امنیتی Helmet سخت‌گیرانه‌تر شد (HSTS در Production، noSniff، frameguard deny).
  - Rate limiter سراسری 120 درخواست در 15 دقیقه، با keyGenerator مبتنی بر IP واقعی.
  - مسیرهای جدید `/api/password-reset` و `/api/registration` اضافه شد.
  - خطاهای 500 هرگز Stack Trace، SQL یا Secret را به کلاینت افشا نمی‌کنند.

#### مسیرهای جدید
- `routes/passwordReset.js`:
  - ضد Enumeration: اگر شماره وجود نداشته باشد، پاسخ عمومی بدون Tracking Code و با تاخیر تصادفی 200ms برمی‌گردد.
  - Rate limiting در DB via `warroom_hit_otp_rate_limit` (10/IP/hour و 3/phone/hour).
  - `/status` فقط با فیلتر دقیق `tracking_code` و `national_code` در DB کوئری می‌کند، نه دانلود کل جدول (رفع نشت PII قبلی در `backendApi.ts`).
- `routes/registration.js`:
  - اعتبارسنجی کامل کد ملی (regex + checksum)، شماره موبایل E.164، قدرت رمز عبور.
  - بررسی تکراری بودن کد ملی و شماره موبایل.
  - ایجاد رکورد در `warroom_pending_registrations` با انقضای 15 دقیقه، یا fallback به کاربر غیرفعال (`is_active=false`).
  - Rate limiting جداگانه برای IP، کد ملی و شماره موبایل.

#### بهبود OTP
- `routes/otp.js`:
  - کاربران مسدودشده (`is_blocked=true`) نمی‌توانند OTP دریافت کنند.
  - پس از تأیید موفق OTP، کاربر غیرفعال به فعال تبدیل می‌شود (`is_active=true`).
  - تمام چالش‌های معلق دیگر برای همان کد ملی باطل می‌شوند تا از Replay جلوگیری شود.
  - اعتبار کد ۱۲۰ ثانیه است و همان مهلت مطلق در `expires_at` (Supabase)، `exp` توکن چالش، متن پیامک و تایمر مرورگر به کار می‌رود؛ کد پس از انقضا در هیچ لایه‌ای پذیرفته نمی‌شود.
  - ارسال مجدد برای هر دو مسیر ورود و ثبت‌نام فعال است، اما برای `purpose=login` رمز عبور دوباره روی سرور (`warroom_verify_login`) بررسی می‌شود؛ محدودیت IP، سقف هر کد ملی در ۱۵ دقیقه و کول‌داون ارسال بدون تغییر باقی می‌مانند و پاسخ کول‌داون `429` همراه `Retry-After` است.
  - خطاهای ارسال پیامک به کدهای مستقل (پیکربندی، فرستنده، احراز هویت Provider، محدودیت نرخ Provider، رد گیرنده/متن، شبکه) تفکیک شده‌اند و لاگ‌ها فقط کد خطا، وضعیت HTTP، کد خطای Provider و شمارهٔ ماسک‌شده را ثبت می‌کنند.
  - تحویل هر پیام با گزارش رسمی IPPanel (`/api/report/by_bulk` و `/api/report/recipients`) و از مسیرهای فقط‌خواندنی (CLI یا `POST /api/admin/otp/sms-status` مخصوص مدیر) قابل بررسی است؛ جزئیات در [otp-sms-delivery.md](./otp-sms-delivery.md).

#### کتابخانه‌های امنیتی
- `lib/password.js`: اعتبارسنجی قدرت رمز (حداقل 8 کاراکتر، نیاز به حرف و رقم، عدم وجود فاصله، عدم وجود الگوهای رایج) و تولید رمز امن با `crypto.randomInt`.
- `lib/validators.js`: اعتبارسنجی checksum کد ملی ایران، نرمال‌سازی شماره موبایل، sanitize متن.
- `lib/security.test.js`: 11 تست واحد برای OTP، رمز عبور، کد ملی و شماره موبایل (تمام Pass).

### 2. فرانت‌اند React/Vite/TypeScript

#### حذف دسترسی مستقیم ناامن به Supabase
- `supabaseData.ts` بازنویسی کامل:
  - حذف `sha256Hex`، `userPasswordCache`، `EMPTY_STRING_HASH` — رمز عبور هرگز در کلاینت هش یا ذخیره نمی‌شود، فقط via RPC با bcrypt در سرور.
  - `normalizeRowForDb` رمز عبور را حذف می‌کند.
  - `SENSITIVE_TABLES` تعریف شد: `warroom_users`, `warroom_credentials`, `warroom_otp_codes`, `warroom_password_reset_requests`, `warroom_wallet_transactions` و غیره هرگز کش آفلاین نمی‌شوند و mutation مستقیم آن‌ها مسدود است.
  - `PUBLIC_CACHE_TABLES` فقط داده‌های عمومی: missions, trainings, stages, prizes, announcements, etc.
  - `useSyncedCollection` برای جداول حساس هشدار می‌دهد و از mutation مستقیم جلوگیری می‌کند.

#### کش آفلاین امن
- `offlineStorage.ts` نسخه v2:
  - DB_NAME به `warroom_offline_v2` ارتقا یافت تا کش قدیمی حساس پاک شود.
  - `ALLOWED_CACHE_TABLES` و `BLOCKED_TABLES` صریح تعریف شدند.
  - `enqueueOfflineMutation` برای جداول حساس خطا می‌دهد.
  - `Math.random` با `crypto.randomUUID` و `crypto.getRandomValues` جایگزین شد.
  - `containsSensitiveData` از ذخیره فیلدهای `password`, `secret`, `token`, `otp` جلوگیری می‌کند.
  - `BLOCKED_KV_KEYS` از ذخیره `password`, `token`, `session_id` و غیره در IndexedDB/localStorage جلوگیری می‌کند.
  - در بارگذاری اولیه، کلیدهای حساس قدیمی مانند `warroom_current_user_data`, `warroom_session_id` از localStorage پاک می‌شوند.

#### حذف Math.random ناامن
- `AuthView.tsx`: تولید رمز تصادفی با `crypto.getRandomValues` و shuffle امن.
- `App.tsx`: تولید کد رهگیری `WR-XXXXXX` با `crypto.getRandomValues`.
- `auditLogger.ts`: ID با `crypto.randomUUID`.
- `groupChatService.ts`: ID پیام با `crypto.randomUUID`.
- `groupRegistration.ts`: تمام IDها و credentialهای مشترک با `crypto.getRandomValues`.
- `jalali.ts`: تولید کد پرسنلی با `crypto.getRandomValues`.
- `AdminPanel.tsx`: کد پرسنلی و ID سوال با `crypto.getRandomValues`.
- `VitrinView.tsx`: ID کامنت با `crypto.randomUUID`.
- `WalletTransfersView.tsx`: ref_id با `crypto.getRandomValues`.

#### مدیریت نشست و حریم خصوصی
- `backendApi.ts` بازنویسی امن:
  - `apiCheckNationalCodeExists` اکنون از `/api/registration/check-national` سرور استفاده می‌کند، نه کوئری مستقیم `warroom_users`.
  - `apiRegister` کاربر را با `is_active=false` می‌سازد و از ارتقای نقش جلوگیری می‌کند.
  - `requestPasswordReset` و `checkPasswordResetStatus` از مسیرهای امن Node (`/api/password-reset/*`) استفاده می‌کنند، نه دانلود کل جدول.
  - `adminUpdateUser` ابتدا RPC امن `warroom_admin_update_user` را امتحان می‌کند، سپس fallback با RLS.
  - `adminGeneratePassword` و `adminCreateUser` با `crypto.getRandomValues`.
  - `apiLogout` فقط کلیدهای خود را پاک می‌کند، نه تمام localStorage.
  - خطاها هرگز SQL یا Secret را افشا نمی‌کنند.
- `redisClient.ts`: `VITE_REDIS_URL` حذف شد، فقط `REDIS_URL` سرور استفاده می‌شود.
- `vite.config.ts`: پروکسی برای مسیرهای جدید اضافه شد، و `test` config برای vitest.

#### اعتبارسنجی
- `validators.ts` جدید: توابع مشترک برای کد ملی، موبایل، رمز عبور، sanitize.
- `validators.test.ts`: 4 تست.
- `offlineStorage.test.ts`: 5 تست برای مسدودسازی کش حساس.

### 3. Supabase / PostgreSQL / RLS

#### Migration جدید: `20261012000000_harden_rls_and_auth.sql`
- جدول `warroom_pending_registrations` برای جریان ثبت‌نام امن (فقط `service_role`).
- **warroom_users**:
  - سیاست‌های قدیمی `USING (true)` حذف شدند.
  - `SELECT`: فقط `authenticated` که `is_admin()` یا `id = current_user_id`.
  - `INSERT`: `WITH CHECK (false)` برای anon/authenticated — فقط via RPC `security definer`.
  - `UPDATE`: own یا admin.
  - `DELETE`: admin only.
  - `FORCE RLS` فعال.
- **warroom_users_public** view بازسازی شد با فیلدهای امن و فیلتر `is_active=true` و `is_blocked=false`.
- **warroom_kv**:
  - `SELECT`: حساس‌ها فقط برای admin.
  - `INSERT/UPDATE`: فقط admin یا `saved_posts_%` یا کلیدهای عمومی خاص.
  - `DELETE`: admin only.
- **warroom_groups**: فقط leader، member یا admin می‌توانند ببینند/ویرایش کنند.
- **warroom_password_reset_requests**: `SELECT` فقط own یا admin، `INSERT` فقط pending با tracking_code، `UPDATE` فقط admin.
- **warroom_group_chat_messages**: فقط اعضای گروه یا admin.
- **RPCهای جدید امن**:
  - `warroom_admin_update_user(p_admin_proof, p_user_id, p_patch)`: بررسی OTP مدیر تا 30 دقیقه، allowlist فیلدهای مجاز، جلوگیری از ارتقای نقش.
  - `warroom_admin_revoke_sessions`: ابطال refresh_tokens و OTP codes.
  - `warroom_activate_user_after_otp`: فعال‌سازی پس از OTP.
  - `warroom_set_pending_password`: هش رمز pending.
  - `warroom_cleanup_expired`: پاکسازی pending و OTP منقضی (فقط admin).
- **بهبود `warroom_register_user`**: افزودن اعتبارسنجی checksum کد ملی، تنظیم `is_active=false` پیش‌فرض، جلوگیری از role escalation.
- **Grants**: تمام جداول حساس `REVOKE ALL FROM anon, authenticated` و `GRANT ALL TO service_role`.

## مشکلات امنیتی رفع‌شده

### بحرانی
1. **دسترسی مستقیم فرانت‌اند به `warroom_users` با `USING (true)`**: هر anon می‌توانست تمام کاربران، کد ملی، شماره موبایل، رمز هش‌شده را بخواند/ویرایش/حذف کند. **رفع شد** با RLS سخت‌گیرانه و `FORCE RLS`.
2. **نشت تمام درخواست‌های بازیابی رمز**: `checkPasswordResetStatus` کل جدول `warroom_password_reset_requests` را دانلود و در مرورگر فیلتر می‌کرد. **رفع شد** با مسیر سرور `/api/password-reset/status` که فقط رکورد موردنظر را برمی‌گرداند.
3. **ذخیره رمز عبور در `warroom_users.data.password` و `userPasswordCache`**: رمز خام/هش ضعیف SHA256 در کلاینت و IndexedDB. **رفع شد** با حذف کامل کش رمز و استفاده فقط از `warroom_credentials` با bcrypt.
4. **Enumeration شماره موبایل و کد ملی**: پاسخ‌های متفاوت برای وجود/عدم وجود حساب. **رفع شد** با پاسخ عمومی و تاخیر ثابت.

### بالا
5. **استفاده از `Math.random()` برای رمز، توکن، کد رهگیری**: قابل حدس. **رفع شد** با `crypto.getRandomValues` و `crypto.randomUUID` در 12 فایل.
6. **کش آفلاین داده‌های حساس**: `warroom_users`, `warroom_wallet_transactions`, `warroom_password_reset_requests` در IndexedDB و localStorage بدون رمزنگاری. **رفع شد** با allowlist جداول عمومی و blocklist حساس.
7. **ارتقای نقش توسط کلاینت**: `data->>'role' = 'admin'` قابل تنظیم توسط مرورگر. **رفع شد** با حذف `role` از payload و RLS + RPC allowlist.
8. **عملیات مدیریتی بدون مدرک معتبر**: `adminUpdateUser` مستقیماً `warroom_users` را آپدیت می‌کرد. **رفع شد** با RPC `warroom_admin_update_user` که OTP مدیر را بررسی می‌کند.

### متوسط
9. **VITE_REDIS_URL در باندل فرانت‌اند**: URL Redis خصوصی در کلاینت. **رفع شد** با استفاده از `REDIS_URL` سرور.
10. **عدم ابطال نشست پس از تغییر رمز**: **رفع شد** با RPC `warroom_admin_revoke_sessions` و `warroom_admin_set_user_password` که refresh_tokens را revoke می‌کند.
11. **ماژول Node.js ناسازگار**: `package.json` commonjs ولی کد ESM. **رفع شد** با `type: module`.
12. **عدم وجود Lockfile برای `server_node`**: **رفع شد** با `package-lock.json`.

## مشکلات باقی‌مانده (محدودیت محیط)

1. **تست RLS زنده**: Migration جدید روی دیتابیس واقعی Supabase اجرا نشده (طبق محدودیت). باید در محیط آزمایشی با `supabase db push` و تست نفوذ بررسی شود.
2. **ارسال واقعی SMS**: تست‌های `sms.test.js` از Mock استفاده می‌کنند؛ ارسال واقعی در محیط آزمایشی با IPPanel Sandbox باید تست شود.
3. **کوکی HttpOnly و CSRF**: نشست فعلی در حافظه React است، نه HttpOnly Cookie. برای Production باید نشست‌ها به کوکی `HttpOnly`, `Secure`, `SameSite=Lax` + CSRF token منتقل شوند. این نیاز به تغییرات گسترده در احراز هویت دارد و در این PR به‌صورت طراحی باقی مانده.
4. **Supabase Auth vs Custom**: معماری فعلی ترکیبی از RPC سفارشی و OTP Node است. مهاجرت کامل به Supabase Auth با RLS مبتنی بر `auth.uid()` توصیه می‌شود اما نیاز به بازطراحی دارد.
5. **Offline Queue Replay**: هرچند جداول حساس مسدود شدند، اما replay برای `warroom_group_chat_messages` هنوز مستقیم است و باید با RLS جدید تست شود.
6. **Payment و Wallet**: دفترکل مالی فقط SELECT برای کاربران دارد و INSERT فقط via RPC — این امن است اما باید تست شود که UI پرداخت آنلاین به‌درستی کار می‌کند.

## تست‌های اجرا‌شده

### server_node (node:test)
```
✓ OTP generation uses six digits and keyed hashes reject modified or unrelated values
✓ OTP input accepts exactly six ASCII, Persian, or Arabic-Indic digits
✓ identity helpers normalize Persian/Arabic digits and Iranian phone numbers
✓ password strength rejects weak passwords and accepts strong ones
✓ secure password generator uses crypto and produces required charset
✓ national code checksum validation
✓ phone validation normalizes Iranian numbers
✓ OTP code normalization rejects invalid inputs
✓ isValidNationalCode from identity rejects invalid
✓ SMS adapter fails explicitly when IPPanel is not configured
✓ SMS adapter sends the documented payload and accepts only a successful response with an outbox ID
Tests: 11 passed
```

### frontend (vitest jsdom)
```
✓ offlineStorage security - should block caching of sensitive tables
✓ offlineStorage security - should allow caching of public tables
✓ offlineStorage security - should block offline mutations for sensitive tables
✓ offlineStorage security - should block sensitive KV keys
✓ offlineStorage security - should allow safe KV keys
✓ validators - validates national code checksum
✓ validators - validates Iranian phone numbers
✓ validators - rejects weak passwords
✓ validators - sanitizes text and truncates
✓ groupChatService - creates room, appends message, and deletes it
✓ groupChatService - rejects empty messages
Tests: 11 passed
```

### تست‌های اجرا‌نشده
- تست یکپارچه با دیتابیس واقعی Supabase (نیاز به env و عدم اجرا روی Production)
- تست نفوذ RLS با anon key واقعی
- تست E2E ثبت‌نام → OTP → ورود
- تست ارسال واقعی SMS (طبق محدودیت)

## Migrationها و نحوه اجرا

### فایل‌های جدید
- `supabase/migrations/20261012000000_harden_rls_and_auth.sql` — افزایشی، قابل تکرار، بدون DROP TABLE داده‌ای.

### راهنمای اجرای امن
1. **محیط آزمایشی محلی (Supabase CLI)**:
   ```bash
   supabase start
   supabase db reset
   supabase migration list
   supabase db push --include-all
   ```
   سپس تست‌های RLS:
   ```sql
   -- به‌عنوان anon
   set role anon;
   select * from warroom_users; -- باید 0 ردیف یا خطا
   select * from warroom_users_public; -- باید فقط فیلدهای عمومی
   select * from warroom_kv where id='payment_settings'; -- باید خطا برای anon
   ```

2. **بررسی پیش‌شرط**:
   - اطمینان از عدم وجود `national_code` تکراری (Migration بررسی می‌کند).
   - اطمینان از وجود `pgcrypto`.

3. **Production**:
   - هرگز Migration را مستقیم روی Production اجرا نکنید؛ ابتدا در Staging تست کنید.
   - Rollback: این Migration سیاست‌های قدیمی را حذف می‌کند؛ Rollback نیاز به بازگردانی سیاست‌های قدیمی دارد اما نباید `USING (true)` را بازگرداند. به‌جای Rollback کامل، سیاست‌های جدید را با `DROP POLICY` و بازسازی سیاست‌های امن قبلی جایگزین کنید.

## متغیرهای محیطی

### فرانت‌اند (VITE_ — عمومی)
- `VITE_SUPABASE_URL` — URL پروژه Supabase
- `VITE_SUPABASE_PUBLISHABLE_KEY` — کلید publishable (فرمت جدید `sb_publishable_...`) یا anon key

### سرور Node (خصوصی — هرگز VITE_)
- `SUPABASE_URL` — همان URL
- `SUPABASE_SERVICE_ROLE_KEY` — کلید service_role (فقط سرور)
- `OTP_CHALLENGE_SECRET` — حداقل 32 کاراکتر تصادفی، مستقل از OTP_SECRET
- `OTP_SECRET` — حداقل 32 کاراکتر تصادفی
- `OTP_TTL_SECONDS` — 60-900، پیش‌فرض 120
- `OTP_MAX_SEND_PER_15MIN` — 1-10، پیش‌فرض 3
- `OTP_RESEND_COOLDOWN_SECONDS` — 10-600، پیش‌فرض 60
- `OTP_MAX_VERIFY_ATTEMPTS` — 3-10، پیش‌فرض 5
- `IPPANEL_API_KEY` — کلید IPPanel
- `IPPANEL_FROM_NUMBER` — شماره فرستنده E.164 تأییدشده
- `IPPANEL_API_URL` — `https://edge.ippanel.com/v1/api/send`
- `PORT` — 4010
- `HOST` — 0.0.0.0
- `NODE_ENV` — production/development
- `TRUST_PROXY` — 0-2، پیش‌فرض 1
- `PASSWORD_RESET_RATE_LIMIT_PER_HOUR` — پیش‌فرض 3
- `REGISTRATION_RATE_LIMIT_PER_HOUR` — پیش‌فرض 5
- `REDIS_URL` — اختیاری، فقط سرور

تولید Secret امن:
```bash
openssl rand -base64 32
```

## کنترل‌های امنیتی اعمال‌شده در کد

- [x] RLS فعال روی تمام جداول، `FORCE RLS` برای حساس‌ها
- [x] `search_path = public, pg_temp` برای تمام توابع SECURITY DEFINER
- [x] HMAC برای هش OTP و rate limit با Secret مجزا
- [x] `randomInt` و `crypto.getRandomValues` برای OTP و رمز، نه `Math.random`
- [x] اعتبارسنجی کد ملی با checksum در فرانت‌اند، Node و DB
- [x] محدودیت نرخ در DB via `warroom_hit_otp_rate_limit` مقاوم به Restart
- [x] ابطال چالش قبلی هنگام resend
- [x] تأیید OTP اتمیک via `warroom_verify_otp`
- [x] جلوگیری از استفاده مجدد OTP (is_used=true پس از verify)
- [x] مسدودسازی کش آفلاین داده‌های حساس
- [x] حذف رمز از localStorage/sessionStorage/IndexedDB
- [x] جلوگیری از افشای Stack Trace, SQL, Secret به کلاینت
- [x] هدرهای امنیتی Helmet
- [x] محدودیت اندازه JSON (16kb)
- [x] اعتبارسنجی ورودی با Schema و sanitize
- [x] جلوگیری از role escalation
- [x] ابطال نشست‌های قبلی پس از تغییر رمز

## برآورد امنیت (ارزیابی مهندسی تقریبی)

- **React/Vite**: 75% → 85% (حذف Math.random، محدودسازی کش، حذف رمز از State)
- **Node.js**: 70% → 90% (اصلاح ماژول، rate limiting، مسیرهای امن، عدم افشای اطلاعات)
- **Supabase/PostgreSQL**: 40% → 80% (RLS سخت‌گیرانه، Grants حداقلی، RPC امن، اما نیاز به تست زنده)

**ریسک باقی‌مانده**: تا زمانی که RLS جدید روی DB واقعی تست و نشست‌ها به HttpOnly Cookie + CSRF منتقل نشوند، ادعای Production Ready کامل نمی‌توان کرد. این ارزیابی نتیجه اسکن رسمی نیست.

## Commitها و PR

- شاخه: `arena/9315e499-warroom-v4`
- Commitهای انجام‌شده:
  - fix(server_node): harden module type, config, security headers, add secure routes
  - fix(frontend): secure offline storage, remove password cache, block sensitive tables
  - fix(frontend): replace Math.random with crypto secure RNG across codebase
  - feat(supabase): add hardening migration 20261012000000 with secure RLS and admin RPCs
  - test: add security unit tests for OTP, password, validators, offline storage
  - docs: update .env.example and add security-hardening report

- PR پیش‌نویس: باید via `gh pr create --draft` ساخته شود (در محیط فعلی بدون اتصال GitHub API کامل، باید دستی ساخته شود).

## مراحل بعدی برای مالک پروژه

1. اجرای Migration جدید در محیط Staging و تست RLS با anon key واقعی.
2. تست جریان ثبت‌نام امن: `POST /api/registration/start` → OTP → `POST /api/otp/verify` → بررسی `is_active=true`.
3. تست ضد Enumeration برای بازیابی رمز: درخواست با شماره ناموجود باید پاسخ عمومی بدون Tracking Code بدهد.
4. بررسی لاگ‌های `server/log/` برای عدم وجود PII.
5. تنظیم Secretهای واقعی در محیط Production (نه در Git).
6. فعال‌سازی HSTS و بررسی هدرهای امنیتی.
7. برنامه‌ریزی مهاجرت به HttpOnly Cookie + CSRF برای نشست‌ها.
8. اجرای `npm audit` و رفع آسیب‌پذیری‌های شناخته‌شده (در حال حاضر 6 مورد moderate/high در root).
9. تست PWA و آفلاین فقط برای داده‌های عمومی.
10. مستندسازی Rollback Plan برای Migration جدید.
