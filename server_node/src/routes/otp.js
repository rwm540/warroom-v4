import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { publicError } from '../lib/errors.js';
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
import { signChallengeToken, verifyToken } from '../lib/tokens.js';

// Purposes a *client* may request for a new challenge.
const OTP_SEND_PURPOSES = new Set(['login', 'registration']);
// Purposes that may legitimately exist on a stored challenge (admin challenges are created
// only by the admin router after a server-verified admin session).
const OTP_STORED_PURPOSES = new Set(['login', 'registration', 'admin']);

function normalizePurpose(value, { allowed = OTP_SEND_PURPOSES } = {}) {
  const purpose = String(value || 'login').trim().toLowerCase();
  return allowed.has(purpose) ? purpose : null;
}

function phoneFromUserData(data) {
  const source = data || {};
  return toE164Iran(source.phone || source.mobile || source.contact_phone);
}

/**
 * OTP delivery and verification.
 *
 * The proof produced here is bound to:
 *   - one user (login) or one pending registration (registration),
 *   - one purpose, and
 *   - a short deadline (OTP TTL + OTP proof max age).
 * Verification never grants authorization by itself: a session is only issued after the
 * proof is consumed atomically (see routes/session.js).
 */
export function createOtpRouter({ store, sms, limiter, config }) {
  const router = Router();

  async function enforceSendRateLimits({ ip, nationalCode }) {
    const nationalKey = hashValue(nationalCode);
    const idKey = hashValue(ip);
    const allowedIp = await limiter.hit(`otp:ip:${idKey}`, 12, 15 * 60);
    const allowedNational = await limiter.hit(`otp:national:${nationalKey}`, config.otpMaxSend, 15 * 60);
    const allowedCooldown = await limiter.hit(`otp:cooldown:${nationalKey}`, 1, config.otpResendCooldown);
    if (!allowedIp || !allowedNational || !allowedCooldown) {
      throw publicError('RATE_LIMITED', 'تعداد درخواست‌ها زیاد است؛ بعداً تلاش کنید.', 429);
    }
  }

  async function resolveTarget({ purpose, nationalCode, password }) {
    if (purpose === 'registration') {
      const pending = await store.findPendingRegistration({ nationalCode });
      if (!pending) return null;
      const phone = toE164Iran(pending.phone_e164 || pending.phone);
      if (!phone) throw publicError('PHONE_MISSING', 'شماره موبایل معتبر برای این ثبت‌نام ثبت نشده است.', 400);
      return { subjectId: String(pending.id), phone, pendingId: String(pending.id) };
    }

    if (!password) {
      // A login OTP is only issued to prove possession of the phone *after* the password
      // was verified server-side. Without a password there is nothing to verify.
      throw publicError('INVALID_CREDENTIALS', 'کد ملی یا رمز عبور اشتباه است.', 401);
    }
    const verification = await store.verifyLoginCredentials(nationalCode, password);
    if (verification?.success !== true || !verification.user?.id) {
      // Same response for unknown user, wrong password, blocked or inactive account.
      throw publicError('INVALID_CREDENTIALS', 'کد ملی یا رمز عبور اشتباه است.', 401);
    }
    const phone = phoneFromUserData(verification.user);
    if (!phone) throw publicError('PHONE_MISSING', 'شماره موبایل معتبر برای این حساب ثبت نشده است.', 400);
    return { subjectId: String(verification.user.id), phone, pendingId: null };
  }

  async function sendChallenge({ purpose, nationalCode, password, req }) {
    const ip = clientIp(req);
    await enforceSendRateLimits({ ip, nationalCode });

    if (purpose === 'login') {
      const allowedAuth = await limiter.hit(`otp:login-auth:${hashValue(nationalCode)}`, 10, 15 * 60);
      if (!allowedAuth) {
        throw publicError('RATE_LIMITED', 'تعداد تلاش‌های ورود زیاد است؛ بعداً تلاش کنید.', 429);
      }
    }

    const target = await resolveTarget({ purpose, nationalCode, password });
    if (!target) {
      // Anti-enumeration: nothing distinguishes "no pending registration" from "not eligible".
      return {
        success: true,
        message: 'اگر اطلاعات ارسال‌شده معتبر باشد، کد تأیید پیامکی ارسال می‌شود.',
      };
    }

    const otp = createOtp();
    const challengeId = randomUUID();
    const issuedAtMs = Math.floor(Date.now() / 1000) * 1000;
    const expiresAtMs = issuedAtMs + config.otpTtlSeconds * 1000;
    const expiresAt = new Date(expiresAtMs).toISOString();
    const challengeToken = signChallengeToken({
      sub: target.subjectId,
      challengeId,
      purpose,
      nationalCodeBinding: hashNationalCodeForChallenge(nationalCode),
    }, expiresAtMs);

    // Atomically invalidate prior challenges and insert this one under a per-subject DB lock.
    await store.issueOtpChallenge({
      challenge_id: challengeId,
      user_id: target.subjectId,
      national_code: nationalCode,
      phone: target.phone.e164,
      code_hash: hashOtp(nationalCode, target.phone.e164, otp),
      attempt_count: 0,
      max_attempts: config.otpMaxAttempts,
      expires_at: expiresAt,
      is_used: false,
      ip_hash: hashValue(ip),
      purpose,
      pending_id: target.pendingId,
    });

    try {
      const smsResult = await sms.send(target.phone.e164, otp, { issuedAtMs, expiresAtMs });
      const messageId = smsResult?.ids?.[0];
      if (!messageId) {
        throw publicError('SMS_SEND_FAILED', 'ارسال پیامک توسط سرویس تأیید نشد.', 502);
      }
      const saved = await store.setOtpSmsMessageId(challengeId, String(messageId));
      if (!saved) {
        throw publicError('OTP_STORE_FAILED', 'ثبت نتیجه سرویس پیامک در پایگاه داده ناموفق بود.', 503);
      }
    } catch (error) {
      // Never leave an undelivered-but-usable challenge behind.
      try {
        await store.invalidateOtpChallenge(challengeId);
      } catch {
        throw publicError('OTP_CLEANUP_FAILED', 'ارسال پیامک تأیید نشد و پاک‌سازی کد نیز ناموفق بود؛ با پشتیبانی تماس بگیرید.', 503);
      }
      throw error;
    }

    const expiresIn = Math.floor((expiresAtMs - Date.now()) / 1000);
    if (expiresIn <= 0) {
      throw publicError('OTP_EXPIRED', 'مهلت کد تأیید هنگام ارسال پایان یافت؛ دوباره درخواست کنید.', 503);
    }

    return {
      success: true,
      message: 'درخواست ارسال کد توسط سرویس پیامک پذیرفته شد؛ تحویل نهایی به اپراتور وابسته است.',
      expiresIn,
      expiresAt,
      deliveryStatus: 'accepted',
      maskedPhone: maskPhone(target.phone.local),
      challengeToken,
      purpose,
    };
  }

  async function handleSend(req, res, next) {
    try {
      const nationalCode = isValidNationalCode(req.body?.nationalCode || req.body?.national_code);
      if (!nationalCode) throw publicError('INVALID_NATIONAL_CODE', 'کد ملی معتبر نیست.');
      const purpose = normalizePurpose(req.body?.purpose);
      if (!purpose) throw publicError('INVALID_PURPOSE', 'نوع درخواست OTP معتبر نیست.');
      const result = await sendChallenge({
        purpose,
        nationalCode,
        password: String(req.body?.password || ''),
        req,
      });
      return res.json(result);
    } catch (error) {
      return next(error);
    }
  }

  router.post('/send', handleSend);
  router.post('/resend', handleSend);

  router.post('/verify', async (req, res, next) => {
    try {
      const rawNationalCode = String(req.body?.nationalCode || req.body?.national_code || '').trim();
      const suppliedNationalCode = rawNationalCode ? isValidNationalCode(rawNationalCode) : null;
      const code = normalizeOtpCode(req.body?.code);
      const challengeToken = String(req.body?.challengeToken || '');

      if ((rawNationalCode && !suppliedNationalCode) || !code || !challengeToken) {
        throw publicError('INVALID_INPUT', 'کد ملی، کد تأیید شش‌رقمی یا نشست نامعتبر است.');
      }

      let challenge;
      try {
        challenge = verifyToken(challengeToken, 'otp_challenge');
      } catch {
        throw publicError('CHALLENGE_EXPIRED', 'نشست تأیید منقضی یا نامعتبر است. دوباره کد را ارسال کنید.', 401);
      }

      if (typeof challenge.sub !== 'string' || typeof challenge.challengeId !== 'string') {
        throw publicError('CHALLENGE_MISMATCH', 'نشست تأیید نامعتبر است.', 401);
      }

      const challengeRow = await store.getOtpByChallenge(challenge.challengeId);
      if (!challengeRow || String(challengeRow.user_id) !== String(challenge.sub) ||
          challengeRow.purpose !== challenge.purpose) {
        throw publicError('OTP_EXPIRED', 'کد منقضی شده یا وجود ندارد.');
      }

      // The national code identifies the challenge; when the caller omits it (admin flows
      // where the admin account may not have one) the code stored on the challenge is used.
      const nationalCode = suppliedNationalCode || String(challengeRow.national_code || '');
      if (!safeEqualHex(challenge.nationalCodeBinding, hashNationalCodeForChallenge(nationalCode))) {
        throw publicError('CHALLENGE_MISMATCH', 'نشست تأیید با این کد ملی سازگار نیست.', 401);
      }
      if (suppliedNationalCode && String(challengeRow.national_code) !== suppliedNationalCode) {
        throw publicError('OTP_EXPIRED', 'کد منقضی شده یا وجود ندارد.');
      }

      const allowed = await limiter.hit(`otp:verify:${hashValue(nationalCode || challenge.sub)}`, 10, 15 * 60);
      if (!allowed) throw publicError('RATE_LIMITED', 'تعداد تلاش‌های تأیید بیش از حد مجاز است.', 429);
      if (challengeRow.is_used === true) {
        throw publicError('OTP_PROOF_REUSED', 'این کد قبلاً استفاده شده است.', 409);
      }
      const purpose = normalizePurpose(challengeRow.purpose, { allowed: OTP_STORED_PURPOSES });
      if (!purpose) throw publicError('INVALID_PURPOSE', 'نوع درخواست OTP معتبر نیست.');

      const submitted = hashOtp(nationalCode, challengeRow.phone, code);
      const verification = await store.verifyOtp({
        challengeId: challenge.challengeId,
        nationalCode,
        codeHash: submitted,
      });

      if (verification?.result === 'locked') {
        throw publicError('OTP_LOCKED', 'تعداد تلاش‌های مجاز تمام شده است.', 429);
      }
      if (verification?.result === 'invalid') {
        throw publicError('OTP_INVALID', 'کد تأیید اشتباه است.');
      }
      if (verification?.result !== 'valid' || String(verification.user_id) !== String(challenge.sub)) {
        throw publicError('OTP_EXPIRED', 'کد منقضی شده یا قبلاً مصرف شده است.');
      }

      // Only one usable proof may exist per national code.
      await store.invalidateActiveOtpChallenges({ nationalCode, keepChallengeId: challenge.challengeId });

      return res.json({
        success: true,
        message: 'کد تأیید شد.',
        otpProof: challenge.challengeId,
        purpose,
      });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}
