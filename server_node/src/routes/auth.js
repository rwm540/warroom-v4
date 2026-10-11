import { Router } from 'express';
import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { config } from '../config.js';
import { assertDb, findUserById, findUserByNationalCode, findUserByPhone } from '../lib/supabase.js';
import { hashPassword, verifyPassword } from '../lib/passwords.js';
import {
  authGuard,
  clearSessionCookies,
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  setSessionCookies,
  signAccessToken,
} from '../lib/tokens.js';
import { hashValue, isValidNationalCode, toE164Iran } from '../lib/identity.js';

const router = Router();

router.post('/admin/bootstrap', async (req, res, next) => {
  try {
    const configuredToken = config.adminBootstrapToken;
    const suppliedToken = String(req.headers['x-admin-bootstrap-token'] || '');
    const configured = Buffer.from(configuredToken);
    const supplied = Buffer.from(suppliedToken);
    if (
      configured.length < 32 ||
      /^(replace_|your_|change_me|unset_)/i.test(configuredToken) ||
      configured.length !== supplied.length ||
      !timingSafeEqual(configured, supplied)
    ) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND' });
    }

    const password = String(req.body?.password || '');
    if (password.length < 16) {
      return res.status(400).json({ success: false, error: 'INVALID_BOOTSTRAP', message: 'رمز اولیه باید حداقل ۱۶ نویسه باشد.' });
    }
    const db = assertDb();
    const { data: adminRows, error: adminError } = await db.from('warroom_users')
      .select('id, data')
      .eq('data->>role', 'admin')
      .limit(2);
    if (adminError) throw adminError;
    if (!adminRows?.length) return res.status(404).json({ success: false, error: 'ADMIN_NOT_PROVISIONED' });
    const adminRow = adminRows[0];
    const { data: created, error: bootstrapError } = await db.rpc('warroom_bootstrap_admin', {
      p_user_id: adminRow.id,
      p_password_hash: await hashPassword(password),
    });
    if (bootstrapError) throw bootstrapError;
    if (created !== true) return res.status(409).json({ success: false, error: 'ADMIN_ALREADY_BOOTSTRAPPED' });
    res.status(201).json({ success: true, message: 'اعتبارنامه مدیر ایجاد شد؛ bootstrap token را از محیط سرور حذف کنید.' });
  } catch (error) {
    next(error);
  }
});

async function adminGuard(req, res, next) {
  try {
    const userRow = await findUserById(req.user.sub);
    if (!userRow || userRow.data?.role !== 'admin' || userRow.data?.is_blocked) {
      return res.status(403).json({ success: false, error: 'ADMIN_REQUIRED', message: 'این عملیات فقط برای مدیر مجاز است.' });
    }
    req.admin = userRow;
    next();
  } catch (error) {
    next(error);
  }
}

function generatedPassword() {
  return randomBytes(18).toString('base64url');
}

function publicUser(row) {
  const data = { ...(row?.data || {}) };
  for (const key of Object.keys(data)) {
    if (/password|token|secret|api.?key|otp/i.test(key)) delete data[key];
  }
  return {
    ...data,
    id: row.id,
    national_code: data.national_code,
    role: data.role === 'admin' ? 'admin' : 'user',
  };
}

