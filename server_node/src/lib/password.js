import { randomInt } from 'node:crypto';

const MIN_LENGTH = 8;
const RECOMMENDED_MIN = 12;

export function validatePasswordStrength(password) {
  const pwd = String(password || '');
  if (pwd.length < MIN_LENGTH) {
    return { valid: false, reason: 'WEAK_PASSWORD', message: `رمز عبور باید حداقل ${MIN_LENGTH} کاراکتر باشد.` };
  }
  if (pwd.length > 128) {
    return { valid: false, reason: 'PASSWORD_TOO_LONG', message: 'رمز عبور بیش از حد طولانی است.' };
  }
  if (/\s/.test(pwd)) {
    return { valid: false, reason: 'PASSWORD_HAS_SPACE', message: 'رمز عبور نباید فاصله داشته باشد.' };
  }
  const hasLetter = /[A-Za-z]/.test(pwd);
  const hasDigit = /\d/.test(pwd);
  if (!hasLetter || !hasDigit) {
    return { valid: false, reason: 'WEAK_PASSWORD', message: 'رمز عبور باید ترکیبی از حرف لاتین و رقم باشد.' };
  }
  const lower = pwd.toLowerCase();
  const common = ['123456', 'password', 'qwerty', '111111', 'abc123'];
  if (common.some(c => lower.includes(c))) {
    return { valid: false, reason: 'WEAK_PASSWORD', message: 'رمز عبور بسیار ساده است.' };
  }
  return { valid: true, recommended: pwd.length >= RECOMMENDED_MIN };
}

export function generateSecurePassword(length = 16) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  let pwd = '';
  for (let i = 0; i < length; i++) {
    pwd += alphabet[randomInt(0, alphabet.length)];
  }
  return pwd;
}
