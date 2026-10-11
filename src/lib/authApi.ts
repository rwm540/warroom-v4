/**
 * Authentication API.
 *
 * The flow is entirely server-driven:
 *   1. registration: start (pending record) -> registration OTP
 *      login:       national code + password -> login OTP
 *   2. verify the OTP code (server checks the challenge binding)
 *   3. exchange the one-time OTP proof for an HttpOnly session cookie
 *
 * The client never decides identity or role, and never stores credentials, OTP proofs or
 * session material in Web Storage.
 */

import {
  createSessionSecure,
  startSecureRegistration,
  type RegistrationStartResponse,
  type SessionUserResponse,
} from './secureApi';
import { sendOtpByNationalCode, type OTPSendResponse } from './otpApi';

export interface RegisterData {
  firstName: string;
  lastName: string;
  nationalCode: string;
  phone: string;
  birthDate: string;
  gender: 'دختر' | 'پسر';
  password: string;
  groupName?: string;
  personalCode?: string;
  educationLevel?: string;
  grade?: string;
  province?: string;
  city?: string;
  schoolName?: string;
}

export interface AuthResult {
  success: boolean;
  message?: string;
  error?: string;
  user?: SessionUserResponse['user'];
  mustChangePassword?: boolean;
  isNewRegistration?: boolean;
}

/**
 * Starts the registration flow. The response is intentionally uniform: it never reveals
 * whether the national code already belongs to an account.
 */
export async function startRegistration(data: RegisterData): Promise<RegistrationStartResponse> {
  return startSecureRegistration({
    firstName: data.firstName,
    lastName: data.lastName,
    nationalCode: data.nationalCode,
    phone: data.phone,
    birthDate: data.birthDate,
    gender: data.gender,
    password: data.password,
    groupName: data.groupName || '',
    province: data.province,
    city: data.city,
    schoolName: data.schoolName,
  });
}

/** Requests the registration OTP. Only issued when an unexpired pending registration exists. */
export async function requestRegistrationChallenge(nationalCode: string): Promise<OTPSendResponse> {
  return sendOtpByNationalCode(nationalCode, { purpose: 'registration' });
}

/** Requests a login OTP. The password is verified by the server before any SMS is sent. */
export async function requestLoginChallenge(nationalCode: string, password: string): Promise<OTPSendResponse> {
  return sendOtpByNationalCode(nationalCode, { purpose: 'login', password });
}

/**
 * Exchanges a verified, one-time OTP proof for a server session.
 * The returned user profile is the authoritative one produced by the server.
 */
export async function completeAuthentication(otpProof: string): Promise<AuthResult> {
  const result = await createSessionSecure(otpProof);
  if (!result.success || !result.user) {
    return { success: false, error: result.error || result.message || 'ایجاد نشست امن ممکن نشد.' };
  }
  return {
    success: true,
    message: result.message,
    user: result.user,
    mustChangePassword: result.mustChangePassword === true,
    isNewRegistration: result.isNewRegistration === true,
  };
}
