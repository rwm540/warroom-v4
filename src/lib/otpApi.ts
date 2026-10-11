/**
 * API برای ارسال و تایید کد OTP از طریق سرور Node.js
 */

const OTP_API_BASE = import.meta.env.VITE_OTP_API_URL || 'http://localhost:5000/api/otp';

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
 * ارسال کد OTP بر اساس کد ملی
 * سرور از Supabase شماره موبایل را می‌گیرد و پیامک ارسال می‌کند
 */
export async function sendOtpByNationalCode(nationalCode: string): Promise<OTPSendResponse> {
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
    console.error('خطا در ارسال OTP:', error);
    return {
      success: false,
      message: 'خطا در ارتباط با سرور',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * تایید کد OTP وارد شده توسط کاربر
 */
export async function verifyOtp(nationalCode: string, code: string): Promise<OTPVerifyResponse> {
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
    console.error('خطا در تایید OTP:', error);
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
export async function resendOtp(nationalCode: string): Promise<OTPSendResponse> {
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
    console.error('خطا در ارسال مجدد OTP:', error);
    return {
      success: false,
      message: 'خطا در ارتباط با سرور',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
