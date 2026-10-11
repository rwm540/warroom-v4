import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { publicError } from '../lib/errors.js';
import { clientIp, hashValue } from '../lib/identity.js';
import { isUuid } from '../lib/validators.js';
import { validatePasswordStrength } from '../lib/password.js';
import { sanitizeUserData } from '../lib/store.js';
import {
  clearCsrfCookie,
  clearSessionCookie,
  createCsrfToken,
  createSessionToken,
  hashSessionToken,
  serializeCsrfCookie,
  serializeSessionCookie,
} from '../lib/session.js';

const SESSION_PURPOSES = {
  login: 'session:login',
  registration: 'session:registration',
};

function sessionPurposeFor(otpPurpose) {
  const normalized = String(otpPurpose || 'login').trim().toLowerCase();
  return SESSION_PURPOSES[normalized] || null;
}

function mapConsumeFailure(result) {
  const code = String(result?.error || 'PROOF_CONSUME_FAILED');
  if (code === 'PROOF_ALREADY_CONSUMED') {
    return publicError('OTP_PROOF_REUSED', 'مدرک OTP قبلاً استفاده شده است.', 409);
  }
  if (code === 'INVALID_OR_EXPIRED_PROOF' || code === 'PROOF_PURPOSE_MISMATCH') {
    return publicError('INVALID_OTP_PROOF', 'مدرک OTP نامعتبر، منقضی یا مربوط به عملیات دیگری است.', 401);
  }
  if (code === 'ADMIN_PROOF_REQUIRED') {
    return publicError('ADMIN_OTP_REQUIRED', 'این مدرک برای عملیات مدیریتی معتبر نیست.', 403);
  }
  return publicError('OTP_PROOF_CONSUME_FAILED', 'ثبت مصرف مدرک OTP ممکن نشد.', 409);
}

/**
 * Session lifecycle router.
 *
 * Security invariants:
 *  - A session is only created after an atomic, one-time OTP proof consumption bound to the
 *    user, to the operation and to a short deadline.
 *  - The identity behind the session always comes from the database (OTP row), never from
 *    the request body.
 *  - The session cookie is HttpOnly; the raw session token never reaches JavaScript or
 *    Web Storage. CSRF uses an HMAC token derived from the server-side session id.
 */
