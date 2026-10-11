/**
 * محدودسازی درخواست‌ها (Rate Limiting)
 */
const rateLimit = require('express-rate-limit');

/**
 * محدودسازی عمومی API
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقیقه
  max: 100, // حداکثر 100 درخواست
  message: {
    success: false,
    error: 'تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً بعداً تلاش کنید.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * محدودسازی ارسال OTP
 * هر IP می‌تواند در هر 15 دقیقه حداکثر 3 بار درخواست ارسال OTP بدهد
 */
const otpSendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  skipSuccessfulRequests: false,
  message: {
    success: false,
    error: 'شما بیش از حد مجاز درخواست کد تایید داده‌اید. لطفاً 15 دقیقه صبر کنید.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * محدودسازی تایید OTP
 * هر IP می‌تواند در هر 15 دقیقه حداکثر 10 بار تلاش تایید کند
 */
const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    error: 'تعداد تلاش‌های شما برای تایید کد بیش از حد مجاز است.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  apiLimiter,
  otpSendLimiter,
  otpVerifyLimiter
};
