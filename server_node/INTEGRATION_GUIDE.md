# 🔗 راهنمای یکپارچه‌سازی فرانت‌اند React با سرور OTP

این راهنما نحوه اتصال کامپوننت `AuthView.tsx` به سرور Node.js OTP را توضیح می‌دهد.

---

## 1️⃣ تغییرات در `AuthView.tsx`

### قدم 1: اضافه کردن تابع ارسال OTP

در `AuthView.tsx`، تابع `handleRegisterSubmit` یا `handleLoginSubmit` را به‌روزرسانی کنید:

```typescript
const handleLoginSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoginError(null);

  const natId = normalizeToEnglishDigits(loginNationalId.trim());
  if (!validateNationalCode(natId)) {
    setLoginError('کد ملی معتبر نیست');
    return;
  }

  // مرحله 1: ارسال OTP از طریق سرور Node.js
  try {
    setIsSubmitting(true);
    
    const otpResponse = await fetch('http://localhost:5000/api/otp/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        nationalCode: natId
      })
    });

    const otpData = await otpResponse.json();
    
    if (!otpResponse.ok || !otpData.success) {
      setLoginError(otpData.error || 'خطا در ارسال کد تایید');
      setIsSubmitting(false);
      return;
    }

    // نمایش مودال OTP
    setPendingNationalCode(natId);
    setShowOtpModal(true);
    setIsSubmitting(false);
    
    triggerAlert('کد تایید به شماره موبایل شما ارسال شد');
    
  } catch (error) {
    console.error('خطا در ارسال OTP:', error);
    setLoginError('خطا در ارتباط با سرور');
    setIsSubmitting(false);
  }
};
```

### قدم 2: تابع تایید OTP

```typescript
const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setOtpError(null);

  const code = otpInput.trim();
  if (!/^\d{6}$/.test(code)) {
    setOtpError('کد تایید باید 6 رقم باشد');
    return;
  }

  try {
    setIsSubmitting(true);

    const verifyResponse = await fetch('http://localhost:5000/api/otp/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        nationalCode: pendingNationalCode,
        code: code
      })
    });

    const verifyData = await verifyResponse.json();

    if (!verifyResponse.ok || !verifyData.success) {
      setOtpError(verifyData.error || 'کد تایید نادرست است');
      setIsSubmitting(false);
      return;
    }

    // ذخیره توکن JWT
    localStorage.setItem('warroom_auth_token', verifyData.token);
    
    // ذخیره اطلاعات کاربر
    const user: User = {
      id: verifyData.user.id,
      first_name: verifyData.user.firstName,
      last_name: verifyData.user.lastName,
      // سایر فیلدها...
    };

    setCurrentUser(user);
    setShowOtpModal(false);
    setIsSubmitting(false);
    
    triggerAlert(`خوش آمدید ${user.first_name} ${user.last_name}`);
    onLoginSuccess(user);

  } catch (error) {
    console.error('خطا در تایید OTP:', error);
    setOtpError('خطا در ارتباط با سرور');
    setIsSubmitting(false);
  }
};
```

### قدم 3: State‌های جدید

```typescript
const [pendingNationalCode, setPendingNationalCode] = useState<string>('');
const [showOtpModal, setShowOtpModal] = useState(false);
const [otpInput, setOtpInput] = useState('');
const [otpError, setOtpError] = useState<string | null>(null);
const [isSubmitting, setIsSubmitting] = useState(false);
```

---

## 2️⃣ استفاده از کامپوننت `OTPVerificationModal`

### Import کامپوننت

```typescript
import OTPVerificationModal from './OTPVerificationModal';
```

### استفاده در JSX

```tsx
return (
  <>
    {/* مودال تایید OTP */}
    <OTPVerificationModal
      isOpen={showOtpModal}
      onClose={() => {
        setShowOtpModal(false);
        setOtpInput('');
        setOtpError(null);
      }}
      onSuccess={handleVerifyOtpSubmit}
      userPhone={detectedUser?.phone || '09123456789'}
      userId={pendingNationalCode}
      campaignTheme={isGirls ? 'girls' : 'boys'}
    />

    {/* فرم ورود */}
    <div className="auth-container">
      {/* ... */}
    </div>
  </>
);
```

---

## 3️⃣ ایجاد سرویس API (پیشنهادی)

برای سازماندهی بهتر، یک فایل سرویس بسازید:

### فایل `src/services/otpService.ts`

