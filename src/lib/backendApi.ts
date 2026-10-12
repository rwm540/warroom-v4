/**
 * Backend facade used by the UI.
 *
 * Security contract:
 *  - The session is an HttpOnly cookie managed by the Node backend; this module never keeps
 *    a session or refresh token and never falls back to direct Supabase table access for
 *    authentication or administration.
 *  - `apiSession()` validates the cookie against the server and returns the server-sanitized
 *    profile; local state is a rendering cache only.
 *  - Administrative operations require a live admin session (enforced by the server) and,
 *    for destructive operations, a fresh one-time admin OTP proof held in memory only.
 */

import type { User, Group, PasswordResetRequest } from '../types';
import {
  createLeaderGroupSecure,
  createLeaderGroupMemberSecure,
  adminAuditLogSecure,
  adminCreateUserSecure,
  adminListPasswordResetsSecure,
  adminPatchUserSecure,
  adminSetUserPasswordSecure,
  adminUpdatePasswordResetSecure,
  apiRequest,
  getCsrfToken,
  logoutSecure,
  requestAdminOtpChallengeSecure,
  requestPasswordResetSecure,
  checkPasswordResetStatusSecure,
  revokeUserSessionsSecure,
  validateSessionSecure,
  verifyOtpSecure,
  changePasswordSecure,
} from './secureApi';

export interface ApiError {
  code: string;
  message: string;
  retryAfter?: number;
  status?: number;
}

export interface ApiResult<T> {
  ok: boolean;
  data?: T;
  error?: ApiError;
}

export interface BackendStatus {
  available: boolean;
  mode?: 'server';
  checkedAt: number;
  message?: string;
}

let cachedStatus: BackendStatus | null = null;
let probePromise: Promise<BackendStatus> | null = null;
const statusListeners = new Set<(status: BackendStatus) => void>();
const STATUS_TTL_MS = 30_000;

/** In-memory only: never persisted, never refreshed from Web Storage. */
let adminOtpProof: string | null = null;

function notify(status: BackendStatus) {
  cachedStatus = status;
  statusListeners.forEach((listener) => {
    try { listener(status); } catch { /* ignore listener errors */ }
  });
}

function fromSecureError(error: string | undefined, fallbackCode: string, fallbackMessage: string): ApiError {
  return { code: fallbackCode, message: error || fallbackMessage };
}

export function subscribeBackendStatus(listener: (status: BackendStatus) => void): () => void {
  statusListeners.add(listener);
  if (cachedStatus) listener(cachedStatus);
  return () => statusListeners.delete(listener);
}

export function getBackendStatus(): BackendStatus | null {
  return cachedStatus;
}

export function isBackendAvailable(): boolean {
  return Boolean(cachedStatus?.available);
}

export async function ensureCsrfToken(): Promise<string | null> {
  return getCsrfToken();
}

/** Creates the current leader's first squad through the authenticated server session. */
export async function apiCreateLeaderGroup(
  payload: Record<string, unknown>,
): Promise<ApiResult<{ group: Group; user: User }>> {
  const result = await createLeaderGroupSecure(payload);
  if (!result.success || !result.group || !result.user) {
    return { ok: false, error: fromSecureError(result.error, 'GROUP_CREATE_FAILED', 'ایجاد جوخه ناموفق بود.') };
  }
  return {
    ok: true,
    data: {
      group: result.group as unknown as Group,
      user: { ...(result.user as unknown as User), password: '' } as User,
    },
  };
}

/** Persists a member account and its credential atomically on the server. */
export async function apiCreateSquadMember(
  groupId: string,
  user: Record<string, unknown>,
  password: string,
): Promise<ApiResult<{ user: User; group?: Group; mustChangePassword: boolean }>> {
  const result = await createLeaderGroupMemberSecure(groupId, user, password);
  if (!result.success || !result.user) {
    return { ok: false, error: fromSecureError(result.error, 'GROUP_MEMBER_CREATE_FAILED', 'افزودن عضو ناموفق بود.') };
  }
  return {
    ok: true,
    data: {
      user: { ...(result.user as unknown as User), password: '' } as User,
      group: result.group as unknown as Group | undefined,
      mustChangePassword: result.mustChangePassword === true,
    },
  };
}

