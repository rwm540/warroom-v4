import jwt from 'jsonwebtoken';
import { randomBytes } from 'node:crypto';
import { config } from '../config.js';
import { hashValue } from './identity.js';
import { assertDb } from './supabase.js';

export function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      nationalCode: user.national_code,
      role: user.role || 'user',
      typ: 'access',
    },
    config.jwtSecret,
    { expiresIn: config.jwtAccessTtl, issuer: 'warroom-server-node' }
  );
}

export function signChallengeToken(payload) {
  return jwt.sign(
    { ...payload, typ: 'otp_challenge' },
    config.jwtSecret,
    { expiresIn: `${config.otpTtlSeconds}s`, issuer: 'warroom-server-node' }
  );
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
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const db = assertDb();
  await db.from('warroom_refresh_tokens').insert({
    user_id: userId,
    token_hash: tokenHash,
    expires_at: expiresAt,
  });
  return raw;
}

export async function rotateRefreshToken(raw) {
  const db = assertDb();
  const tokenHash = hashValue(raw);
  const { data } = await db
    .from('warroom_refresh_tokens')
    .select('*')
    .eq('token_hash', tokenHash)
    .is('revoked_at', null)
    .limit(1)
    .maybeSingle();

  if (!data || new Date(data.expires_at) < new Date()) {
    const error = new Error('REFRESH_INVALID');
    error.status = 401;
    throw error;
  }

  await db
    .from('warroom_refresh_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', data.id);

  return data.user_id;
}

export async function revokeRefreshToken(raw) {
  if (!raw) return;
  const db = assertDb();
  await db
    .from('warroom_refresh_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('token_hash', hashValue(raw));
}

export function authGuard(req, res, next) {
  const header = String(req.headers.authorization || '');
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) {
    res.status(401).json({ error: 'TOKEN_REQUIRED' });
    return;
  }
  try {
    req.user = verifyToken(token, 'access');
    next();
  } catch {
    res.status(401).json({ error: 'TOKEN_INVALID' });
  }
}
