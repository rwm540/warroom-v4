# 🔗 راهنمای یکپارچه‌سازی AuthView با سرور OTP

## مشکلاتی که حل شد:

1. ✅ **صفحه ریلود نمی‌شود**
2. ✅ **بعد از ثبت‌نام مستقیم به مودال OTP می‌رود**
3. ✅ **تایمر 120 ثانیه**
4. ✅ **ثبت داده در Supabase**

---

## 📁 فایل‌های جدید ایجاد شده

### 1. فایل‌های API

- ✅ `src/lib/otpApi.ts` - API برای ارسال و تایید OTP
- ✅ `src/lib/authApi.ts` - API برای ثبت‌نام
- ✅ `src/components/OTPVerificationModal.tsx` - مودال OTP با تایمر 120 ثانیه

### 2. مسیرهای سرور

- ✅ `server_node/routes/authRoutes.js` - مسیر ثبت‌نام

---

## 🔧 تغییرات مورد نیاز در `AuthView.tsx`

### قدم 1: Import‌های جدید

```typescript
import OTPVerificationModal from './OTPVerificationModal';
import { registerUser } from '../lib/authApi';
import { sendOtpByNationalCode } from '../lib/otpApi';
```

### قدم 2: State‌های جدید

```typescript
// State‌های OTP
const [showOtpModal, setShowOtpModal] = useState(false);
const [pendingNationalCode, setPendingNationalCode] = useState('');
const [pendingUserPhone, setPendingUserPhone] = useState('');
```

### قدم 3: تابع ثبت‌نام جدید

```typescript
const handleRegisterSubmit = async (e: React.FormEvent) => {
  e.preventDefault(); // 👈 جلوگیری از ریلود صفحه
  setRegisterError(null);
  setIsSubmitting(true);

  const nationalCode = normalizeToEnglishDigits(registerForm.nationalCode.trim());
  const birthDate = normalizeToEnglishDigits(registerForm.birthDate.trim());
  const firstName = registerForm.firstName.trim();
  const lastName = registerForm.lastName.trim();
  const groupName = registerForm.groupName?.trim() || '';
  const phone = normalizeToEnglishDigits(registerForm.phone.trim()).replace(/\D/g, '');

  // اعتبارسنجی
  if (!firstName || !lastName) {
    setRegisterError('لطفاً نام و نام خانوادگی را وارد نمایید.');
    setIsSubmitting(false);
    return;
  }

  if (!validateNationalCode(nationalCode)) {
    setRegisterError('کد ملی ۱۰ رقمی وارد شده معتبر نمی‌باشد.');
    setIsSubmitting(false);
    return;
  }

  if (!validateJalaliDate(birthDate)) {
    setRegisterError('فرمت تاریخ تولد معتبر نیست (مثال: 1388/06/20).');
    setIsSubmitting(false);
    return;
  }

  const rawPassword = registerForm.password.trim();
  if (rawPassword.length < 8) {
    setRegisterError('رمز عبور باید حداقل ۸ کاراکتر باشد.');
    setIsSubmitting(false);
    return;
  }

  if (!/^09\d{9}$/.test(phone)) {
    setRegisterError('شماره همراه معتبر وارد کنید (مثال: 09123456789)');
    setIsSubmitting(false);
    return;
  }

  try {
    // ثبت‌نام در سرور (ذخیره در Supabase)
    const registerResult = await registerUser({
      firstName,
      lastName,
      nationalCode,
      phone: `+98${phone.slice(1)}`,
      birthDate,
      gender: selectedGender,
      password: rawPassword,
      groupName
    });

    if (!registerResult.success) {
      setRegisterError(registerResult.error || 'خطا در ثبت‌نام');
      setIsSubmitting(false);
      return;
    }

    // ارسال کد OTP
    const otpResult = await sendOtpByNationalCode(nationalCode);

    if (!otpResult.success) {
      setRegisterError('ثبت‌نام موفق بود اما خطا در ارسال کد تایید');
      setIsSubmitting(false);
      return;
    }

    // نمایش مودال OTP
    setPendingNationalCode(nationalCode);
    setPendingUserPhone(otpResult.phone || `+98****${phone.slice(-4)}`);
    setShowOtpModal(true);
    setIsSubmitting(false);

    triggerAlert(`ثبت‌نام موفق! کد تایید به شماره ${otpResult.phone} ارسال شد`);

  } catch (error) {
    console.error('خطا در ثبت‌نام:', error);
    setRegisterError('خطا در ارتباط با سرور');
    setIsSubmitting(false);
  }
};
```

### قدم 4: تابع موفقیت OTP

```typescript
const handleOTPSuccess = (token: string, user: any) => {
  // ذخیره توکن JWT
  localStorage.setItem('warroom_auth_token', token);
  
  // ساخت شیء User
  const fullUser: User = {
    id: user.id,
    first_name: user.firstName,
    last_name: user.lastName,
    national_code: user.id,
    phone: user.phone || pendingUserPhone,
    gender: selectedGender,
    role: 'user',
    // سایر فیلدها...
    password: '',
    personal_code: `90${Math.floor(Math.random() * 10000000)}`,
    birth_date: registerForm.birthDate,
    education_level: 'متوسطه اول',
    grade: 'هشتم',
    province: 'تهران',
    city: 'تهران',
    school_name: 'دبیرستان',
    level: 1,
    points: 0,
    completed_stages: [],
    avatar_url: selectedGender === 'دختر' 
      ? '/avatars/woman/woman_1.jpeg' 
      : '/avatars/male/male_1.jpeg'
  };

  // بستن مودال
  setShowOtpModal(false);
  
  // ورود کاربر
  onLoginSuccess(fullUser, { isNewRegistration: true });
  
  triggerAlert(`خوش آمدید ${user.firstName} ${user.lastName}!`);
};
```