export function createSessionRouter({ store, limiter, auth, config }) {
  const router = Router();

  // OTP proofs are short lived: a verified code may only be exchanged for a session inside
  // the 5 * 60 * 1000 ms window that follows verification (overridable by configuration).
  const proofMaxAgeMs = config.otpProofMaxAgeSeconds > 0 ? config.otpProofMaxAgeSeconds * 1000 : 5 * 60 * 1000;

  function issueSessionCookies(res, { token, csrfToken, ttlSeconds }) {
    res.append('Set-Cookie', serializeSessionCookie(token, { ttlSeconds }));
    res.append('Set-Cookie', serializeCsrfCookie(csrfToken, { ttlSeconds }));
  }

  function clearSessionCookies(res) {
    res.append('Set-Cookie', clearSessionCookie());
    res.append('Set-Cookie', clearCsrfCookie());
  }

  function assertUserUsable(userRow) {
    const data = userRow?.data || {};
    if (data.is_blocked === true) {
      throw publicError('USER_BLOCKED', 'حساب کاربری مسدود شده است.', 403);
    }
    if (data.is_active === false) {
      throw publicError('USER_INACTIVE', 'حساب کاربری فعال نیست. با پشتیبانی تماس بگیرید.', 403);
    }
  }

  // Create a server session from a verified OTP proof.
  router.post('/create', async (req, res, next) => {
    try {
      const otpProof = String(req.body?.otpProof || '').trim();
      if (!isUuid(otpProof)) {
        throw publicError('INVALID_INPUT', 'مدرک OTP نامعتبر است.');
      }

      const ip = clientIp(req);
      const allowed = await limiter.hit(`session:create:${hashValue(ip)}`, 30, 15 * 60);
      if (!allowed) throw publicError('RATE_LIMITED', 'تعداد درخواست زیاد است.', 429);

      const otpRow = await store.getOtpByChallenge(otpProof);
      if (!otpRow) throw publicError('INVALID_OTP_PROOF', 'مدرک OTP نامعتبر است.', 401);
      if (otpRow.verified !== true || otpRow.is_used !== true) {
        throw publicError('OTP_NOT_VERIFIED', 'OTP تأیید نشده است.', 401);
      }

      const usedAt = otpRow.used_at ? new Date(otpRow.used_at).getTime() : 0;
      if (!usedAt || Number.isNaN(usedAt) || Date.now() - usedAt > proofMaxAgeMs || Date.now() - usedAt < 0) {
        throw publicError('OTP_PROOF_EXPIRED', 'مدرک OTP منقضی شده است. دوباره وارد شوید.', 401);
      }

      const purpose = sessionPurposeFor(otpRow.purpose);
      if (!purpose) {
        // Admin proofs, or any future purpose, must never mint a user session.
        throw publicError('OTP_PROOF_PURPOSE_MISMATCH', 'این مدرک برای ایجاد نشست معتبر نیست.', 401);
      }

      let userId = String(otpRow.user_id || '');
      let isNewRegistration = false;

      if (purpose === SESSION_PURPOSES.registration) {
        const pendingId = otpRow.pending_id ? String(otpRow.pending_id) : '';
        if (!isUuid(pendingId)) {
          throw publicError('INVALID_OTP_PROOF', 'درخواست ثبت‌نام متناظر یافت نشد.', 401);
        }
        const finalize = await store.finalizeRegistration({
          challengeId: otpProof,
          pendingId,
          userId: `user_${randomUUID()}`,
        });
        if (finalize?.success !== true) {
          const error = String(finalize?.error || 'REGISTRATION_FINALIZE_FAILED');
          if (error === 'USER_ALREADY_EXISTS' || error === 'DUPLICATE_USER') {
            throw publicError('DUPLICATE_USER', 'این کد ملی قبلاً ثبت شده است. از مسیر ورود استفاده کنید.', 409);
          }
          if (error === 'PENDING_NOT_FOUND' || error === 'PENDING_EXPIRED' || error === 'PENDING_ALREADY_VERIFIED') {
            throw publicError('REGISTRATION_EXPIRED', 'درخواست ثبت‌نام منقضی شده است. دوباره ثبت‌نام کنید.', 409);
          }
          if (error === 'ACCOUNT_BLOCKED') {
            throw publicError('USER_BLOCKED', 'حساب کاربری مسدود شده است.', 403);
          }
          throw publicError('REGISTRATION_FINALIZE_FAILED', 'تکمیل ثبت‌نام ممکن نشد.', 409);
        }
        userId = String(finalize.user_id || '');
        isNewRegistration = true;
      }

      if (!userId) throw publicError('INVALID_OTP_PROOF', 'مدرک OTP معتبر نیست.', 401);

      // Atomic, one-time consumption of the proof - a failed insert means someone else won.
      const consumed = await store.consumeOtpProof(otpProof, purpose);
      if (consumed?.success !== true) {
        throw mapConsumeFailure(consumed);
      }
      // Integrity: the consumed proof must be the one that was inspected, for the same subject.
      if (String(consumed.user_id || '') !== String(otpRow.user_id)) {
        throw publicError('OTP_PROOF_MISMATCH', 'مدرک OTP با این حساب سازگار نیست.', 401);
      }

      const userRow = await store.findUserById(userId);
      if (!userRow) throw publicError('USER_NOT_FOUND', 'کاربر یافت نشد.', 401);
      assertUserUsable(userRow);

      const ttlSeconds = config.sessionTtlSeconds;
      const sessionId = randomUUID();
      const token = createSessionToken({ userId, sessionId, ttlMs: ttlSeconds * 1000 });
      const csrfToken = createCsrfToken(sessionId);
      const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

      await store.insertSession({
        id: sessionId,
        user_id: userId,
        token_hash: hashSessionToken(token),
        expires_at: expiresAt,
      });

      issueSessionCookies(res, { token, csrfToken, ttlSeconds });

      const user = { id: String(userRow.id), ...sanitizeUserData(userRow.data) };
      return res.json({
        success: true,
        message: isNewRegistration ? 'ثبت‌نام تکمیل و نشست ایجاد شد.' : 'نشست ایجاد شد.',
        sessionId,
        csrfToken,
        expiresAt,
        isNewRegistration,
        mustChangePassword: await store.mustChangePassword(userId),
        user,
      });
    } catch (error) {
      return next(error);
    }
  });

  // Validate the current cookie session and return the authoritative (sanitized) profile.
  router.post('/validate', async (req, res, next) => {
    try {
      const context = await auth.loadContext(req);
      if (!context) {
        return res.status(401).json({ success: false, error: 'NO_SESSION', message: 'نشست معتبر یافت نشد.' });
      }
      const user = { id: context.userId, ...sanitizeUserData(context.user) };
      return res.json({
        success: true,
        userId: context.userId,
        role: context.role,
        csrfToken: createCsrfToken(context.sessionId),
        expiresAt: context.expiresAt,
        mustChangePassword: await store.mustChangePassword(context.userId),
        user,
      });
    } catch (error) {
      return next(error);
    }
  });

  // Logout: revoke the single server-side session tied to this cookie.
  router.post('/logout', auth.requireSession, auth.requireCsrf, async (req, res, next) => {
    try {
      await store.revokeSessionById(req.authContext.sessionId);
      clearSessionCookies(res);
      return res.json({ success: true, message: 'خروج انجام شد.' });
    } catch (error) {
      return next(error);
    }
  });

  /**
   * Revoke sessions.
   *  - A normal user may only revoke their own sessions (the id comes from the session).
   *  - Revoking somebody else requires an admin session validated against the database and a
   *    fresh one-time admin OTP proof bound to this operation.
   *  - `userId`/`role` sent by the browser never grant anything.
   */
  router.post('/revoke-all', auth.requireSession, auth.requireCsrf, async (req, res, next) => {
    try {
      const context = req.authContext;
      const requested = req.body?.userId;
      const requestedUserId = requested === undefined || requested === null || String(requested).trim() === ''
        ? null
        : String(requested).trim();
      const targetUserId = requestedUserId || context.userId;
      const isSelf = targetUserId === context.userId;

      if (!isSelf) {
        if (context.role !== 'admin') {
          throw publicError('FORBIDDEN', 'ابطال نشست سایر کاربران فقط با مجوز مدیریتی ممکن است.', 403);
        }

        const allowedAdmin = await limiter.hit(`session:revoke-admin:${hashValue(context.userId)}`, 20, 60 * 60);
        if (!allowedAdmin) throw publicError('RATE_LIMITED', 'تعداد درخواست زیاد است.', 429);

        if (config.adminOtpRequiredForDestructiveOps) {
          const proofHeader = req.headers['x-admin-otp-proof'];
          const adminOtpProof = String(req.body?.adminOtpProof || proofHeader || '').trim();
          if (!isUuid(adminOtpProof)) {
            throw publicError('ADMIN_OTP_REQUIRED', 'برای این عملیات مدیریتی، تأیید OTP تازه لازم است.', 403);
          }
          const consumed = await store.consumeOtpProof(adminOtpProof, 'admin:session:revoke-all');
          if (consumed?.success !== true) {
            throw mapConsumeFailure(consumed);
          }
          if (String(consumed.user_id || '') !== context.userId) {
            throw publicError('ADMIN_OTP_REQUIRED', 'مدرک OTP مدیریتی با نشست جاری سازگار نیست.', 403);
          }
        }
      } else {
        const allowed = await limiter.hit(`session:revoke:${hashValue(context.userId)}`, 10, 60 * 60);
        if (!allowed) throw publicError('RATE_LIMITED', 'تعداد درخواست زیاد است.', 429);
      }

      const revoked = await store.revokeSessionsForUser(targetUserId);
      if (isSelf) clearSessionCookies(res);

      return res.json({
        success: true,
        revoked,
        scope: isSelf ? 'self' : 'admin',
        message: isSelf ? 'تمام نشست‌های شما باطل شد.' : 'تمام نشست‌های کاربر باطل شد.',
      });
    } catch (error) {
      return next(error);
    }
  });

  // Change password for the authenticated user only (identity from the session).
  router.post('/change-password', auth.requireSession, auth.requireCsrf, async (req, res, next) => {
    try {
      const context = req.authContext;
      const currentPassword = String(req.body?.currentPassword || '');
      const newPassword = String(req.body?.newPassword || '');
      if (!currentPassword || !newPassword) {
        throw publicError('INVALID_INPUT', 'رمز فعلی و رمز جدید الزامی است.');
      }
      const strength = validatePasswordStrength(newPassword);
      if (!strength.valid) throw publicError(strength.reason, strength.message);

      const allowed = await limiter.hit(`session:pwd:${hashValue(context.userId)}`, 5, 15 * 60);
      if (!allowed) throw publicError('RATE_LIMITED', 'تعداد درخواست زیاد است.', 429);

      const result = await store.changePassword({
        userId: context.userId,
        currentPassword,
        newPassword,
      });
      if (result?.success !== true) {
        const error = String(result?.error || 'PASSWORD_CHANGE_FAILED');
        if (error === 'INVALID_CREDENTIALS' || error === 'INVALID_CURRENT_PASSWORD') {
          throw publicError('INVALID_CREDENTIALS', 'رمز عبور فعلی نادرست است.', 401);
        }
        if (error === 'WEAK_PASSWORD') {
          throw publicError('WEAK_PASSWORD', 'رمز عبور جدید ضعیف است.');
        }
        throw publicError('PASSWORD_CHANGE_FAILED', 'تغییر رمز ممکن نشد.', 400);
      }

      // Password change invalidates every session (including this one) - the client must log in again.
      await store.revokeSessionsForUser(context.userId);
      clearSessionCookies(res);
      return res.json({ success: true, reauthRequired: true, message: 'رمز عبور تغییر کرد؛ دوباره وارد شوید.' });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}
