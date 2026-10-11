import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { config } from '../config.js';
import {
  clientIp,
  createOtp,
  hashOtp,
  hashValue,
  isValidNationalCode,
  maskPhone,
  toE164Iran,
} from '../lib/identity.js';
import { sendOtpSms } from '../lib/sms.js';
import { assertDb, findUserByNationalCode } from '../lib/supabase.js';
import { issueRefreshToken, setSessionCookies, signAccessToken, signChallengeToken, verifyToken } from '../lib/tokens.js';

const router = Router();

function publicError(code, message, status = 400) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

async function persistRateLimit(key, max, windowSeconds) {
  const { data, error } = await assertDb().rpc('warroom_hit_otp_rate_limit', {
    p_id: key,
    p_max: max,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    throw publicError('RATE_LIMIT_STORE_FAILED', 'محدودیت امنیتی موقتاً در دسترس نیست؛ بعداً تلاش کنید.', 503);
  }
  return data === true;
}

function extractPhone(userRow) {
  const data = userRow?.data || {};
  return toE164Iran(data.phone || data.mobile || data.contact_phone);
}

async function sendForNationalCode(nationalCode, req) {
  const ip = clientIp(req);
  const allowedIp = await persistRateLimit(`otp:ip:${hashValue(ip)}`, 12, 15 * 60);
  const nationalCodeKey = hashValue(nationalCode);
  const allowedNat = await persistRateLimit(`otp:nat:${nationalCodeKey}`, config.otpMaxSend, 15 * 60);
  const allowedCool = await persistRateLimit(`otp:cool:${nationalCodeKey}`, 1, config.otpResendCooldown);

  if (!allowedIp || !allowedNat || !allowedCool) {
    throw publicError('RATE_LIMITED', 'تعداد درخواست‌ها زیاد است؛ بعداً تلاش کنید.', 429);
  }

  const userRow = await findUserByNationalCode(nationalCode);
  if (!userRow) {
    return {
      success: true,
      message: 'اگر حسابی با این کد ملی وجود داشته باشد، کد تأیید ارسال می‌شود.',
    };
  }

  const phone = extractPhone(userRow);
  if (!phone) {
    throw publicError('PHONE_MISSING', 'شماره موبایل برای این کد ملی ثبت نشده است.', 400);
  }

  const otp = createOtp();
  const otpHash = hashOtp(nationalCode, phone.e164, otp);
  const challengeId = randomUUID();
  const expiresAt = new Date(Date.now() + config.otpTtlSeconds * 1000).toISOString();
  const db = assertDb();

  const { error: revokeOtpError } = await db
    .from('warroom_otp_codes')
    .update({ is_used: true, used_at: new Date().toISOString() })
    .eq('national_code', nationalCode)
    .eq('is_used', false);
  if (revokeOtpError) throw publicError('OTP_STORE_FAILED', 'کد قبلی باطل نشد؛ دوباره تلاش کنید.', 503);

  const { error } = await db.from('warroom_otp_codes').insert({
    challenge_id: challengeId,
    user_id: userRow.id,
    national_code: nationalCode,
    phone: phone.e164,
    code_hash: otpHash,
    attempt_count: 0,
    max_attempts: config.otpMaxAttempts,
    expires_at: expiresAt,
    is_used: false,
    ip_hash: hashValue(ip),
  });

  if (error) {
    throw publicError('OTP_STORE_FAILED', 'ذخیره کد تأیید ممکن نشد؛ migrationهای Supabase را بررسی کنید.', 500);
  }

  try {
    const smsResult = await sendOtpSms(phone.e164, otp);
    const messageId = smsResult.ids?.[0];
    if (messageId) {
      const { error: messageIdError } = await db.from('warroom_otp_codes')
        .update({ sms_message_id: String(messageId).slice(0, 200) })
        .eq('challenge_id', challengeId);
      if (messageIdError) console.warn('[warroom-otp] provider message ID persistence failed');
    }
  } catch (error) {
    await db.from('warroom_otp_codes').update({ is_used: true, used_at: new Date().toISOString() })
      .eq('challenge_id', challengeId);
    throw error;
  }

  const challengeToken = signChallengeToken({
    sub: userRow.id,
    challengeId,
  });

  return {
    success: true,
    message: 'درخواست ارسال کد توسط سرویس پیامک پذیرفته شد؛ وضعیت تحویل نهایی به اپراتور وابسته است.',
    expiresIn: config.otpTtlSeconds,
    maskedPhone: maskPhone(phone.local),
    challengeToken,
  };
}

router.post('/send', async (req, res, next) => {
  try {
    const nationalCode = isValidNationalCode(req.body?.nationalCode || req.body?.national_code);
    if (!nationalCode) {
      throw publicError('INVALID_NATIONAL_CODE', 'کد ملی معتبر نیست.');
    }
    const result = await sendForNationalCode(nationalCode, req);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/resend', async (req, res, next) => {
  try {
    const nationalCode = isValidNationalCode(req.body?.nationalCode || req.body?.national_code);
    if (!nationalCode) {
      throw publicError('INVALID_NATIONAL_CODE', 'کد ملی معتبر نیست.');
    }
    const result = await sendForNationalCode(nationalCode, req);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/verify', async (req, res, next) => {
  try {
    const nationalCode = isValidNationalCode(req.body?.nationalCode || req.body?.national_code);
    const code = String(req.body?.code || '').replace(/\D/g, '');
    const challengeToken = String(req.body?.challengeToken || '');

    if (!nationalCode || !/^\d{6}$/.test(code) || !challengeToken) {
      throw publicError('INVALID_INPUT', 'کد ملی، کد تأیید یا نشست نامعتبر است.');
    }

    let challenge;
    try {
      challenge = verifyToken(challengeToken, 'otp_challenge');
    } catch {
      throw publicError('CHALLENGE_EXPIRED', 'نشست تأیید منقضی شده است. دوباره ارسال کنید.', 401);
    }

    const allowed = await persistRateLimit(`otp:verify:${hashValue(nationalCode)}`, 10, 15 * 60);
    if (!allowed) {
      throw publicError('RATE_LIMITED', 'تعداد تلاش‌های تأیید بیش از حد مجاز است.', 429);
    }

    const db = assertDb();
    const { data: challengeRow, error: challengeError } = await db
      .from('warroom_otp_codes')
      .select('phone, user_id')
      .eq('challenge_id', challenge.challengeId)
      .eq('national_code', nationalCode)
      .eq('is_used', false)
      .maybeSingle();
    if (challengeError) throw publicError('OTP_LOOKUP_FAILED', 'بررسی کد تأیید ممکن نشد.', 503);
    if (!challengeRow || challengeRow.user_id !== challenge.sub) {
      throw publicError('OTP_EXPIRED', 'کد منقضی شده یا وجود ندارد.');
    }

    const submitted = hashOtp(nationalCode, challengeRow.phone, code);
    const { data: verificationRows, error: verifyError } = await db.rpc('warroom_verify_otp', {
      p_challenge_id: challenge.challengeId,
      p_national_code: nationalCode,
      p_code_hash: submitted,
    });
    if (verifyError) throw publicError('OTP_VERIFY_FAILED', 'بررسی کد تأیید ممکن نشد.', 503);
    const verification = Array.isArray(verificationRows) ? verificationRows[0] : verificationRows;
    if (verification?.result === 'locked') throw publicError('OTP_LOCKED', 'تعداد تلاش‌های مجاز تمام شده است.', 429);
    if (verification?.result === 'invalid') throw publicError('OTP_INVALID', 'کد تأیید اشتباه است.');
    if (verification?.result !== 'valid' || verification.user_id !== challenge.sub) {
      throw publicError('OTP_EXPIRED', 'کد منقضی شده یا وجود ندارد.');
    }

    const userRow = await findUserByNationalCode(nationalCode);
    const user = {
      id: verification.user_id,
      national_code: nationalCode,
      role: userRow?.data?.role || 'user',
      first_name: userRow?.data?.first_name || '',
      last_name: userRow?.data?.last_name || '',
    };

    const refresh = await issueRefreshToken(user.id);
    const accessToken = signAccessToken(user, refresh.sessionId);
    setSessionCookies(res, accessToken, refresh.token);

    res.json({
      success: true,
      tokenType: 'Bearer',
      expiresIn: config.jwtAccessTtl,
      user,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
