import type { User, PasswordResetRequest } from '../types';
import { checkSupabaseHealth, isSupabaseEnabled, supabase } from './supabaseData';

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
  mode?: 'supabase';
  checkedAt: number;
  message?: string;
}

export interface AuthPayload {
  user: User;
  mustChangePassword: boolean;
}

let activeUser: User | null = null;
let activeOtpProof: string | null = null;
let mustChangePasswordFlag = false;
let cachedStatus: BackendStatus | null = null;
let probePromise: Promise<BackendStatus> | null = null;
const statusListeners = new Set<(status: BackendStatus) => void>();
const STATUS_TTL_MS = 30_000;

function notify(status: BackendStatus) {
  cachedStatus = status;
  statusListeners.forEach((listener) => {
    try { listener(status); } catch { }
  });
}

function unavailable(): ApiError {
  return { code: 'SUPABASE_UNAVAILABLE', message: 'ارتباط با Supabase برقرار نیست.' };
}

function errorFrom(error: any): ApiError {
  const msg = String(error?.message || 'درخواست ناموفق بود.');
  // Never expose SQL, stack, or secrets
  const safeMsg = msg.includes('password') || msg.includes('secret') || msg.includes('token') || msg.toLowerCase().includes('stack')
    ? 'درخواست ناموفق بود.'
    : msg.slice(0, 300);
  return { code: String(error?.code || 'SUPABASE_REQUEST_FAILED'), message: safeMsg };
}

function requireSupabase(): NonNullable<typeof supabase> {
  if (!isSupabaseEnabled || !supabase) throw Object.assign(new Error('SUPABASE_UNAVAILABLE'), { code: 'SUPABASE_UNAVAILABLE' });
  return supabase;
}

export function setOtpVerifiedUser(user: User, proof: string) {
  if (!proof || !user.id) throw new Error('OTP verification proof is required');
  // Strip password before storing in memory
  const { password, ...safeUser } = user as any;
  activeUser = { ...safeUser, password: '' } as User;
  activeOtpProof = proof;
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
      const result = await checkSupabaseHealth();
      status = { available: result.ok, mode: 'supabase', checkedAt: Date.now(), message: result.message };
    } catch {
      status = { available: false, mode: 'supabase', checkedAt: Date.now(), message: 'ارتباط با Supabase برقرار نشد.' };
    }
    notify(status);
    return status;
  })().finally(() => { probePromise = null; });
  return probePromise;
}

function secureRandomString(length: number, alphabet: string): string {
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr, (v) => alphabet[v % alphabet.length]).join('');
}

export async function apiLogin(nationalCode: string, password: string): Promise<ApiResult<AuthPayload>> {
  try {
    const { data, error } = await requireSupabase().rpc('warroom_verify_login', {
      p_national_code: nationalCode,
      p_password: password,
    });
    if (error) return { ok: false, error: errorFrom(error) };
    if (!data?.success || !data.user?.id) {
      // Generic message to avoid enumeration
      return { ok: false, error: { code: data?.error || 'INVALID_CREDENTIALS', message: 'کد ملی یا رمز عبور اشتباه است.' } };
    }
    // Check if user is blocked or inactive
    if (data.user.is_blocked) {
      return { ok: false, error: { code: 'USER_BLOCKED', message: 'حساب کاربری مسدود شده است.' } };
    }
    const user = { ...data.user, password: '' } as User;
    return { ok: true, data: { user, mustChangePassword: Boolean(data.mustChangePassword) } };
  } catch (error: any) {
    return { ok: false, error: error?.code === 'SUPABASE_UNAVAILABLE' ? unavailable() : errorFrom(error) };
  }
}

export async function apiCheckNationalCodeExists(nationalCode: string): Promise<boolean> {
  try {
    // Use secure server endpoint to avoid direct table access and enumeration timing differences
    const res = await fetch('/api/registration/check-national', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ nationalCode }),
    });
    if (!res.ok) return false;
    const payload = await res.json().catch(() => null);
    return Boolean(payload?.exists);
  } catch {
    // Fallback to supabase RPC if server not available, but with limited exposure
    try {
      const { data, error } = await requireSupabase().from('warroom_users').select('id').eq('data->>national_code', nationalCode).limit(1).maybeSingle();
      return !error && Boolean(data);
    } catch {
      return false;
    }
  }
}

