/**
 * ابزارهای تولید و مدیریت کد OTP
 */
const crypto = require('crypto');

/**
 * تولید کد OTP شش رقمی امن
 * @returns {string} کد ۶ رقمی
 */
function generateOTP() {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * نرمال‌سازی شماره موبایل ایران
 * @param {string} phone - شماره موبایل
 * @returns {string|null} شماره نرمال‌شده یا null
 */
function normalizePhone(phone) {
  if (typeof phone !== 'string') return null;
  
  // حذف فاصله‌ها و کاراکترهای اضافی
  const cleaned = phone.trim().replace(/[\s\-()]/g, '');
  
  // بررسی فرمت‌های مختلف
  if (/^09\d{9}$/.test(cleaned)) {
    return `+98${cleaned.slice(1)}`; // تبدیل 09123456789 به +989123456789
  } else if (/^\+989\d{9}$/.test(cleaned)) {
    return cleaned; // قبلاً نرمال است
  } else if (/^989\d{9}$/.test(cleaned)) {
    return `+${cleaned}`; // تبدیل 989123456789 به +989123456789
  }
  
  return null;
}

/**
 * اعتبارسنجی کد ملی ایرانی
 * @param {string} nationalCode - کد ملی ۱۰ رقمی
 * @returns {boolean}
 */
function validateNationalCode(nationalCode) {
  if (!nationalCode || typeof nationalCode !== 'string') return false;
  
  const code = nationalCode.replace(/\D/g, '');
  if (code.length !== 10) return false;
  
  // بررسی کدهای تکراری نامعتبر
  if (/^(\d)\1{9}$/.test(code)) return false;
  
  // الگوریتم اعتبارسنجی کد ملی
  const check = parseInt(code[9]);
  let sum = 0;
  
  for (let i = 0; i < 9; i++) {
    sum += parseInt(code[i]) * (10 - i);
  }
  
  const remainder = sum % 11;
  return (remainder < 2 && check === remainder) || (remainder >= 2 && check === 11 - remainder);
}

/**
 * هش امن کد OTP برای ذخیره در دیتابیس
 * @param {string} otp - کد OTP
 * @param {string} phone - شماره موبایل
 * @returns {string} هش SHA-256
 */
function hashOTP(otp, phone) {
  const secret = process.env.JWT_SECRET || 'default_secret_key';
  return crypto
    .createHmac('sha256', secret)
    .update(`${phone}:${otp}`)
    .digest('hex');
}

/**
 * مقایسه امن دو هش (جلوگیری از حملات Timing Attack)
 * @param {string} a - هش اول
 * @param {string} b - هش دوم
 * @returns {boolean}
 */
function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  
  if (bufA.length !== bufB.length) return false;
  
  return crypto.timingSafeEqual(bufA, bufB);
}

module.exports = {
  generateOTP,
  normalizePhone,
  validateNationalCode,
  hashOTP,
  timingSafeEqual
};
