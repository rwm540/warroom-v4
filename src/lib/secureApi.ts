/**
 * Secure API client for the WarRoom Node backend.
 *
 * Rules enforced here:
 *  - The session lives exclusively in an HttpOnly cookie; this module never sees, stores or
 *    forwards the session token.
 *  - Nothing (session token, refresh token, OTP proof, challenge token) is written to
 *    localStorage/sessionStorage.
 *  - State-changing calls send the CSRF token (readable cookie -> request header).
 *  - Client-side role/user state is presentation only; every authorization decision is made
 *    by the server from the session cookie.
 */

export interface ApiEnvelope {
  success?: boolean;
  message?: string;
  error?: string;
}

export interface ApiSessionUser {
  id: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  [key: string]: unknown;
}

const CSRF_COOKIE_NAME = 'warroom_csrf';
const CSRF_HEADER = 'X-CSRF-Token';

let csrfToken: string | null = null;

export function setCsrfToken(token: string | null): void {
  csrfToken = token && token.length > 0 ? token : null;
}

export function getCsrfToken(): string | null {
  return csrfToken;
}

function readCsrfCookie(): string | null {
  if (typeof document === 'undefined' || !document.cookie) return null;
  for (const part of document.cookie.split(';')) {
    const index = part.indexOf('=');
    if (index <= 0) continue;
    if (part.slice(0, index).trim() === CSRF_COOKIE_NAME) {
      return decodeURIComponent(part.slice(index + 1).trim());
    }
  }
  return null;
}

export interface ApiRequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  headers?: Record<string, string>;
}

export async function apiRequest<T extends ApiEnvelope>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const method = options.method || 'POST';
  const headers: Record<string, string> = { ...(options.headers || {}) };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';

  if (method !== 'GET') {
    const token = csrfToken || readCsrfCookie();
    if (token) headers[CSRF_HEADER] = token;
  }

  try {
    const response = await fetch(path, {
      method,
      credentials: 'include', // HttpOnly cookie session
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    const payload: unknown = await response.json().catch(() => null);
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return { success: false, error: 'پاسخ معتبر از سرور دریافت نشد.' } as T;
    }
    const data = payload as T;
    const maybeCsrf = (data as Record<string, unknown>).csrfToken;
    if (typeof maybeCsrf === 'string') setCsrfToken(maybeCsrf);
    if (!response.ok) {
      return {
        ...data,
        success: false,
        error: data.message || data.error || `درخواست ناموفق (${response.status})`,
      } as T;
    }
    return data;
  } catch {
    return { success: false, error: 'ارتباط با سرور برقرار نشد.' } as T;
  }
}

/* ------------------------------------------------------------------ */
/* Session lifecycle                                                   */
/* ------------------------------------------------------------------ */

export interface SessionUserResponse extends ApiEnvelope {
  success: boolean;
  userId?: string;
  role?: string;
  csrfToken?: string;
  expiresAt?: string;
  mustChangePassword?: boolean;
  isNewRegistration?: boolean;
  user?: ApiSessionUser;
}

export async function createSessionSecure(otpProof: string): Promise<SessionUserResponse> {
  const result = await apiRequest<SessionUserResponse>('/api/session/create', { body: { otpProof } });
  if (!result.success) setCsrfToken(null);
  return result;
}

export async function validateSessionSecure(): Promise<SessionUserResponse> {
  return apiRequest<SessionUserResponse>('/api/session/validate', { body: {} });
}

export async function logoutSecure(): Promise<ApiEnvelope> {
  const result = await apiRequest<ApiEnvelope>('/api/session/logout', { body: {} });
  setCsrfToken(null);
  return result;
}

export async function changePasswordSecure(currentPassword: string, newPassword: string): Promise<ApiEnvelope> {
  const result = await apiRequest<ApiEnvelope>('/api/session/change-password', {
    body: { currentPassword, newPassword },
  });
  if (result.success) setCsrfToken(null);
  return result;
}