```typescript
const OTP_API_BASE = 'http://localhost:5000/api/otp';

export interface OTPSendResponse {
  success: boolean;
  message: string;
  phone?: string;
  expiresIn?: number;
  error?: string;
}

export interface OTPVerifyResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  error?: string;
}

/**
 * ارسال کد OTP به شماره موبایل
 */
export async function sendOTP(nationalCode: string): Promise<OTPSendResponse> {
  try {
    const response = await fetch(`${OTP_API_BASE}/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ nationalCode })
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error sending OTP:', error);
    return {
      success: false,
      message: 'خطا در ارتباط با سرور',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * تایید کد OTP
 */
export async function verifyOTP(
  nationalCode: string,
  code: string
): Promise<OTPVerifyResponse> {
  try {
    const response = await fetch(`${OTP_API_BASE}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ nationalCode, code })
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return {
      success: false,
      message: 'خطا در ارتباط با سرور',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * ارسال مجدد کد OTP
 */
export async function resendOTP(nationalCode: string): Promise<OTPSendResponse> {
  try {
    const response = await fetch(`${OTP_API_BASE}/resend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ nationalCode })
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error resending OTP:', error);
    return {
      success: false,
      message: 'خطا در ارتباط با سرور',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
```

### استفاده از سرویس در AuthView

```typescript
import { sendOTP, verifyOTP } from '../services/otpService';

const handleLoginSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoginError(null);

  const natId = normalizeToEnglishDigits(loginNationalId.trim());
  if (!validateNationalCode(natId)) {
    setLoginError('کد ملی معتبر نیست');
    return;
  }

  setIsSubmitting(true);
  
  // ارسال OTP
  const result = await sendOTP(natId);
  
  if (!result.success) {
    setLoginError(result.error || result.message);
    setIsSubmitting(false);
    return;
  }

  setPendingNationalCode(natId);
  setShowOtpModal(true);
  setIsSubmitting(false);
  triggerAlert('کد تایید به شماره موبایل شما ارسال شد');
};

const handleVerifyOTP = async () => {
  const code = otpInput.trim();
  if (!/^\d{6}$/.test(code)) {
    setOtpError('کد تایید باید 6 رقم باشد');
    return;
  }

  setIsSubmitting(true);

  const result = await verifyOTP(pendingNationalCode, code);

  if (!result.success) {
    setOtpError(result.error || result.message);
    setIsSubmitting(false);
    return;
  }

  // ذخیره توکن و ورود کاربر
  if (result.token) {
    localStorage.setItem('warroom_auth_token', result.token);
  }

  setShowOtpModal(false);
  setIsSubmitting(false);
  triggerAlert(`خوش آمدید ${result.user?.firstName}`);
  // onLoginSuccess...
};
```

---

## 4️⃣ تنظیمات متغیر محیطی

### فایل `.env` در ریشه پروژه React

```env
VITE_OTP_API_URL=http://localhost:5000/api/otp
```

### استفاده در کد

```typescript
const OTP_API_BASE = import.meta.env.VITE_OTP_API_URL || 'http://localhost:5000/api/otp';
```

---

## 5️⃣ مدیریت JWT Token

### ذخیره توکن پس از ورود موفق

```typescript
const handleSuccessfulLogin = (token: string, user: User) => {
  // ذخیره در localStorage
  localStorage.setItem('warroom_auth_token', token);
  
  // ذخیره اطلاعات کاربر
  localStorage.setItem('warroom_current_user_data', JSON.stringify(user));
  
  // تنظیم در state
  setCurrentUser(user);
  onLoginSuccess(user);
};
```

### استفاده از توکن در درخواست‌های بعدی

```typescript
const makeAuthenticatedRequest = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('warroom_auth_token');
  
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
};
```

### بررسی اعتبار توکن

```typescript
import jwt_decode from 'jwt-decode';

const isTokenValid = (token: string): boolean => {
  try {
    const decoded: any = jwt_decode(token);
    const currentTime = Date.now() / 1000;
    return decoded.exp > currentTime;
  } catch {
    return false;
  }
};

// استفاده
const token = localStorage.getItem('warroom_auth_token');
if (token && isTokenValid(token)) {
  // توکن معتبر است
} else {
  // توکن منقضی شده، کاربر را به صفحه ورود هدایت کنید
  localStorage.removeItem('warroom_auth_token');
}
```

---

## 6️⃣ مدیریت خطاها

### نمایش خطاهای شبکه

```typescript
const handleNetworkError = (error: any) => {
  if (error.message === 'Failed to fetch') {
    triggerAlert('خطا در ارتباط با سرور. لطفاً اتصال اینترنت خود را بررسی کنید.');
  } else if (error.message.includes('timeout')) {
    triggerAlert('زمان درخواست به پایان رسید. لطفاً دوباره تلاش کنید.');
  } else {
    triggerAlert('خطای نامشخص رخ داده است.');
  }
};
```

### Retry Logic

```typescript
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 3
): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  throw new Error('Max retries reached');
}
```

---

## 7️⃣ تست یکپارچه‌سازی

### تست با شماره واقعی

```typescript
// تست کامل جریان OTP
const testOTPFlow = async () => {
  console.log('🧪 شروع تست OTP...');
  
  // 1. ارسال OTP
  const sendResult = await sendOTP('0123456789');
  console.log('📤 نتیجه ارسال:', sendResult);
  
  // 2. دریافت کد از پیامک (دستی)
  const code = prompt('کد دریافتی را وارد کنید:');
  
  // 3. تایید کد
  const verifyResult = await verifyOTP('0123456789', code || '');
  console.log('✅ نتیجه تایید:', verifyResult);
  
  if (verifyResult.success) {
    console.log('🎉 تست موفق!');
    console.log('Token:', verifyResult.token);
  } else {
    console.error('❌ تست ناموفق:', verifyResult.error);
  }
};
```

---

## 8️⃣ نکات مهم امنیتی

✅ **هرگز کد OTP را در localStorage ذخیره نکنید**
✅ **فقط JWT Token را ذخیره کنید**
✅ **از HTTPS در Production استفاده کنید**
✅ **توکن را در header Authorization ارسال کنید**
✅ **کد OTP را در console.log ننویسید (مگر در development)**

---

## 9️⃣ Deployment

### تنظیمات Production

```typescript
const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://api.warroom-game.ir'
  : 'http://localhost:5000';
```

### CORS در Production

در سرور Node.js، دامنه Production را اضافه کنید:

```javascript
const allowedOrigins = [
  'http://localhost:3000',
  'https://warroom-game.ir',  // دامنه اصلی
  'https://www.warroom-game.ir'
];
```

---

این یکپارچه‌سازی کامل بین فرانت‌اند React و سرور Node.js OTP را فراهم می‌کند! 🚀
