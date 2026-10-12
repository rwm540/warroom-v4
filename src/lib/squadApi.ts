/**
 * کلاینت API ساخت زیرگروه و حساب اعضای آن از داخل چت‌روم.
 * ------------------------------------------------------------------
 * همهٔ درخواست‌ها به سرور Node هم‌منشأ (/api/squads) می‌روند و گواهی نشست
 * (challenge_id تأییدشدهٔ OTP هنگام ورود) را روی هدر اختصاصی ارسال می‌کنند.
 * مرورگر هیچ‌گاه مستقیماً در جداول حساب کاربری نمی‌نویسد و leader_id یا role
 * را از سمت کلاینت اعلام نمی‌کند.
 */
import type { Group, SquadRank, User } from '../types';
import { apiRequest } from './secureApi';
import { isSupabaseEnabled, supabase } from './supabaseData';

const SQUAD_API_BASE = '/api/squads';

/**
 * هم‌راستا با ApiResult در backendApi.ts؛ در این پروژه strictNullChecks خاموش است،
 * بنابراین نتیجه به شکل یک آبجکت با فیلدهای اختیاری برگردانده می‌شود.
 */
export interface SquadApiResult<T> {
  ok: boolean;
  data?: T;
  code?: string;
  message?: string;
}

export function squadApiErrorMessage(result: SquadApiResult<unknown>): string {
  return result.message || 'عملیات ناموفق بود؛ دوباره تلاش کنید.';
}

export interface SquadMemberDraft {
  first_name: string;
  last_name: string;
  national_code: string;
  phone: string;
  birth_date?: string;
  grade?: string;
  gender?: 'پسر' | 'دختر';
  squad_rank: SquadRank;
  /** اگر خالی بماند، سرور رمز قوی یک‌بارمصرف تولید می‌کند. */
  password?: string;
}

export interface ProvisionedMember {
  national_code: string;
  login_id: string;
  user_id: string;
  status: 'created' | 'linked' | 'unchanged';
  squad_rank: SquadRank;
  must_change_password: boolean;
  /** فقط یک بار برگردانده می‌شود؛ در هیچ‌جا ذخیره نمی‌شود. */
  initial_password: string | null;
}

export interface SquadMemberCredentialStatus {
  user_id: string;
  login_id: string;
  full_name: string;
  squad_rank: SquadRank;
  role: string;
  has_credentials: boolean;
  password_algorithm: string | null;
  must_change_password: boolean;
}

interface ApiEnvelope {
  success?: boolean;
  message?: string;
  error?: string;
}

async function request<T extends ApiEnvelope>(
  method: 'GET' | 'POST',
  path: string,
  body?: unknown
): Promise<SquadApiResult<T>> {
  const payload = await apiRequest<T>(`${SQUAD_API_BASE}${path}`, { method, body });
  if (payload.success !== true) {
    return {
      ok: false,
      code: String(payload.error || 'REQUEST_FAILED'),
      message: payload.message || payload.error || 'عملیات ناموفق بود.',
    };
  }
  return { ok: true, data: payload };
}

export interface CreateSquadResponse extends ApiEnvelope {
  squad: Group;
}

export async function createSquad(input: {
  name: string;
  parentSquadId?: string | null;
  metadata?: { educationLevel?: string; gender?: string; province?: string; city?: string };
}): Promise<SquadApiResult<CreateSquadResponse>> {
  return request<CreateSquadResponse>('POST', '', {
    name: input.name,
    parentSquadId: input.parentSquadId || null,
    metadata: input.metadata || {},
  });
}

export interface ProvisionMembersResponse extends ApiEnvelope {
  squad: Group;
  summary: { created: number; linked: number; unchanged: number };
  members: ProvisionedMember[];
}

export async function provisionSquadMembers(
  squadId: string,
  members: SquadMemberDraft[]
): Promise<SquadApiResult<ProvisionMembersResponse>> {
  return request<ProvisionMembersResponse>('POST', `/${encodeURIComponent(squadId)}/members`, { members });
}

export interface MemberCredentialStatusResponse extends ApiEnvelope {
  members: SquadMemberCredentialStatus[];
}

export async function listSquadMemberCredentials(
  squadId: string
): Promise<SquadApiResult<MemberCredentialStatusResponse>> {
  return request<MemberCredentialStatusResponse>('GET', `/${encodeURIComponent(squadId)}/members`);
}

export interface ReissuePasswordResponse extends ApiEnvelope {
  loginId: string;
  userId: string;
  initialPassword: string;
  mustChangePassword: boolean;
}

export async function reissueMemberPassword(
  squadId: string,
  nationalCode: string,
  password?: string
): Promise<SquadApiResult<ReissuePasswordResponse>> {
  return request<ReissuePasswordResponse>(
    'POST',
    `/${encodeURIComponent(squadId)}/members/reissue-password`,
    { nationalCode, password: password || undefined }
  );
}

/**
 * ساخت آبجکت User محلی از نتیجهٔ سرور، تا وضعیت React با رکوردهای واقعی
 * پایگاه داده هم‌خوان بماند (شناسه‌ها را سرور تعیین می‌کند).
 */
export function userFromProvisionedMember(
  member: ProvisionedMember,
  draft: SquadMemberDraft,
  squad: Group
): User {
  return {
    id: member.user_id,
    first_name: draft.first_name,
    last_name: draft.last_name,
    national_code: member.national_code,
    phone: draft.phone,
    // رمز هرگز در کلاینت نگه داشته نمی‌شود.
    password: '',
    role: member.squad_rank === 'commander' ? 'leader' : member.squad_rank === 'soldier' ? 'member' : 'user',
    education_level: squad.education_level,
    grade: draft.grade || '',
    gender: (draft.gender || squad.gender || 'پسر') as User['gender'],
    province: squad.province,
    city: squad.city,
    birth_date: draft.birth_date || '',
    school_name: '',
    personal_code: '',
    group_id: squad.id,
    is_group_member: true,
    squad_rank: member.squad_rank,
    mustChangePassword: member.must_change_password,
    is_active: true,
    is_blocked: false,
  };
}

/**
 * واکشی رکوردهای معتبر کاربران از پایگاه داده پس از ثبت موفق، تا وضعیت محلی
 * دقیقاً همان چیزی باشد که سرور ذخیره کرده است (و هنگام همگام‌سازی بعدی،
 * فیلدهای سمت سرور مثل کد پرسنلی بازنویسی نشوند).
 */
export async function fetchUsersByIds(userIds: string[]): Promise<User[]> {
  if (!isSupabaseEnabled || !supabase || userIds.length === 0) return [];
  try {
    const { data, error } = await supabase
      .from('warroom_users_public')
      .select('id, data')
      .in('id', userIds);
    if (error || !Array.isArray(data)) return [];
    return data
      .map((row: any) => (row?.data ? ({ ...row.data, id: row.id } as User) : null))
      .filter((user): user is User => Boolean(user));
  } catch {
    return [];
  }
}
