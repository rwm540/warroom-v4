/**
 * Squad / subgroup provisioning API.
 *
 * Called by the chat room when a commander creates a subgroup or registers its members.
 * Every mutation is performed by a SECURITY DEFINER Postgres function that resolves the
 * acting user from the session proof, so leader_id, group_id and role from the request
 * body carry no authority.
 */
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { assertDb } from '../lib/supabase.js';
import { isValidNationalCode, toE164Iran } from '../lib/identity.js';
import { generateInitialPassword, isAcceptablePassword } from '../lib/passwords.js';
import { publicError } from '../lib/errors.js';

export function createSquadsRouter({ auth }) {
  if (!auth) throw new Error('createSquadsRouter requires session auth');
const router = Router();
  router.use(auth.requireSession, auth.requireCsrf);

const RANKS = new Set(['soldier', 'farmando', 'jokhedar', 'commander']);
const MAX_MEMBERS_PER_SQUAD = 6;
const MAX_MEMBERS_PER_REQUEST = 5;

const ERROR_MESSAGES = {
  INVALID_SQUAD_NAME: 'نام زیرگروه باید بین ۲ تا ۶۰ نویسه باشد.',
  PARENT_SQUAD_NOT_FOUND: 'جوخهٔ والد پیدا نشد.',
  PARENT_SQUAD_MERGED: 'جوخهٔ والد ادغام شده است و زیرگروه جدید نمی‌پذیرد.',
  SQUAD_LIMIT_REACHED: 'سقف تعداد جوخه‌های تحت فرمان شما تکمیل شده است.',
  SQUAD_NOT_FOUND: 'جوخه پیدا نشد.',
  SQUAD_FULL: `سقف اعضای جوخه (حداکثر ${MAX_MEMBERS_PER_SQUAD} نفر) تکمیل است.`,
  FORBIDDEN: 'شما اجازهٔ این عملیات را روی این جوخه ندارید.',
  NO_MEMBERS: 'هیچ عضوی برای ثبت ارسال نشد.',
  TOO_MANY_MEMBERS: `در هر مرحله حداکثر ${MAX_MEMBERS_PER_REQUEST} عضو ثبت کنید.`,
  INVALID_MEMBER_NAME: 'نام و نام خانوادگی عضو معتبر نیست.',
  INVALID_NATIONAL_CODE: 'کد ملی یکی از اعضا معتبر نیست.',
  INVALID_PHONE: 'شمارهٔ موبایل یکی از اعضا معتبر نیست.',
  INVALID_RANK: 'درجهٔ جوخهٔ انتخاب‌شده معتبر نیست.',
  DUPLICATE_MEMBER_IN_REQUEST: 'یک کد ملی بیش از یک بار در این فهرست تکرار شده است.',
  MEMBER_BELONGS_TO_OTHER_SQUAD: 'این کد ملی پیش‌تر در جوخهٔ دیگری ثبت شده است.',
  ACCOUNT_BLOCKED: 'حساب یکی از اعضا مسدود است.',
  WEAK_PASSWORD: 'رمز انتخاب‌شده به اندازهٔ کافی قوی نیست.',
  DUPLICATE_MEMBER: 'این کد ملی هم‌زمان توسط درخواست دیگری ثبت شد؛ دوباره تلاش کنید.',
  DUPLICATE_SQUAD: 'این جوخه هم‌زمان توسط درخواست دیگری ثبت شد؛ دوباره تلاش کنید.',
  MEMBER_NOT_FOUND: 'عضوی با این کد ملی پیدا نشد.',
  NOT_A_SQUAD_MEMBER: 'این کاربر عضو جوخهٔ شما نیست.',
  RATE_LIMITED: 'تعداد درخواست‌ها زیاد است؛ کمی بعد دوباره تلاش کنید.',
};

const ERROR_STATUS = {
  FORBIDDEN: 403,
  ACCOUNT_BLOCKED: 403,
  MEMBER_BELONGS_TO_OTHER_SQUAD: 409,
  DUPLICATE_MEMBER: 409,
  DUPLICATE_SQUAD: 409,
  SQUAD_FULL: 409,
  RATE_LIMITED: 429,
  SESSION_PROOF_EXPIRED: 401,
  SQUAD_NOT_FOUND: 404,
  PARENT_SQUAD_NOT_FOUND: 404,
  MEMBER_NOT_FOUND: 404,
  NOT_A_SQUAD_MEMBER: 404,
};

function publicError(code, status = 400) {
  const error = new Error(ERROR_MESSAGES[code] || 'درخواست نامعتبر است.');
  error.status = status;
  error.code = code;
  return error;
}

function fail(result) {
  const code = String(result?.error || 'REQUEST_FAILED');
  throw publicError(code, ERROR_STATUS[code] || 400);
}

router.use((req, _res, next) => {
  try {
    
    next();
  } catch (error) {
    next(error);
  }
});

router.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 40,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'RATE_LIMITED', message: 'تعداد درخواست‌ها زیاد است.' },
  })
);