/** Probes the same-origin Node backend (never Supabase directly). */
export async function probeBackend(force = false): Promise<BackendStatus> {
  if (!force && cachedStatus && Date.now() - cachedStatus.checkedAt < STATUS_TTL_MS) return cachedStatus;
  if (probePromise) return probePromise;
  probePromise = (async () => {
    let status: BackendStatus;
    try {
      const response = await fetch('/api/health', { method: 'GET', credentials: 'include' });
      let message: string | undefined;
      try {
        const payload = await response.json();
        message = typeof payload?.message === 'string' ? payload.message : undefined;
      } catch { /* ignore body parse errors */ }
      status = { available: response.ok, mode: 'server', checkedAt: Date.now(), message };
    } catch {
      status = { available: false, mode: 'server', checkedAt: Date.now(), message: 'ارتباط با سرور برقرار نشد.' };
    }
    notify(status);
    return status;
  })().finally(() => { probePromise = null; });
  return probePromise;
}

/**
 * Validates the HttpOnly session against the server.
 * This is the only source of the authenticated identity - nothing is trusted from cache.
 */
export async function apiSession(): Promise<ApiResult<{ authenticated: boolean; user?: User; mustChangePassword?: boolean }>> {
  const result = await validateSessionSecure();
  if (!result.success || !result.user) {
    return { ok: true, data: { authenticated: false } };
  }
  const user = { ...(result.user as unknown as User), password: '' } as User;
  return {
    ok: true,
    data: {
      authenticated: true,
      user,
      mustChangePassword: result.mustChangePassword === true,
    },
  };
}

/** Revokes the server-side session and clears every locally cached identity fragment. */
export async function apiLogout(): Promise<ApiResult<{ message: string }>> {
  adminOtpProof = null;
  try {
    await logoutSecure();
  } catch { /* the local session is cleared even if the network call fails */ }
  try {
    // Only remove our own keys, never the whole namespace.
    localStorage.removeItem('warroom_session_id');
    localStorage.removeItem('warroom_current_user_data');
    localStorage.removeItem('warroom_current_user_id');
    sessionStorage.removeItem('warroom_selected_game_id');
  } catch { /* ignore storage access issues */ }
  return { ok: true, data: { message: 'از حساب خارج شدید.' } };
}

export async function apiChangePassword(currentPassword: string, newPassword: string): Promise<ApiResult<{ message: string }>> {
  const result = await changePasswordSecure(currentPassword, newPassword);
  if (!result.success) {
    return { ok: false, error: fromSecureError(result.error, 'PASSWORD_CHANGE_FAILED', 'تغییر رمز ناموفق بود.') };
  }
  adminOtpProof = null;
  return { ok: true, data: { message: result.message || 'رمز عبور تغییر کرد.' } };
}

export async function apiCheckNationalCodeExists(nationalCode: string): Promise<boolean> {
  // The server endpoint is enumeration-safe: it never discloses whether an account exists.
  const result = await apiRequest<{ success: boolean; exists?: boolean }>('/api/registration/check-national', {
    body: { nationalCode },
  });
  return result.success === true && result.exists === true;
}

export async function requestPasswordReset(input: { phone: string; note?: string }): Promise<ApiResult<{ trackingCode: string; message: string }>> {
  const result = await requestPasswordResetSecure(input.phone, input.note);
  if (!result.success) {
    return { ok: false, error: fromSecureError(result.error, 'REQUEST_FAILED', 'ثبت درخواست بازیابی ممکن نشد.') };
  }
  return {
    ok: true,
    data: { trackingCode: result.trackingCode || '', message: result.message || 'درخواست شما دریافت شد.' },
  };
}

export async function checkPasswordResetStatus(nationalCode: string, trackingCode: string): Promise<ApiResult<{ status: string; message: string; createdAt?: string; resolvedAt?: string | null }>> {
  const result = await checkPasswordResetStatusSecure(nationalCode, trackingCode);
  if (!result.success || !result.data) {
    return { ok: false, error: fromSecureError(result.error, 'NOT_FOUND', 'درخواستی با این کد رهگیری و کد ملی پیدا نشد.') };
  }
  return { ok: true, data: result.data };
}

/* ------------------------------------------------------------------ */
/* Admin OTP proof (memory only)                                       */
/* ------------------------------------------------------------------ */

