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
- Nginx این سه مسیر OTP و `GET /api/health` را با location اختصاصی به Node روی شبکه خصوصی Docker هدایت می‌کند و بقیه مسیرهای `/api/` (از جمله `/api/session` و `/api/admin`) را با همان سرویس خصوصی پروکسی می‌کند؛ `GET /api/health` زمان‌بندی جداگانه دارد. API Node پورت عمومی میزبان ندارد.
- ثبت‌نام و ورود همچنان از Supabase RPC فرانت‌اند انجام می‌شود؛ Node سرویس عمومی مدیریت کاربران نیست.

## قرارداد OTP

OTP دقیقاً شش رقم است. مقدار پیش‌فرض اعتبار `OTP_TTL_SECONDS` برابر **۱۲۰ ثانیه** است. همان مهلت مطلق برای `expires_at` در Supabase، `exp` توکن چالش و تایمر مرورگر استفاده می‌شود: پاسخ سرور هم `expiresIn` (ثانیهٔ باقی‌مانده) و هم `expiresAt` (مهلت مطلق ISO) و `resendAvailableIn` (کول‌داون ارسال مجدد) را برمی‌گرداند و مودال از همان مهلت مطلق می‌شمارد، بنابراین بستن و بازکردن پنجره عمر کد را تمدید نمی‌کند. متن SMS همان پترن تأییدشده است و مدت اعتبار را ذکر نمی‌کند. چالش به شناسه کاربر، شناسه درخواست و HMAC کد ملی مقید است؛ کد OTP به‌صورت HMAC ذخیره می‌شود و پس از تأیید یا پایان تلاش‌ها قابل استفاده مجدد نیست. کدی که از مهلت گذشته باشد هم در لایهٔ امضای توکن و هم در تابع `warroom_verify_otp` (`expires_at > now()`) رد می‌شود.

## قرارداد ارسال مجدد

`POST /api/otp/resend` همان handler محافظت‌شدهٔ `POST /api/otp/send` را اجرا می‌کند؛ بنابراین محدودیت‌ها در ارسال مجدد هم برقرار است:

- `purpose: "login"`: رمز عبور **دوباره اجباری** است و پیش از ارسال هر پیامک روی سرور بررسی می‌شود (رمزپایه‌بودن ورود با OTP حفظ می‌شود). اگر رمز نیامده باشد یا درست نباشد، پاسخ یکسان `401 INVALID_CREDENTIALS` و بدون ارسال پیامک است.
- `purpose: "registration"`: با کد ملی و تنها در صورت وجود ثبت‌نام موقت معتبر کار می‌کند.
- کول‌داون `OTP_RESEND_COOLDOWN_SECONDS` (پیش‌فرض ۱۲۰ ثانیه) با پاسخ `429 OTP_RESEND_COOLDOWN` و `retryAfterSeconds`/`Retry-After` گزارش می‌شود؛ سقف IP و سقف هر کد ملی در ۱۵ دقیقه هم دست‌نخورده اعمال می‌شوند.
- بستن پنجرهٔ OTP در مرورگر هیچ چالشی را باطل نمی‌کند و هیچ حسابی قفل نمی‌شود؛ کاربر می‌تواند بعداً دوباره کد جدید دریافت کند (تنها محدودکننده، همان کول‌داون و سقف‌های سروری است).

## بررسی تحویل پیامک

`deliveryStatus: "accepted"` در پاسخ سرویس به معنای پذیرش درخواست توسط IPPanel است، نه تحویل به گوشی. روش قطعی بررسی تحویل هر پیام (گزارش `by_bulk` و `recipients`، معناهای `message_status`، ابزار خط فرمان، endpoint مدیریتی و جدول تفکیک خطاها) در [docs/otp-sms-delivery.md](docs/otp-sms-delivery.md) آمده است.

## قرارداد IPPanel

کد از [Edge Pattern API رسمی IPPanel](https://ippanelcom.github.io/Edge-Document/docs/send/pattern/) استفاده می‌کند: `sending_type: pattern`، شناسهٔ پترن در `code` و OTP همان چالش در `params.code`. پاسخ `accepted` تحویل قطعی نیست. راهنمای استقرار، Migration لازم و تعارض متن ۲۸ نویسه‌ای پترن با حد ۲۵ نویسه در [docs/otp-pattern-rollout.md](docs/otp-pattern-rollout.md) آمده است.

خطاها به کدهای مستقل تفکیک شده‌اند تا «پیکربندی ناقص»، «فرستندهٔ تأییدنشده»، «کلید نامعتبر»، «محدودیت نرخ Provider»، «رد گیرنده/متن» و «خطای شبکه» از هم قابل تشخیص باشند. شناسهٔ پیام Provider در `warroom_otp_codes.sms_message_id` ذخیره می‌شود و لاگ‌ها فقط شامل کد خطا، وضعیت HTTP، کد خطای Provider و شمارهٔ ماسک‌شده‌اند؛ کد OTP، کلید API، رمز، کد ملی، شمارهٔ کامل و بدنهٔ پاسخ Provider هرگز Log نمی‌شوند.

کلید فقط در متغیر خصوصی سمت Node به نام `IPPANEL_API_KEY` قرار می‌گیرد. فرستنده، پترن و URL از `IPPANEL_FROM_NUMBER`، `IPPANEL_PATTERN_CODE` و `IPPANEL_API_URL` سمت سرور خوانده می‌شوند. هیچ مقدار واقعی یا کلیدی در این مخزن قرار ندهید.

## Supabase و محدودیت‌های فعلی

`warroom_otp_codes` فقط برای نقش سرویس در دسترس است و migration جدید `warroom_issue_otp_challenge` را برای ابطال و ثبت اتمیک چالش جایگزین می‌کند؛ `warroom_verify_otp` را برای جلوگیری از تأیید پیش از ثبت شناسهٔ Provider محدود می‌کند. تا اجرای جداگانه و آزمون این migration در Staging، API جدید آمادهٔ استقرار نیست. تست‌های Mock جای آزمون Supabase واقعی را نمی‌گیرند. قرارداد رمز ورود، نهایی‌سازی ثبت‌نام، مصرف proof و نشست معتبر در [docs/otp-pattern-rollout.md](docs/otp-pattern-rollout.md) توضیح داده شده‌اند.

محدودیت ۲۵ نویسه با متن تأییدشدهٔ ۲۸ نویسه‌ای **باز** است و بدون تأیید محصول یا Provider نباید متن یا کد پترن تغییر کند. هیچ پیامک واقعی، تغییر Production یا migration زنده در این کار اجرا نشده است.