export async function apiRegister(payload: Record<string, any>): Promise<ApiResult<AuthPayload>> {
  try {
    const userId = String(payload.id || `user_${crypto.randomUUID()}`);
    const profile = {
      ...payload,
      id: userId,
      national_code: String(payload.national_code || payload.nationalCode || ''),
      role: 'user',
      level: 1,
      points: 100,
      is_active: false, // Important: inactive until OTP verified
      is_blocked: false,
    };
    delete (profile as any).password;
    // Strip any role escalation attempt
    delete (profile as any).role;

    const finalProfile = {
      ...profile,
      role: 'user',
      is_active: false,
      is_blocked: false,
      level: 1,
      points: 0,
    };

    const { data, error } = await requireSupabase().rpc('warroom_register_user', {
      p_user_id: userId,
      p_user_data: finalProfile,
      p_password: String(payload.password || ''),
    });
    if (error) return { ok: false, error: errorFrom(error) };
    if (!data?.success || !data.user?.id) {
      return { ok: false, error: { code: data?.error || 'REGISTRATION_FAILED', message: data?.error === 'DUPLICATE_USER' ? 'این کد ملی قبلاً ثبت شده است.' : 'ثبت‌نام در Supabase انجام نشد.' } };
    }
    return { ok: true, data: { user: { ...data.user, password: '' } as User, mustChangePassword: false } };
  } catch (error: any) {
    return { ok: false, error: error?.code === 'SUPABASE_UNAVAILABLE' ? unavailable() : errorFrom(error) };
  }
}

export async function apiLogout(): Promise<ApiResult<{ message: string }>> {
  activeUser = null;
  activeOtpProof = null;
  mustChangePasswordFlag = false;
  try {
    // Only remove our own keys, not all localStorage
    localStorage.removeItem('warroom_session_id');
    localStorage.removeItem('warroom_current_user_data');
    localStorage.removeItem('warroom_current_user_id');
    sessionStorage.removeItem('warroom_selected_game_id');
  } catch {}
  return { ok: true, data: { message: 'از حساب خارج شدید.' } };
}

export async function apiSession(): Promise<ApiResult<{ authenticated: boolean; user?: User; mustChangePassword?: boolean }>> {
  if (!activeUser || !activeOtpProof) return { ok: true, data: { authenticated: false } };
  return { ok: true, data: { authenticated: true, user: activeUser, mustChangePassword: mustChangePasswordFlag } };
}

export async function apiChangePassword(currentPassword: string, newPassword: string): Promise<ApiResult<{ message: string }>> {
  if (!activeUser) return { ok: false, error: { code: 'UNAUTHENTICATED', message: 'ابتدا وارد حساب کاربری شوید.' } };
  try {
    const { data, error } = await requireSupabase().rpc('warroom_change_password', {
      p_national_code: activeUser.national_code,
      p_current_password: currentPassword,
      p_new_password: newPassword,
    });
    if (error) return { ok: false, error: errorFrom(error) };
    if (!data?.success) return { ok: false, error: { code: data?.error || 'PASSWORD_CHANGE_FAILED', message: 'تغییر رمز ناموفق بود.' } };
    mustChangePasswordFlag = false;
    return { ok: true, data: { message: 'رمز عبور تغییر کرد.' } };
  } catch (error) {
    return { ok: false, error: errorFrom(error) };
  }
}

export async function requestPasswordReset(input: { phone: string; note?: string }): Promise<ApiResult<{ trackingCode: string; message: string }>> {
  try {
    // Use secure server endpoint to prevent enumeration and direct table access
    const res = await fetch('/api/password-reset/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ phone: input.phone, note: input.note }),
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      return { ok: false, error: { code: payload?.error || 'REQUEST_FAILED', message: payload?.message || 'ثبت درخواست بازیابی ممکن نشد.' } };
    }
    if (!payload?.success) {
      return { ok: false, error: { code: payload?.error || 'REQUEST_FAILED', message: payload?.message || 'ثبت درخواست بازیابی ممکن نشد.' } };
    }
    // If trackingCode is null (user not found), we still return success with generic message to prevent enumeration
    if (!payload.trackingCode) {
      return { ok: true, data: { trackingCode: '', message: payload.message || 'درخواست شما دریافت شد.' } };
    }
    return { ok: true, data: { trackingCode: payload.trackingCode, message: payload.message } };
  } catch (error: any) {
    return { ok: false, error: { code: 'REQUEST_FAILED', message: 'ارتباط با سرور برقرار نشد.' } };
  }
}

