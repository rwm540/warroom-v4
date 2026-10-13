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
  resendOtpSecure,
  verifyOtpSecure,
} from './secureApi';

export type OtpPurpose = 'login' | 'registration';

export interface OTPSendResponse {
  success: boolean;
  message?: string;
  error?: string;
  expiresIn?: number;
  /** Absolute server deadline (ISO) - the single source of truth for the countdown. */
  expiresAt?: string;
  /** Server instant the answer was produced (ISO); used to align the countdown. */
  serverTime?: string;
  /** Seconds to wait before another code may be requested (server cooldown). */
  resendAvailableIn?: number;
  /** Absolute resend deadline (ISO). */
  resendAvailableAt?: string;
  /** 'accepted' means the provider queued the SMS; it is not proof of handset delivery. */
  deliveryStatus?: 'accepted';
  retryAfterSeconds?: number;
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

function normalizePurpose(value: unknown, fallback: OtpPurpose): OtpPurpose {
  return value === 'login' || value === 'registration' ? value : fallback;
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
    expiresAt: result.expiresAt,
    serverTime: result.serverTime,
    resendAvailableIn: result.resendAvailableIn,
    resendAvailableAt: result.resendAvailableAt,
    deliveryStatus: result.deliveryStatus,
    retryAfterSeconds: result.retryAfterSeconds,
    maskedPhone: result.maskedPhone,
    challengeToken: result.challengeToken,
    purpose: normalizePurpose(result.purpose, purpose),
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

export interface ResendOtpOptions {
  purpose?: OtpPurpose;
  /**
   * Required for a login resend: the server re-verifies the password before issuing a new code
   * (the same gate as the first request), so the password must be sent again.
   */
  password?: string;
}

/**
 * Requests a fresh code for either purpose.
 *
 * Both purposes are supported now:
 *  - 'registration': only needs the national code, and only works while an unexpired pending
 *    registration exists;
 *  - 'login': needs the password again, because the server re-runs the password gate before
 *    any SMS is sent (the OTP is a second factor, never a password replacement).
 *
 * Server-side cooldown, per-national-code and per-IP limits are untouched and still apply.
 */
export async function resendOtp(
  nationalCode: string,
  purposeOrOptions: OtpPurpose | ResendOtpOptions = 'registration',
  legacyPassword?: string,
): Promise<OTPSendResponse> {
  const options: ResendOtpOptions = typeof purposeOrOptions === 'string'
    ? { purpose: purposeOrOptions, password: legacyPassword }
    : purposeOrOptions || {};
  const purpose: OtpPurpose = options.purpose === 'login' ? 'login' : 'registration';
  const password = String(options.password || '');

  if (purpose === 'login' && !password) {
    // Fail before the request: without the password the server would reject it anyway.
    return {
      success: false,
      error: 'برای دریافت کد جدید، رمز عبور را دوباره وارد کنید و ورود را تکمیل کنید.',
    };
  }

  const result = await resendOtpSecure(nationalCode, { purpose, password: purpose === 'login' ? password : undefined });
  return {
    success: result.success === true,
    message: result.message,
    error: result.error,
    expiresIn: result.expiresIn,
    expiresAt: result.expiresAt,
    serverTime: result.serverTime,
    resendAvailableIn: result.resendAvailableIn,
    resendAvailableAt: result.resendAvailableAt,
    deliveryStatus: result.deliveryStatus,
    retryAfterSeconds: result.retryAfterSeconds,
    maskedPhone: result.maskedPhone,
    challengeToken: result.challengeToken,
    purpose: normalizePurpose(result.purpose, purpose),
  };
}
