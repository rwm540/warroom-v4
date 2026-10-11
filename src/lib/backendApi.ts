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
let mustChangePassword = false;
let cachedStatus: BackendStatus | null = null;
let probePromise: Promise<BackendStatus> | null = null;
const statusListeners = new Set<(status: BackendStatus) => void>();
const STATUS_TTL_MS = 30_000;

function notify(status: BackendStatus) {
  cachedStatus = status;
  statusListeners.forEach((listener) => {
    try { listener(status); } catch { /* Ignore listener errors. */ }
  });
}

function unavailable(): ApiError {
  return { code: 'SUPABASE_UNAVAILABLE', message: 'ارتباط با Supabase برقرار نیست.' };
}

function errorFrom(error: any): ApiError {
  return { code: String(error?.code || 'SUPABASE_REQUEST_FAILED'), message: String(error?.message || 'درخواست ناموفق بود.') };
}

function requireSupabase(): NonNullable<typeof supabase> {
  if (!isSupabaseEnabled || !supabase) throw Object.assign(new Error('SUPABASE_UNAVAILABLE'), { code: 'SUPABASE_UNAVAILABLE' });
  return supabase;
}

export function setOtpVerifiedUser(user: User, proof: string) {
  if (!proof || !user.id) throw new Error('OTP verification proof is required');
  activeUser = { ...user, password: '' };
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

export async function apiLogin(nationalCode: string, password: string): Promise<ApiResult<AuthPayload>> {
  try {
    const { data, error } = await requireSupabase().rpc('warroom_verify_login', {
      p_national_code: nationalCode,
      p_password: password,
    });
    if (error) return { ok: false, error: errorFrom(error) };
    if (!data?.success || !data.user?.id) {
      return { ok: false, error: { code: data?.error || 'INVALID_CREDENTIALS', message: 'کد ملی یا رمز عبور اشتباه است.' } };
    }
    const user = { ...data.user, password: '' } as User;
    return { ok: true, data: { user, mustChangePassword: Boolean(data.mustChangePassword) } };
  } catch (error: any) {
    return { ok: false, error: error?.code === 'SUPABASE_UNAVAILABLE' ? unavailable() : errorFrom(error) };
  }
}

export async function apiCheckNationalCodeExists(nationalCode: string): Promise<boolean> {
  try {
    const { data, error } = await requireSupabase()
      .from('warroom_users')
      .select('id')
      .eq('data->>national_code', nationalCode)
      .limit(1);
    return !error && Array.isArray(data) && data.length > 0;
  } catch {
    return false;
  }
}

export async function apiRegister(payload: Record<string, any>): Promise<ApiResult<AuthPayload>> {
  try {
    const userId = String(payload.id || `user_${globalThis.crypto.randomUUID()}`);
    const profile = {
      ...payload,
      id: userId,
      national_code: String(payload.national_code || payload.nationalCode || ''),
      role: 'user',
      level: 1,
      points: 100,
      is_active: true,
      is_blocked: false,
    };
    delete profile.password;
    const { data, error } = await requireSupabase().rpc('warroom_register_user', {
      p_user_id: userId,
      p_user_data: profile,
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
  mustChangePassword = false;
  localStorage.removeItem('warroom_session_id');
  localStorage.removeItem('warroom_current_user_data');
  localStorage.removeItem('warroom_current_user_id');
  return { ok: true, data: { message: 'از حساب خارج شدید.' } };
}

export async function apiSession(): Promise<ApiResult<{ authenticated: boolean; user?: User; mustChangePassword?: boolean }>> {
  if (!activeUser || !activeOtpProof) return { ok: true, data: { authenticated: false } };
  return { ok: true, data: { authenticated: true, user: activeUser, mustChangePassword } };
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
    mustChangePassword = false;
    return { ok: true, data: { message: 'رمز عبور تغییر کرد.' } };
  } catch (error) {
    return { ok: false, error: errorFrom(error) };
  }
}

export async function requestPasswordReset(input: { phone: string; note?: string }): Promise<ApiResult<{ trackingCode: string; message: string }>> {
  try {
    const db = requireSupabase();
    const { data: userRow, error: lookupError } = await db
      .from('warroom_users')
      .select('id, data')
      .eq('data->>phone', input.phone)
      .limit(1)
      .maybeSingle();
    if (lookupError) return { ok: false, error: errorFrom(lookupError) };
    if (!userRow) return { ok: false, error: { code: 'USER_NOT_FOUND', message: 'شماره همراه در سامانه پیدا نشد.' } };
    const trackingCode = `WR-${globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
    const record = {
      id: `reset_${globalThis.crypto.randomUUID()}`,
      user_id: userRow.id,
      national_code: userRow.data?.national_code,
      contact_phone: input.phone,
      note: input.note || '',
      tracking_code: trackingCode,
      status: 'pending',
      created_at: new Date().toISOString(),
    };
    const { error } = await db.from('warroom_password_reset_requests').insert({ id: record.id, data: record });
    if (error) return { ok: false, error: errorFrom(error) };
    return { ok: true, data: { trackingCode, message: 'درخواست بازیابی در Supabase ثبت شد.' } };
  } catch (error: any) {
    return { ok: false, error: error?.code === 'SUPABASE_UNAVAILABLE' ? unavailable() : errorFrom(error) };
  }
}

export async function checkPasswordResetStatus(nationalCode: string, trackingCode: string): Promise<ApiResult<{ status: string; message: string; createdAt?: string; resolvedAt?: string | null }>> {
  try {
    const { data, error } = await requireSupabase().from('warroom_password_reset_requests').select('data');
    if (error) return { ok: false, error: errorFrom(error) };
    const record = (data || []).map((row: any) => row.data).find((item: any) =>
      item?.national_code === nationalCode && String(item.tracking_code || '').toUpperCase() === trackingCode.trim().toUpperCase());
    if (!record) return { ok: false, error: { code: 'NOT_FOUND', message: 'درخواستی با این کد رهگیری و کد ملی پیدا نشد.' } };
    return { ok: true, data: { status: record.status, message: 'وضعیت درخواست بازیابی به‌روزرسانی شد.', createdAt: record.created_at, resolvedAt: record.resolved_at || null } };
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
  const random = crypto.getRandomValues(new Uint8Array(24));
  const password = Array.from(random, (value) => alphabet[value % alphabet.length]).join('');
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
  const oneTimePassword = String(payload.password || Array.from(crypto.getRandomValues(new Uint8Array(24)), (value) => 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%'[value % 62]).join(''));
  const result = await apiRegister({ ...payload, password: oneTimePassword });
  if (!result.ok || !result.data) return { ok: false, error: result.error || { code: 'CREATE_FAILED', message: 'ایجاد کاربر ناموفق بود.' } };
  return { ok: true, data: { user: result.data.user, oneTimePassword, message: 'پروفایل کاربر در Supabase ایجاد شد.' } };
}

export async function adminUpdateUser(id: string, patch: Record<string, any>): Promise<ApiResult<{ user: User }>> {
  try {
    const db = requireSupabase();
    const { data: existing, error: readError } = await db.from('warroom_users').select('data').eq('id', id).maybeSingle();
    if (readError) return { ok: false, error: errorFrom(readError) };
    if (!existing) return { ok: false, error: { code: 'USER_NOT_FOUND', message: 'کاربر پیدا نشد.' } };
    const allowed = ['first_name', 'last_name', 'phone', 'gender', 'province', 'city', 'school_name', 'is_active', 'is_blocked', 'points', 'level', 'avatar_url'];
    const updated = { ...existing.data, ...Object.fromEntries(Object.entries(patch).filter(([key]) => allowed.includes(key))) };
    const { error } = await db.from('warroom_users').update({ data: updated, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) return { ok: false, error: errorFrom(error) };
    return { ok: true, data: { user: { ...updated, id } as User } };
  } catch (error) {
    return { ok: false, error: errorFrom(error) };
  }
}

export async function adminResetUserPassword(id: string, password?: string): Promise<ApiResult<{ oneTimePassword: string; message: string }>> {
  try {
    const oneTimePassword = String(password || Array.from(crypto.getRandomValues(new Uint8Array(24)), (value) => 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%'[value % 62]).join(''));
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
  return { ok: true, data: { removed: 0 } };
}

export async function adminSecurityOverview(): Promise<ApiResult<any>> {
  try {
    const health = await checkSupabaseHealth();
    return { ok: true, data: { supabaseConnected: health.ok, securityStatus: 'داده‌های برنامه مستقیماً در Supabase مدیریت می‌شوند.', authMethod: 'Supabase RPC، OTP پیامکی و نشست React در حافظه' } };
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
