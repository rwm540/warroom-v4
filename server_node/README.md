# WarRoom Node OTP API

این سرویس فقط برای challengeهای OTP، محدودسازی درخواست‌ها، تأیید امن کد و ارسال SMS از طریق IPPanel است. مسیر فعال Production در `src/index.js` است؛ `npm start` و `server_node/Dockerfile` هر دو همین entry point را اجرا می‌کنند. پیاده‌سازی فعال OTP در `src/routes/otp.js` است و درخت فعلی شامل route قدیمی `routes/otpRoutes.js` نیست.

## API

### `GET /api/health`

پاسخ لایونِس فرایند و وضعیت پیکربندی را می‌دهد. `connectivity: "not_checked"` یعنی این endpoint به Supabase یا IPPanel وصل نمی‌شود و دسترس‌پذیری آن‌ها را ادعا نمی‌کند.

### `POST /api/otp/send`

```json
{ "nationalCode": "0123456789" }
```

در صورت وجود حساب معتبر و پذیرش پیامک، پاسخ شامل `success`, `expiresIn`, `maskedPhone` و `challengeToken` است. `expiresIn` زمان باقی‌مانده برحسب ثانیه است؛ کد ملی و شماره کامل در پاسخ ارسال نمی‌شوند. کد ناموجود پاسخ عمومی می‌گیرد و پیامک/چالش ندارد؛ بااین‌حال، وجود challenge و شماره نیمه‌ماسک‌شده در پاسخ موفق یعنی این تفاوت پاسخ افشای وجود حساب را کاملاً منتفی نمی‌کند. محدودیت نرخ فقط کاهش‌دهنده ریسک است.

### `POST /api/otp/resend`

```json
{ "nationalCode": "0123456789" }
```

پس از محدودیت ارسال، چالش فعال قبلی باطل می‌شود و در صورت موفقیت چالش و مهلت جدید برمی‌گردد.

### `POST /api/otp/verify`

```json
{
  "nationalCode": "0123456789",
  "code": "123456",
  "challengeToken": "<challenge-from-send-response>"
}
```

کد باید دقیقاً شش رقم باشد. پاسخ موفق فقط شناسه کاربر و `otpProof` را برمی‌گرداند؛ خود OTP در API پاسخ داده نمی‌شود. توکن challenge فقط در پاسخ send/resend به مرورگر فرستاده می‌شود و نباید Log یا ذخیره شود.

همه پاسخ‌های خطا safe هستند و شامل payload Provider، کلید محرمانه، OTP، کد ملی یا شماره کامل نیستند.

## تنظیمات خصوصی

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` — فقط در محیط خصوصی Node؛ هرگز `VITE_*` نکنید.
- `OTP_CHALLENGE_SECRET` و `OTP_SECRET` — دو مقدار تصادفی مستقل، هرکدام حداقل ۳۲ نویسه.
- `OTP_TTL_SECONDS` — پیش‌فرض ۳۰۰؛ بازه مجاز ۶۰ تا ۹۰۰ ثانیه.
- `OTP_MAX_SEND_PER_15MIN` — پیش‌فرض ۳.
- `OTP_RESEND_COOLDOWN_SECONDS` — پیش‌فرض ۶۰.
- `OTP_MAX_VERIFY_ATTEMPTS` — پیش‌فرض ۵.
- `IPPANEL_API_KEY`, `IPPANEL_FROM_NUMBER`, `IPPANEL_API_URL` — فقط سمت سرور. مستندات رسمی Webservice: [IPPanel Edge API](https://ippanelcom.github.io/Edge-Document/docs/send/webservice/).
- `PORT` — پیش‌فرض `4010`; `HOST` — پیش‌فرض `0.0.0.0`.

فایل `.env.example` placeholder دارد، نه credential واقعی. در Production از فایل یا Secret Store خصوصی استفاده کنید.

## قرارداد IPPanel

Adapter از `POST https://edge.ippanel.com/v1/api/send` استفاده می‌کند و `IPPANEL_API_KEY` را در Header `Authorization` می‌فرستد. Body شامل `sending_type: "webservice"`، `from_number` و `recipients` با قالب E.164 و متن OTP است. موفقیت تنها وقتی پذیرفته می‌شود که HTTP موفق باشد، `meta.status === true` باشد و `data.message_outbox_ids` حداقل یک شناسه عددی معتبر داشته باشد. Timeout درخواست خروجی ۱۵ ثانیه و timeout خواندن Nginx برای API برابر ۳۰ ثانیه است. شکست یا پیکربندی نامعتبر پاسخ عمومی و غیرموفق می‌دهد؛ هیچ تلاش مجدد خودکاری انجام نمی‌شود و بدنه پاسخ Provider یا اطلاعات محرمانه Log نمی‌شوند. پذیرش IPPanel تحویل قطعی پیامک به تلفن را اثبات نمی‌کند.

