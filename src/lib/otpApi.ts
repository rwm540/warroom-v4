/** API calls for the same-origin Node OTP service. */

const OTP_API_BASE = '/api/otp';

interface ApiEnvelope {
  success?: boolean;
  message?: string;
  error?: string;
}

async function postJson<T extends ApiEnvelope>(path: string, body: unknown): Promise<T> {
  try {
    const response = await fetch(`${OTP_API_BASE}/${path}`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const payload: unknown = await response.json().catch(() => null);
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return {
        success: false,
        error: 'پاسخ معتبر از سرور دریافت نشد.',
      } as T;
    }

    const data = payload as T;
    if (!response.ok) {
      return {
        ...data,
        success: false,
        error: data.message || data.error || `درخواست ناموفق بود (${response.status}).`,
      } as T;
    }
    return data;
  } catch {
    return {
      success: false,
      error: 'ارتباط با سرور برقرار نشد.',
    } as T;
  }
}

export interface OTPSendResponse extends ApiEnvelope {
  success: boolean;
  message?: string;
  error?: string;
  expiresIn?: number;
  maskedPhone?: string;
  challengeToken?: string;
}

export interface OTPVerifiedUser {
  id: string;
  otpProof: string;
}

export interface OTPVerifyResponse extends ApiEnvelope {
  success: boolean;
  message?: string;
  error?: string;
  user?: OTPVerifiedUser;
}

/** The server resolves the registered phone number and never returns it in full. */
export async function sendOtpByNationalCode(nationalCode: string): Promise<OTPSendResponse> {
  return postJson<OTPSendResponse>('send', { nationalCode });
}

/** Verifies a six-digit code against the request identified by its challenge token. */
export async function verifyOtp(
  nationalCode: string,
  code: string,
  challengeToken: string,
): Promise<OTPVerifyResponse> {
  return postJson<OTPVerifyResponse>('verify', { nationalCode, code, challengeToken });
}

/** Requests a new OTP challenge for the same national code. */
export async function resendOtp(nationalCode: string): Promise<OTPSendResponse> {
  return postJson<OTPSendResponse>('resend', { nationalCode });
}
