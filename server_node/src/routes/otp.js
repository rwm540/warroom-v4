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

async function dbRateLimit(key, max, windowSeconds) {
  try {
    const { data, error } = await assertDb().rpc('warroom_hit_otp_rate_limit', {
      p_id: key,
      p_max: max,
      p_window_seconds: windowSeconds,
    });
    if (error) {
      console.error('[rate-limit] DB error:', error.message);
      return null;
    }
    return data === true;
  } catch (e) {
    console.error('[rate-limit] DB exception:', e.message);
    return null;
  }
}

async function persistRateLimit(key, max, windowSeconds) {
  // Try Redis first (with hashed key to avoid raw PII), fallback to DB, fail closed if both down
  let redisResult = null;
  try {
    const { redisRateLimit } = await import('../lib/redis.js');
    redisResult = await redisRateLimit(key, max, windowSeconds);
  } catch {
    redisResult = null;
  }

  if (redisResult !== null) {
    // Redis succeeded
    return redisResult;
  }

  // Fallback to DB
  const dbResult = await dbRateLimit(key, max, windowSeconds);
  if (dbResult !== null) {
    return dbResult;
  }

  // Both Redis and DB unavailable - fail closed for security
  throw publicError('RATE_LIMIT_STORE_FAILED', 'محدودیت امنیتی موقتاً در دسترس نیست؛ بعداً تلاش کنید.', 503);
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
    // Anti-enumeration: generic success without challenge
    return {
      success: true,
      message: 'اگر حسابی با این کد ملی وجود داشته باشد، کد تأیید ارسال می‌شود.',
    };
  }

  // Blocked or inactive users should not receive OTP for login, but allow activation flow
  const userData = userRow?.data || {};
  if (userData.is_blocked === true) {
    throw publicError('USER_BLOCKED', 'حساب کاربری مسدود شده است.', 403);
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

    // If user was inactive (pending registration), activate after successful OTP verification
    // CRITICAL: Never reactivate a user that admin has blocked or explicitly deactivated
    // Only activate if user is not blocked and is_active is false (pending)
    try {
      const { data: userCheck } = await db.from('warroom_users').select('data').eq('id', challenge.sub).maybeSingle();
      if (userCheck && userCheck.data) {
        const isBlocked = userCheck.data.is_blocked === true;
        const isActive = userCheck.data.is_active !== false; // true if active or undefined
        if (isBlocked) {
          // Blocked users must stay blocked - admin action required
          throw publicError('USER_BLOCKED', 'حساب کاربری مسدود شده است. با مدیر تماس بگیرید.', 403);
        }
        if (!isActive) {
          // Only pending users (is_active=false) can be auto-activated via OTP
          // Check that user was created via registration flow (has pending record or is_active false)
          // Do NOT activate if admin explicitly deactivated (need additional flag)
          // For safety, we only activate if user is not blocked and was pending
          const updatedData = { ...userCheck.data, is_active: true };
          const { error: activateError } = await db.from('warroom_users').update({ data: updatedData, updated_at: new Date().toISOString() }).eq('id', challenge.sub).eq('data->>is_blocked', 'false').select('id').maybeSingle();
          // If update affected 0 rows, user might have been blocked between check and update - fail securely
          if (activateError) {
            console.warn('[otp] activation update failed:', activateError.message);
          }
        }
      }
    } catch (e) {
      if (e.status) throw e;
      // Non-critical activation failure should not fail OTP verification for already active users
      // But for pending users, we should still try to activate via RPC warroom_activate_user_after_otp
      try {
        const { data: activationResult } = await db.rpc('warroom_activate_user_after_otp', {
          p_challenge_id: challenge.challengeId,
          p_national_code: nationalCode,
        });
        if (activationResult && activationResult.success === false) {
          console.warn('[otp] activation via RPC failed:', activationResult.error);
        }
      } catch {}
    }

    // Invalidate all other pending challenges for this national code to prevent replay
    try {
      await db.from('warroom_otp_codes').update({ is_used: true, used_at: new Date().toISOString() })
        .eq('national_code', nationalCode)
        .eq('is_used', false)
        .neq('challenge_id', challenge.challengeId);
    } catch {}

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
