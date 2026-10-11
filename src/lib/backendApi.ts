import type { User, PasswordResetRequest } from '../types';

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

export interface AuthPayload {
  user: User;
  mustChangePassword: boolean;
}

let activeSession: { user: User; mustChangePassword: boolean } | null = null;
let cachedStatus: BackendStatus | null = null;
let probePromise: Promise<BackendStatus> | null = null;
const statusListeners = new Set<(status: BackendStatus) => void>();
const STATUS_TTL_MS = 30_000;

function notify(status: BackendStatus) {
  cachedStatus = status;
  statusListeners.forEach((listener) => {
    try { listener(status); } catch { /* ignore subscriber failures */ }
  });
}

async function requestJson<T>(path: string, body?: unknown, method = 'POST'): Promise<{ response: Response; data: T }> {
  const response = await fetch(path, {
    method,
    credentials: 'same-origin',
    cache: 'no-store',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({})) as T;
  return { response, data };
}

function apiError(payload: any, fallback: string, status?: number): ApiError {
  return {
    code: String(payload?.error || 'REQUEST_FAILED'),
    message: String(payload?.message || fallback),
    status,
  };
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
  return null;
}

export async function probeBackend(force = false): Promise<BackendStatus> {
  if (!force && cachedStatus && Date.now() - cachedStatus.checkedAt < STATUS_TTL_MS) return cachedStatus;
  if (probePromise) return probePromise;

  probePromise = (async () => {
    let status: BackendStatus;
    try {
      const { response, data } = await requestJson<{ ok?: boolean }>('/api/health', undefined, 'GET');
      status = {
        available: response.ok && data.ok === true,
        mode: 'server',
        checkedAt: Date.now(),
        message: response.ok && data.ok ? 'سرور احراز هویت در دسترس است.' : 'سرور احراز هویت پاسخ معتبر نداد.',
      };
    } catch {
      status = { available: false, mode: 'server', checkedAt: Date.now(), message: 'ارتباط با سرور احراز هویت برقرار نشد.' };
    }
    notify(status);
    return status;
  })().finally(() => { probePromise = null; });

  return probePromise;
}

export async function apiLogin(nationalCode: string, password: string): Promise<ApiResult<AuthPayload>> {
  try {
    const { response, data } = await requestJson<any>('/api/auth/login', { nationalCode, password });
    if (!response.ok || !data.user) return { ok: false, error: apiError(data, 'ورود ناموفق بود.', response.status) };
    const user = { ...data.user, password: '' } as User;
    activeSession = { user, mustChangePassword: Boolean(data.mustChangePassword) };
    return { ok: true, data: { user, mustChangePassword: Boolean(data.mustChangePassword) } };
  } catch {
    return { ok: false, error: { code: 'AUTH_SERVER_UNAVAILABLE', message: 'سرور احراز هویت در دسترس نیست.' } };
  }
}

export async function apiCheckNationalCodeExists(nationalCode: string): Promise<boolean> {
  try {
    const { response, data } = await requestJson<{ exists?: boolean }>('/api/auth/check-national-code', { nationalCode });
    return response.ok && data.exists === true;
  } catch {
    return false;
  }
}

export async function apiRegister(payload: Record<string, any>): Promise<ApiResult<AuthPayload>> {
  try {
    const { response, data } = await requestJson<any>('/api/auth/register', payload);
    if (!response.ok || !data.user) return { ok: false, error: apiError(data, 'ثبت‌نام ناموفق بود.', response.status) };
    return { ok: true, data: { user: { ...data.user, password: '' } as User, mustChangePassword: Boolean(data.mustChangePassword) } };
  } catch {
    return { ok: false, error: { code: 'AUTH_SERVER_UNAVAILABLE', message: 'سرور ثبت‌نام در دسترس نیست.' } };
  }
}

export async function apiLogout(): Promise<ApiResult<{ message: string }>> {
  activeSession = null;
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'same-origin',
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // Clear browser caches even if the API cannot be reached.
  } finally {
    localStorage.removeItem('warroom_session_id');
    localStorage.removeItem('warroom_current_user_data');
    localStorage.removeItem('warroom_current_user_id');
  }
  return { ok: true, data: { message: 'از حساب خارج شدید.' } };
}

