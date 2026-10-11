import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { publicError } from '../lib/errors.js';
import { clientIp, hashValue, isValidNationalCode, toE164Iran } from '../lib/identity.js';
import { sanitizeText, validateGroupName, validatePhone, isValidIranianNationalCodeChecksum } from '../lib/validators.js';
import { validatePasswordStrength } from '../lib/password.js';

/**
 * Registration start.
 *
 * The endpoint validates the submitted data, stores an *inactive* pending registration and
 * returns a response that is intentionally identical whether or not an account already
 * exists for the submitted national code. The account itself is only created later, during
 * the session flow, by an atomic database function after the OTP proof was verified - so no
 * client callback can create, activate or re-enable an account.
 */
export function createRegistrationRouter({ store, sms, limiter, config }) {
  const router = Router();

  /**
   * Rate-limit helper. The database counter is authoritative; Redis may only deny earlier,
   * never grant extra requests (see lib/rateLimit.js).
   */
  async function hitRateLimit(key, max, windowSeconds) {
    return limiter.hit(key, max, windowSeconds);
  }

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

      const maskedPhone = `${phoneLocal.slice(0, 4)}***${phoneLocal.slice(-2)}`;
      const uniformResponse = {
        success: true,
        message: 'اطلاعات دریافتی بررسی شد. اگر ثبت‌نام قابل انجام باشد، با ارسال کد پیامکی ادامه دهید.',
        maskedPhone,
        verificationRequired: true,
      };

      const existing = await store.findUserByNationalCode(nationalCode);
      if (existing) {
        // Do not disclose existence: the response is the same as the happy path, but no
        // pending registration is created (finalization also refuses duplicates in SQL).
        return res.json(uniformResponse);
      }

      const pending = await store.findPendingRegistration({ nationalCode });
      if (pending) {
        return res.json(uniformResponse);
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

      try {
        await store.createPendingRegistration({
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
      } catch (error) {
        if (String(error?.detail || error?.message || '').includes('does not exist')) {
          throw publicError('REGISTRATION_TABLE_MISSING', 'سامانه ثبت‌نام موقتاً در دسترس نیست. Migration مورد نیاز اعمال نشده است.', 503);
        }
        throw error;
      }

      const passwordResult = await store.setPendingPassword(pendingId, password);
      if (passwordResult?.success !== true) {
        try {
          await store.deletePendingRegistration(pendingId);
        } catch {
          throw publicError('REGISTRATION_FAILED', 'ذخیره رمز عبور ممکن نشد و پاک‌سازی درخواست نیز ناموفق بود.', 503);
        }
        const error = String(passwordResult?.error || 'REGISTRATION_FAILED');
        if (error === 'WEAK_PASSWORD') throw publicError('WEAK_PASSWORD', 'رمز عبور ضعیف است.');
        throw publicError('REGISTRATION_FAILED', 'ذخیره رمز عبور ممکن نشد.', 503);
      }

      return res.json(uniformResponse);
    } catch (error) {
      return next(error);
    }
  });

  /**
   * Uniform, enumeration-safe answer. The endpoint intentionally does not query the users
   * table, so its response and timing are identical for registered and unregistered codes.
   * Use POST /api/registration/start followed by POST /api/otp/send to continue the flow.
   */
  router.post('/check-national', async (req, res, next) => {
    try {
      const ip = clientIp(req);
      const allowed = await hitRateLimit(`reg:check:${hashValue(ip)}`, 20, 15 * 60);
      if (!allowed) throw publicError('RATE_LIMITED', 'تعداد استعلام زیاد است.', 429);

      const nationalCodeRaw = String(req.body?.nationalCode || req.body?.national_code || '').trim();
      const nationalCode = isValidNationalCode(nationalCodeRaw);
      if (nationalCode) {
        const perCode = await hitRateLimit(`reg:check:national:${hashValue(nationalCode)}`, 10, 15 * 60);
        if (!perCode) throw publicError('RATE_LIMITED', 'تعداد استعلام زیاد است.', 429);
      }

      await new Promise((resolve) => setTimeout(resolve, 120));
      return res.json({
        success: true,
        checked: true,
        message: 'برای ادامه، ثبت‌نام را تکمیل کنید؛ نتیجه بررسی وجود حساب افشا نمی‌شود.',
      });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}