router.post('/register', async (req, res, next) => {
  try {
    const nationalCode = isValidNationalCode(req.body?.nationalCode || req.body?.national_code);
    const phone = toE164Iran(req.body?.phone);
    const password = String(req.body?.password || '');
    const firstName = String(req.body?.firstName || req.body?.first_name || '').trim();
    const lastName = String(req.body?.lastName || req.body?.last_name || '').trim();
    if (!nationalCode || !phone || !firstName || !lastName || password.length < 8) {
      return res.status(400).json({ success: false, error: 'INVALID_REGISTRATION', message: 'اطلاعات ثبت‌نام معتبر یا کامل نیست.' });
    }

    const db = assertDb();
    if (await findUserByNationalCode(nationalCode)) {
      return res.status(409).json({ success: false, error: 'DUPLICATE_USER', message: 'این کد ملی قبلاً ثبت شده است.' });
    }

    const userId = `user_${randomUUID()}`;
    const groupId = req.body?.groupName ? `group_${randomUUID()}` : undefined;
    let registeredGroup;
    const userData = {
      first_name: firstName,
      last_name: lastName,
      national_code: nationalCode,
      personal_code: String(req.body?.personalCode || req.body?.personal_code || ''),
      phone: phone.local,
      birth_date: String(req.body?.birthDate || req.body?.birth_date || ''),
      gender: req.body?.gender === 'دختر' ? 'دختر' : 'پسر',
      role: 'user',
      education_level: String(req.body?.educationLevel || req.body?.education_level || 'متوسطه اول'),
      grade: String(req.body?.grade || 'هشتم'),
      province: String(req.body?.province || ''),
      city: String(req.body?.city || ''),
      school_name: String(req.body?.schoolName || req.body?.school_name || ''),
      level: 1,
      points: 100,
      is_active: true,
      is_blocked: false,
      ...(groupId ? { group_id: groupId, is_group_member: false, squad_rank: 'commander' } : {}),
    };

    const { error: userError } = await db.from('warroom_users').insert({ id: userId, data: userData });
    if (userError) throw userError;

    const { error: credentialError } = await db.from('warroom_credentials').insert({
      id: userId,
      data: { password_hash: await hashPassword(password), password_algorithm: 'scrypt-v1', mustChangePassword: false },
    });
    if (credentialError) {
      await db.from('warroom_users').delete().eq('id', userId);
      throw credentialError;
    }

    if (groupId) {
      const groupData = {
        id: groupId,
        name: String(req.body.groupName).trim(),
        leader_id: userId,
        leader_name: `${firstName} ${lastName}`,
        members_count: 1,
        max_members: 4,
        member_ids: [userId],
        registration_code: `WR-${randomBytes(5).toString('hex').toUpperCase()}`,
        status: 'active',
        education_level: userData.education_level,
        gender: userData.gender,
        province: userData.province,
        city: userData.city,
        total_points: userData.points,
        level: 1,
        created_at: new Date().toISOString(),
      };
      const { error: groupError } = await db.from('warroom_groups').insert({ id: groupId, data: groupData });
      if (groupError) {
        await db.from('warroom_credentials').delete().eq('id', userId);
        await db.from('warroom_users').delete().eq('id', userId);
        throw groupError;
      }
      registeredGroup = groupData;
    }

    res.status(201).json({
      success: true,
      user: publicUser({ id: userId, data: userData }),
      group: registeredGroup,
      mustChangePassword: false,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const nationalCode = isValidNationalCode(req.body?.nationalCode || req.body?.national_code);
    const password = String(req.body?.password || '');
    if (!nationalCode || !password) {
      return res.status(400).json({ success: false, error: 'INVALID_CREDENTIALS', message: 'کد ملی یا رمز عبور اشتباه است.' });
    }
    const { data: loginAllowed, error: rateError } = await assertDb().rpc('warroom_hit_otp_rate_limit', {
      p_id: `auth:login:${hashValue(nationalCode)}`,
      p_max: 10,
      p_window_seconds: 15 * 60,
    });
    if (rateError) throw rateError;
    if (loginAllowed !== true) {
      return res.status(429).json({ success: false, error: 'RATE_LIMITED', message: 'تلاش‌های ورود بیش از حد مجاز است؛ بعداً دوباره تلاش کنید.' });
    }
    const db = assertDb();
    const row = await findUserByNationalCode(nationalCode);
    if (!row || row.data?.is_blocked) {
      return res.status(401).json({ success: false, error: 'INVALID_CREDENTIALS', message: 'کد ملی یا رمز عبور اشتباه است.' });
    }

    const { data: credential, error } = await db.from('warroom_credentials').select('data').eq('id', row.id).maybeSingle();
    if (error) throw error;
    const storedHash = String(credential?.data?.password_hash || row.data?.password_hash || row.data?.password || '');
    const verified = await verifyPassword(password, storedHash);
    if (!verified.valid) {
      return res.status(401).json({ success: false, error: 'INVALID_CREDENTIALS', message: 'کد ملی یا رمز عبور اشتباه است.' });
    }
    if (verified.needsUpgrade) {
      const { error: upgradeError } = await db.from('warroom_credentials').upsert({
        id: row.id,
        data: { ...(credential?.data || {}), password_hash: await hashPassword(password), password_algorithm: 'scrypt-v1' },
      });
      if (upgradeError) throw upgradeError;
    }

    res.json({ success: true, user: publicUser(row), mustChangePassword: Boolean(credential?.data?.mustChangePassword) });
  } catch (error) {
    next(error);
  }
});

router.post('/check-national-code', async (req, res, next) => {
  try {
    const nationalCode = isValidNationalCode(req.body?.nationalCode || req.body?.national_code);
    if (!nationalCode) return res.status(400).json({ success: false, exists: false, error: 'INVALID_NATIONAL_CODE' });
    res.json({ success: true, exists: Boolean(await findUserByNationalCode(nationalCode)) });
  } catch (error) {
    next(error);
  }
});

router.post('/password-reset-requests', async (req, res, next) => {
  try {
    const phone = toE164Iran(req.body?.phone);
    if (!phone) return res.status(400).json({ success: false, error: 'INVALID_PHONE', message: 'شماره همراه معتبر نیست.' });
    const rateKey = `password-reset:${hashValue(phone.local)}`;
    const { data: allowed, error: rateError } = await assertDb().rpc('warroom_hit_otp_rate_limit', {
      p_id: rateKey,
      p_max: 3,
      p_window_seconds: 15 * 60,
    });
    if (rateError) throw rateError;
    if (allowed !== true) return res.status(429).json({ success: false, error: 'RATE_LIMITED', message: 'درخواست‌های بازیابی زیادی ثبت شده است.' });
    const userRow = await findUserByPhone(phone.local);
    if (!userRow) return res.status(404).json({ success: false, error: 'REQUEST_NOT_FOUND', message: 'درخواستی با این مشخصات پیدا نشد.' });

    const trackingCode = `WR-${randomBytes(4).toString('hex').toUpperCase()}`;
    const record = {
      id: `reset_${randomUUID()}`,
      user_id: userRow.id,
      national_code: userRow.data.national_code,
      contact_phone: phone.local,
      note: String(req.body?.note || '').slice(0, 500),
      tracking_code: trackingCode,
      status: 'pending',
      created_at: new Date().toISOString(),
    };
    const { error } = await assertDb().from('warroom_password_reset_requests').insert({ id: record.id, data: record });
    if (error) throw error;
    res.status(201).json({ success: true, trackingCode, message: 'درخواست بازیابی برای بررسی ثبت شد.' });
  } catch (error) {
    next(error);
  }
});

router.post('/password-reset-requests/status', async (req, res, next) => {
  try {
    const nationalCode = isValidNationalCode(req.body?.nationalCode);
    const trackingCode = String(req.body?.trackingCode || '').trim().toUpperCase();
    if (!nationalCode || !/^WR-[A-F0-9]{8}$/.test(trackingCode)) {
      return res.status(404).json({ success: false, error: 'REQUEST_NOT_FOUND', message: 'درخواستی با این کد رهگیری و کد ملی پیدا نشد.' });
    }
    const { data, error } = await assertDb().from('warroom_password_reset_requests').select('data');
    if (error) throw error;
    const request = (data || []).map((row) => row.data).find((item) =>
      item?.national_code === nationalCode && String(item.tracking_code || '').toUpperCase() === trackingCode);
    if (!request) return res.status(404).json({ success: false, error: 'REQUEST_NOT_FOUND', message: 'درخواستی با این کد رهگیری و کد ملی پیدا نشد.' });
    res.json({
      success: true,
      status: request.status,
      createdAt: request.created_at,
      resolvedAt: request.resolved_at || null,
      message: request.status === 'resolved' ? 'درخواست بررسی و انجام شد.' : request.status === 'rejected' ? 'درخواست رد شد.' : 'درخواست در صف بررسی است.',
    });
  } catch (error) {
    next(error);
  }
});

router.post('/admin/users', authGuard, adminGuard, async (req, res, next) => {
  try {
    const nationalCode = isValidNationalCode(req.body?.nationalCode || req.body?.national_code);
    const phone = toE164Iran(req.body?.phone);
    const firstName = String(req.body?.firstName || req.body?.first_name || '').trim();
    const lastName = String(req.body?.lastName || req.body?.last_name || '').trim();
    const oneTimePassword = String(req.body?.password || generatedPassword());
    if (!nationalCode || !phone || !firstName || !lastName || oneTimePassword.length < 12) {
      return res.status(400).json({ success: false, error: 'INVALID_USER', message: 'اطلاعات کاربر یا رمز موقت معتبر نیست.' });
    }
    if (await findUserByNationalCode(nationalCode)) {
      return res.status(409).json({ success: false, error: 'DUPLICATE_USER', message: 'این کد ملی قبلاً ثبت شده است.' });
    }
    const id = `user_${randomUUID()}`;
    const userData = {
      id,
      national_code: nationalCode,
      personal_code: String(req.body?.personalCode || ''),
      first_name: firstName,
      last_name: lastName,
      phone: phone.local,
      birth_date: String(req.body?.birthDate || ''),
      gender: req.body?.gender === 'دختر' ? 'دختر' : 'پسر',
      role: 'user',
      is_active: true,
      is_blocked: false,
      level: 1,
      points: 0,
    };
    const db = assertDb();
    const { error: userError } = await db.from('warroom_users').insert({ id, data: userData });
    if (userError) throw userError;
    const { error: credentialError } = await db.from('warroom_credentials').insert({
      id,
      data: { password_hash: await hashPassword(oneTimePassword), password_algorithm: 'scrypt-v1', mustChangePassword: true },
    });
    if (credentialError) {
      await db.from('warroom_users').delete().eq('id', id);
      throw credentialError;
    }
    res.status(201).json({ success: true, user: publicUser({ id, data: userData }), oneTimePassword, message: 'کاربر ایجاد شد.' });
  } catch (error) {
    next(error);
  }
});

router.patch('/admin/users/:id', authGuard, adminGuard, async (req, res, next) => {
  try {
    const db = assertDb();
    const userRow = await findUserById(req.params.id);
    if (!userRow) return res.status(404).json({ success: false, error: 'USER_NOT_FOUND' });
    const allowed = ['first_name', 'last_name', 'phone', 'gender', 'province', 'city', 'school_name', 'is_active', 'is_blocked', 'points', 'level'];
    const patch = Object.fromEntries(Object.entries(req.body || {}).filter(([key]) => allowed.includes(key)));
    const updated = { ...userRow.data, ...patch };
    if (updated.role === 'admin') updated.role = 'user';
    const { error } = await db.from('warroom_users').update({ data: updated }).eq('id', userRow.id);
    if (error) throw error;
    res.json({ success: true, user: publicUser({ id: userRow.id, data: updated }) });
  } catch (error) {
    next(error);
  }
});

router.post('/admin/users/:id/password', authGuard, adminGuard, async (req, res, next) => {
  try {
    const userRow = await findUserById(req.params.id);
    if (!userRow) return res.status(404).json({ success: false, error: 'USER_NOT_FOUND' });
    const oneTimePassword = String(req.body?.password || generatedPassword());
    if (oneTimePassword.length < 12) return res.status(400).json({ success: false, error: 'WEAK_PASSWORD' });
    const { error } = await assertDb().from('warroom_credentials').upsert({
      id: userRow.id,
      data: { password_hash: await hashPassword(oneTimePassword), password_algorithm: 'scrypt-v1', mustChangePassword: true },
    });
    if (error) throw error;
    await assertDb().from('warroom_refresh_tokens').update({ revoked_at: new Date().toISOString() }).eq('user_id', userRow.id).is('revoked_at', null);
    res.json({ success: true, oneTimePassword, message: 'رمز موقت تنظیم شد.' });
  } catch (error) {
    next(error);
  }
});

router.post('/admin/users/:id/sessions/revoke', authGuard, adminGuard, async (req, res, next) => {
  try {
    const { data, error } = await assertDb().from('warroom_refresh_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('user_id', req.params.id)
      .is('revoked_at', null)
      .select('id');
    if (error) throw error;
    res.json({ success: true, removed: data?.length || 0 });
  } catch (error) {
    next(error);
  }
});

router.get('/admin/password-reset-requests', authGuard, adminGuard, async (req, res, next) => {
  try {
    const { data, error } = await assertDb().from('warroom_password_reset_requests').select('id, data');
    if (error) throw error;
    let requests = (data || []).map((row) => ({ ...row.data, id: row.id }));
    const status = String(req.query.status || 'all');
    if (status !== 'all') requests = requests.filter((item) => item.status === status);
    const query = String(req.query.q || '').trim().toLowerCase();
    if (query) requests = requests.filter((item) => [item.national_code, item.tracking_code, item.contact_phone].some((value) => String(value || '').toLowerCase().includes(query)));
    res.json({ success: true, requests, stats: Object.fromEntries(['pending', 'contacted', 'resolved', 'rejected'].map((key) => [key, requests.filter((item) => item.status === key).length])) });
  } catch (error) {
    next(error);
  }
});

router.post('/admin/password-reset-requests/:id/:action', authGuard, adminGuard, async (req, res, next) => {
  try {
    const db = assertDb();
    const { data: row, error } = await db.from('warroom_password_reset_requests').select('data').eq('id', req.params.id).maybeSingle();
    if (error) throw error;
    if (!row?.data) return res.status(404).json({ success: false, error: 'REQUEST_NOT_FOUND' });
    const request = row.data;
    const action = req.params.action;
    if (action === 'resolve') {
      const user = await findUserByNationalCode(request.national_code);
      if (!user) return res.status(404).json({ success: false, error: 'USER_NOT_FOUND' });
      const password = String(req.body?.password || generatedPassword());
      if (password.length < 12) return res.status(400).json({ success: false, error: 'WEAK_PASSWORD' });
      const { error: credentialError } = await db.from('warroom_credentials').upsert({
        id: user.id,
        data: { password_hash: await hashPassword(password), password_algorithm: 'scrypt-v1', mustChangePassword: true },
      });
      if (credentialError) throw credentialError;
      await db.from('warroom_refresh_tokens').update({ revoked_at: new Date().toISOString() }).eq('user_id', user.id).is('revoked_at', null);
      request.status = 'resolved';
      request.resolved_at = new Date().toISOString();
      request.admin_note = String(req.body?.note || '').slice(0, 500);
      const { error: updateError } = await db.from('warroom_password_reset_requests').update({ data: request }).eq('id', req.params.id);
      if (updateError) throw updateError;
      return res.json({ success: true, password, message: 'رمز موقت تنظیم شد و نشست‌های قبلی باطل شدند.' });
    }
    if (action === 'contacted') {
      request.status = 'contacted';
      request.contacted_at = new Date().toISOString();
      request.admin_note = String(req.body?.note || '').slice(0, 500);
    } else if (action === 'reject') {
      request.status = 'rejected';
      request.resolved_at = new Date().toISOString();
      request.rejection_reason = String(req.body?.reason || '').slice(0, 500);
    } else {
      return res.status(400).json({ success: false, error: 'INVALID_ACTION' });
    }
    const { error: updateError } = await db.from('warroom_password_reset_requests').update({ data: request }).eq('id', req.params.id);
    if (updateError) throw updateError;
    res.json({ success: true, status: request.status });
  } catch (error) {
    next(error);
  }
});

router.get('/me', authGuard, async (req, res, next) => {
  try {
    const userRow = await findUserByNationalCode(req.user.nationalCode);
    if (!userRow || userRow.id !== req.user.sub || userRow.data?.is_blocked) {
      return res.status(401).json({ success: false, error: 'SESSION_INVALID' });
    }
    res.json({ success: true, user: publicUser(userRow) });
  } catch (error) {
    next(error);
  }
});

router.post('/change-password', authGuard, async (req, res, next) => {
  try {
    const currentPassword = String(req.body?.currentPassword || '');
    const newPassword = String(req.body?.newPassword || '');
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, error: 'WEAK_PASSWORD', message: 'رمز جدید باید حداقل ۸ نویسه باشد.' });
    }
    const db = assertDb();
    const { data: credential, error } = await db.from('warroom_credentials').select('data').eq('id', req.user.sub).maybeSingle();
    if (error) throw error;
    const verified = await verifyPassword(currentPassword, String(credential?.data?.password_hash || ''));
    if (!verified.valid) {
      return res.status(401).json({ success: false, error: 'INVALID_CURRENT_PASSWORD', message: 'رمز فعلی صحیح نیست.' });
    }
    const { error: updateError } = await db.from('warroom_credentials').upsert({
      id: req.user.sub,
      data: { ...credential.data, password_hash: await hashPassword(newPassword), password_algorithm: 'scrypt-v1', mustChangePassword: false },
    });
    if (updateError) throw updateError;
    res.json({ success: true, message: 'رمز عبور تغییر کرد.' });
  } catch (error) {
    next(error);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const raw = req.cookies?.warroom_refresh || parseCookies(req.headers.cookie).warroom_refresh || '';
    const user = await rotateRefreshToken(raw);
    const refresh = await issueRefreshToken(user.id);
    const accessToken = signAccessToken(user, refresh.sessionId);
    setSessionCookies(res, accessToken, refresh.token);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', async (req, res, next) => {
  try {
    const raw = parseCookies(req.headers.cookie).warroom_refresh || '';
    try {
      await revokeRefreshToken(raw);
    } finally {
      clearSessionCookies(res);
    }
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

function parseCookies(header = '') {
  return Object.fromEntries(String(header).split(';').map((part) => {
    const index = part.indexOf('=');
    return index < 0 ? ['', ''] : [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())];
  }).filter(([key]) => key));
}

export default router;
