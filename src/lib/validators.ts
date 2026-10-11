/**
 * Secure frontend validators - must match server-side validation
 * Client validation is for UX only, never replaces server validation
 */

export function normalizeDigits(input: string): string {
  return String(input || '')
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/\D/g, '');
}

export function validateNationalCode(code: string): boolean {
  const clean = normalizeDigits(code);
  if (!/^\d{10}$/.test(clean)) return false;
  if (/^(\d)\1{9}$/.test(clean)) return false;
  const check = Number(clean[9]);
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += Number(clean[i]) * (10 - i);
  }
  const rem = sum % 11;
  return rem < 2 ? check === rem : check === 11 - rem;
}

export function validatePhone(phone: string): boolean {
  const clean = normalizeDigits(phone);
  let local = clean;
  if (local.startsWith('98') && local.length === 12) local = `0${local.slice(2)}`;
  if (local.startsWith('9') && local.length === 10) local = `0${local}`;
  return /^09\d{9}$/.test(local);
}

export function validatePasswordStrength(password: string): { valid: boolean; message?: string } {
  const pwd = String(password || '');
  if (pwd.length < 8) return { valid: false, message: 'رمز عبور باید حداقل ۸ کاراکتر باشد.' };
  if (pwd.length > 128) return { valid: false, message: 'رمز عبور بیش از حد طولانی است.' };
  if (/\s/.test(pwd)) return { valid: false, message: 'رمز عبور نباید فاصله داشته باشد.' };
  if (!/[A-Za-z]/.test(pwd) || !/\d/.test(pwd)) return { valid: false, message: 'رمز عبور باید ترکیبی از حرف لاتین و رقم باشد.' };
  return { valid: true };
}

export function sanitizeText(input: string, maxLen = 500): string {
  const s = String(input || '').trim();
  if (s.length > maxLen) return s.slice(0, maxLen);
  return s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

export function isSafeKvKey(key: string): boolean {
  const blocked = ['payment_settings', 'payment_secrets', 'admin_config', 'api_keys', 'server_secrets'];
  if (blocked.includes(key)) return false;
  const lower = key.toLowerCase();
  if (lower.includes('password') || lower.includes('secret') || lower.includes('token') || lower.includes('session')) return false;
  return true;
}