/** Requests an admin OTP bound to the admin's own registered phone. */
export async function requestAdminOtpChallenge(): Promise<ApiResult<{ challengeToken: string; maskedPhone?: string; expiresIn?: number }>> {
  const result = await requestAdminOtpChallengeSecure();
  if (!result.success || !result.challengeToken) {
    return { ok: false, error: fromSecureError(result.error, 'ADMIN_OTP_REQUIRED', 'درخواست کد تأیید مدیریتی ناموفق بود.') };
  }
  return {
    ok: true,
    data: { challengeToken: result.challengeToken, maskedPhone: result.maskedPhone, expiresIn: result.expiresIn },
  };
}

/** Completes the admin OTP challenge; the resulting proof stays in memory only. */
export async function completeAdminOtpVerification(params: { nationalCode: string; code: string; challengeToken: string }): Promise<ApiResult<{ message: string }>> {
  const result = await verifyOtpSecure(params.nationalCode, params.code, params.challengeToken);
  if (!result.success || !result.otpProof) {
    return { ok: false, error: fromSecureError(result.error, 'ADMIN_OTP_REQUIRED', 'کد تأیید مدیریتی نامعتبر است.') };
  }
  if (result.purpose !== 'admin') {
    return { ok: false, error: { code: 'ADMIN_OTP_REQUIRED', message: 'این کد برای عملیات مدیریتی صادر نشده است.' } };
  }
  adminOtpProof = result.otpProof;
  return { ok: true, data: { message: 'تأیید مدیریتی انجام شد.' } };
}

export function hasAdminOtpProof(): boolean {
  return Boolean(adminOtpProof);
}

export function clearAdminOtpProof(): void {
  adminOtpProof = null;
}

function adminProofOrUndefined(): string | undefined {
  return adminOtpProof || undefined;
}

function adminFailure(code: string, fallbackMessage = 'عملیات مدیریتی ناموفق بود.'): ApiResult<never> {
  const messages: Record<string, string> = {
    ADMIN_OTP_REQUIRED: 'برای این عملیات مدیریتی، تأیید OTP تازه لازم است.',
    ADMIN_OTP_REUSED: 'این مدرک تأیید قبلاً مصرف شده است؛ کد تازه بگیرید.',
    NO_SESSION: 'نشست مدیریتی معتبر نیست؛ دوباره وارد شوید.',
    FORBIDDEN: 'دسترسی مدیریتی برای این عملیات وجود ندارد.',
    RATE_LIMITED: 'تعداد درخواست‌ها زیاد است؛ کمی بعد تلاش کنید.',
  };
  return { ok: false, error: { code, message: messages[code] || fallbackMessage } };
}

/* ------------------------------------------------------------------ */
/* Admin operations (server session + optional admin OTP proof)        */
/* ------------------------------------------------------------------ */

export async function adminListPasswordResets(params: { status?: string; q?: string } = {}): Promise<ApiResult<{ requests: PasswordResetRequest[]; stats: Record<string, number> }>> {
  const result = await adminListPasswordResetsSecure(params);
  if (!result.success) return adminFailure(result.error || 'ADMIN_OPERATION_FAILED');
  return { ok: true, data: { requests: (result.requests || []) as PasswordResetRequest[], stats: result.stats || {} } };
}

export async function adminGeneratePassword(id: string): Promise<ApiResult<{ password: string; message: string }>> {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const password = Array.from(bytes, (value) => alphabet[value % alphabet.length]).join('');
  return { ok: true, data: { password, message: `رمز موقت برای درخواست ${id} آماده شد.` } };
}

async function updateResetRequest(id: string, action: 'contacted' | 'resolve' | 'reject', values: Record<string, unknown>): Promise<ApiResult<any>> {
  const result = await adminUpdatePasswordResetSecure(id, action, {
    password: values.password === undefined ? undefined : String(values.password),
    note: values.note === undefined ? undefined : String(values.note),
    adminOtpProof: adminProofOrUndefined(),
  });
  if (!result.success) return adminFailure(result.error || 'ADMIN_OPERATION_FAILED');
  return { ok: true, data: result };
}

export async function adminMarkContacted(id: string, note?: string): Promise<ApiResult<any>> {
  return updateResetRequest(id, 'contacted', { note });
}

export async function adminResolvePasswordReset(id: string, password: string, note?: string): Promise<ApiResult<{ password: string; message: string }>> {
  const result = await updateResetRequest(id, 'resolve', { password, note });
  if (!result.ok) return result as ApiResult<{ password: string; message: string }>;
  return { ok: true, data: { password, message: 'رمز جدید ثبت شد.' } };
}

