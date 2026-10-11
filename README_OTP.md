# سرویس OTP و IPPanel در WarRoom V4

این فایل فقط قرارداد و مسیرهای فعال در مخزن را خلاصه می‌کند؛ **آماده‌بودن Production یا تحویل واقعی پیامک را تأیید نمی‌کند**. معماری و محدودیت‌ها در [docs/deployment-auth.md](docs/deployment-auth.md) توضیح داده شده‌اند.

## مسیر فعال

- Entry point سرور: `server_node/src/index.js`
- Routeهای OTP: `server_node/src/routes/otp.js`
- سرویس SMS: `server_node/src/lib/sms.js`
- تنظیمات: `server_node/src/config.js`
- Supabase: `server_node/src/lib/supabase.js`
- فرانت‌اند از مسیرهای same-origin زیر استفاده می‌کند:
  - `POST /api/otp/send`
  - `POST /api/otp/verify`
  - `POST /api/otp/resend`
- Nginx فقط همین سه مسیر و `GET /api/health` را به Node روی شبکه خصوصی Docker هدایت می‌کند. API Node پورت عمومی میزبان ندارد.
- ثبت‌نام و ورود همچنان از Supabase RPC فرانت‌اند انجام می‌شود؛ Node سرویس عمومی مدیریت کاربران نیست.

## قرارداد OTP

OTP دقیقاً شش رقم است. مقدار پیش‌فرض اعتبار `OTP_TTL_SECONDS` برابر **۳۰۰ ثانیه** است. همان مهلت مطلق برای `expires_at` در Supabase و انقضای challenge token استفاده می‌شود؛ متن SMS مدت اعتبار را به ثانیه از زمان صدور بیان می‌کند و فرانت‌اند تایمر را از `expiresIn` پاسخ سرور می‌گیرد. چالش به شناسه کاربر، شناسه درخواست و HMAC کد ملی مقید است؛ کد OTP به‌صورت HMAC ذخیره می‌شود و پس از تأیید یا پایان تلاش‌ها قابل استفاده مجدد نیست.

## قرارداد IPPanel

کد از Edge Webservice API رسمی IPPanel استفاده می‌کند: [`POST /v1/api/send`](https://ippanelcom.github.io/Edge-Document/docs/send/webservice/). درخواست شامل `Authorization`، فرستنده و گیرنده E.164، متن پیام و `params.recipients` است. موفقیت فقط با پاسخ HTTP موفق، `meta.status === true` و شناسه معتبر در `data.message_outbox_ids` پذیرفته می‌شود. درخواست خروجی timeout برابر ۱۵ ثانیه دارد و timeout خواندن Nginx برای API برابر ۳۰ ثانیه است؛ پاسخ موفق Provider، تحویل قطعی به تلفن را اثبات نمی‌کند.

کلید فقط در متغیر خصوصی سمت Node به نام `IPPANEL_API_KEY` قرار می‌گیرد. فرستنده و URL از `IPPANEL_FROM_NUMBER` و `IPPANEL_API_URL` سمت سرور خوانده می‌شوند. هیچ مقدار واقعی یا کلیدی در این مخزن قرار ندهید.

## Supabase و محدودیت‌های فعلی

جداول `warroom_otp_codes` و `warroom_otp_rate_limits` و امضای RPCهای استفاده‌شده در Migrationهای موجود تعریف شده‌اند. دسترسی OTP در Migrationها برای `service_role` محدود شده است. بااین‌حال، Migration پایه برای `warroom_users` هنوز دسترسی مستقیم گسترده و Policyهای `USING (true)` دارد؛ این موضوع می‌تواند کد ملی و شماره همراه را در معرض کلاینت بگذارد و مانع جداگانه Production است. رفع آن نیازمند بازبینی جریان‌های مستقیم Supabase فرانت‌اند است و در این تغییر انجام نشده است. همچنین فرانت‌اند و Node رقم کنترلی کد ملی را بررسی می‌کنند، اما RPC ثبت‌نام `warroom_register_user` در Migration فقط طول/رقمی‌بودن را می‌سنجد و از `anon` قابل فراخوانی است؛ فراخوانی مستقیم می‌تواند رکوردی بسازد که OTP آن را رد می‌کند. قرارداد RPC باید در Migration بازبینی‌شده هم‌راستا شود. همچنین UI رمز را پیش از OTP بررسی می‌کند، اما endpointهای عمومی Node خودشان رمز را نمی‌گیرند یا تأییدشده‌بودنش را نمی‌بندند؛ Migration برای RPCهای مدیریتی `anon` را با OTP مدیر مجاز می‌کند. بنابراین این پیاده‌سازی به‌تنهایی الزام دو عاملی رمز+پیامک را تضمین نمی‌کند و پیش از Production باید این مرز احراز هویت بازطراحی شود. تطبیق فقط ایستا است؛ هیچ SQL/Migration یا اتصال به پایگاه داده واقعی انجام نشده است.

**مانع Build/CI باقی‌مانده:** `server_node/package-lock.json` در مخزن وجود ندارد، در حالی که CI و Docker برای API از `npm ci` استفاده می‌کنند. فایل `.gitignore` دیگر Lock را نادیده نمی‌گیرد، اما Lock معتبر از روی Manifest تولید نشده است. تا تولید و ثبت Lock واقعی از مسیر مجاز، نصب API و Build تصویر آن قابل تأیید نیست؛ Lock ساختگی ارائه نمی‌شود.

هیچ تست، Build، نصب وابستگی، Docker، SQL/Migration، ارسال پیامک واقعی یا Deployment از این راهنما اجرا نمی‌شود.