export async function apiSession(): Promise<ApiResult<{ authenticated: boolean; user?: User; mustChangePassword?: boolean }>> {
  try {
    let { response, data } = await requestJson<any>('/api/auth/me', undefined, 'GET');
    if (response.status === 401) {
      const refresh = await requestJson<any>('/api/auth/refresh');
      if (refresh.response.ok) ({ response, data } = await requestJson<any>('/api/auth/me', undefined, 'GET'));
    }
    if (!response.ok || !data.user?.id) {
      activeSession = null;
      localStorage.removeItem('warroom_current_user_data');
      localStorage.removeItem('warroom_current_user_id');
      return { ok: true, data: { authenticated: false } };
    }
    const user = { ...data.user, password: '' } as User;
    activeSession = { user, mustChangePassword: Boolean(data.mustChangePassword) };
    return { ok: true, data: { authenticated: true, user, mustChangePassword: activeSession.mustChangePassword } };
  } catch {
    activeSession = null;
    return { ok: false, error: { code: 'AUTH_SERVER_UNAVAILABLE', message: 'سرور احراز هویت در دسترس نیست.' } };
  }
}

export async function apiChangePassword(currentPassword: string, newPassword: string): Promise<ApiResult<{ message: string }>> {
  try {
    const { response, data } = await requestJson<any>('/api/auth/change-password', { currentPassword, newPassword });
    if (!response.ok) return { ok: false, error: apiError(data, 'تغییر رمز ناموفق بود.', response.status) };
    if (activeSession) activeSession.mustChangePassword = false;
    return { ok: true, data: { message: data.message || 'رمز عبور تغییر کرد.' } };
  } catch {
    return { ok: false, error: { code: 'AUTH_SERVER_UNAVAILABLE', message: 'سرور احراز هویت در دسترس نیست.' } };
  }
}

export async function requestPasswordReset(input: { phone: string; note?: string }): Promise<ApiResult<{ trackingCode: string; message: string }>> {
  try {
    const { response, data } = await requestJson<any>('/api/auth/password-reset-requests', input);
    if (!response.ok) return { ok: false, error: apiError(data, 'ثبت درخواست بازیابی رمز ناموفق بود.', response.status) };
    return { ok: true, data: { trackingCode: data.trackingCode, message: data.message } };
  } catch {
    return { ok: false, error: { code: 'AUTH_SERVER_UNAVAILABLE', message: 'سرور احراز هویت در دسترس نیست.' } };
  }
}

export async function checkPasswordResetStatus(nationalCode: string, trackingCode: string): Promise<ApiResult<{ status: string; message: string; createdAt?: string; resolvedAt?: string | null }>> {
  try {
    const { response, data } = await requestJson<any>('/api/auth/password-reset-requests/status', { nationalCode, trackingCode });
    if (!response.ok) return { ok: false, error: apiError(data, 'درخواستی پیدا نشد.', response.status) };
    return { ok: true, data };
  } catch {
    return { ok: false, error: { code: 'AUTH_SERVER_UNAVAILABLE', message: 'سرور احراز هویت در دسترس نیست.' } };
  }
}

export async function adminListPasswordResets(params: { status?: string; q?: string } = {}): Promise<ApiResult<{ requests: PasswordResetRequest[]; stats: Record<string, number> }>> {
  try {
    const queryParams = new URLSearchParams();
    if (params.status) queryParams.set('status', params.status);
    if (params.q) queryParams.set('q', params.q);
    const query = queryParams.toString();
    const { response, data } = await requestJson<any>(`/api/auth/admin/password-reset-requests${query ? `?${query}` : ''}`, undefined, 'GET');
    if (!response.ok) return { ok: false, error: apiError(data, 'دریافت درخواست‌ها ناموفق بود.', response.status) };
    return { ok: true, data };
  } catch {
    return { ok: false, error: { code: 'AUTH_SERVER_UNAVAILABLE', message: 'سرور احراز هویت در دسترس نیست.' } };
  }
}

export async function adminGeneratePassword(id: string): Promise<ApiResult<{ password: string; message: string }>> {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  const random = crypto.getRandomValues(new Uint8Array(20));
  const password = Array.from(random, (value) => alphabet[value % alphabet.length]).join('');
  return { ok: true, data: { password, message: `رمز موقت برای کاربر ${id} آماده شد.` } };
}

export async function adminMarkContacted(id: string, note?: string): Promise<ApiResult<any>> {
  return adminPasswordResetAction(id, 'contacted', { note });
}

