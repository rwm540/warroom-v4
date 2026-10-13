# WarRoom Node OTP API

این سرویس فقط برای challengeهای OTP، محدودسازی درخواست‌ها، تأیید امن کد و ارسال SMS از طریق IPPanel است. مسیر فعال Production در `src/index.js` است؛ `npm start` و `server_node/Dockerfile` هر دو همین entry point را اجرا می‌کنند. پیاده‌سازی فعال OTP در `src/routes/otp.js` است و درخت فعلی شامل route قدیمی `routes/otpRoutes.js` نیست.

## API

### `GET /api/health`

پاسخ لایونِس فرایند و وضعیت پیکربندی را می‌دهد. `connectivity: "not_checked"` یعنی این endpoint به Supabase یا IPPanel وصل نمی‌شود و دسترس‌پذیری آن‌ها را ادعا نمی‌کند.

### `POST /api/otp/send`

```json
{ "nationalCode": "0123456789", "purpose": "login", "password": "<password>" }
```

- `purpose: "login"`: رمز اجباری است و پیش از هر ارسال روی سرور با RPC `warroom_verify_login` بررسی می‌شود؛ در صورت اشتباه‌بودن، پاسخ یکسان `401 INVALID_CREDENTIALS` است و هیچ پیامکی ارسال نمی‌شود.
- `purpose: "registration"`: فقط تا وقتی یک ثبت‌نام موقت معتبر و منقضی‌نشده وجود دارد کد صادر می‌شود.

در صورت پذیرش پیامک، پاسخ شامل `success`, `deliveryStatus: "accepted"`, `expiresIn`, `expiresAt`, `resendAvailableIn`, `maskedPhone` و `challengeToken` است. `expiresAt` مهلت مطلق (ISO) مشترک با `expires_at` در Supabase و `exp` توکن چالش است؛ `expiresIn` فقط فاصلهٔ باقی‌مانده و `resendAvailableIn` ثانیه‌های کول‌داون تا درخواست بعدی است، `resendAvailableAt` همان مهلت مطلق ارسال مجدد است و `serverTime` زمان سرور در لحظهٔ پاسخ است (مرورگر شمارش را بر اساس این مقادیر هم‌زمان می‌کند). کد ملی و شماره کامل در پاسخ ارسال نمی‌شوند. کد ناموجود پاسخ عمومی می‌گیرد و پیامک/چالش ندارد؛ بااین‌حال، وجود challenge و شماره نیمه‌ماسک‌شده در پاسخ موفق یعنی این تفاوت پاسخ افشای وجود حساب را کاملاً منتفی نمی‌کند. محدودیت نرخ فقط کاهش‌دهنده ریسک است. `deliveryStatus` تنها «پذیرش درخواست توسط IPPanel» را نشان می‌دهد، نه تحویل به گوشی (به [راهنمای بررسی تحویل](../docs/otp-sms-delivery.md) مراجعه کنید).

### `POST /api/otp/resend`

```json
{ "nationalCode": "0123456789", "purpose": "login", "password": "<password>" }
```

همان handler محافظت‌شدهٔ `/api/otp/send` را اجرا می‌کند، بنابراین:

- برای `purpose: "login"` رمز دوباره اجباری و پیش از ارسال دوباره روی سرور بررسی می‌شود (ارسال مجدد راهی برای دور زدن رمز نیست)؛
- برای `purpose: "registration"` کد ملی کافی است و باید ثبت‌نام موقت معتبر وجود داشته باشد؛
- سقف IP، سقف هر کد ملی در ۱۵ دقیقه و کول‌داون `OTP_RESEND_COOLDOWN_SECONDS` بدون تغییر اعمال می‌شوند؛ پاسخ کول‌داون `429 OTP_RESEND_COOLDOWN` همراه `retryAfterSeconds` و هدر `Retry-After` است.

