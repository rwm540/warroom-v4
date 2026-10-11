import { Router } from 'express';
import { config } from '../config.js';
import {
  clientIp,
  createOtp,
  hashOtp,
  hashValue,
  isValidNationalCode,
  maskPhone,
  safeEqualHex,
  toE164Iran,
} from '../lib/identity.js';
import { sendOtpSms } from '../lib/sms.js';
import { assertDb, findUserByNationalCode } from '../lib/supabase.js';
import { issueRefreshToken, signAccessToken, signChallengeToken, verifyToken } from '../lib/tokens.js';

const router = Router();
const memoryRate = new Map();

function publicError(code, message, status = 400) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

async function hitRateLimit(key, max, windowSeconds) {
  const now = Date.now();
  const record = memoryRate.get(key);
  if (!record || record.resetAt <= now) {
    memoryRate.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return true;
  }
  record.count += 1;
  return record.count <= max;
}

async function persistRateLimit(key, max, windowSeconds) {
  try {
    const db = assertDb();
    const { data } = await db
      .from('warroom_otp_rate_limits')
      .select('*')
      .eq('id', key)
      .maybeSingle();
    const now = new Date();
    if (!data || new Date(data.window_end) <= now) {
      await db.from('warroom_otp_rate_limits').upsert({
        id: key,
        hit_count: 1,
        window_end: new Date(now.getTime() + windowSeconds * 1000).toISOString(),
      });
      return true;
    }
    const next = Number(data.hit_count || 0) + 1;
    await db.from('warroom_otp_rate_limits').update({ hit_count: next }).eq('id', key);
    return next <= max;
  } catch {
    return hitRateLimit(key, max, windowSeconds);
  }
}

function extractPhone(userRow) {
  const data = userRow?.data || {};
  return toE164Iran(data.phone || data.mobile || data.contact_phone);
}

async function sendForNationalCode(nationalCode, req) {
  const ip = clientIp(req);
  const allowedIp = await persistRateLimit(`otp:ip:${hashValue(ip)}`, 12, 15 * 60);
  const allowedNat = await persistRateLimit(`otp:nat:${nationalCode}`, config.otpMaxSend, 15 * 60);
  const allowedCool = await persistRateLimit(`otp:cool:${nationalCode}`, 1, config.otpResendCooldown);

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
  const challengeId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + config.otpTtlSeconds * 1000).toISOString();
  const db = assertDb();

  await db
    .from('warroom_otp_codes')
    .update({ is_used: true, used_at: new Date().toISOString() })
    .eq('national_code', nationalCode)
    .eq('is_used', false);

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
    throw publicError('OTP_STORE_FAILED', 'ذخیره کد تأیید ممکن نشد. ابتدا query.sql را اجرا کنید.', 500);
  }

  await sendOtpSms(phone.e164, otp);

  const challengeToken = signChallengeToken({
    sub: userRow.id,
    nationalCode,
    challengeId,
  });

  return {
    success: true,
    message: 'در صورت امکان، کد تأیید به شماره ثبت‌شده ارسال شد.',
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

    if (challenge.nationalCode !== nationalCode) {
      throw publicError('CHALLENGE_MISMATCH', 'درخواست تأیید با کد ملی مطابقت ندارد.', 401);
    }

    const allowed = await persistRateLimit(`otp:verify:${nationalCode}`, 10, 15 * 60);
    if (!allowed) {
      throw publicError('RATE_LIMITED', 'تعداد تلاش‌های تأیید بیش از حد مجاز است.', 429);
    }

    const db = assertDb();
    const { data: row } = await db
      .from('warroom_otp_codes')
      .select('*')
      .eq('challenge_id', challenge.challengeId)
      .eq('national_code', nationalCode)
      .eq('is_used', false)
      .maybeSingle();

    if (!row || new Date(row.expires_at) < new Date()) {
      throw publicError('OTP_EXPIRED', 'کد منقضی شده یا وجود ندارد.');
    }

    const attempts = Number(row.attempt_count || 0) + 1;
    await db.from('warroom_otp_codes').update({ attempt_count: attempts }).eq('id', row.id);

    if (attempts > Number(row.max_attempts || config.otpMaxAttempts)) {
      await db.from('warroom_otp_codes').update({ is_used: true, used_at: new Date().toISOString() }).eq('id', row.id);
      throw publicError('OTP_LOCKED', 'تعداد تلاش‌های مجاز تمام شده است.', 429);
    }

    const submitted = hashOtp(nationalCode, row.phone, code);
    if (!safeEqualHex(row.code_hash, submitted)) {
      throw publicError('OTP_INVALID', 'کد تأیید اشتباه است.');
    }

    await db.from('warroom_otp_codes').update({
      is_used: true,
      used_at: new Date().toISOString(),
    }).eq('id', row.id);

    const userRow = await findUserByNationalCode(nationalCode);
    const user = {
      id: row.user_id,
      national_code: nationalCode,
      role: userRow?.data?.role || 'user',
      first_name: userRow?.data?.first_name || '',
      last_name: userRow?.data?.last_name || '',
    };

    const accessToken = signAccessToken(user);
    const refreshToken = await issueRefreshToken(user.id).catch(() => null);

    res.json({
      success: true,
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: config.jwtAccessTtl,
      user,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