export async function adminResolvePasswordReset(id: string, password: string, note?: string): Promise<ApiResult<{ password: string; message: string }>> {
  return adminPasswordResetAction(id, 'resolve', { password, note });
}

export async function adminRejectPasswordReset(id: string, reason?: string): Promise<ApiResult<any>> {
  return adminPasswordResetAction(id, 'reject', { reason });
}

async function adminPasswordResetAction(id: string, action: string, body: unknown): Promise<ApiResult<any>> {
  try {
    const { response, data } = await requestJson<any>(`/api/auth/admin/password-reset-requests/${encodeURIComponent(id)}/${action}`, body);
    if (!response.ok) return { ok: false, error: apiError(data, 'عملیات مدیریتی ناموفق بود.', response.status) };
    return { ok: true, data };
  } catch {
    return { ok: false, error: { code: 'AUTH_SERVER_UNAVAILABLE', message: 'سرور احراز هویت در دسترس نیست.' } };
  }
}

export async function adminCreateUser(payload: Record<string, any>): Promise<ApiResult<{ user: User; oneTimePassword: string; message: string }>> {
  try {
    const { response, data } = await requestJson<any>('/api/auth/admin/users', payload);
    if (!response.ok) return { ok: false, error: apiError(data, 'ایجاد کاربر ناموفق بود.', response.status) };
    return { ok: true, data: { user: data.user, oneTimePassword: data.oneTimePassword, message: data.message } };
  } catch {
    return { ok: false, error: { code: 'AUTH_SERVER_UNAVAILABLE', message: 'سرور احراز هویت در دسترس نیست.' } };
  }
}

export async function adminUpdateUser(id: string, patch: Record<string, any>): Promise<ApiResult<{ user: User }>> {
  try {
    const { response, data } = await requestJson<any>(`/api/auth/admin/users/${encodeURIComponent(id)}`, patch, 'PATCH');
    if (!response.ok) return { ok: false, error: apiError(data, 'به‌روزرسانی کاربر ناموفق بود.', response.status) };
    return { ok: true, data: { user: data.user } };
  } catch {
    return { ok: false, error: { code: 'AUTH_SERVER_UNAVAILABLE', message: 'سرور احراز هویت در دسترس نیست.' } };
  }
}

export async function adminResetUserPassword(id: string, password?: string): Promise<ApiResult<{ oneTimePassword: string; message: string }>> {
  try {
    const { response, data } = await requestJson<any>(`/api/auth/admin/users/${encodeURIComponent(id)}/password`, { password });
    if (!response.ok) return { ok: false, error: apiError(data, 'بازنشانی رمز ناموفق بود.', response.status) };
    return { ok: true, data: { oneTimePassword: data.oneTimePassword, message: data.message } };
  } catch {
    return { ok: false, error: { code: 'AUTH_SERVER_UNAVAILABLE', message: 'سرور احراز هویت در دسترس نیست.' } };
  }
}

export async function adminRevokeUserSessions(id: string): Promise<ApiResult<{ removed: number }>> {
  try {
    const { response, data } = await requestJson<any>(`/api/auth/admin/users/${encodeURIComponent(id)}/sessions/revoke`);
    if (!response.ok) return { ok: false, error: apiError(data, 'ابطال نشست‌ها ناموفق بود.', response.status) };
    return { ok: true, data };
  } catch {
    return { ok: false, error: { code: 'AUTH_SERVER_UNAVAILABLE', message: 'سرور احراز هویت در دسترس نیست.' } };
  }
}

export async function adminSecurityOverview(): Promise<ApiResult<any>> {
  try {
    const { response, data } = await requestJson<any>('/api/health', undefined, 'GET');
    return response.ok ? { ok: true, data: { ...data, securityStatus: 'احراز هویت سمت سرور فعال است.', authMethod: 'scrypt و OTP با نشست HttpOnly' } } : { ok: false, error: apiError(data, 'وضعیت سرور در دسترس نیست.', response.status) };
  } catch {
    return { ok: false, error: { code: 'AUTH_SERVER_UNAVAILABLE', message: 'سرور احراز هویت در دسترس نیست.' } };
  }
}

export async function adminAuditLog(_limit = 100): Promise<ApiResult<{ events: any[] }>> {
  return { ok: true, data: { events: [] } };
}