export async function revokeOwnSessionsSecure(): Promise<ApiEnvelope & { revoked?: number }> {
  const result = await apiRequest<ApiEnvelope & { revoked?: number }>('/api/session/revoke-all', { body: {} });
  if (result.success) setCsrfToken(null);
  return result;
}

/* ------------------------------------------------------------------ */
/* OTP + registration                                                  */
/* ------------------------------------------------------------------ */

export interface OtpChallengeResponse extends ApiEnvelope {
  success: boolean;
  expiresIn?: number;
  /** Absolute deadline (ISO) shared by Supabase `expires_at` and the challenge token. */
  expiresAt?: string;
  /** Seconds the user must wait before the next code may be requested. */
  resendAvailableIn?: number;
  /** Always 'accepted': the provider queued the message, nothing about handset delivery. */
  deliveryStatus?: 'accepted';
  /** Set on cooldown answers so the UI can show an accurate countdown. */
  retryAfterSeconds?: number;
  maskedPhone?: string;
  challengeToken?: string;
  purpose?: 'login' | 'registration';
}

export async function requestLoginOtpSecure(nationalCode: string, password: string): Promise<OtpChallengeResponse> {
  return apiRequest<OtpChallengeResponse>('/api/otp/send', {
    body: { nationalCode, purpose: 'login', password },
  });
}

export async function requestRegistrationOtpSecure(nationalCode: string): Promise<OtpChallengeResponse> {
  return apiRequest<OtpChallengeResponse>('/api/otp/send', { body: { nationalCode, purpose: 'registration' } });
}

/**
 * Requests a fresh code.
 *
 * `/api/otp/resend` runs the same guarded handler as `/api/otp/send`, so a login resend still
 * has to carry the password: the server re-verifies it before issuing any SMS. Registration
 * resends only work while an unexpired pending registration exists (`nationalCode` only).
 */
export async function resendOtpSecure(
  nationalCode: string,
  options: { purpose?: 'login' | 'registration'; password?: string } = {},
): Promise<OtpChallengeResponse> {
  const purpose = options.purpose === 'login' ? 'login' : 'registration';
  const body = purpose === 'login'
    ? { nationalCode, purpose, password: String(options.password || '') }
    : { nationalCode, purpose };
  return apiRequest<OtpChallengeResponse>('/api/otp/resend', { body });
}

export interface RegistrationStartResponse extends ApiEnvelope {
  success: boolean;
  maskedPhone?: string;
  verificationRequired?: boolean;
}

export async function startSecureRegistration(data: {
  firstName: string;
  lastName: string;
  nationalCode: string;
  phone: string;
  birthDate: string;
  gender: string;
  password: string;
  groupName: string;
  province?: string;
  city?: string;
  schoolName?: string;
}): Promise<RegistrationStartResponse> {
  return apiRequest<RegistrationStartResponse>('/api/registration/start', { body: data });
}

export interface CheckNationalResponse extends ApiEnvelope {
  success: boolean;
  checked?: boolean;
}

/** Enumeration-safe: the server never discloses whether an account exists. */
export async function checkNationalSecure(nationalCode: string): Promise<CheckNationalResponse> {
  return apiRequest<CheckNationalResponse>('/api/registration/check-national', { body: { nationalCode } });
}

export interface OtpVerifyResponse extends ApiEnvelope {
  success: boolean;
  otpProof?: string;
  purpose?: 'login' | 'registration' | 'admin';
}

export async function verifyOtpSecure(
  nationalCode: string,
  code: string,
  challengeToken: string,
): Promise<OtpVerifyResponse> {
  return apiRequest<OtpVerifyResponse>('/api/otp/verify', { body: { nationalCode, code, challengeToken } });
}

/* ------------------------------------------------------------------ */
/* Password reset                                                      */
/* ------------------------------------------------------------------ */

export interface PasswordResetRequestResponse extends ApiEnvelope {
  success: boolean;
  trackingCode?: string | null;
}