### قدم 5: JSX مودال OTP

```tsx
return (
  <>
    {/* مودال تایید OTP */}
    <OTPVerificationModal
      isOpen={showOtpModal}
      onClose={() => {
        setShowOtpModal(false);
        setPendingNationalCode('');
        setPendingUserPhone('');
      }}
      onSuccess={handleOTPSuccess}
      userPhone={pendingUserPhone}
      nationalCode={pendingNationalCode}
      campaignTheme={isGirls ? 'girls' : 'boys'}
    />

    {/* فرم ثبت‌نام */}
    <form onSubmit={handleRegisterSubmit}>
      {/* فیلدهای فرم ... */}
      
      <button
        type="submit"
        disabled={isSubmitting}
        className="..."
      >
        {isSubmitting ? 'در حال ثبت‌نام...' : 'ثبت‌نام'}
      </button>
    </form>
  </>
);
```

---

## 🚀 راه‌اندازی

### 1. نصب وابستگی‌ها (اگر قبلاً نصب نکردید)

```bash
cd server_node
npm install
```

### 2. راه‌اندازی سرور Node.js

```bash
cd server_node
npm start
```

سرور روی `http://localhost:5000` اجرا می‌شود.

### 3. تنظیم متغیر محیطی در React

فایل `.env` در ریشه پروژه React:

```env
VITE_OTP_API_URL=http://localhost:5000/api/otp
```

### 4. اجرای React

```bash
npm run dev
```

---

## 🧪 تست جریان کامل

### مرحله 1: ثبت‌نام
1. فرم ثبت‌نام را پر کنید
2. دکمه ثبت‌نام را بزنید
3. **صفحه ریلود نمی‌شود**
4. لودینگ نمایش داده می‌شود
5. داده در Supabase ذخیره می‌شود

### مرحله 2: ارسال OTP
1. کد OTP به سرور Node.js ارسال می‌شود
2. سرور کد 6 رقمی تولید می‌کند
3. پیامک از طریق IPPanel ارسال می‌شود
4. کد در Supabase ذخیره می‌شود

### مرحله 3: نمایش مودال
1. **لودینگ بسته می‌شود**
2. **مودال OTP نمایش داده می‌شود**
3. تایمر 120 ثانیه شروع می‌شود
4. کاربر کد را وارد می‌کند

### مرحله 4: تایید کد
1. کد به سرور ارسال می‌شود
2. سرور کد را تایید می‌کند
3. JWT Token صادر می‌شود
4. کاربر وارد سیستم می‌شود

---

## 🔍 بررسی داده در Supabase

### بررسی کاربر ثبت‌شده

```sql
SELECT * FROM warroom_users WHERE id = '0123456789';
```

### بررسی کد OTP

```sql
SELECT * FROM warroom_otp_codes 
WHERE user_id = '0123456789' 
ORDER BY created_at DESC 
LIMIT 1;
```

### بررسی گروه (در صورت ثبت‌نام گروهی)

```sql
SELECT * FROM warroom_groups 
WHERE data->>'leader_id' = '0123456789';
```

---

## 🐛 عیب‌یابی

### مشکل 1: صفحه ریلود می‌شود

**علت:** نداشتن `e.preventDefault()` در `onSubmit`

**راه‌حل:**
```typescript
const handleRegisterSubmit = async (e: React.FormEvent) => {
  e.preventDefault(); // 👈 این خط ضروری است
  // ...
};
```

### مشکل 2: داده در Supabase ذخیره نمی‌شود

**علت:** سرور Node.js اجرا نشده یا خطا دارد

**راه‌حل:**
```bash
# بررسی سرور
curl http://localhost:5000/health

# اجرای مجدد
cd server_node
npm start
```

### مشکل 3: مودال OTP نمایش داده نمی‌شود

**علت:** خطا در ارسال OTP

**راه‌حل:** بررسی لاگ سرور و کنسول مرورگر

### مشکل 4: تایمر کار نمی‌کند

**علت:** کامپوننت قدیمی OTP

**راه‌حل:** از فایل `OTPVerificationModal.tsx` جدید استفاده کنید

---

## 📊 جریان کامل

```
[کاربر] پر کردن فرم
   ↓
[Submit] با e.preventDefault()
   ↓
[React] ارسال به /api/auth/register
   ↓
[Node.js] ذخیره در Supabase
   ↓
[Node.js] تولید کد OTP
   ↓
[IPPanel] ارسال پیامک
   ↓
[React] بستن لودینگ
   ↓
[React] نمایش مودال OTP (تایمر 120s)
   ↓
[کاربر] ورود کد
   ↓
[Node.js] تایید کد
   ↓
[Node.js] صدور JWT
   ↓
[React] ورود کاربر ✅
```

---

## ✅ چک‌لیست نهایی

- [ ] سرور Node.js راه‌اندازی شده (`npm start` در `server_node/`)
- [ ] فایل `.env` در React تنظیم شده
- [ ] `e.preventDefault()` در `handleRegisterSubmit` اضافه شده
- [ ] Import‌های جدید اضافه شده
- [ ] State‌های OTP اضافه شده
- [ ] تابع `handleOTPSuccess` پیاده‌سازی شده
- [ ] مودال OTP در JSX اضافه شده
- [ ] SQL در Supabase اجرا شده

---

**✨ با انجام این تغییرات، تمام مشکلات حل می‌شود! ✨**
