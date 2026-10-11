import { normalizeDigits } from './identity.js';

export function isValidIranianNationalCodeChecksum(code) {
  const digits = normalizeDigits(code);
  if (!/^\d{10}$/.test(digits) || /^(\d)\1{9}$/.test(digits)) return false;
  const checksum = Number(digits[9]);
  const sum = digits.slice(0, 9).split('').reduce((total, d, idx) => total + Number(d) * (10 - idx), 0);
  const remainder = sum % 11;
  const valid = remainder < 2 ? checksum === remainder : checksum === 11 - remainder;
  return valid;
}

export function validatePhone(phone) {
  const digits = normalizeDigits(phone);
  let local = digits;
  if (local.startsWith('98') && local.length === 12) local = `0${local.slice(2)}`;
  if (local.startsWith('9') && local.length === 10) local = `0${local}`;
  return /^09\d{9}$/.test(local) ? local : null;
}

export function sanitizeText(input, maxLen = 500) {
  const s = String(input || '').trim();
  if (s.length === 0) return '';
  if (s.length > maxLen) return s.slice(0, maxLen);
  // Remove control chars, keep Persian/Arabic/Latin
  return s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

export function validateGroupName(name) {
  const clean = sanitizeText(name, 100);
  if (clean.length < 2) return null;
  if (clean.length > 80) return null;
  return clean;
}
