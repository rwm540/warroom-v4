import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { config } from '../config.js';
import { assertDb } from '../lib/supabase.js';
import { isValidNationalCode, hashValue, clientIp, toE164Iran } from '../lib/identity.js';
import { validatePhone, sanitizeText, validateGroupName, isValidIranianNationalCodeChecksum } from '../lib/validators.js';
import { validatePasswordStrength } from '../lib/password.js';

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

// Registration pending flow - secure, no fallback to direct user creation
// Pending table warroom_pending_registrations must exist (created in migration 20261012000000)
// Password hash stored via bcrypt via RPC warroom_set_pending_password (service_role only)

router.post('/start', async (req, res, next) => {
  try {
    const ip = clientIp(req);
    const ipKey = hashValue(ip);
    const allowedIp = await hitRateLimit(`reg:ip:${ipKey}`, 20, 60 * 60);
    if (!allowedIp) throw publicError('RATE_LIMITED', 'تعداد درخواست ثبت‌نام زیاد است.', 429);

    const body = req.body || {};
    const firstName = sanitizeText(body.firstName || body.first_name, 80);
    const lastName = sanitizeText(body.lastName || body.last_name, 80);
    const nationalCodeRaw = String(body.nationalCode || body.national_code || '').trim();
    const phoneRaw = String(body.phone || '').trim();
    const birthDate = sanitizeText(body.birthDate || body.birth_date, 20);
    const gender = String(body.gender || '').trim();
    const password = String(body.password || '');
    const groupNameRaw = String(body.groupName || body.group_name || '').trim();

    if (!firstName || firstName.length < 2) throw publicError('INVALID_INPUT', 'نام معتبر نیست.');
    if (!lastName || lastName.length < 2) throw publicError('INVALID_INPUT', 'نام خانوادگی معتبر نیست.');

    const nationalCode = isValidNationalCode(nationalCodeRaw);
    if (!nationalCode) throw publicError('INVALID_NATIONAL_CODE', 'کد ملی معتبر نیست.');
    if (!isValidIranianNationalCodeChecksum(nationalCode)) throw publicError('INVALID_NATIONAL_CODE', 'کد ملی معتبر نیست.');

    const phoneLocal = validatePhone(phoneRaw);
    if (!phoneLocal) throw publicError('INVALID_PHONE', 'شماره موبایل معتبر نیست.');
    const phoneE164 = toE164Iran(phoneLocal);
    if (!phoneE164) throw publicError('INVALID_PHONE', 'شماره موبایل معتبر نیست.');

    if (gender !== 'پسر' && gender !== 'دختر') throw publicError('INVALID_INPUT', 'جنسیت معتبر نیست.');

    const groupName = validateGroupName(groupNameRaw);
    if (!groupName) throw publicError('INVALID_INPUT', 'نام گروه معتبر نیست.');

    const pwdCheck = validatePasswordStrength(password);
    if (!pwdCheck.valid) throw publicError(pwdCheck.reason, pwdCheck.message);

    const allowedNational = await hitRateLimit(`reg:national:${hashValue(nationalCode)}`, config.registrationRateLimitPerHour, 3600);
    if (!allowedNational) throw publicError('RATE_LIMITED', 'تعداد درخواست برای این کد ملی زیاد است.', 429);

    const allowedPhone = await hitRateLimit(`reg:phone:${hashValue(phoneLocal)}`, config.registrationRateLimitPerHour, 3600);
    if (!allowedPhone) throw publicError('RATE_LIMITED', 'تعداد درخواست برای این شماره زیاد است.', 429);

    const db = assertDb();

    // Check duplicate national code in users
    const { data: existing, error: existError } = await db.from('warroom_users').select('id').eq('data->>national_code', nationalCode).limit(1).maybeSingle();
    if (existError) throw publicError('DB_ERROR', 'بررسی حساب موجود ممکن نشد.', 503);
    if (existing) {
      throw publicError('DUPLICATE_USER', 'این کد ملی قبلاً ثبت شده است.', 409);
    }

    // Check duplicate phone
    const { data: existingPhone, error: phoneError } = await db.from('warroom_users').select('id').eq('data->>phone', phoneLocal).limit(1).maybeSingle();
    if (phoneError) throw publicError('DB_ERROR', 'بررسی شماره ممکن نشد.', 503);
    if (existingPhone) {
      throw publicError('DUPLICATE_PHONE', 'این شماره موبایل قبلاً ثبت شده است.', 409);
    }

    // Check duplicate in pending registrations (not expired)
    try {
      const { data: pendingExists } = await db.from('warroom_pending_registrations').select('id').eq('national_code', nationalCode).gt('expires_at', new Date().toISOString()).limit(1).maybeSingle();
      if (pendingExists) {
        throw publicError('PENDING_EXISTS', 'درخواست ثبت‌نام معلق برای این کد ملی وجود دارد. لطفاً کد تأیید را وارد کنید یا بعد از انقضا مجدد تلاش کنید.', 409);
      }
    } catch (e) {
      if (e.code === 'PENDING_EXISTS') throw e;
      // If table doesn't exist, fail securely - migration must be applied
      if (e.message && e.message.includes('does not exist')) {
        throw publicError('REGISTRATION_TABLE_MISSING', 'سامانه ثبت‌نام موقتاً در دسترس نیست. Migration مورد نیاز اعمال نشده است.', 503);
      }
    }

    const pendingId = randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const userData = {
      first_name: firstName,
      last_name: lastName,
      national_code: nationalCode,
      phone: phoneLocal,
      phone_e164: phoneE164.e164,
      birth_date: birthDate,
      gender,
      group_name: groupName,
      province: sanitizeText(body.province, 50) || 'تهران',
      city: sanitizeText(body.city, 50) || 'تهران',
      school_name: sanitizeText(body.schoolName || body.school_name, 100) || '',
    };

    // Create pending registration - no fallback to direct user creation (secure flow)
    const { error: pendingError } = await db.from('warroom_pending_registrations').insert({
      id: pendingId,
      national_code: nationalCode,
      phone: phoneLocal,
      phone_e164: phoneE164.e164,
      user_data: userData,
      expires_at: expiresAt,
      is_verified: false,
      attempt_count: 0,
      ip_hash: ipKey,
    });

    if (pendingError) {
      console.error('[registration] pending insert failed:', pendingError.message);
      if (pendingError.message.includes('does not exist')) {
        throw publicError('REGISTRATION_TABLE_MISSING', 'جدول ثبت‌نام معلق وجود ندارد. Migration باید اعمال شود.', 503);
      }
      throw publicError('REGISTRATION_FAILED', 'ثبت‌نام موقتاً ممکن نشد.', 503);
    }

    // Store password hash securely via RPC (service_role only, bcrypt)
    try {
      const { data: pwdData, error: pwdError } = await db.rpc('warroom_set_pending_password', {
        p_pending_id: pendingId,
        p_password: password,
      });
      if (pwdError) {
        console.error('[registration] set pending password failed:', pwdError.message);
        // Cleanup pending on failure
        try {
          await db.from('warroom_pending_registrations').delete().eq('id', pendingId);
        } catch {}
        throw publicError('REGISTRATION_FAILED', 'ذخیره رمز عبور ممکن نشد.', 503);
      }
      if (pwdData && pwdData.success === false) {
        try {
          await db.from('warroom_pending_registrations').delete().eq('id', pendingId);
        } catch {}
        throw publicError(pwdData.error || 'WEAK_PASSWORD', pwdData.error === 'WEAK_PASSWORD' ? 'رمز عبور ضعیف است.' : 'ثبت‌نام ناموفق بود.');
      }
    } catch (e) {
      if (e.status) throw e;
      console.error('[registration] set password exception:', e.message);
      try {
        await db.from('warroom_pending_registrations').delete().eq('id', pendingId);
      } catch {}
      throw publicError('REGISTRATION_FAILED', 'ذخیره رمز عبور ممکن نشد.', 503);
    }

    return res.json({
      success: true,
      message: 'اطلاعات ثبت‌نام اعتبارسنجی شد. برای تکمیل ثبت‌نام، کد تأیید پیامکی را دریافت کنید.',
      pendingId,
      nationalCode,
      maskedPhone: `${phoneLocal.slice(0,4)}***${phoneLocal.slice(-2)}`,
      expiresAt,
    });
  } catch (e) {
    next(e);
  }
});

router.post('/check-national', async (req, res, next) => {
  try {
    const ip = clientIp(req);
    const allowed = await hitRateLimit(`reg:check:${hashValue(ip)}`, 20, 15 * 60);
    if (!allowed) {
      throw publicError('RATE_LIMITED', 'تعداد استعلام زیاد است.', 429);
    }

    const nationalCodeRaw = String(req.body?.nationalCode || req.body?.national_code || '').trim();
    const nationalCode = isValidNationalCode(nationalCodeRaw);
    if (!nationalCode) {
      return res.json({ success: true, exists: false });
    }
    const db = assertDb();
    const { data, error } = await db.from('warroom_users').select('id').eq('data->>national_code', nationalCode).limit(1).maybeSingle();
    if (error) throw publicError('DB_ERROR', 'بررسی ممکن نشد.', 503);
    // Note: This endpoint leaks existence but is needed for UX.
    // Rate limited per IP to mitigate enumeration.
    // Alternative secure design would require generic response, but current UI needs duplicate check.
    return res.json({ success: true, exists: Boolean(data) });
  } catch (e) {
    next(e);
  }
});

export default router;
