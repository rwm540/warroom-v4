# ⚡ راه‌اندازی سریع سرور OTP

## نصب و راه‌اندازی در 5 دقیقه

### 📦 مرحله 1: نصب

```bash
cd server_node
npm install
```

### ⚙️ مرحله 2: تنظیم محیط

فایل `.env` از قبل آماده است. در صورت نیاز، ویرایش کنید:

```bash
# نمایش تنظیمات فعلی
cat .env
```

### 🗄️ مرحله 3: اجرای SQL در Supabase

1. به این آدرس بروید:
   ```
   https://dewfcjxlfolwvxqofocc.supabase.co
   ```

2. SQL Editor را باز کنید

3. محتوای فایل `query.sql` را کپی و Run کنید

### 🚀 مرحله 4: راه‌اندازی سرور

```bash
npm start
```

سرور روی پورت 5000 راه‌اندازی می‌شود:
```
http://localhost:5000
```

---

## ✅ بررسی سلامت سرور

```bash
curl http://localhost:5000/health
```

باید پاسخ زیر را ببینید:
```json
{
  "status": "OK",
  "uptime": 12.34,
  "service": "WarRoom OTP Server"
}
```

---

## 🧪 تست ارسال پیامک

### با شماره تست (09919901583):

```bash
curl -X POST http://localhost:5000/api/otp/send \
  -H "Content-Type: application/json" \
  -d "{\"nationalCode\":\"0123456789\"}"
```

**توجه:** کاربری با این کد ملی باید در Supabase وجود داشته باشد!

---

## 🔍 بررسی لاگ‌ها

سرور به‌صورت زنده لاگ می‌دهد:

```
✅ پیامک با موفقیت ارسال شد. شناسه: 1234567
❌ خطا در ارسال پیامک: کاربر یافت نشد
```

---

## 🛑 متوقف کردن سرور

در ترمینال سرور، `Ctrl + C` را فشار دهید.

---

## 🐛 عیب‌یابی سریع

### سرور اجرا نمی‌شود؟

```bash
# بررسی پورت 5000
netstat -ano | findstr :5000

# Kill کردن پروسه قبلی
taskkill /PID [PID_NUMBER] /F
```

### پیامک ارسال نمی‌شود؟

1. بررسی کلید API در `.env`
2. بررسی اعتبار حساب IPPanel
3. بررسی وجود کاربر در Supabase:

```sql
SELECT * FROM warroom_users WHERE id = '0123456789';
```

### خطای Supabase؟

```bash
# بررسی اتصال
curl https://dewfcjxlfolwvxqofocc.supabase.co/rest/v1/
```

---

## 📚 مستندات کامل

- `README.md`: راهنمای کامل API
- `INTEGRATION_GUIDE.md`: یکپارچه‌سازی با React

---

## 🎯 مرحله بعدی

پس از راه‌اندازی موفق سرور، فرانت‌اند React را راه‌اندازی کنید:

```bash
cd ..
npm run dev
```

---

**✅ سرور شما آماده است!**