/** Resolves the acting user and makes sure the proof is still valid before any write. */
async function authenticate(req) {
  // Identity comes only from the verified HttpOnly session middleware, never request data.
  const proof = String(req.authContext?.sessionId || '').trim();
  const actorId = String(req.authContext?.userId || '').trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(proof) || !actorId) {
    throw publicError('NO_SESSION', 'نشست معتبر یافت نشد؛ دوباره وارد شوید.', 401);
  }
  const profile = req.authContext?.user || {};
  if (profile.is_blocked === true || profile.is_active === false) {
    throw publicError('ACCOUNT_BLOCKED', 'حساب کاربری غیرفعال است.', 403);
  }
  return { db: assertDb(), proof, actor: { id: actorId, profile } };
}

function normalizeMember(raw, index) {
  if (!raw || typeof raw !== 'object') {
    throw publicError('INVALID_MEMBER_NAME');
  }

  const firstName = String(raw.first_name || raw.firstName || '').trim();
  const lastName = String(raw.last_name || raw.lastName || '').trim();
  if (!firstName || !lastName || firstName.length > 60 || lastName.length > 60) {
    throw publicError('INVALID_MEMBER_NAME');
  }

  const nationalCode = isValidNationalCode(raw.national_code || raw.nationalCode);
  if (!nationalCode) {
    throw publicError('INVALID_NATIONAL_CODE');
  }

  const phone = toE164Iran(raw.phone || raw.mobile);
  if (!phone) {
    throw publicError('INVALID_PHONE');
  }

  const rank = String(raw.squad_rank || raw.squadRank || 'soldier').trim().toLowerCase();
  if (!RANKS.has(rank)) {
    throw publicError('INVALID_RANK');
  }

  const supplied = String(raw.password || '').trim();
  if (supplied && !isAcceptablePassword(supplied)) {
    throw publicError('WEAK_PASSWORD');
  }

  // No password typed by the commander? Issue a strong one server-side and return it once.
  const password = supplied || generateInitialPassword();

  return {
    index,
    first_name: firstName,
    last_name: lastName,
    national_code: nationalCode,
    phone: phone.local,
    squad_rank: rank,
    birth_date: String(raw.birth_date || raw.birthDate || '').trim(),
    grade: String(raw.grade || '').trim(),
    gender: raw.gender === 'دختر' ? 'دختر' : raw.gender === 'پسر' ? 'پسر' : '',
    password,
  };
}

/** Current session + the squads this commander is allowed to manage. */
router.get('/session', async (req, res, next) => {
  try {
    const { db, actor } = await authenticate(req);
    const { data: squads, error } = await db
      .from('warroom_groups')
      .select('id, data')
      .or(`data->>leader_id.eq.${actor.id}`);
    if (error) throw publicError('SQUAD_NOT_FOUND', 503);

    res.json({
      success: true,
      actor: {
        id: actor.id,
        full_name: `${actor.profile.first_name || ''} ${actor.profile.last_name || ''}`.trim(),
        role: actor.profile.role || 'user',
        group_id: actor.profile.group_id || '',
      },
      squads: (squads || []).map((row) => ({
        id: row.id,
        name: row.data?.name || 'جوخه',
        parent_group_id: row.data?.parent_group_id || null,
        members_count: Number(row.data?.members_count || 0),
        max_members: Number(row.data?.max_members || MAX_MEMBERS_PER_SQUAD),
        status: row.data?.status || 'active',
      })),
    });
  } catch (error) {
    next(error);
  }
});

