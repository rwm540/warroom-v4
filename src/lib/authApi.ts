/**
 * API برای ثبت‌نام و ورود کاربر
 */

const AUTH_API_BASE = '/api/auth';

async function postAuth<T>(path: string, data: unknown): Promise<T & { success?: boolean; error?: string; message?: string }> {
  try {
    const response = await fetch(`${AUTH_API_BASE}/${path}`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (!response.ok) return { ...result, success: false, error: result.message || result.error || 'درخواست ناموفق بود.' };
    return result;
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'ارتباط با سرور برقرار نشد.' } as T & { success: boolean; error: string };
  }
}

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
  error?: string;
}

/**
 * ثبت‌نام کاربر جدید
 */
export async function registerUser(data: RegisterData): Promise<RegisterResponse> {
  return postAuth<RegisterResponse>('register', data);
}

export async function loginUser(nationalCode: string, password: string): Promise<RegisterResponse> {
  return postAuth<RegisterResponse>('login', { nationalCode, password });
}

/**
 * بررسی وجود کد ملی
 */
export async function checkNationalCodeExists(nationalCode: string): Promise<boolean> {
  const result = await postAuth<{ exists?: boolean }>('check-national-code', { nationalCode });
  return result.exists === true;
}
