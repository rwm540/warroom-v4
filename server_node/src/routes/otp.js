import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { config } from '../config.js';
import {
  clientIp,
  createOtp,
  hashNationalCodeForChallenge,
  hashOtp,
  hashValue,
  isValidNationalCode,
  maskPhone,
  normalizeOtpCode,
  safeEqualHex,
  toE164Iran,
} from '../lib/identity.js';
import { sendOtpSms } from '../lib/sms.js';
import { assertDb, findUserByNationalCode } from '../lib/supabase.js';
import { signChallengeToken, verifyToken } from '../lib/tokens.js';

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

async function invalidateChallenge(db, challengeId) {
  const { error } = await db
    .from('warroom_otp_codes')
    .update({ is_used: true, used_at: new Date().toISOString() })
    .eq('challenge_id', challengeId)
    .eq('is_used', false);
  if (error) throw error;
}

async function sendForNationalCode(nationalCode, req) {
  const ip = clientIp(req);
  const nationalCodeKey = hashValue(nationalCode);
  const allowedIp = await persistRateLimit(`otp:ip:${hashValue(ip)}`, 12, 15 * 60);
  const allowedNationalCode = await persistRateLimit(`otp:national:${nationalCodeKey}`, config.otpMaxSend, 15 * 60);
  const allowedCooldown = await persistRateLimit(`otp:cooldown:${nationalCodeKey}`, 1, config.otpResendCooldown);

  if (!allowedIp || !allowedNationalCode || !allowedCooldown) {
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
    throw publicError('PHONE_MISSING', 'شماره موبایل معتبر برای این حساب ثبت نشده است.', 400);
  }

  const otp = createOtp();
  const otpHash = hashOtp(nationalCode, phone.e164, otp);
  const challengeId = randomUUID();
  const issuedAtMs = Math.floor(Date.now() / 1000) * 1000;
  const expiresAtMs = issuedAtMs + config.otpTtlSeconds * 1000;
  const expiresAt = new Date(expiresAtMs).toISOString();
  const challengeToken = signChallengeToken({
    sub: String(userRow.id),
    challengeId,
    nationalCodeBinding: hashNationalCodeForChallenge(nationalCode),
  }, expiresAtMs);
  const db = assertDb();
  const issuedAt = new Date(issuedAtMs).toISOString();

  const { error: revokeOtpError } = await db
    .from('warroom_otp_codes')
    .update({ is_used: true, used_at: issuedAt })
    .eq('national_code', nationalCode)
    .eq('is_used', false);
  if (revokeOtpError) {
    throw publicError('OTP_STORE_FAILED', 'کد قبلی باطل نشد؛ درخواست جدید ثبت نشد.', 503);
  }

  const { error: insertError } = await db.from('warroom_otp_codes').insert({
    challenge_id: challengeId,
    user_id: String(userRow.id),
    national_code: nationalCode,
    phone: phone.e164,
    code_hash: otpHash,
    attempt_count: 0,
    max_attempts: config.otpMaxAttempts,
    expires_at: expiresAt,
    is_used: false,
    ip_hash: hashValue(ip),
  });

  if (insertError) {
    throw publicError('OTP_STORE_FAILED', 'ذخیره کد تأیید ممکن نشد.', 503);
  }

  try {
    const smsResult = await sendOtpSms(phone.e164, otp, { issuedAtMs, expiresAtMs });
    const messageId = smsResult.ids?.[0];
    if (!messageId) {
      throw publicError('SMS_SEND_FAILED', 'ارسال پیامک توسط سرویس تأیید نشد.', 502);
    }

    const { data: savedMessage, error: messageIdError } = await db
      .from('warroom_otp_codes')
      .update({ sms_message_id: messageId })
      .eq('challenge_id', challengeId)
      .eq('is_used', false)
      .select('challenge_id')
      .maybeSingle();
    if (messageIdError || !savedMessage) {
      throw publicError('OTP_STORE_FAILED', 'ثبت نتیجه سرویس پیامک در پایگاه داده ناموفق بود.', 503);
    }

    const expiresIn = Math.floor((expiresAtMs - Date.now()) / 1000);
    if (expiresIn <= 0) {
      throw publicError('OTP_EXPIRED', 'مهلت کد تأیید هنگام ارسال پایان یافت؛ دوباره درخواست کنید.', 503);
    }

    return {
      success: true,
      message: 'درخواست ارسال کد توسط سرویس پیامک پذیرفته شد؛ تحویل نهایی به اپراتور وابسته است.',
      expiresIn,
      maskedPhone: maskPhone(phone.local),
      challengeToken,
    };
  } catch (error) {
    try {
      await invalidateChallenge(db, challengeId);
    } catch {
      throw publicError('OTP_CLEANUP_FAILED', 'ارسال پیامک تأیید نشد و پاک‌سازی کد نیز ناموفق بود؛ با پشتیبانی تماس بگیرید.', 503);
    }
    throw error;
  }
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
    const code = normalizeOtpCode(req.body?.code);
    const challengeToken = String(req.body?.challengeToken || '');

    if (!nationalCode || !code || !challengeToken) {
      throw publicError('INVALID_INPUT', 'کد ملی، کد تأیید شش‌رقمی یا نشست نامعتبر است.');
    }

    let challenge;
    try {
      challenge = verifyToken(challengeToken, 'otp_challenge');
    } catch {
      throw publicError('CHALLENGE_EXPIRED', 'نشست تأیید منقضی یا نامعتبر است. دوباره کد را ارسال کنید.', 401);
    }

    if (
      typeof challenge.sub !== 'string' ||
      typeof challenge.challengeId !== 'string' ||
      !safeEqualHex(challenge.nationalCodeBinding, hashNationalCodeForChallenge(nationalCode))
    ) {
      throw publicError('CHALLENGE_MISMATCH', 'نشست تأیید با این کد ملی سازگار نیست.', 401);
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
    if (challengeError) {
      throw publicError('OTP_LOOKUP_FAILED', 'بررسی کد تأیید ممکن نشد.', 503);
    }
    if (!challengeRow || String(challengeRow.user_id) !== challenge.sub) {
      throw publicError('OTP_EXPIRED', 'کد منقضی شده یا وجود ندارد.');
    }

    const submitted = hashOtp(nationalCode, challengeRow.phone, code);
    const { data: verificationRows, error: verifyError } = await db.rpc('warroom_verify_otp', {
      p_challenge_id: challenge.challengeId,
      p_national_code: nationalCode,
      p_code_hash: submitted,
    });
    if (verifyError) {
      throw publicError('OTP_VERIFY_FAILED', 'بررسی کد تأیید ممکن نشد.', 503);
    }

    const verification = Array.isArray(verificationRows) ? verificationRows[0] : verificationRows;
    if (verification?.result === 'locked') {
      throw publicError('OTP_LOCKED', 'تعداد تلاش‌های مجاز تمام شده است.', 429);
    }
    if (verification?.result === 'invalid') {
      throw publicError('OTP_INVALID', 'کد تأیید اشتباه است.');
    }
    if (verification?.result !== 'valid' || String(verification.user_id) !== challenge.sub) {
      throw publicError('OTP_EXPIRED', 'کد منقضی شده یا قبلاً مصرف شده است.');
    }

    res.json({
      success: true,
      message: 'کد تأیید شد.',
      user: { id: challenge.sub, otpProof: challenge.challengeId },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
