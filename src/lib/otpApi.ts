/**
 * OTP API facade.
 *
 * Every call goes through secureApi so credentials handling, CSRF headers and error
 * normalisation stay in one place. The challenge token and the one-time OTP proof live only
 * in React state - they are never written to localStorage/sessionStorage.
 */

import {
  requestLoginOtpSecure,
  requestRegistrationOtpSecure,
  resendRegistrationOtpSecure,
  verifyOtpSecure,
} from './secureApi';

export type OtpPurpose = 'login' | 'registration';

export interface OTPSendResponse {
  success: boolean;
  message?: string;
  error?: string;
  expiresIn?: number;
  maskedPhone?: string;
  challengeToken?: string;
  purpose?: OtpPurpose;
}

export interface OTPVerifiedUser {
  otpProof: string;
  purpose?: OtpPurpose;
}

export interface OTPVerifyResponse {
  success: boolean;
  message?: string;
  error?: string;
  user?: OTPVerifiedUser;
}

/**
 * Requests an OTP challenge.
 *  - purpose 'login': the server verifies the password *before* any SMS is sent and never
 *    reveals whether the account exists;
 *  - purpose 'registration': only issued while an unexpired pending registration exists.
 */
export async function sendOtpByNationalCode(
  nationalCode: string,
  options: { purpose?: OtpPurpose; password?: string } = {},
): Promise<OTPSendResponse> {
  const purpose: OtpPurpose = options.purpose === 'login' ? 'login' : 'registration';
  const result = purpose === 'login'
    ? await requestLoginOtpSecure(nationalCode, String(options.password || ''))
    : await requestRegistrationOtpSecure(nationalCode);
  return {
    success: result.success === true,
    message: result.message,
    error: result.error,
    expiresIn: result.expiresIn,
    maskedPhone: result.maskedPhone,
    challengeToken: result.challengeToken,
    purpose: result.purpose === 'login' || result.purpose === 'registration' ? result.purpose : purpose,
  };
}

/** Verifies a six-digit code against the challenge identified by its server-issued token. */
export async function verifyOtp(
  nationalCode: string,
  code: string,
  challengeToken: string,
): Promise<OTPVerifyResponse> {
  const result = await verifyOtpSecure(nationalCode, code, challengeToken);
  if (!result.success || !result.otpProof) {
    return {
      success: false,
      message: result.message,
      error: result.error || 'کد تأیید نامعتبر است.',
    };
  }
  return {
    success: true,
    message: result.message,
    user: {
      otpProof: result.otpProof,
      purpose: result.purpose === 'login' || result.purpose === 'registration' ? result.purpose : undefined,
    },
  };
}

/**
 * Requests a fresh registration challenge. Login challenges are never silently re-issued:
 * the password gate must run again, so callers restart the login flow instead.
 */
export async function resendOtp(nationalCode: string, purpose: OtpPurpose = 'registration'): Promise<OTPSendResponse> {
  if (purpose === 'login') {
    return { success: false, error: 'برای دریافت کد جدید، ورود را از ابتدا تکمیل کنید.' };
  }
  const result = await resendRegistrationOtpSecure(nationalCode);
  return {
    success: result.success === true,
    message: result.message,
    error: result.error,
    expiresIn: result.expiresIn,
    maskedPhone: result.maskedPhone,
    challengeToken: result.challengeToken,
    purpose: 'registration',
  };
}
