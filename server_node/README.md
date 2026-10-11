# 🛡️ سرور OTP اتاق جنگ

سرور امن Node.js + Express برای ارسال و اعتبارسنجی کد تایید (OTP) با IPPanel و Supabase

---

## ✨ ویژگی‌ها

- ✅ **ارسال پیامک OTP** از طریق IPPanel
- ✅ **اعتبارسنجی کد ملی** و دریافت شماره موبایل از Supabase
- ✅ **ذخیره امن کد OTP** به‌صورت HMAC-SHA256
- ✅ **JWT Authentication** برای مدیریت نشست کاربران
- ✅ **Rate Limiting** برای جلوگیری از حملات Brute Force
- ✅ **امنیت بالا** با Helmet و CORS
- ✅ **لاگ و پایش** تلاش‌های ناموفق

---

## 📋 پیش‌نیازها

- Node.js v16 یا بالاتر
- حساب فعال IPPanel با خط اختصاصی
- دیتابیس Supabase راه‌اندازی شده
- اجرای فایل `query.sql` در Supabase SQL Editor

---

## 🚀 نصب و راه‌اندازی

### 1. نصب پکیج‌ها

```bash
cd server_node
npm install
```

### 2. تنظیم متغیرهای محیطی

فایل `.env` را بسازید (از `.env.example` کپی کنید):

```bash
PORT=5000

IPPANEL_API_KEY=YTJmMzJjMGEtMDcyZi00YmZkLWE4NTUtNDc3ZDM1NGUwNzY0MjhkZGIwZWY0ZmI4MGQ5Njc4NTkxNGJhMDFkY2VhODc=
IPPANEL_FROM_NUMBER=+9890004939

SUPABASE_URL=https://dewfcjxlfolwvxqofocc.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

JWT_SECRET=warroom_super_secure_jwt_secret_key_2026

NODE_ENV=production
```

### 3. اجرای سرور

**حالت عادی:**
```bash
npm start
```

**حالت توسعه (با Hot Reload):**
```bash
npm run dev
```

سرور روی پورت 5000 راه‌اندازی می‌شود:
```
http://localhost:5000
```

---

## 📡 API Endpoints

### 1. **Health Check**
```http
GET /health
```

**Response:**
```json
{
  "status": "OK",
  "uptime": 123.45,
  "timestamp": "2026-10-11T05:30:00.000Z",
  "service": "WarRoom OTP Server",
  "version": "1.0.0"
}
```

---

### 2. **ارسال کد OTP**
```http
POST /api/otp/send
Content-Type: application/json

{
  "nationalCode": "0123456789"
}
```

**Response موفق:**
```json
{
  "success": true,
  "message": "کد تایید به شماره موبایل شما ارسال شد",
  "phone": "+98****1583",
  "expiresIn": 300
}
```

**توضیحات:**
- سرور کاربر را با کد ملی در Supabase جستجو می‌کند
- شماره موبایل را از پروفایل کاربر می‌گیرد
- کد 6 رقمی تولید و به‌صورت HMAC-SHA256 هش می‌شود
- پیامک از طریق IPPanel ارسال می‌شود
- کد به مدت 5 دقیقه معتبر است

---

### 3. **تایید کد OTP**
```http
POST /api/otp/verify
Content-Type: application/json

{
  "nationalCode": "0123456789",
  "code": "123456"
}
```

**Response موفق:**
```json
{
  "success": true,
  "message": "کد تایید با موفقیت تایید شد",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "0123456789",
    "firstName": "علی",
    "lastName": "احمدی"
  }
}
```

**توضیحات:**
- کد وارد شده را با هش ذخیره‌شده مقایسه می‌کند
- در صورت صحت، JWT با اعتبار 7 روزه صادر می‌شود
- کد پس از استفاده یکبار، غیرفعال می‌شود

---

### 4. **ارسال مجدد کد**
```http
POST /api/otp/resend
Content-Type: application/json

{
  "nationalCode": "0123456789"
}
```

---

## 🔒 امنیت

### محدودسازی درخواست‌ها (Rate Limiting)

- **ارسال OTP**: حداکثر 3 بار در 15 دقیقه
- **تایید OTP**: حداکثر 10 بار در 15 دقیقه
- **API عمومی**: حداکثر 100 درخواست در 15 دقیقه

### امنیت داده‌ها

- کد OTP **هرگز** به‌صورت متن ساده ذخیره نمی‌شود
- فقط HMAC-SHA256 هش در دیتابیس ذخیره می‌شود
- JWT با کلید مخفی امضا می‌شود
- CORS فقط برای دامنه‌های مجاز فعال است
- Helmet برای محافظت از هدرهای HTTP
- Input Validation کامل

