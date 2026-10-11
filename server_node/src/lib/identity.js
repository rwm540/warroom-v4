import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { config } from '../config.js';

const SECRET_PLACEHOLDER = /^(replace_|your_|change_me|unset_)/i;

export function normalizeDigits(input) {
  return String(input || '')
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/\D/g, '');
}

export function normalizeOtpCode(input) {
  const value = String(input ?? '');
  if (!/^[0-9۰-۹٠-٩]{6}$/.test(value)) return null;
  return normalizeDigits(value);
}

export function isValidNationalCode(raw) {
  const code = normalizeDigits(raw);
  if (!/^\d{10}$/.test(code) || /^(\d)\1{9}$/.test(code)) return null;

  const checksum = Number(code[9]);
  const weightedSum = code.slice(0, 9).split('').reduce(
    (total, digit, index) => total + Number(digit) * (10 - index),
    0,
  );
  const remainder = weightedSum % 11;
  const isValidChecksum = remainder < 2 ? checksum === remainder : checksum === 11 - remainder;
  return isValidChecksum ? code : null;
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

function assertOtpSecrets() {
  if (
    config.otpSecret.length < 32 ||
    config.otpChallengeSecret.length < 32 ||
    config.otpSecret === config.otpChallengeSecret ||
    SECRET_PLACEHOLDER.test(config.otpSecret) ||
    SECRET_PLACEHOLDER.test(config.otpChallengeSecret)
  ) {
    const error = new Error('AUTH_SECRETS_NOT_CONFIGURED');
    error.status = 503;
    error.code = 'AUTH_SECRETS_NOT_CONFIGURED';
    throw error;
  }
}

export function createOtp() {
  assertOtpSecrets();
  if (!Number.isInteger(config.otpTtlSeconds) || config.otpTtlSeconds < 60 || config.otpTtlSeconds > 900) {
    const error = new Error('OTP_TTL_INVALID');
    error.status = 503;
    error.code = 'OTP_TTL_INVALID';
    throw error;
  }
  return String(randomInt(100000, 1000000));
}

export function hashOtp(nationalCode, phone, otp) {
  if (config.otpSecret.length < 32 || SECRET_PLACEHOLDER.test(config.otpSecret)) {
    const error = new Error('OTP_SECRET_NOT_CONFIGURED');
    error.status = 503;
    error.code = 'OTP_SECRET_NOT_CONFIGURED';
    throw error;
  }
  return createHmac('sha256', config.otpSecret)
    .update(`otp-code:${nationalCode}:${phone}:${otp}`)
    .digest('hex');
}

export function hashNationalCodeForChallenge(nationalCode) {
  if (config.otpSecret.length < 32 || SECRET_PLACEHOLDER.test(config.otpSecret)) {
    const error = new Error('OTP_SECRET_NOT_CONFIGURED');
    error.status = 503;
    error.code = 'OTP_SECRET_NOT_CONFIGURED';
    throw error;
  }
  return createHmac('sha256', config.otpSecret)
    .update(`otp-challenge-national-code:${nationalCode}`)
    .digest('hex');
}

export function safeEqualHex(a, b) {
  const left = Buffer.from(String(a || ''), 'hex');
  const right = Buffer.from(String(b || ''), 'hex');
  return left.length === 32 && left.length === right.length && timingSafeEqual(left, right);
}

export function hashValue(value) {
  if (config.otpSecret.length < 32 || SECRET_PLACEHOLDER.test(config.otpSecret)) {
    const error = new Error('OTP_SECRET_NOT_CONFIGURED');
    error.status = 503;
    error.code = 'OTP_SECRET_NOT_CONFIGURED';
    throw error;
  }
  return createHmac('sha256', config.otpSecret)
    .update(`otp-rate-limit:${String(value || '')}`)
    .digest('hex');
}

export function clientIp(req) {
  return String(req.ip || req.socket?.remoteAddress || 'unknown');
}
