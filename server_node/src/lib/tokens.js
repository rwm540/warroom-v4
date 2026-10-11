import jwt from 'jsonwebtoken';
import { randomBytes } from 'node:crypto';
import { config } from '../config.js';
import { hashValue } from './identity.js';
import { assertDb } from './supabase.js';

function ttlMilliseconds(value, fallback) {
  const ttl = String(value || '');
  const match = ttl.match(/^(\d+)(s|m|h|d)$/i);
  if (match) {
    const unit = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2].toLowerCase()];
    return Number(match[1]) * unit;
  }
  return /^\d+$/.test(ttl) ? Number(ttl) * 1000 : fallback;
}

export function signAccessToken(user, sessionId) {
  if (config.jwtSecret.length < 32 || /^(replace_|your_|change_me|unset_)/i.test(config.jwtSecret)) {
    const error = new Error('JWT_SECRET_NOT_CONFIGURED');
    error.status = 503;
    error.code = 'JWT_SECRET_NOT_CONFIGURED';
    throw error;
  }
  return jwt.sign(
    {
      sub: user.id,
      nationalCode: user.national_code,
      role: user.role || 'user',
      sid: sessionId,
      typ: 'access',
    },
    config.jwtSecret,
    { expiresIn: config.jwtAccessTtl, issuer: 'warroom-server-node' }
  );
}

export function signChallengeToken(payload) {
  if (config.jwtSecret.length < 32 || /^(replace_|your_|change_me|unset_)/i.test(config.jwtSecret)) {
    const error = new Error('JWT_SECRET_NOT_CONFIGURED');
    error.status = 503;
    error.code = 'JWT_SECRET_NOT_CONFIGURED';
    throw error;
  }
  return jwt.sign(
    { ...payload, typ: 'otp_challenge' },
    config.jwtSecret,
    { expiresIn: `${config.otpTtlSeconds}s`, issuer: 'warroom-server-node' }
  );
}

export function setSessionCookies(res, accessToken, refreshToken) {
  const secure = config.nodeEnv === 'production';
  const common = { httpOnly: true, secure, sameSite: 'lax' };
  res.cookie('warroom_access', accessToken, { ...common, path: '/', maxAge: ttlMilliseconds(config.jwtAccessTtl, 15 * 60 * 1000) });
  res.cookie('warroom_refresh', refreshToken, { ...common, path: '/api/auth', maxAge: ttlMilliseconds(config.jwtRefreshTtl, 7 * 24 * 60 * 60 * 1000) });
}

export function clearSessionCookies(res) {
  const common = { httpOnly: true, secure: config.nodeEnv === 'production', sameSite: 'lax' };
  res.clearCookie('warroom_access', { ...common, path: '/' });
  res.clearCookie('warroom_refresh', { ...common, path: '/api/auth' });
}

export function verifyToken(token, expectedTyp) {
  const decoded = jwt.verify(token, config.jwtSecret, { issuer: 'warroom-server-node' });
  if (expectedTyp && decoded.typ !== expectedTyp) {
    const error = new Error('INVALID_TOKEN_TYPE');
    error.status = 401;
    throw error;
  }
  return decoded;
}

export async function issueRefreshToken(userId) {
  const raw = randomBytes(48).toString('hex');
  const tokenHash = hashValue(raw);
  const expiresAt = new Date(Date.now() + ttlMilliseconds(config.jwtRefreshTtl, 7 * 24 * 60 * 60 * 1000)).toISOString();
  const db = assertDb();
  const { data, error } = await db.from('warroom_refresh_tokens').insert({
    user_id: userId,
    token_hash: tokenHash,
    expires_at: expiresAt,
  }).select('id').single();
  if (error) throw error;
  return { token: raw, sessionId: data.id };
}

export async function rotateRefreshToken(raw) {
  const db = assertDb();
  const tokenHash = hashValue(raw);
  const { data: userId, error } = await db.rpc('warroom_consume_refresh_token', { p_token_hash: tokenHash });
  if (error) throw error;
  if (!userId) {
    const error = new Error('REFRESH_INVALID');
    error.status = 401;
    throw error;
  }

  const { findUserById } = await import('./supabase.js');
  const userRow = await findUserById(userId);
  if (!userRow || userRow.data?.is_blocked) {
    const invalid = new Error('REFRESH_INVALID');
    invalid.status = 401;
    throw invalid;
  }
  return {
    id: userRow.id,
    national_code: userRow.data?.national_code || '',
    role: userRow.data?.role === 'admin' ? 'admin' : 'user',
  };
}

export async function revokeRefreshToken(raw) {
  if (!raw) return;
  const db = assertDb();
  const { error } = await db
    .from('warroom_refresh_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('token_hash', hashValue(raw));
  if (error) throw error;
}

export async function authGuard(req, res, next) {
  const header = String(req.headers.authorization || '');
  const cookies = Object.fromEntries(String(req.headers.cookie || '').split(';').map((part) => {
    const index = part.indexOf('=');
    return index < 0 ? ['', ''] : [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())];
  }).filter(([key]) => key));
  const token = header.startsWith('Bearer ') ? header.slice(7) : cookies.warroom_access || '';
  if (!token) {
    res.status(401).json({ error: 'TOKEN_REQUIRED' });
    return;
  }
  try {
    req.user = verifyToken(token, 'access');
    if (!req.user.sid) {
      res.status(401).json({ success: false, error: 'SESSION_INVALID' });
      return;
    }
    const { data, error } = await assertDb()
      .from('warroom_refresh_tokens')
      .select('id')
      .eq('id', req.user.sid)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();
    if (error) {
      res.status(503).json({ success: false, error: 'SESSION_CHECK_UNAVAILABLE' });
      return;
    }
    if (!data) {
      res.status(401).json({ success: false, error: 'SESSION_INVALID' });
      return;
    }
    next();
  } catch {
    res.status(401).json({ error: 'TOKEN_INVALID' });
  }
}