### CORS مجاز

```javascript
[
  'http://localhost:3000',
  'http://localhost:5173',
  'https://warroom-game.ir',
  'https://dewfcjxlfolwvxqofocc.supabase.co'
]
```

---

## 🧪 تست API با cURL

### تست ارسال OTP:
```bash
curl -X POST http://localhost:5000/api/otp/send \
  -H "Content-Type: application/json" \
  -d "{\"nationalCode\":\"0123456789\"}"
```

### تست تایید OTP:
```bash
curl -X POST http://localhost:5000/api/otp/verify \
  -H "Content-Type: application/json" \
  -d "{\"nationalCode\":\"0123456789\",\"code\":\"123456\"}"
```

---

## 📊 لاگ‌ها

سرور اطلاعات زیر را لاگ می‌کند:

```
✅ موفقیت‌ها:
   - ارسال موفق پیامک (با شناسه پیام)
   - تایید موفق کد OTP

❌ خطاها:
   - خطای ارسال پیامک IPPanel
   - کد OTP نادرست
   - کاربر یافت نشد
   - تعداد تلاش‌ها بیش از حد

🔐 امنیتی:
   - تلاش‌های ناموفق در جدول warroom_otp_failed_attempts
```

---

## 🗄️ ساختار دیتابیس

### جدول `warroom_otp_codes`

| ستون | نوع | توضیحات |
|------|-----|---------|
| `id` | uuid | شناسه یکتا |
| `user_id` | text | کد ملی کاربر |
| `phone` | text | شماره موبایل |
| `code` | text | HMAC-SHA256 هش کد |
| `expires_at` | timestamptz | زمان انقضا |
| `is_used` | boolean | آیا استفاده شده؟ |
| `used_at` | timestamptz | زمان استفاده |
| `attempts` | integer | تعداد تلاش‌ها |
| `created_at` | timestamptz | زمان ایجاد |

---

## 🔧 عیب‌یابی

### سرور راه‌اندازی نمی‌شود

```bash
# بررسی متغیرهای محیطی
node -e "require('dotenv').config(); console.log(process.env.IPPANEL_API_KEY)"

# بررسی پورت
netstat -ano | findstr :5000
```

### پیامک ارسال نمی‌شود

1. بررسی کلید API در پنل IPPanel
2. بررسی اعتبار حساب IPPanel
3. بررسی فرمت خط ارسال: `+9890004939`
4. مشاهده لاگ‌های سرور

### کاربر یافت نمی‌شود

1. بررسی وجود کاربر در Supabase:
```sql
SELECT * FROM warroom_users WHERE id = '0123456789';
```

2. بررسی فیلد `phone` در `data`:
```sql
SELECT data->>'phone' FROM warroom_users WHERE id = '0123456789';
```

---

## 📦 وابستگی‌ها

```json
{
  "express": "^4.18.2",
  "cors": "^2.8.5",
  "helmet": "^7.1.0",
  "dotenv": "^16.4.5",
  "jsonwebtoken": "^9.0.2",
  "ippanel-node-sdk": "^1.0.0",
  "express-rate-limit": "^7.1.5",
  "@supabase/supabase-js": "^2.39.3"
}
```

---

## 🌐 استفاده در فرانت‌اند React

```javascript
// ارسال کد
const sendOTP = async (nationalCode) => {
  const response = await fetch('http://localhost:5000/api/otp/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nationalCode })
  });
  return await response.json();
};

// تایید کد
const verifyOTP = async (nationalCode, code) => {
  const response = await fetch('http://localhost:5000/api/otp/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nationalCode, code })
  });
  const data = await response.json();
  if (data.success) {
    localStorage.setItem('token', data.token);
  }
  return data;
};
```

---

## 📝 یادداشت‌های مهم

1. **کلید API را هرگز در کد فرانت‌اند قرار ندهید**
2. فایل `.env` را در Git قرار ندهید
3. در محیط توسعه، کد OTP در کنسول نمایش داده می‌شود
4. در محیط Production، `NODE_ENV=production` تنظیم کنید
5. برای Deploy، از PM2 یا Docker استفاده کنید

---

## 🚀 Deploy با PM2

```bash
npm install -g pm2
pm2 start server.js --name warroom-otp
pm2 save
pm2 startup
```

---

## 📄 لایسنس

MIT License - پروژه اتاق جنگ

---

## 🤝 پشتیبانی

برای سوالات و مشکلات، به تیم توسعه پروژه مراجعه کنید.