export async function adminRejectPasswordReset(id: string, reason?: string): Promise<ApiResult<any>> {
  return updateResetRequest(id, 'reject', { reason });
}

export async function adminCreateUser(payload: Record<string, any>): Promise<ApiResult<{ user: User; oneTimePassword: string; message: string }>> {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  const randomBytes = new Uint8Array(16);
  crypto.getRandomValues(randomBytes);
  const oneTimePassword = String(payload.password || Array.from(randomBytes, (value) => alphabet[value % alphabet.length]).join(''));

  const { password: _ignored, ...userData } = payload;
  const result = await adminCreateUserSecure(userData, oneTimePassword);
  if (!result.success || !result.user) {
    return { ok: false, error: fromSecureError(result.error, 'CREATE_FAILED', 'ایجاد کاربر ناموفق بود.') };
  }
  return {
    ok: true,
    data: { user: { ...(result.user as unknown as User), password: '' } as User, oneTimePassword, message: 'پروفایل کاربر ایجاد شد.' },
  };
}

export async function adminUpdateUser(id: string, patch: Record<string, any>): Promise<ApiResult<{ user: User }>> {
  // The server re-validates the allow-list; keeping a local filter is defense in depth.
  const allowed = ['first_name', 'last_name', 'phone', 'gender', 'province', 'city', 'school_name', 'is_active', 'is_blocked', 'points', 'level', 'avatar_url'];
  const filteredPatch = Object.fromEntries(Object.entries(patch).filter(([key]) => allowed.includes(key)));
  if (Object.keys(filteredPatch).length === 0) {
    return { ok: false, error: { code: 'INVALID_PATCH', message: 'فیلدی برای ویرایش ارسال نشد.' } };
  }

  const result = await adminPatchUserSecure(id, filteredPatch, adminProofOrUndefined());
  if (!result.success || !result.user) {
    return { ok: false, error: fromSecureError(result.error, 'ADMIN_OPERATION_FAILED', 'ویرایش کاربر ناموفق بود.') };
  }
  return { ok: true, data: { user: { ...(result.user as unknown as User), password: '' } as User } };
}

export async function adminResetUserPassword(id: string, password?: string): Promise<ApiResult<{ oneTimePassword: string; message: string }>> {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  const randomBytes = new Uint8Array(16);
  crypto.getRandomValues(randomBytes);
  const oneTimePassword = String(password || Array.from(randomBytes, (value) => alphabet[value % alphabet.length]).join(''));

  const result = await adminSetUserPasswordSecure(id, oneTimePassword, adminProofOrUndefined());
  if (!result.success) {
    return { ok: false, error: fromSecureError(result.error, 'ADMIN_OTP_REQUIRED', 'بازنشانی رمز ناموفق بود.') };
  }
  return { ok: true, data: { oneTimePassword, message: 'رمز جدید ثبت شد.' } };
}

export async function adminRevokeUserSessions(id: string): Promise<ApiResult<{ removed: number }>> {
  const result = await revokeUserSessionsSecure(id, adminProofOrUndefined());
  if (!result.success) {
    return { ok: false, error: fromSecureError(result.error, 'ADMIN_OPERATION_FAILED', 'ابطال نشست‌های کاربر ناموفق بود.') };
  }
  return { ok: true, data: { removed: Number(result.revoked || 0) } };
}

export async function adminSecurityOverview(): Promise<ApiResult<any>> {
  const health = await probeBackend();
  const result = await apiRequest<{ success: boolean; data?: Record<string, unknown>; error?: string }>('/api/admin/security/overview', { method: 'GET' });
  if (!result.success) {
    return {
      ok: true,
      data: {
        serverConnected: health.available,
        securityStatus: 'نشست‌ها با کوکی HttpOnly و تأیید سمت سرور محافظت می‌شوند.',
        authMethod: 'نشست سرور + OTP پیامکی + CSRF',
      },
    };
  }
  return { ok: true, data: { serverConnected: health.available, ...(result.data || {}) } };
}

export async function adminAuditLog(limit = 100): Promise<ApiResult<{ events: any[] }>> {
  const result = await adminAuditLogSecure(limit);
  if (!result.success) return adminFailure(result.error || 'ADMIN_OPERATION_FAILED');
  return { ok: true, data: { events: result.events || [] } };
}