## Supabase و دسترسی

خدمت فقط ردیف کاربر لازم را از `warroom_users` می‌خواند و OTP و rate limit را در `warroom_otp_codes` و `warroom_otp_rate_limits` نگه می‌دارد. RPCهای `warroom_hit_otp_rate_limit` و `warroom_verify_otp` در Migrationهای موجود تعریف و برای `service_role` محدود شده‌اند. ثبت‌نام و ورود در فرانت‌اند همچنان از Supabase RPC استفاده می‌کند؛ این API ثبت‌نام عمومی ندارد. IP limiterها در کد فعال‌اند، اما Nginx `X-Forwarded-For` را به آدرس peer خودش تنظیم می‌کند؛ پشت reverse proxy میزبان، per-IP واقعی هنوز اثبات نشده و ممکن است کل کاربران در یک bucket مشترک بیفتند.

این توضیحات تأیید اجرای Migration روی دیتابیس واقعی نیستند. علاوه بر آن، Migration پایه برای `warroom_users` دسترسی مستقیم و Policyهای گسترده `USING (true)` دارد و فیلدهای خصوصی مانند کد ملی و تلفن را در معرض کلاینت قرار می‌دهد؛ این مانع امنیتی خارج از ایزوله‌سازی جداول OTP است و باید پیش از Production با بازطراحی مسیرهای Supabase فرانت‌اند رفع شود. همچنین RPC ثبت‌نام `warroom_register_user` برای `anon` مجاز است ولی در Migration فقط ۱۰ رقم بودن را بررسی می‌کند؛ فرانت‌اند و OTP API نیز رقم کنترلی می‌سنجند، بنابراین فراخوانی مستقیم RPC می‌تواند حسابی بسازد که OTP رد کند. این قرارداد باید با Migration بازبینی‌شده و فهرست‌برداری ایمن از داده‌های موجود هم‌راستا شود. یک blocker مهم دیگر: UI پیش از OTP، رمز را با `warroom_verify_login` بررسی می‌کند، اما endpointهای عمومی Node برای send/resend رمز یا مدرک رمز-تأییدشده نمی‌گیرند. Migration، RPCهای مدیریتی `anon` را با OTP تأییدشده مدیر تا ۳۰ دقیقه مجاز می‌کند؛ بنابراین این API به‌تنهایی الزام دو عاملی رمز+پیامک را تضمین نمی‌کند. پیش از ادعای 2FA یا Production باید رمز و OTP در مرز مورداعتماد به هم متصل و قرارداد RPC بازبینی شود. هیچ Migrationی در این تغییر ویرایش یا اجرا نشده است. تغییر Schema باید جداگانه با وضعیت دیتابیس مقصد مقایسه و بازبینی شود.

## Lockfile و CI

`server_node/package-lock.json` در مخزن موجود نیست و در نتیجه دستورات `npm ci --prefix server_node` در GitHub Actions و `npm ci --omit=dev` در Dockerfile API تا زمان ثبت Lock معتبر قابل اتکا نیستند. فایل `.gitignore` اجازه ثبت آن را می‌دهد؛ این Lock در این تغییر ساخته یا جعل نشده است. جزئیات در [راهنمای معماری و استقرار](../docs/deployment-auth.md) آمده است.

هیچ نصب وابستگی، تست، Build، Docker، SQL/Migration، درخواست واقعی به IPPanel یا Deployment به‌عنوان بخشی از این بررسی انجام نشده است.
