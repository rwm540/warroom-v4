/**
 * API برای ثبت‌نام و ورود کاربر
 */

const AUTH_API_BASE = import.meta.env.VITE_OTP_API_URL?.replace('/otp', '/auth') || 'http://localhost:5000/api/auth';

export interface RegisterData {
  firstName: string;
  lastName: string;
  nationalCode: string;
  phone: string;
  birthDate: string;
  gender: 'دختر' | 'پسر';
  password: string;
  groupName?: string;
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
  };
  error?: string;
}

/**
 * ثبت‌نام کاربر جدید
 */
export async function registerUser(data: RegisterData): Promise<RegisterResponse> {
  try {
    const response = await fetch(`${AUTH_API_BASE}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('خطا در ثبت‌نام:', error);
    return {
      success: false,
      message: 'خطا در ارتباط با سرور',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * بررسی وجود کد ملی
 */
export async function checkNationalCodeExists(nationalCode: string): Promise<boolean> {
  try {
    const response = await fetch(`${AUTH_API_BASE}/check-national-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ nationalCode })
    });

    const result = await response.json();
    return result.exists === true;
  } catch (error) {
    console.error('خطا در بررسی کد ملی:', error);
    return false;
  }
}