پس از ارسال موفق، چالش فعال قبلی باطل می‌شود و چالش و مهلت جدید برمی‌گردد. بستن پنجرهٔ OTP در مرورگر هیچ چالشی را باطل نمی‌کند و مانع درخواست بعدی نمی‌شود.

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
- `OTP_TTL_SECONDS` — پیش‌فرض ۱۲۰؛ بازه مجاز ۶۰ تا ۹۰۰ ثانیه.
- `OTP_MAX_SEND_PER_15MIN` — پیش‌فرض ۳.
- `OTP_RESEND_COOLDOWN_SECONDS` — پیش‌فرض ۱۲۰ (برابر با مدت اعتبار کد).
- `OTP_MAX_VERIFY_ATTEMPTS` — پیش‌فرض ۵.
- `IPPANEL_API_KEY`, `IPPANEL_FROM_NUMBER`, `IPPANEL_API_URL` — فقط سمت سرور. مستندات رسمی Webservice: [IPPanel Edge API](https://ippanelcom.github.io/Edge-Document/docs/send/webservice/).
- `IPPANEL_SENDING_TYPE` — `webservice` (پیش‌فرض، متن آزاد) یا `pattern` (الگوی تأییدشده). مقدار دیگر خطای پیکربندی است.
- `IPPANEL_PATTERN_CODE` — فقط در حالت `pattern` لازم است؛ کد الگوی تأییدشده در پنل IPPanel. در Production بدون کد معتبر، سرور راه‌اندازی نمی‌شود. مستندات: [Send Pattern SMS](https://ippanelcom.github.io/Edge-Document/docs/send/pattern/).
- `PORT` — پیش‌فرض `4010`; `HOST` — پیش‌فرض `0.0.0.0`.

فایل `.env.example` placeholder دارد، نه credential واقعی. در Production از فایل یا Secret Store خصوصی استفاده کنید.

## قرارداد IPPanel

Adapter از `POST https://edge.ippanel.com/v1/api/send` استفاده می‌کند و `IPPANEL_API_KEY` را در Header `Authorization` می‌فرستد. Body در حالت `webservice` شامل `sending_type: "webservice"`، `from_number`، `message` (متن کوتاه `کد اتاق جنگ: %code%`) و `params.recipients` است. در حالت `pattern` بدنه `sending_type: "pattern"`، `from_number`، `code` (کد الگو به صورت رشته)، `recipients` (یک گیرنده) و `params.code` (کد OTP به صورت رشته) است؛ هیچ‌گاه به متن آزاد برنمی‌گردد. موفقیت تنها وقتی پذیرفته می‌شود که HTTP موفق باشد، `meta.status === true` باشد و `data.message_outbox_ids` حداقل یک شناسه عددی معتبر داشته باشد. Timeout درخواست خروجی ۱۵ ثانیه و timeout خواندن Nginx برای API برابر ۳۰ ثانیه است. شناسهٔ پیام در ستون `sms_message_id` چالش ذخیره می‌شود تا بعداً بتوان تحویل همان پیام را از گزارش رسمی Provider خواند.

شکست‌ها به کدهای مستقل تفکیک می‌شوند تا پیکربندی، اعتبارسنجی فرستنده، خطای احراز هویت Provider، محدودیت نرخ Provider، رد گیرنده/متن و خطای شبکه از هم قابل تشخیص باشند (`SMS_NOT_CONFIGURED`, `SMS_CONFIGURATION_INVALID`, `SMS_SENDER_INVALID`, `SMS_AUTH_REJECTED`, `SMS_SENDER_REJECTED`, `SMS_RECIPIENT_REJECTED`, `SMS_MESSAGE_REJECTED`, `SMS_PATTERN_NOT_CONFIGURED`, `SMS_PATTERN_REJECTED`, `SMS_PROVIDER_RATE_LIMITED`, `SMS_PROVIDER_UNAVAILABLE`, `SMS_NETWORK_FAILED`, `SMS_SEND_FAILED`). هیچ تلاش مجدد خودکاری انجام نمی‌شود، بدنهٔ درخواست/پاسخ Provider هرگز Log نمی‌شود و در لاگ فقط کد خطا، وضعیت HTTP، کد خطای Provider و شمارهٔ ماسک‌شده ثبت می‌گردد. پذیرش IPPanel تحویل قطعی پیامک به تلفن را اثبات نمی‌کند؛ روش قطعی بررسی تحویل در [docs/otp-sms-delivery.md](../docs/otp-sms-delivery.md) آمده است.

## Supabase و دسترسی

خدمت فقط ردیف کاربر لازم را از `warroom_users` می‌خواند و OTP و rate limit را در `warroom_otp_codes` و `warroom_otp_rate_limits` نگه می‌دارد. RPCهای `warroom_hit_otp_rate_limit` و `warroom_verify_otp` در Migrationهای موجود تعریف و برای `service_role` محدود شده‌اند. ثبت‌نام و ورود در فرانت‌اند همچنان از Supabase RPC استفاده می‌کند؛ این API ثبت‌نام عمومی ندارد. IP limiterها در کد فعال‌اند، اما Nginx `X-Forwarded-For` را به آدرس peer خودش تنظیم می‌کند؛ پشت reverse proxy میزبان، per-IP واقعی هنوز اثبات نشده و ممکن است کل کاربران در یک bucket مشترک بیفتند.

این توضیحات تأیید اجرای Migration روی دیتابیس واقعی نیستند. علاوه بر آن، Migration پایه برای `warroom_users` دسترسی مستقیم و Policyهای گسترده `USING (true)` دارد و فیلدهای خصوصی مانند کد ملی و تلفن را در معرض کلاینت قرار می‌دهد؛ این مانع امنیتی خارج از ایزوله‌سازی جداول OTP است و باید پیش از Production با بازطراحی مسیرهای Supabase فرانت‌اند رفع شود. همچنین RPC ثبت‌نام `warroom_register_user` برای `anon` مجاز است ولی در Migration فقط ۱۰ رقم بودن را بررسی می‌کند؛ فرانت‌اند و OTP API نیز رقم کنترلی می‌سنجند، بنابراین فراخوانی مستقیم RPC می‌تواند حسابی بسازد که OTP رد کند. این قرارداد باید با Migration بازبینی‌شده و فهرست‌برداری ایمن از داده‌های موجود هم‌راستا شود. یک blocker مهم دیگر: UI پیش از OTP، رمز را با `warroom_verify_login` بررسی می‌کند، اما endpointهای عمومی Node برای send/resend رمز یا مدرک رمز-تأییدشده نمی‌گیرند. Migration، RPCهای مدیریتی `anon` را با OTP تأییدشده مدیر تا ۳۰ دقیقه مجاز می‌کند؛ بنابراین این API به‌تنهایی الزام دو عاملی رمز+پیامک را تضمین نمی‌کند. پیش از ادعای 2FA یا Production باید رمز و OTP در مرز مورداعتماد به هم متصل و قرارداد RPC بازبینی شود. هیچ Migrationی در این تغییر ویرایش یا اجرا نشده است. تغییر Schema باید جداگانه با وضعیت دیتابیس مقصد مقایسه و بازبینی شود.

## Lockfile و CI

`server_node/package-lock.json` در مخزن موجود نیست و در نتیجه دستورات `npm ci --prefix server_node` در GitHub Actions و `npm ci --omit=dev` در Dockerfile API تا زمان ثبت Lock معتبر قابل اتکا نیستند. فایل `.gitignore` اجازه ثبت آن را می‌دهد؛ این Lock در این تغییر ساخته یا جعل نشده است. جزئیات در [راهنمای معماری و استقرار](../docs/deployment-auth.md) آمده است.

هیچ API-وابستگی، تست، Build، Docker، SQL/Migration، اتصال زنده به دیتابیس، درخواست واقعی به IPPanel یا Deployment به‌عنوان بخشی از این بررسی اجرا نشد. به‌اشتباه، هنگام ساخت PR یک `npm ci` در ریشه مخزن اجرا شد و npm گزارش کرد ۵۰۵ بسته نصب شده‌اند؛ این کار برخلاف محدودیت درخواست‌شده بود و تکرار نمی‌شود. این نصب lockfile را نساخت یا تغییر نداد و `server_node` جداگانه نصب نشد.
