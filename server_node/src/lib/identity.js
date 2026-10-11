import { createHmac, createHash, randomInt, timingSafeEqual } from 'node:crypto';
import { config } from '../config.js';

export function normalizeDigits(input) {
  return String(input || '')
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/\D/g, '');
}

export function isValidNationalCode(raw) {
  const code = normalizeDigits(raw);
  if (!/^\d{10}$/.test(code) || /^(\d)\1{9}$/.test(code)) return null;
  return code;
}

export function toE164Iran(input) {
  const digits = normalizeDigits(input);
  let local = digits;
  if (local.startsWith('98') && local.length === 12) local = `0${local.slice(2)}`;
  if (local.startsWith('9') && local.length === 10) local = `0${local}`;
  if (!/^09\d{9}$/.test(local)) return null;
  return { local, e164: `+98${local.slice(1)}` };
}

export function maskPhone(e164OrLocal) {
  const digits = normalizeDigits(e164OrLocal);
  const local = digits.length === 12 && digits.startsWith('98') ? `0${digits.slice(2)}` : digits;
  if (local.length < 8) return '۰۹*******';
  return `${local.slice(0, 4)}***${local.slice(-2)}`;
}

export function createOtp() {
  return String(randomInt(100000, 1000000));
}

export function hashOtp(nationalCode, phone, otp) {
  return createHmac('sha256', config.otpSecret)
    .update(`${nationalCode}:${phone}:${otp}`)
    .digest('hex');
}

export function safeEqualHex(a, b) {
  const left = Buffer.from(String(a || ''), 'hex');
  const right = Buffer.from(String(b || ''), 'hex');
  return left.length === 32 && left.length === right.length && timingSafeEqual(left, right);
}

export function hashValue(value) {
  return createHash('sha256').update(String(value || '')).digest('hex');
}

export function clientIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || req.socket?.remoteAddress || 'unknown';
}
