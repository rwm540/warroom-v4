/**
 * API برای ثبت‌نام و ورود کاربر
 */

import { apiCheckNationalCodeExists, apiLogin, apiRegister } from './backendApi';

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

export interface RegisterResponse {
  success: boolean;
  message: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    gender: string;
    national_code?: string;
    [field: string]: unknown;
  };
  group?: Record<string, unknown>;
  mustChangePassword?: boolean;
  otpProof?: string;
  error?: string;
}

/**
 * ثبت‌نام کاربر جدید
 */
export async function registerUser(data: RegisterData): Promise<RegisterResponse> {
  const result = await apiRegister({
    first_name: data.firstName,
    last_name: data.lastName,
    national_code: data.nationalCode,
    phone: data.phone,
    birth_date: data.birthDate,
    gender: data.gender,
    password: data.password,
    group_name: data.groupName,
    personal_code: data.personalCode,
    education_level: data.educationLevel,
    grade: data.grade,
    province: data.province,
    city: data.city,
    school_name: data.schoolName,
  });
  if (!result.ok || !result.data) return { success: false, message: result.error?.message || 'ثبت‌نام در Supabase ناموفق بود.', error: result.error?.message || 'ثبت‌نام در Supabase ناموفق بود.' };
  return { success: true, message: 'پروفایل در Supabase ذخیره شد.', user: result.data.user as unknown as RegisterResponse['user'], mustChangePassword: result.data.mustChangePassword };
}

export async function loginUser(nationalCode: string, password: string): Promise<RegisterResponse> {
  const result = await apiLogin(nationalCode, password);
  if (!result.ok || !result.data) return { success: false, message: result.error?.message || 'ورود ناموفق بود.', error: result.error?.message || 'ورود ناموفق بود.' };
  return { success: true, message: 'رمز عبور در Supabase تأیید شد.', user: result.data.user as unknown as RegisterResponse['user'], mustChangePassword: result.data.mustChangePassword };
}

/**
 * بررسی وجود کد ملی
 */
export async function checkNationalCodeExists(nationalCode: string): Promise<boolean> {
  return apiCheckNationalCodeExists(nationalCode);
}