/** Creates a squad, or a subgroup when parentSquadId is supplied. */
router.post('/', async (req, res, next) => {
  try {
    const { db, proof } = await authenticate(req);
    const name = String(req.body?.name || '').trim();
    if (name.length < 2 || name.length > 60) {
      throw publicError('INVALID_SQUAD_NAME');
    }

    const parentSquadId = String(req.body?.parentSquadId || req.body?.parent_squad_id || '').trim() || null;
    const metadata = req.body?.metadata && typeof req.body.metadata === 'object' ? req.body.metadata : {};

    const { data, error } = await db.rpc('warroom_create_squad', {
      p_proof: proof,
      p_name: name,
      p_parent_squad_id: parentSquadId,
      p_metadata: {
        education_level: String(metadata.educationLevel || metadata.education_level || ''),
        gender: metadata.gender === 'دختر' || metadata.gender === 'پسر' ? metadata.gender : '',
        province: String(metadata.province || ''),
        city: String(metadata.city || ''),
        max_members: Number(metadata.maxMembers || metadata.max_members || MAX_MEMBERS_PER_SQUAD),
      },
    });
    if (error) throw publicError('SQUAD_NOT_FOUND', 503);
    if (!data?.success) fail(data);

    res.status(201).json({
      success: true,
      message: parentSquadId ? 'زیرگروه با موفقیت ثبت شد.' : 'جوخه با موفقیت ثبت شد.',
      squad: data.squad,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Registers members of a squad and creates their independent login accounts.
 * The initial password of each newly created account is returned once, here.
 */
router.post('/:squadId/members', async (req, res, next) => {
  try {
    const { db, proof } = await authenticate(req);
    const squadId = String(req.params.squadId || '').trim();
    if (!squadId) throw publicError('SQUAD_NOT_FOUND');

    const incoming = Array.isArray(req.body?.members) ? req.body.members : [];
    if (incoming.length === 0) throw publicError('NO_MEMBERS');
    if (incoming.length > MAX_MEMBERS_PER_REQUEST) throw publicError('TOO_MANY_MEMBERS');

    const members = incoming.map((raw, index) => normalizeMember(raw, index));
    const passwords = new Map(members.map((member) => [member.national_code, member.password]));

    const { data, error } = await db.rpc('warroom_provision_squad_members', {
      p_proof: proof,
      p_squad_id: squadId,
      p_members: members.map(({ index, ...member }) => member),
    });
    if (error) throw publicError('SQUAD_NOT_FOUND', 503);
    if (!data?.success) fail(data);

    res.status(201).json({
      success: true,
      message: 'اعضا با موفقیت ثبت شدند و حساب کاربری مستقل آن‌ها ساخته شد.',
      squad: data.squad,
      summary: data.summary,
      members: (data.members || []).map((member) => ({
        ...member,
        // Only shown once; the database stores the bcrypt hash, never this value.
        initial_password: member.status === 'created' ? passwords.get(member.national_code) : null,
      })),
    });
  } catch (error) {
    next(error);
  }
});

/** Credential status of the squad's members — lets the commander spot legacy accounts. */
router.get('/:squadId/members', async (req, res, next) => {
  try {
    const { db, proof } = await authenticate(req);
    const squadId = String(req.params.squadId || '').trim();
    const { data, error } = await db.rpc('warroom_squad_member_credential_status', {
      p_proof: proof,
      p_squad_id: squadId,
    });
    if (error) throw publicError('SQUAD_NOT_FOUND', 503);
    if (!data?.success) fail(data);

    res.json({ success: true, members: data.members });
  } catch (error) {
    next(error);
  }
});

/**
 * Issues an initial password for an existing squad member who has no usable credential
 * (accounts created before server-side provisioning).
 */
router.post('/:squadId/members/reissue-password', async (req, res, next) => {
  try {
    const { db, proof } = await authenticate(req);
    const squadId = String(req.params.squadId || '').trim();
    const nationalCode = isValidNationalCode(req.body?.nationalCode || req.body?.national_code);
    if (!nationalCode) throw publicError('INVALID_NATIONAL_CODE');

    const supplied = String(req.body?.password || '').trim();
    if (supplied && !isAcceptablePassword(supplied, { minLength: 12 })) {
      throw publicError('WEAK_PASSWORD');
    }
    const password = supplied || generateInitialPassword(16);

    const { data, error } = await db.rpc('warroom_reissue_squad_member_password', {
      p_proof: proof,
      p_squad_id: squadId,
      p_national_code: nationalCode,
      p_new_password: password,
    });
    if (error) throw publicError('MEMBER_NOT_FOUND', 503);
    if (!data?.success) fail(data);

    res.json({
      success: true,
      message: 'رمز اولیهٔ عضو تعیین شد؛ این رمز فقط یک بار نمایش داده می‌شود.',
      loginId: nationalCode,
      userId: data.user_id,
      initialPassword: password,
      mustChangePassword: true,
    });
  } catch (error) {
    next(error);
  }
});

return router;
}