export async function requestPasswordResetSecure(phone: string, note?: string): Promise<PasswordResetRequestResponse> {
  return apiRequest<PasswordResetRequestResponse>('/api/password-reset/request', { body: { phone, note } });
}

export interface PasswordResetStatusResponse extends ApiEnvelope {
  success: boolean;
  data?: {
    status: string;
    message: string;
    createdAt?: string;
    resolvedAt?: string | null;
  };
}

export async function checkPasswordResetStatusSecure(
  nationalCode: string,
  trackingCode: string,
): Promise<PasswordResetStatusResponse> {
  return apiRequest<PasswordResetStatusResponse>('/api/password-reset/status', { body: { nationalCode, trackingCode } });
}

/* ------------------------------------------------------------------ */
/* Admin (server-side session + admin role + operation-bound OTP proof) */
/* ------------------------------------------------------------------ */

export interface AdminOtpChallengeResponse extends ApiEnvelope {
  success: boolean;
  challengeToken?: string;
  maskedPhone?: string;
  expiresIn?: number;
}

export async function requestAdminOtpChallengeSecure(): Promise<AdminOtpChallengeResponse> {
  return apiRequest<AdminOtpChallengeResponse>('/api/admin/otp/challenge', { body: {} });
}

export async function revokeUserSessionsSecure(
  userId: string,
  adminOtpProof?: string,
): Promise<ApiEnvelope & { revoked?: number }> {
  return apiRequest<ApiEnvelope & { revoked?: number }>('/api/admin/sessions/revoke', {
    body: { userId, adminOtpProof },
  });
}

export async function adminPatchUserSecure(
  userId: string,
  patch: Record<string, unknown>,
  adminOtpProof?: string,
): Promise<ApiEnvelope & { user?: ApiSessionUser }> {
  return apiRequest<ApiEnvelope & { user?: ApiSessionUser }>('/api/admin/users/patch', {
    body: { userId, patch, adminOtpProof },
  });
}

export async function adminSetUserPasswordSecure(
  userId: string,
  password: string,
  adminOtpProof?: string,
): Promise<ApiEnvelope> {
  return apiRequest<ApiEnvelope>('/api/admin/users/password', { body: { userId, password, adminOtpProof } });
}

export async function adminCreateUserSecure(
  user: Record<string, unknown>,
  password: string,
): Promise<ApiEnvelope & { user?: ApiSessionUser }> {
  return apiRequest<ApiEnvelope & { user?: ApiSessionUser }>('/api/admin/users/create', { body: { user, password } });
}

export async function adminListPasswordResetsSecure(
  params: { status?: string; q?: string } = {},
): Promise<ApiEnvelope & { requests?: unknown[]; stats?: Record<string, number> }> {
  return apiRequest<ApiEnvelope & { requests?: unknown[]; stats?: Record<string, number> }>(
    '/api/admin/password-resets/list',
    { body: { status: params.status || 'all', q: params.q || '' } },
  );
}

export async function adminUpdatePasswordResetSecure(
  requestId: string,
  action: 'contacted' | 'resolve' | 'reject',
  values: { password?: string; note?: string; adminOtpProof?: string } = {},
): Promise<ApiEnvelope> {
  return apiRequest<ApiEnvelope>('/api/admin/password-resets/update', {
    body: {
      requestId,
      action,
      password: values.password || '',
      note: values.note || '',
      adminOtpProof: values.adminOtpProof,
    },
  });
}

export async function adminAuditLogSecure(limit = 100): Promise<ApiEnvelope & { events?: unknown[] }> {
  return apiRequest<ApiEnvelope & { events?: unknown[] }>(`/api/admin/audit-log?limit=${encodeURIComponent(limit)}`, {
    method: 'GET',
  });
}

export async function adminSecurityOverviewSecure(): Promise<ApiEnvelope & { data?: Record<string, unknown> }> {
  return apiRequest<ApiEnvelope & { data?: Record<string, unknown> }>('/api/admin/security/overview', { method: 'GET' });
}
