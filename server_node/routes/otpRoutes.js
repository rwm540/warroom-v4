/**
 * مسیرهای API مربوط به OTP
 */
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { supabase } = require('../config/supabase');
const { sendOTP } = require('../services/smsService');
const { 
  generateOTP, 
  normalizePhone, 
  validateNationalCode,
  hashOTP,
  timingSafeEqual 
} = require('../utils/otp');
const { otpSendLimiter, otpVerifyLimiter } = require('../middleware/rateLimiter');

const JWT_SECRET = process.env.JWT_SECRET;
const OTP_EXPIRY_MINUTES = 5;
const MAX_VERIFY_ATTEMPTS = 5;

/**
 * POST /api/otp/send
 * ارسال کد OTP به شماره موبایل کاربر
 * 
 * Body: { nationalCode: string }
 */
router.post('/send', otpSendLimiter, async (req, res) => {
  try {
    const { nationalCode } = req.body;
    
    // اعتبارسنجی کد ملی
    if (!validateNationalCode(nationalCode)) {
      return res.status(400).json({
        success: false,
        error: 'کد ملی وارد شده معتبر نیست'
      });
    }
    
    // جستجوی کاربر در Supabase بر اساس کد ملی
    const { data: users, error: fetchError } = await supabase
      .from('warroom_users')
      .select('data')
      .eq('id', nationalCode)
      .limit(1);
    
    if (fetchError) {
      console.error('خطا در جستجوی کاربر:', fetchError);
      return res.status(500).json({
        success: false,
        error: 'خطا در بررسی اطلاعات کاربر'
      });
    }
    
    // اگر کاربری با این کد ملی در دیتابیس پیدا نشد
    if (!users || users.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'کاربری با این کد ملی یافت نشد. لطفاً ابتدا ثبت‌نام کنید.'
      });
    }
    
    const userData = users[0].data;
    const userPhone = userData.phone;
    
    // بررسی وجود شماره موبایل
    if (!userPhone) {
      return res.status(400).json({
        success: false,
        error: 'شماره موبایل برای این کاربر ثبت نشده است'
      });
    }
    
    // نرمال‌سازی شماره موبایل
    const normalizedPhone = normalizePhone(userPhone);
    if (!normalizedPhone) {
      return res.status(400).json({
        success: false,
        error: 'شماره موبایل معتبر نیست'
      });
    }
    
    // تولید کد OTP
    const otp = generateOTP();
    const otpHash = hashOTP(otp, normalizedPhone);
    
    // ارسال پیامک
    const smsResult = await sendOTP(normalizedPhone, otp);
    
    if (!smsResult.success) {
      return res.status(502).json({
        success: false,
        error: 'خطا در ارسال پیامک. لطفاً دوباره تلاش کنید.'
      });
    }
    
    // ذخیره OTP در دیتابیس با زمان انقضا
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    
    const { error: insertError } = await supabase
      .from('warroom_otp_codes')
      .insert({
        user_id: nationalCode,
        phone: normalizedPhone,
        code: otpHash, // فقط هش را ذخیره می‌کنیم، نه کد خام
        expires_at: expiresAt.toISOString(),
        is_used: false
      });
    
    if (insertError) {
      console.error('خطا در ذخیره OTP:', insertError);
      // حتی اگر ذخیره ناموفق باشد، پیامک ارسال شده است
    }
    
    // لاگ برای debug (فقط در محیط توسعه)
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔐 [DEV] کد OTP برای ${normalizedPhone}: ${otp}`);
    }
    
    res.json({
      success: true,
      message: 'کد تایید به شماره موبایل شما ارسال شد',
      phone: normalizedPhone.replace(/(\d{3})(\d{4})(\d{4})/, '$1****$3'), // ماسک کردن شماره
      expiresIn: OTP_EXPIRY_MINUTES * 60 // به ثانیه
    });
    
  } catch (error) {
    console.error('خطا در ارسال OTP:', error);
    res.status(500).json({
      success: false,
      error: 'خطای سرور در ارسال کد تایید'
    });
  }
});

/**
 * POST /api/otp/verify
 * تایید کد OTP وارد شده توسط کاربر
 * 
 * Body: { nationalCode: string, code: string }
 */
router.post('/verify', otpVerifyLimiter, async (req, res) => {
  try {
    const { nationalCode, code } = req.body;
    
    // اعتبارسنجی ورودی‌ها
    if (!validateNationalCode(nationalCode)) {
      return res.status(400).json({
        success: false,
        error: 'کد ملی معتبر نیست'
      });
    }
    
    if (!code || !/^\d{6}$/.test(code)) {
      return res.status(400).json({
        success: false,
        error: 'کد تایید باید 6 رقم باشد'
      });
    }
    
    // جستجوی شماره موبایل کاربر
    const { data: users } = await supabase
      .from('warroom_users')
      .select('data')
      .eq('id', nationalCode)
      .limit(1);
    
    if (!users || users.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'کاربر یافت نشد'
      });
    }
    
    const userPhone = users[0].data.phone;
    const normalizedPhone = normalizePhone(userPhone);
    
    // دریافت آخرین OTP معتبر برای این کاربر
    const { data: otpRecords, error: fetchError } = await supabase
      .from('warroom_otp_codes')
      .select('*')
      .eq('user_id', nationalCode)
      .eq('is_used', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (fetchError || !otpRecords || otpRecords.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'کد تایید منقضی شده یا وجود ندارد. لطفاً کد جدید درخواست کنید.'
      });
    }
    
    const otpRecord = otpRecords[0];
    
    // هش کد وارد شده
    const submittedHash = hashOTP(code, normalizedPhone);
    
    // مقایسه امن
    if (!timingSafeEqual(otpRecord.code, submittedHash)) {
      return res.status(400).json({
        success: false,
        error: 'کد تایید نادرست است'
      });
    }
    
    // علامت‌گذاری کد به عنوان استفاده‌شده
    await supabase
      .from('warroom_otp_codes')
      .update({ 
        is_used: true, 
        used_at: new Date().toISOString() 
      })
      .eq('id', otpRecord.id);
    
    // ایجاد JWT برای کاربر
    const token = jwt.sign(
      {
        userId: nationalCode,
        phone: normalizedPhone,
        verified: true
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      message: 'کد تایید با موفقیت تایید شد',
      token,
      user: {
        id: nationalCode,
        firstName: users[0].data.first_name,
        lastName: users[0].data.last_name
      }
    });
    
  } catch (error) {
    console.error('خطا در تایید OTP:', error);
    res.status(500).json({
      success: false,
      error: 'خطای سرور در تایید کد'
    });
  }
});

/**
 * POST /api/otp/resend
 * ارسال مجدد کد OTP
 */
router.post('/resend', otpSendLimiter, async (req, res) => {
  // منطق مشابه /send
  // می‌توان کد /send را فراخوانی کرد
  return router.handle(req, res);
});

module.exports = router;
