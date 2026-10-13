# راهنمای سریع سرویس OTP

> قرارداد و مسیرهای جاری در [docs/deployment-auth.md](../docs/deployment-auth.md) و [README.md](README.md) آمده‌اند. نمونه‌های قدیمی این راهنما عمداً حذف شده‌اند تا فرمان‌های نصب یا SQL قدیمی با مسیر اجرایی فعلی اشتباه نشوند.

- API فعال: `server_node/src/index.js`
- Routeهای OTP: `server_node/src/routes/otp.js`
- درخواست‌های مرورگر: `/api/otp/send`, `/api/otp/verify`, `/api/otp/resend`
- Health: `GET /api/health`؛ فقط وضعیت فرایند و پیکربندی را گزارش می‌کند، نه اتصال واقعی به Provider یا Supabase.
- ثبت‌نام و ورود همچنان از Supabase RPC فرانت‌اند انجام می‌شود.
- OTP شش‌رقمی است و TTL پیش‌فرض آن ۱۲۰ ثانیه است.
- IPPanel Edge Webservice contract در [مستندات رسمی](https://ippanelcom.github.io/Edge-Document/docs/send/webservice/) آمده است.

## مانع جاری

`server_node/package-lock.json` در مخزن موجود نیست؛ تا زمانی که Lock معتبر از روی Manifest تولید و ثبت نشود، CI و ساخت API با `npm ci` قابل تأیید نیست. در این تغییر Lock ساختگی ساخته نشده است. Migrationها نیز باید با دیتابیس مقصد جداگانه تطبیق داده شوند؛ هیچ Migration اجرا نشده است.