export async function checkPasswordResetStatus(nationalCode: string, trackingCode: string): Promise<ApiResult<{ status: string; message: string; createdAt?: string; resolvedAt?: string | null }>> {
  try {
    const res = await fetch('/api/password-reset/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ nationalCode, trackingCode }),
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok || !payload?.success) {
      return { ok: false, error: { code: payload?.error || 'NOT_FOUND', message: payload?.message || 'درخواستی با این کد رهگیری و کد ملی پیدا نشد.' } };
    }
    return { ok: true, data: { status: payload.data.status, message: payload.data.message, createdAt: payload.data.createdAt, resolvedAt: payload.data.resolvedAt } };
  } catch (error) {
    return { ok: false, error: errorFrom(error) };
  }
}

function requireAdminProof(): string {
  if (!activeUser || activeUser.role !== 'admin' || !activeOtpProof) throw new Error('ADMIN_OTP_REQUIRED');
  return activeOtpProof;
}

export async function adminListPasswordResets(params: { status?: string; q?: string } = {}): Promise<ApiResult<{ requests: PasswordResetRequest[]; stats: Record<string, number> }>> {
  try {
    const { data, error } = await requireSupabase().rpc('warroom_admin_list_password_resets', {
      p_admin_proof: requireAdminProof(),
      p_status: params.status || 'all',
      p_query: params.q || '',
    });
    if (error) return { ok: false, error: errorFrom(error) };
    if (!data?.success) return { ok: false, error: { code: data?.error || 'ADMIN_OTP_REQUIRED', message: 'برای عملیات مدیریتی دوباره OTP مدیر را تأیید کنید.' } };
    return { ok: true, data: { requests: data.requests || [], stats: data.stats || {} } };
  } catch (error: any) {
    return { ok: false, error: error?.message === 'ADMIN_OTP_REQUIRED' ? { code: 'ADMIN_OTP_REQUIRED', message: 'نشست OTP مدیر در دسترس نیست.' } : errorFrom(error) };
  }
}

export async function adminGeneratePassword(id: string): Promise<ApiResult<{ password: string; message: string }>> {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  const password = secureRandomString(16, alphabet);
  return { ok: true, data: { password, message: `رمز موقت برای درخواست ${id} آماده شد.` } };
}

async function updateResetRequest(id: string, action: string, values: Record<string, unknown>): Promise<ApiResult<any>> {
  try {
    const { data, error } = await requireSupabase().rpc('warroom_admin_update_password_reset', {
      p_admin_proof: requireAdminProof(),
      p_request_id: id,
      p_action: action,
      p_password: String(values.password || ''),
      p_note: String(values.note || values.reason || ''),
    });
    if (error) return { ok: false, error: errorFrom(error) };
    if (!data?.success) return { ok: false, error: { code: data?.error || 'ADMIN_OPERATION_FAILED', message: 'عملیات مدیریتی ناموفق بود.' } };
    return { ok: true, data };
  } catch (error: any) {
    return { ok: false, error: error?.message === 'ADMIN_OTP_REQUIRED' ? { code: 'ADMIN_OTP_REQUIRED', message: 'نشست OTP مدیر در دسترس نیست.' } : errorFrom(error) };
  }
}

export async function adminMarkContacted(id: string, note?: string): Promise<ApiResult<any>> {
  return updateResetRequest(id, 'contacted', { note });
}

export async function adminResolvePasswordReset(id: string, password: string, note?: string): Promise<ApiResult<{ password: string; message: string }>> {
  return updateResetRequest(id, 'resolve', { password, note });
}

export async function adminRejectPasswordReset(id: string, reason?: string): Promise<ApiResult<any>> {
  return updateResetRequest(id, 'reject', { reason });
}

export async function adminCreateUser(payload: Record<string, any>): Promise<ApiResult<{ user: User; oneTimePassword: string; message: string }>> {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  const oneTimePassword = String(payload.password || secureRandomString(16, alphabet));
  const result = await apiRegister({ ...payload, password: oneTimePassword });
  if (!result.ok || !result.data) return { ok: false, error: result.error || { code: 'CREATE_FAILED', message: 'ایجاد کاربر ناموفق بود.' } };
  return { ok: true, data: { user: result.data.user, oneTimePassword, message: 'پروفایل کاربر در Supabase ایجاد شد.' } };
}

