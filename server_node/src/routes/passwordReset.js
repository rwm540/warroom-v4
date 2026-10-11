import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { publicError } from '../lib/errors.js';
import { clientIp, hashValue, isValidNationalCode } from '../lib/identity.js';
import { sanitizeText, validatePhone } from '../lib/validators.js';

/**
 * Password reset *requests* only.
 *
 * This router never changes a password: it records a request and lets an administrator
 * resolve it through the audited admin endpoints. Responses are uniform so the endpoint
 * cannot be used to enumerate accounts.
 */
export function createPasswordResetRouter({ store, limiter, config }) {
  const router = Router();

  router.post('/request', async (req, res, next) => {
    try {
      const ip = clientIp(req);
      const allowedIp = await limiter.hit(`pwdreset:ip:${hashValue(ip)}`, 10, 60 * 60);
      if (!allowedIp) throw publicError('RATE_LIMITED', 'تعداد درخواست‌ها زیاد است؛ بعداً تلاش کنید.', 429);

      const phoneRaw = String(req.body?.phone || req.body?.contact_phone || '').trim();
      const nationalCodeRaw = String(req.body?.nationalCode || req.body?.national_code || '').trim();
      const noteRaw = sanitizeText(req.body?.note, 500);

      const phoneLocal = validatePhone(phoneRaw);
      if (!phoneLocal) throw publicError('INVALID_PHONE', 'شماره موبایل معتبر نیست.');

      const nationalCode = nationalCodeRaw ? isValidNationalCode(nationalCodeRaw) : null;
      if (nationalCodeRaw && !nationalCode) {
        throw publicError('INVALID_NATIONAL_CODE', 'کد ملی معتبر نیست.');
      }

      const allowedPhone = await limiter.hit(
        `pwdreset:phone:${hashValue(phoneLocal)}`,
        config.passwordResetRateLimitPerHour,
        3600,
      );
      if (!allowedPhone) throw publicError('RATE_LIMITED', 'تعداد درخواست‌های بازیابی برای این شماره زیاد است.', 429);

      let userRow = null;
      if (nationalCode) {
        const found = await store.findUserByNationalCode(nationalCode);
        if (found) {
          const userPhone = String(found.data?.phone || '').replace(/\D/g, '');
          if (userPhone && userPhone !== phoneLocal.replace(/\D/g, '')) {
            userRow = null;
          } else {
            userRow = found;
          }
        }
      } else {
        userRow = await store.findUserByPhone(phoneLocal);
      }

      if (!userRow) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        return res.json({
          success: true,
          message: 'درخواست شما دریافت شد. اگر حساب با این شماره وجود داشته باشد، کد رهگیری تولید می‌شود و مدیر بررسی می‌کند.',
          trackingCode: null,
        });
      }

      const trackingCode = `WR-${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
      const now = new Date().toISOString();
      await store.createPasswordResetRequest({
        id: `reset_${randomUUID()}`,
        data: {
          tracking_code: trackingCode,
          user_id: userRow.id,
          national_code: userRow.data?.national_code || nationalCode || '',
          personal_code: userRow.data?.personal_code || '',
          full_name: `${userRow.data?.first_name || ''} ${userRow.data?.last_name || ''}`.trim(),
          account_phone: userRow.data?.phone || phoneLocal,
          contact_phone: phoneLocal,
          note: noteRaw || '',
          status: 'pending',
          source: 'server',
          created_at: now,
        },
        updated_at: now,
      });

      return res.json({
        success: true,
        message: 'درخواست بازیابی ثبت شد. کد رهگیری را نزد خود نگه دارید.',
        trackingCode,
      });
    } catch (error) {
      return next(error);
    }
  });

  router.post('/status', async (req, res, next) => {
    try {
      const trackingCodeRaw = String(req.body?.trackingCode || req.body?.tracking_code || '').trim().toUpperCase();
      const nationalCodeRaw = String(req.body?.nationalCode || req.body?.national_code || '').trim();

      if (!trackingCodeRaw || !/^WR-[A-Z0-9]{8}$/.test(trackingCodeRaw)) {
        throw publicError('INVALID_TRACKING_CODE', 'کد رهگیری معتبر نیست.');
      }
      const nationalCode = isValidNationalCode(nationalCodeRaw);
      if (!nationalCode) throw publicError('INVALID_NATIONAL_CODE', 'کد ملی معتبر نیست.');

      const ip = clientIp(req);
      const allowed = await limiter.hit(`pwdreset:status:${hashValue(ip)}`, 20, 15 * 60);
      if (!allowed) throw publicError('RATE_LIMITED', 'تعداد استعلام زیاد است.', 429);

      const rows = await store.findPasswordResetRequestsByTrackingCode(trackingCodeRaw);
      const matched = rows.map((row) => row.data).find((item) => item?.national_code === nationalCode);
      if (!matched) {
        return res.json({ success: false, error: 'NOT_FOUND', message: 'درخواستی با این کد رهگیری و کد ملی پیدا نشد.' });
      }

      return res.json({
        success: true,
        data: {
          status: matched.status,
          message: 'وضعیت درخواست بازیابی به‌روزرسانی شد.',
          createdAt: matched.created_at,
          resolvedAt: matched.resolved_at || null,
        },
      });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}
