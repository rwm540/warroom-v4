import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { publicError } from '../lib/errors.js';
import { clientIp, createOtp, hashNationalCodeForChallenge, hashOtp, hashValue, maskPhone, toE164Iran } from '../lib/identity.js';
import { isUuid } from '../lib/validators.js';
import { signChallengeToken } from '../lib/tokens.js';
import { sanitizeUserData } from '../lib/store.js';

const PATCHABLE_FIELDS = new Set([
  'first_name',
  'last_name',
  'phone',
  'gender',
  'province',
  'city',
  'school_name',
  'is_active',
  'is_blocked',
  'points',
  'level',
  'avatar_url',
]);

/**
 * Administrative endpoints.
 *
 * Authorization rules:
 *  - every route requires a session cookie that resolves to a live session row and an
 *    admin role read from the database;
 *  - state-changing routes additionally require the CSRF header;
 *  - destructive operations require a fresh, single-use admin OTP proof bound to the exact
 *    operation, so a login proof can never be replayed for administrative work.
 */
export function createAdminRouter({ store, sms, limiter, auth, config }) {
  const router = Router();

  router.use(auth.requireSession);
  router.use(auth.requireCsrf);
  router.use(auth.requireAdmin);

  function adminId(req) {
    return req.authContext.userId;
  }

  async function consumeAdminProof(req, operation) {
    if (!config.adminOtpRequiredForDestructiveOps) return;
    const proofHeader = req.headers['x-admin-otp-proof'];
    const proof = String(req.body?.adminOtpProof || proofHeader || '').trim();
    if (!isUuid(proof)) {
      throw publicError('ADMIN_OTP_REQUIRED', 'برای این عملیات مدیریتی، تأیید OTP تازه لازم است.', 403);
    }
    const consumed = await store.consumeOtpProof(proof, `admin:${operation}`);
    if (consumed?.success !== true) {
      const code = String(consumed?.error || '');
      if (code === 'PROOF_ALREADY_CONSUMED') {
        throw publicError('ADMIN_OTP_REUSED', 'این مدرک OTP قبلاً مصرف شده است.', 409);
      }
      throw publicError('ADMIN_OTP_REQUIRED', 'مدرک OTP مدیریتی معتبر نیست یا منقضی شده است.', 403);
    }
    if (String(consumed.user_id || '') !== adminId(req)) {
      throw publicError('ADMIN_OTP_REQUIRED', 'مدرک OTP مدیریتی با نشست جاری سازگار نیست.', 403);
    }
  }

  async function enforceLimit(req, name, max, windowSeconds) {
    const allowed = await limiter.hit(`admin:${name}:${hashValue(adminId(req))}`, max, windowSeconds);
    if (!allowed) throw publicError('RATE_LIMITED', 'تعداد درخواست زیاد است.', 429);
  }

  // Issues an OTP bound to the *admin's own* registered phone and to admin operations only.
  router.post('/otp/challenge', async (req, res, next) => {
    try {
      await enforceLimit(req, 'otp', 10, 15 * 60);
      const adminUser = await store.findUserById(adminId(req));
      if (!adminUser) throw publicError('USER_NOT_FOUND', 'حساب مدیریتی یافت نشد.', 404);
      const phone = toE164Iran(adminUser.data?.phone || adminUser.data?.mobile);
      if (!phone) throw publicError('PHONE_MISSING', 'شماره موبایل معتبر برای حساب مدیریتی ثبت نشده است.', 400);

      const otp = createOtp();
      const challengeId = randomUUID();
      const issuedAtMs = Math.floor(Date.now() / 1000) * 1000;
      const expiresAtMs = issuedAtMs + config.otpTtlSeconds * 1000;
      const challengeToken = signChallengeToken({
        sub: String(adminId(req)),
        challengeId,
        purpose: 'admin',
        nationalCodeBinding: hashNationalCodeForChallenge(String(adminUser.data?.national_code || '')),
      }, expiresAtMs);

      await store.insertOtpChallenge({
        challenge_id: challengeId,
        user_id: String(adminId(req)),
        national_code: String(adminUser.data?.national_code || ''),
        phone: phone.e164,
        code_hash: hashOtp(String(adminUser.data?.national_code || ''), phone.e164, otp),
        attempt_count: 0,
        max_attempts: config.otpMaxAttempts,
        expires_at: new Date(expiresAtMs).toISOString(),
        is_used: false,
        ip_hash: hashValue(clientIp(req)),
        purpose: 'admin',
        pending_id: null,
      });

      try {
        const smsResult = await sms.send(phone.e164, otp, { issuedAtMs, expiresAtMs });
        const messageId = smsResult?.ids?.[0];
        if (!messageId) throw publicError('SMS_SEND_FAILED', 'ارسال پیامک توسط سرویس تأیید نشد.', 502);
        const saved = await store.setOtpSmsMessageId(challengeId, String(messageId));
        if (!saved) throw publicError('OTP_STORE_FAILED', 'ثبت نتیجه سرویس پیامک ناموفق بود.', 503);
      } catch (error) {
        try {
          await store.invalidateOtpChallenge(challengeId);
        } catch {
          throw publicError('OTP_CLEANUP_FAILED', 'پاک‌سازی کد مدیریتی ناموفق بود.', 503);
        }
        throw error;
      }

      return res.json({
        success: true,
        message: 'کد تأیید مدیریتی ارسال شد.',
        expiresIn: Math.floor((expiresAtMs - Date.now()) / 1000),
        maskedPhone: maskPhone(phone.local),
        challengeToken,
      });
    } catch (error) {
      return next(error);
    }
  });

  router.post('/sessions/revoke', async (req, res, next) => {
    try {
      const targetUserId = String(req.body?.userId || '').trim();
      if (!targetUserId) throw publicError('INVALID_INPUT', 'شناسه کاربر الزامی است.');
      await enforceLimit(req, 'revoke', 30, 60 * 60);
      await consumeAdminProof(req, 'session:revoke');
      const revoked = await store.revokeSessionsForUser(targetUserId);
      return res.json({ success: true, revoked, message: 'تمام نشست‌های کاربر باطل شد.' });
    } catch (error) {
      return next(error);
    }
  });

  router.post('/users/patch', async (req, res, next) => {
    try {
      const targetUserId = String(req.body?.userId || '').trim();
      const patch = req.body?.patch;
      if (!targetUserId) throw publicError('INVALID_INPUT', 'شناسه کاربر الزامی است.');
      if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
        throw publicError('INVALID_PATCH', 'داده‌های ویرایش معتبر نیست.');
      }
      const filtered = {};
      for (const [key, value] of Object.entries(patch)) {
        if (!PATCHABLE_FIELDS.has(key)) {
          throw publicError('FORBIDDEN_FIELD', 'ویرایش این فیلد مجاز نیست.');
        }
        filtered[key] = value;
      }
      if (Object.keys(filtered).length === 0) throw publicError('INVALID_PATCH', 'فیلدی برای ویرایش ارسال نشد.');

      await enforceLimit(req, 'patch', 60, 60 * 60);
      // Deactivating/blocking another account is destructive: require a fresh proof.
      if (filtered.is_blocked === true || filtered.is_active === false) {
        await consumeAdminProof(req, 'user:restrict');
      }

      const result = await store.adminUpdateUser({ adminId: adminId(req), userId: targetUserId, patch: filtered });
      if (result?.success !== true) {
        throw publicError(String(result?.error || 'ADMIN_OPERATION_FAILED'), 'عملیات مدیریتی ناموفق بود.');
      }
      return res.json({ success: true, user: result.user ? { id: result.user.id, ...sanitizeUserData(result.user) } : null });
    } catch (error) {
      return next(error);
    }
  });

  router.post('/users/password', async (req, res, next) => {
    try {
      const targetUserId = String(req.body?.userId || '').trim();
      const password = String(req.body?.password || '');
      if (!targetUserId || !password) throw publicError('INVALID_INPUT', 'شناسه کاربر و رمز جدید الزامی است.');
      await enforceLimit(req, 'password', 30, 60 * 60);
      await consumeAdminProof(req, 'user:password');
      const result = await store.adminSetUserPassword({ adminId: adminId(req), userId: targetUserId, password });
      if (result?.success !== true) {
        const code = String(result?.error || 'ADMIN_OPERATION_FAILED');
        if (code === 'WEAK_PASSWORD') throw publicError('WEAK_PASSWORD', 'رمز عبور ضعیف است.');
        throw publicError(code, 'عملیات مدیریتی ناموفق بود.');
      }
      return res.json({ success: true, message: 'رمز جدید ثبت شد.' });
    } catch (error) {
      return next(error);
    }
  });

  router.post('/users/create', async (req, res, next) => {
    try {
      const userData = req.body?.user;
      const password = String(req.body?.password || '');
      if (!userData || typeof userData !== 'object' || Array.isArray(userData)) {
        throw publicError('INVALID_INPUT', 'داده کاربر معتبر نیست.');
      }
      if (!password) throw publicError('INVALID_INPUT', 'رمز موقت الزامی است.');
      await enforceLimit(req, 'create', 30, 60 * 60);
      const userId = `user_${randomUUID()}`;
      const result = await store.adminCreateUser({
        adminId: adminId(req),
        userId,
        userData: { ...userData, role: 'user' },
        password,
      });
      if (result?.success !== true) {
        const code = String(result?.error || 'ADMIN_OPERATION_FAILED');
        if (code === 'DUPLICATE_USER') throw publicError('DUPLICATE_USER', 'این کد ملی قبلاً ثبت شده است.', 409);
        throw publicError(code, 'ایجاد کاربر ناموفق بود.');
      }
      return res.json({
        success: true,
        user: result.user ? { id: result.user.id, ...sanitizeUserData(result.user) } : { id: userId },
      });
    } catch (error) {
      return next(error);
    }
  });

  router.post('/password-resets/list', async (req, res, next) => {
    try {
      await enforceLimit(req, 'reset-list', 120, 60 * 60);
      const result = await store.adminListPasswordResets({
        adminId: adminId(req),
        status: String(req.body?.status || 'all'),
        query: String(req.body?.q || ''),
      });
      if (result?.success !== true) throw publicError('ADMIN_OPERATION_FAILED', 'عملیات مدیریتی ناموفق بود.');
      return res.json({ success: true, requests: result.requests || [], stats: result.stats || {} });
    } catch (error) {
      return next(error);
    }
  });

  router.post('/password-resets/update', async (req, res, next) => {
    try {
      const requestId = String(req.body?.requestId || '').trim();
      const action = String(req.body?.action || '').trim();
      if (!requestId || !action) throw publicError('INVALID_INPUT', 'شناسه درخواست و عملیات الزامی است.');
      await enforceLimit(req, 'reset-update', 60, 60 * 60);
      // Resolving a reset issues a new credential for another account: destructive.
      if (action === 'resolve') {
        await consumeAdminProof(req, 'password-reset:resolve');
      }
      const result = await store.adminUpdatePasswordReset({
        adminId: adminId(req),
        requestId,
        action,
        password: String(req.body?.password || ''),
        note: String(req.body?.note || ''),
      });
      if (result?.success !== true) throw publicError('ADMIN_OPERATION_FAILED', 'عملیات مدیریتی ناموفق بود.');
      return res.json({ success: true, data: result });
    } catch (error) {
      return next(error);
    }
  });

  router.get('/audit-log', async (req, res, next) => {
    try {
      await enforceLimit(req, 'audit', 120, 60 * 60);
      const events = await store.listAuditLog(Number(req.query?.limit || 100));
      return res.json({
        success: true,
        events: events.map((row) => ({ id: row.id, ...sanitizeUserData(row.data), timestamp: row.created_at })),
      });
    } catch (error) {
      return next(error);
    }
  });

  router.get('/security/overview', async (req, res, next) => {
    try {
      await enforceLimit(req, 'overview', 120, 60 * 60);
      const activeSessions = await store.countActiveSessionsForUser(adminId(req));
      return res.json({
        success: true,
        data: {
          authenticated: true,
          role: req.authContext.role,
          sessionExpiresAt: req.authContext.expiresAt,
          ownActiveSessions: activeSessions,
          authMethod: 'server session (HttpOnly cookie) + OTP proof (one-time, atomic)',
          destructiveOpsRequireOtp: config.adminOtpRequiredForDestructiveOps === true,
        },
      });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}
