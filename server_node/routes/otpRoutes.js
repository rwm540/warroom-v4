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
const OTP_EXPIRY_SECONDS = 120;
const MAX_VERIFY_ATTEMPTS = 5;

async function findUserByNationalCode(nationalCode) {
  const byNationalCode = await supabase
    .from('warroom_users')
    .select('id, data')
    .eq('data->>national_code', nationalCode)
    .limit(1)
    .maybeSingle();

  if (byNationalCode.error) return byNationalCode;
  if (byNationalCode.data) return byNationalCode;

  return supabase
    .from('warroom_users')
    .select('id, data')
    .eq('id', nationalCode)
    .limit(1)
    .maybeSingle();
}

async function handleSendOtp(req, res) {
  try {
    const nationalCode = String(req.body.nationalCode || '').replace(/\D/g, '');
    if (!validateNationalCode(nationalCode)) {
      return res.status(400).json({
        success: false,
        error: 'کد ملی وارد شده معتبر نیست'
      });
    }

    const { data: userRow, error: fetchError } = await findUserByNationalCode(nationalCode);
    if (fetchError) {
      console.error('خطا در جستجوی کاربر:', fetchError);
      return res.status(500).json({
        success: false,
        error: 'خطا در بررسی اطلاعات کاربر'
      });
    }

    if (!userRow) {
      return res.status(404).json({
        success: false,
        error: 'کاربری با این کد ملی یافت نشد. لطفاً ابتدا ثبت‌نام کنید.'
      });
    }

    const userData = userRow.data || {};
    const userPhone = userData.phone;
    if (!userPhone) {
      return res.status(400).json({
        success: false,
        error: 'شماره موبایل برای این کاربر ثبت نشده است'
      });
    }

    const normalizedPhone = normalizePhone(userPhone);
    if (!normalizedPhone) {
      return res.status(400).json({
        success: false,
        error: 'شماره موبایل معتبر نیست'
      });
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_SECONDS * 1000);
    const { data: otpRecord, error: insertError } = await supabase
      .from('warroom_otp_codes')
      .insert({
        user_id: userRow.id,
        national_code: nationalCode,
        phone: normalizedPhone,
        code_hash: hashOTP(otp, normalizedPhone),
        expires_at: expiresAt.toISOString(),
        is_used: false
      })
      .select('challenge_id')
      .single();

    if (insertError || !otpRecord) {
      console.error('خطا در ذخیره OTP:', insertError);
      return res.status(500).json({
        success: false,
        error: 'ذخیره کد تایید در پایگاه داده ناموفق بود.'
      });
    }

    const smsResult = await sendOTP(normalizedPhone, otp);
    if (!smsResult.success) {
      await supabase
        .from('warroom_otp_codes')
        .update({ is_used: true })
        .eq('challenge_id', otpRecord.challenge_id);
      return res.status(502).json({
        success: false,
        error: 'خطا در ارسال پیامک. لطفاً دوباره تلاش کنید.'
      });
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`🔐 [DEV] کد OTP برای ${normalizedPhone}: ${otp}`);
    }

    res.json({
      success: true,
      message: 'کد تایید به شماره موبایل شما ارسال شد',
      phone: normalizedPhone.replace(/(\d{3})(\d{4})(\d{4})/, '$1****$3'),
      maskedPhone: normalizedPhone.replace(/(\d{3})(\d{4})(\d{4})/, '$1****$3'),
      challengeToken: otpRecord.challenge_id,
      expiresIn: OTP_EXPIRY_SECONDS
    });
  } catch (error) {
    console.error('خطا در ارسال OTP:', error);
    res.status(500).json({
      success: false,
      error: 'خطای سرور در ارسال کد تایید'
    });
  }
}

router.post('/verify', otpVerifyLimiter, async (req, res) => {
  try {
    const nationalCode = String(req.body.nationalCode || '').replace(/\D/g, '');
    const { code, challengeToken } = req.body;
    if (!validateNationalCode(nationalCode)) {
      return res.status(400).json({
        success: false,
        error: 'کد ملی معتبر نیست'
      });
    }
    if (!code || !/^\d{4}$/.test(code)) {
      return res.status(400).json({
        success: false,
        error: 'کد تایید باید ۴ رقم باشد'
      });
    }
    if (!challengeToken) {
      return res.status(400).json({ success: false, error: 'نشست تایید معتبر نیست؛ کد جدید درخواست کنید.' });
    }

    const { data: userRow, error: userError } = await findUserByNationalCode(nationalCode);
    if (userError) {
      console.error('خطا در جستجوی کاربر برای تایید OTP:', userError);
      return res.status(500).json({ success: false, error: 'خطا در بررسی اطلاعات کاربر' });
    }
    if (!userRow) {
      return res.status(404).json({
        success: false,
        error: 'کاربر یافت نشد'
      });
    }

    const userPhone = userRow.data.phone;
    const normalizedPhone = normalizePhone(userPhone);

    const { data: otpRecord, error: fetchError } = await supabase
      .from('warroom_otp_codes')
      .select('*')
      .eq('challenge_id', challengeToken)
      .eq('national_code', nationalCode)
      .eq('is_used', false)
      .gte('expires_at', new Date().toISOString())
      .maybeSingle();

    if (fetchError) {
      console.error('خطا در دریافت کد OTP:', fetchError);
      return res.status(500).json({ success: false, error: 'خطا در بررسی کد تایید' });
    }
    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        error: 'کد تایید منقضی شده یا وجود ندارد. لطفاً کد جدید درخواست کنید.'
      });
    }

    if (otpRecord.attempt_count >= Math.min(otpRecord.max_attempts || MAX_VERIFY_ATTEMPTS, MAX_VERIFY_ATTEMPTS)) {
      return res.status(429).json({ success: false, error: 'تعداد تلاش‌ها بیش از حد مجاز است؛ کد جدید درخواست کنید.' });
    }

    const submittedHash = hashOTP(code, normalizedPhone);
    if (!timingSafeEqual(otpRecord.code_hash, submittedHash)) {
      const nextAttempt = otpRecord.attempt_count + 1;
      const { error: attemptError } = await supabase
        .from('warroom_otp_codes')
        .update({ attempt_count: nextAttempt, is_used: nextAttempt >= MAX_VERIFY_ATTEMPTS })
        .eq('id', otpRecord.id);
      if (attemptError) console.error('خطا در ثبت تلاش ناموفق OTP:', attemptError);
      return res.status(400).json({
        success: false,
        error: 'کد تایید نادرست است'
      });
    }

    const { error: updateError } = await supabase
      .from('warroom_otp_codes')
      .update({
        is_used: true,
        used_at: new Date().toISOString() 
      })
      .eq('id', otpRecord.id);
    if (updateError) {
      console.error('خطا در مصرف کد OTP:', updateError);
      return res.status(500).json({ success: false, error: 'ثبت تایید کد ناموفق بود.' });
    }

    if (!JWT_SECRET) {
      return res.status(500).json({ success: false, error: 'تنظیمات امنیتی سرور کامل نیست.' });
    }

    const token = jwt.sign(
      {
        userId: userRow.id,
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
        id: userRow.id,
        firstName: userRow.data.first_name,
        lastName: userRow.data.last_name
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

router.post('/send', otpSendLimiter, handleSendOtp);
router.post('/resend', otpSendLimiter, handleSendOtp);

module.exports = router;
