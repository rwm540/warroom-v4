import { Router } from 'express';
import { randomBytes, randomUUID } from 'node:crypto';
import { publicError } from '../lib/errors.js';
import { hashValue, isValidNationalCode, normalizeDigits, toE164Iran } from '../lib/identity.js';
import { sanitizeText, validateGroupName } from '../lib/validators.js';
import { validatePasswordStrength } from '../lib/password.js';
import { sanitizeUserData } from '../lib/store.js';

const MEMBER_RANKS = new Set(['soldier', 'farmando', 'jokhedar', 'commander']);
const EDUCATION_LEVELS = new Set(['ابتدایی', 'متوسطه اول', 'متوسطه دوم']);

function responseForFailure(result, fallback) {
  const code = String(result?.error || 'GROUP_OPERATION_FAILED');
  if (code === 'FORBIDDEN') throw publicError(code, 'فقط سرگروه مجاز این جوخه می‌تواند این عملیات را انجام دهد.', 403);
  if (code === 'USER_NOT_FOUND' || code === 'GROUP_NOT_FOUND') throw publicError(code, 'حساب کاربر یا جوخه پیدا نشد.', 404);
  if (code === 'DUPLICATE_USER') throw publicError(code, 'این کد ملی قبلاً در سامانه ثبت شده است.', 409);
  if (code === 'GROUP_FULL') throw publicError(code, 'ظرفیت جوخه تکمیل است.', 409);
  if (code === 'ALREADY_IN_GROUP' || code === 'GROUP_ALREADY_EXISTS') throw publicError(code, 'این کاربر قبلاً جوخه دارد یا جوخه‌ای برای او ثبت شده است.', 409);
  if (code === 'LEADER_INACTIVE') throw publicError(code, 'حساب فرمانده فعال نیست.', 403);
  if (code === 'INVALID_GROUP' || code === 'INVALID_MEMBER') throw publicError(code, 'اطلاعات ارسالی معتبر نیست.', 400);
  throw publicError(code, fallback, 503);
}

export function createGroupRouter({ store, limiter, auth }) {
  const router = Router();
  router.use(auth.requireSession);
  router.use(auth.requireCsrf);

  async function enforceLimit(req, operation, max, windowSeconds) {
    const actor = String(req.authContext?.userId || '');
    const allowed = await limiter.hit(`group:${operation}:${hashValue(actor)}`, max, windowSeconds);
    if (!allowed) throw publicError('RATE_LIMITED', 'تعداد درخواست‌ها زیاد است؛ کمی بعد دوباره تلاش کنید.', 429);
  }

  router.post('/', async (req, res, next) => {
    try {
      await enforceLimit(req, 'create', 5, 60 * 60);
      const leaderId = String(req.authContext.userId);
      const body = req.body || {};
      const name = validateGroupName(body.name || body.groupName);
      if (!name) throw publicError('INVALID_GROUP', 'نام جوخه باید بین ۲ تا ۸۰ نویسه باشد.');

      const educationLevel = EDUCATION_LEVELS.has(String(body.education_level || body.educationLevel || ''))
        ? String(body.education_level || body.educationLevel)
        : 'متوسطه دوم';
      const gender = ['پسر', 'دختر'].includes(String(body.gender || '')) ? String(body.gender) : 'پسر';
      const groupId = `group_${randomUUID()}`;
      const groupData = {
        name,
        education_level: educationLevel,
        gender,
        province: sanitizeText(body.province, 50) || 'تهران',
        city: sanitizeText(body.city, 50) || 'تهران',
        registration_code: `WR-${randomBytes(4).toString('hex').toUpperCase()}`,
        max_members: 6,
        status: 'active',
        created_at: new Date().toISOString(),
      };

      const result = await store.createLeaderGroup({ leaderId, groupId, groupData });
      if (result?.success !== true || !result.group || !result.user) {
        return responseForFailure(result, 'ساخت جوخه در پایگاه داده ناموفق بود.');
      }
      return res.status(201).json({
        success: true,
        group: result.group,
        user: sanitizeUserData(result.user),
        message: 'جوخه در سرور ثبت شد.',
      });
    } catch (error) {
      return next(error);
    }
  });

  router.post('/:groupId/members', async (req, res, next) => {
    try {
      await enforceLimit(req, 'member-create', 20, 60 * 60);
      const leaderId = String(req.authContext.userId);
      const groupId = sanitizeText(req.params.groupId, 128);
      const body = req.body || {};
      const firstName = sanitizeText(body.first_name || body.firstName, 80);
      const lastName = sanitizeText(body.last_name || body.lastName, 80);
      const nationalCode = isValidNationalCode(body.national_code || body.nationalCode);
      const phone = toE164Iran(body.phone || body.mobile);
      const birthDate = sanitizeText(body.birth_date || body.birthDate, 20);
      const password = String(body.password || '');
      const rank = String(body.squad_rank || body.rank || 'soldier');

      if (!groupId || !firstName || firstName.length < 2 || !lastName || lastName.length < 2) {
        throw publicError('INVALID_MEMBER', 'نام، نام خانوادگی و شناسهٔ جوخه الزامی است.');
      }
      if (!nationalCode) throw publicError('INVALID_NATIONAL_CODE', 'کد ملی معتبر وارد کنید.');
      if (!phone) throw publicError('INVALID_PHONE', 'شماره موبایل معتبر وارد کنید.');
      if (!MEMBER_RANKS.has(rank)) throw publicError('INVALID_MEMBER', 'رتبهٔ انتخاب‌شده معتبر نیست.');
      const passwordCheck = validatePasswordStrength(password);
      if (!passwordCheck.valid) throw publicError(passwordCheck.reason, passwordCheck.message);

      await enforceLimit(req, `member-national-${hashValue(nationalCode)}`, 5, 60 * 60);

      const userId = `user_${randomUUID()}`;
      const userData = {
        first_name: firstName,
        last_name: lastName,
        national_code: nationalCode,
        phone: phone.local,
        phone_e164: phone.e164,
        birth_date: birthDate,
        gender: ['پسر', 'دختر'].includes(String(body.gender || '')) ? String(body.gender) : 'پسر',
        education_level: EDUCATION_LEVELS.has(String(body.education_level || '')) ? String(body.education_level) : 'متوسطه دوم',
        grade: sanitizeText(body.grade, 30) || 'یازدهم',
        province: sanitizeText(body.province, 50) || 'تهران',
        city: sanitizeText(body.city, 50) || 'تهران',
        school_name: sanitizeText(body.school_name || body.schoolName, 100),
        personal_code: normalizeDigits(body.personal_code || body.personalCode).slice(0, 9) || String(randomBytes(5).readUInt32BE(0) % 900000000 + 100000000),
        group_id: groupId,
        squad_rank: rank,
        is_group_member: true,
        registration_source: 'leader_created_from_chat',
      };

      const result = await store.createLeaderGroupMember({ leaderId, groupId, userId, userData, password });
      if (result?.success !== true || !result.user) {
        return responseForFailure(result, 'ایجاد حساب عضو در پایگاه داده ناموفق بود.');
      }
      return res.status(201).json({
        success: true,
        user: sanitizeUserData(result.user),
        group: result.group || undefined,
        mustChangePassword: true,
        message: 'حساب عضو ثبت شد؛ تغییر رمز در اولین ورود الزامی است.',
      });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}