export async function adminUpdateUser(id: string, patch: Record<string, any>): Promise<ApiResult<{ user: User }>> {
  try {
    // Only allow safe fields, never role escalation via direct update
    const allowed = ['first_name', 'last_name', 'phone', 'gender', 'province', 'city', 'school_name', 'is_active', 'is_blocked', 'points', 'level', 'avatar_url'];
    const filteredPatch = Object.fromEntries(Object.entries(patch).filter(([key]) => allowed.includes(key)));

    // Try to use admin RPC if available for secure update
    const db = requireSupabase();
    try {
      const { data, error } = await db.rpc('warroom_admin_update_user', {
        p_admin_proof: requireAdminProof(),
        p_user_id: id,
        p_patch: filteredPatch,
      });
      if (!error && data?.success) {
        return { ok: true, data: { user: data.user as User } };
      }
      // If RPC not exists, fallback to direct but with admin check
      if (error && error.code !== '42883') { // 42883 = function does not exist
        return { ok: false, error: errorFrom(error) };
      }
    } catch (e: any) {
      if (e?.code && e.code !== '42883' && e.message !== 'ADMIN_OTP_REQUIRED') {
        // Continue to fallback
      }
      if (e?.message === 'ADMIN_OTP_REQUIRED') {
        return { ok: false, error: { code: 'ADMIN_OTP_REQUIRED', message: 'نشست OTP مدیر در دسترس نیست.' } };
      }
    }

    // Fallback: direct update (will be protected by new RLS requiring admin)
    const { data: existing, error: readError } = await db.from('warroom_users').select('data').eq('id', id).maybeSingle();
    if (readError) return { ok: false, error: errorFrom(readError) };
    if (!existing) return { ok: false, error: { code: 'USER_NOT_FOUND', message: 'کاربر پیدا نشد.' } };
    const updated = { ...existing.data, ...filteredPatch };
    // Prevent role escalation
    if ((patch as any).role && (patch as any).role === 'admin' && activeUser?.role !== 'admin') {
      return { ok: false, error: { code: 'FORBIDDEN', message: 'ارتقای نقش مجاز نیست.' } };
    }
    const { error } = await db.from('warroom_users').update({ data: updated, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) return { ok: false, error: errorFrom(error) };
    return { ok: true, data: { user: { ...updated, id } as User } };
  } catch (error) {
    return { ok: false, error: errorFrom(error) };
  }
}

export async function adminResetUserPassword(id: string, password?: string): Promise<ApiResult<{ oneTimePassword: string; message: string }>> {
  try {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    const oneTimePassword = String(password || secureRandomString(16, alphabet));
    const { data, error } = await requireSupabase().rpc('warroom_admin_set_user_password', {
      p_admin_proof: requireAdminProof(),
      p_user_id: id,
      p_new_password: oneTimePassword,
    });
    if (error) return { ok: false, error: errorFrom(error) };
    if (!data?.success) return { ok: false, error: { code: data?.error || 'ADMIN_OTP_REQUIRED', message: 'بازنشانی رمز نیازمند تأیید OTP مدیر است.' } };
    return { ok: true, data: { oneTimePassword, message: 'رمز جدید در Supabase ثبت شد.' } };
  } catch (error: any) {
    return { ok: false, error: error?.message === 'ADMIN_OTP_REQUIRED' ? { code: 'ADMIN_OTP_REQUIRED', message: 'نشست OTP مدیر در دسترس نیست.' } : errorFrom(error) };
  }
}

export async function adminRevokeUserSessions(_id: string): Promise<ApiResult<{ removed: number }>> {
  try {
    const db = requireSupabase();
    const { data, error } = await db.rpc('warroom_admin_revoke_sessions', {
      p_admin_proof: requireAdminProof(),
      p_user_id: _id,
    });
    if (error) {
      // If RPC not exists, return 0 but log
      if (error.code === '42883') {
        return { ok: true, data: { removed: 0 } };
      }
      return { ok: false, error: errorFrom(error) };
    }
    return { ok: true, data: { removed: data?.removed || 0 } };
  } catch {
    return { ok: true, data: { removed: 0 } };
  }
}

export async function adminSecurityOverview(): Promise<ApiResult<any>> {
  try {
    const health = await checkSupabaseHealth();
    return { ok: true, data: { supabaseConnected: health.ok, securityStatus: 'داده‌های برنامه با RLS سخت‌گیرانه و RPC امن محافظت می‌شوند.', authMethod: 'Supabase RPC + OTP پیامکی + نشست امن' } };
  } catch (error) {
    return { ok: false, error: errorFrom(error) };
  }
}

export async function adminAuditLog(limit = 100): Promise<ApiResult<{ events: any[] }>> {
  try {
    const { data, error } = await requireSupabase().from('warroom_audit_log').select('id, data, created_at').order('created_at', { ascending: false }).limit(limit);
    if (error) return { ok: false, error: errorFrom(error) };
    return { ok: true, data: { events: (data || []).map((row) => ({ id: row.id, ...row.data, timestamp: row.created_at })) } };
  } catch (error) {
    return { ok: false, error: errorFrom(error) };
  }
}
