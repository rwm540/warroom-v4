/**
 * API برای ارسال و تایید کد OTP از طریق سرور Node.js
 */

const OTP_API_BASE = '/api/otp';

async function postJson<T extends { success?: boolean; message?: string; error?: string }>(path: string, body: unknown): Promise<T> {
  try {
    const response = await fetch(`${OTP_API_BASE}/${path}`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) {
      return { ...data, success: false, error: data.message || data.error || `درخواست ناموفق بود (${response.status}).` } as T;
    }
    return data as T;
  } catch (error) {
    return {
      success: false,
      message: 'ارتباط با سرور برقرار نشد.',
      error: error instanceof Error ? error.message : 'خطای ارتباط با سرور',
    } as T;
  }
}

export interface OTPSendResponse {
  success: boolean;
  message: string;
  phone?: string;
  expiresIn?: number;
  maskedPhone?: string;
  challengeToken?: string;
  error?: string;
}

export interface OTPVerifyResponse {
  success: boolean;
  message: string;
  token?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenType?: string;
  expiresIn?: number;
  user?: {
    id: string;
    first_name?: string;
    last_name?: string;
    firstName?: string;
    lastName?: string;
    national_code?: string;
    role?: string;
  };
  error?: string;
}

/**
 * ارسال کد OTP بر اساس کد ملی
 * سرور از Supabase شماره موبایل را می‌گیرد و پیامک ارسال می‌کند
 */
export async function sendOtpByNationalCode(nationalCode: string): Promise<OTPSendResponse> {
  return postJson<OTPSendResponse>('send', { nationalCode });
}

/**
 * تایید کد OTP وارد شده توسط کاربر
 */
export async function verifyOtp(nationalCode: string, code: string, challengeToken?: string): Promise<OTPVerifyResponse> {
  return postJson<OTPVerifyResponse>('verify', { nationalCode, code, challengeToken: challengeToken || '' });
}

/**
 * ارسال مجدد کد OTP
 */
export async function resendOtp(nationalCode: string): Promise<OTPSendResponse> {
  return postJson<OTPSendResponse>('resend', { nationalCode });
}
