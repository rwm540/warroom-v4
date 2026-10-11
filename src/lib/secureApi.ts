/**
 * Secure API client for registration and password reset - uses Node server, not direct Supabase
 */

interface ApiEnvelope {
  success?: boolean;
  message?: string;
  error?: string;
}

async function postJson<T extends ApiEnvelope>(path: string, body: unknown): Promise<T> {
  try {
    const response = await fetch(path, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => null);
    if (!payload || typeof payload !== 'object') {
      return { success: false, error: 'پاسخ معتبر از سرور دریافت نشد.' } as T;
    }
    const data = payload as T;
    if (!response.ok) {
      return { ...data, success: false, error: data.message || data.error || `درخواست ناموفق (${response.status})` } as T;
    }
    return data;
  } catch {
    return { success: false, error: 'ارتباط با سرور برقرار نشد.' } as T;
  }
}

export interface RegistrationStartResponse extends ApiEnvelope {
  success: boolean;
  pendingId?: string | null;
  nationalCode?: string;
  maskedPhone?: string;
  expiresAt?: string;
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
  return postJson<RegistrationStartResponse>('/api/registration/start', data);
}

export interface CheckNationalResponse extends ApiEnvelope {
  success: boolean;
  exists: boolean;
}

export async function checkNationalSecure(nationalCode: string): Promise<CheckNationalResponse> {
  return postJson<CheckNationalResponse>('/api/registration/check-national', { nationalCode });
}

export interface PasswordResetRequestResponse extends ApiEnvelope {
  success: boolean;
  trackingCode?: string | null;
}

export async function requestPasswordResetSecure(phone: string, note?: string): Promise<PasswordResetRequestResponse> {
  return postJson<PasswordResetRequestResponse>('/api/password-reset/request', { phone, note });
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

export async function checkPasswordResetStatusSecure(nationalCode: string, trackingCode: string): Promise<PasswordResetStatusResponse> {
  return postJson<PasswordResetStatusResponse>('/api/password-reset/status', { nationalCode, trackingCode });
}
