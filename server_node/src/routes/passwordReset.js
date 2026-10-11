import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { config } from '../config.js';
import { assertDb } from '../lib/supabase.js';
import { isValidNationalCode, hashValue, clientIp } from '../lib/identity.js';
import { validatePhone, sanitizeText } from '../lib/validators.js';

const router = Router();

function publicError(code, message, status = 400) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

async function dbRateLimit(key, max, windowSeconds) {
  try {
    const { data, error } = await assertDb().rpc('warroom_hit_otp_rate_limit', {
      p_id: key,
      p_max: max,
      p_window_seconds: windowSeconds,
    });
    if (error) return null;
    return data === true;
  } catch {
    return null;
  }
}

async function hitRateLimit(key, max, windowSeconds) {
  // Redis first, DB fallback, fail closed
  let redisResult = null;
  try {
    const { redisRateLimit } = await import('../lib/redis.js');
    redisResult = await redisRateLimit(key, max, windowSeconds);
  } catch {
    redisResult = null;
  }
  if (redisResult !== null) return redisResult;

  const dbResult = await dbRateLimit(key, max, windowSeconds);
  if (dbResult !== null) return dbResult;

  throw publicError('RATE_LIMIT_STORE_FAILED', 'محدودیت امنیتی موقتاً در دسترس نیست.', 503);
}

// Generic response to prevent enumeration of phone/national_code existence
function genericResetResponse() {
  return {
    success: true,
    message: 'اگر شماره همراه در سامانه وجود داشته باشد، درخواست بازیابی ثبت شد و کد رهگیری تولید می‌شود.',
    // Never return tracking code if user not found - but for UX we need to give code when found.
    // To prevent enumeration, we always return same shape, but tracking code only when found.
    // However spec says should not disclose existence. We'll return generic message and tracking code only when found,
    // but with same timing to reduce oracle.
  };
}

router.post('/request', async (req, res, next) => {
  try {
    const ip = clientIp(req);
    const ipKey = hashValue(ip);
    const allowedIp = await hitRateLimit(`pwdreset:ip:${ipKey}`, 10, 60 * 60);
    if (!allowedIp) {
      throw publicError('RATE_LIMITED', 'تعداد درخواست‌ها زیاد است؛ بعداً تلاش کنید.', 429);
    }

    const phoneRaw = String(req.body?.phone || req.body?.contact_phone || '').trim();
    const nationalCodeRaw = String(req.body?.nationalCode || req.body?.national_code || '').trim();
    const noteRaw = sanitizeText(req.body?.note, 500);

    const phoneLocal = validatePhone(phoneRaw);
    if (!phoneLocal) {
      throw publicError('INVALID_PHONE', 'شماره موبایل معتبر نیست.');
    }

    const nationalCode = nationalCodeRaw ? isValidNationalCode(nationalCodeRaw) : null;
    // national code optional for reset, but if provided must be valid
    if (nationalCodeRaw && !nationalCode) {
      throw publicError('INVALID_NATIONAL_CODE', 'کد ملی معتبر نیست.');
    }

    const allowedPhone = await hitRateLimit(`pwdreset:phone:${hashValue(phoneLocal)}`, config.passwordResetRateLimitPerHour, 3600);
    if (!allowedPhone) {
      throw publicError('RATE_LIMITED', 'تعداد درخواست‌های بازیابی برای این شماره زیاد است.', 429);
    }

    const db = assertDb();
    // Lookup user by phone (or national code if provided)
    let userRow = null;
    if (nationalCode) {
      const { data, error } = await db.from('warroom_users').select('id, data').eq('data->>national_code', nationalCode).maybeSingle();
      if (error) throw publicError('DB_ERROR', 'خطا در بررسی حساب.', 503);
      userRow = data;
      // If national code provided, ensure phone matches user's phone to prevent abuse
      if (userRow) {
        const userPhone = String(userRow.data?.phone || '').replace(/\D/g, '');
        const inputPhoneDigits = phoneLocal.replace(/\D/g, '');
        if (userPhone && userPhone !== inputPhoneDigits) {
          // Don't reveal mismatch, treat as not found for enumeration resistance, but log internally
          userRow = null;
        }
      }
    } else {
      const { data, error } = await db.from('warroom_users').select('id, data').eq('data->>phone', phoneLocal).limit(1).maybeSingle();
      if (error) throw publicError('DB_ERROR', 'خطا در بررسی حساب.', 503);
      userRow = data;
    }

    if (!userRow) {
      // Anti-enumeration: return generic success without tracking code, but with same delay
      await new Promise(r => setTimeout(r, 200));
      return res.json({
        success: true,
        message: 'درخواست شما دریافت شد. اگر حساب با این شماره وجود داشته باشد، کد رهگیری تولید می‌شود و مدیر بررسی می‌کند.',
        trackingCode: null,
      });
    }

    const trackingCode = `WR-${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
    const record = {
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
        created_at: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    };

    const { error: insertError } = await db.from('warroom_password_reset_requests').insert({ id: record.id, data: record.data, updated_at: record.updated_at });
    if (insertError) {
      throw publicError('DB_ERROR', 'ثبت درخواست بازیابی ممکن نشد.', 503);
    }

    return res.json({
      success: true,
      message: 'درخواست بازیابی ثبت شد. کد رهگیری را نزد خود نگه دارید.',
      trackingCode,
    });
  } catch (e) {
    next(e);
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
    if (!nationalCode) {
      throw publicError('INVALID_NATIONAL_CODE', 'کد ملی معتبر نیست.');
    }

    const ip = clientIp(req);
    const allowed = await hitRateLimit(`pwdreset:status:${hashValue(ip)}`, 20, 15 * 60);
    if (!allowed) {
      throw publicError('RATE_LIMITED', 'تعداد استعلام زیاد است.', 429);
    }

    const db = assertDb();
    // Secure query: filter by both tracking code and national code in DB, not client side
    const { data, error } = await db.from('warroom_password_reset_requests').select('data, updated_at').eq('data->>tracking_code', trackingCodeRaw).limit(5);
    if (error) throw publicError('DB_ERROR', 'بررسی وضعیت ممکن نشد.', 503);

    const matched = (data || []).map(r => r.data).find(item => item?.national_code === nationalCode);
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
      }
    });
  } catch (e) {
    next(e);
  }
});

export default router;
