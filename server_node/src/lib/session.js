import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { config, SESSION_COOKIE_NAME, CSRF_COOKIE_NAME } from '../config.js';

/**
 * Session primitives.
 *
 * Rules implemented here:
 *  - Sessions are signed with a dedicated SESSION_SECRET (never an OTP secret).
 *  - The cookie is HttpOnly; the token itself is only ever readable by the server.
 *  - The token is bound to a server-side session row (warroom_refresh_tokens) that can be
 *    revoked, so the client cannot forge, extend or re-point a session.
 *  - CSRF tokens are derived from the session id, so a token minted for one session
 *    cannot be used with another session.
 */

const TOKEN_VERSION = 's1';

export function sessionSecretValue() {
  if (!config.sessionSecret || config.sessionSecret.length < 32) {
    const error = new Error('SESSION_SECRET_NOT_CONFIGURED');
    error.code = 'SESSION_SECRET_NOT_CONFIGURED';
    error.status = 503;
    throw error;
  }
  return config.sessionSecret;
}

export function sessionCookieName() {
  return SESSION_COOKIE_NAME;
}

export function hashSessionToken(token) {
  return createHmac('sha256', sessionSecretValue()).update(`session-token:${String(token)}`).digest('hex');
}

export function createSessionToken({ userId, sessionId, ttlMs, now = Date.now() }) {
  if (!userId || !sessionId) throw new Error('SESSION_TOKEN_INPUT_INVALID');
  const issuedAt = now;
  const expiresAt = now + ttlMs;
  const payload = [TOKEN_VERSION, String(sessionId), String(userId), String(issuedAt), String(expiresAt), randomUUID()].join('.');
  const signature = createHmac('sha256', sessionSecretValue()).update(payload).digest('hex');
  return `${Buffer.from(payload, 'utf8').toString('base64url')}.${signature}`;
}

export function verifySessionToken(token, { now = Date.now() } = {}) {
  try {
    const raw = String(token || '');
    const [encoded, signature] = raw.split('.');
    if (!encoded || !signature) return null;
    const payload = Buffer.from(encoded, 'base64url').toString('utf8');
    const expected = createHmac('sha256', sessionSecretValue()).update(payload).digest('hex');
    if (!safeEqualHexString(signature, expected)) return null;
    const [version, sessionId, userId, issuedAtRaw, expiresAtRaw] = payload.split('.');
    if (version !== TOKEN_VERSION || !sessionId || !userId) return null;
    const issuedAt = Number(issuedAtRaw);
    const expiresAt = Number(expiresAtRaw);
    if (!Number.isSafeInteger(issuedAt) || !Number.isSafeInteger(expiresAt)) return null;
    if (expiresAt <= now) return null;
    if (issuedAt > now + 60_000) return null;
    return { sessionId, userId, issuedAt, expiresAt };
  } catch {
    return null;
  }
}

export function createCsrfToken(sessionId) {
  return createHmac('sha256', sessionSecretValue())
    .update(`csrf:${String(sessionId)}`)
    .digest('hex')
    .slice(0, 32);
}

export function verifyCsrfToken(sessionId, candidate) {
  if (!sessionId || !candidate) return false;
  return safeEqualHexString(String(candidate), createCsrfToken(sessionId));
}

function safeEqualHexString(a, b) {
  const left = Buffer.from(String(a || ''), 'utf8');
  const right = Buffer.from(String(b || ''), 'utf8');
  if (left.length !== right.length || left.length === 0) return false;
  return timingSafeEqual(left, right);
}

export function parseCookies(cookieHeader) {
  const cookies = {};
  const header = String(cookieHeader || '');
  if (!header) return cookies;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index <= 0) continue;
    const name = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (!name) continue;
    try {
      cookies[name] = decodeURIComponent(value);
    } catch {
      cookies[name] = value;
    }
  }
  return cookies;
}

export function serializeCookie(name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  parts.push(`Path=${options.path || '/'}`);
  if (options.maxAge !== undefined) parts.push(`Max-Age=${Math.max(0, Math.floor(options.maxAge))}`);
  if (options.expires) parts.push(`Expires=${new Date(options.expires).toUTCString()}`);
  if (options.httpOnly) parts.push('HttpOnly');
  if (options.secure) parts.push('Secure');
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  if (options.domain) parts.push(`Domain=${options.domain}`);
  return parts.join('; ');
}

export function serializeSessionCookie(token, { ttlSeconds = config.sessionTtlSeconds } = {}) {
  return serializeCookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: config.cookieSameSite,
    maxAge: ttlSeconds,
    path: '/',
  });
}

export function clearSessionCookie() {
  return serializeCookie(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: config.cookieSameSite,
    maxAge: 0,
    expires: 0,
    path: '/',
  });
}

/**
 * The CSRF token is intentionally readable by the SPA (double submit pattern), but it is
 * bound to the server-side session id via HMAC so it cannot be forged or transplanted.
 */
export function serializeCsrfCookie(csrfToken, { ttlSeconds = config.sessionTtlSeconds } = {}) {
  return serializeCookie(CSRF_COOKIE_NAME, csrfToken, {
    httpOnly: false,
    secure: config.cookieSecure,
    sameSite: config.cookieSameSite,
    maxAge: ttlSeconds,
    path: '/',
  });
}

export function clearCsrfCookie() {
  return serializeCookie(CSRF_COOKIE_NAME, '', {
    httpOnly: false,
    secure: config.cookieSecure,
    sameSite: config.cookieSameSite,
    maxAge: 0,
    expires: 0,
    path: '/',
  });
}

export function extractSessionToken(req) {
  const cookies = parseCookies(req.headers?.cookie);
  const fromCookie = cookies[SESSION_COOKIE_NAME];
  if (fromCookie) return fromCookie;
  const auth = String(req.headers?.authorization || '');
  if (auth.startsWith('Bearer ')) return auth.slice(7).trim();
  return null;
}

/**
 * Origin allowlist check for state-changing requests.
 * When the browser sends an Origin (or Referer) it must match either the request host
 * (same-origin reverse proxy) or the configured allowlist.
 */
export function isAllowedOriginForRequest(req, origin) {
  if (!origin) return true;
  let parsed;
  try {
    parsed = new URL(origin);
  } catch {
    return false;
  }
  const host = String(req.headers?.host || '').trim();
  if (host && parsed.host === host) return true;
  return config.allowedOrigins.includes(parsed.origin);
}

export function resolveRequestOrigin(req) {
  const origin = String(req.headers?.origin || '').trim();
  if (origin) return origin;
  const referer = String(req.headers?.referer || '').trim();
  if (referer) {
    try {
      return new URL(referer).origin;
    } catch {
      return '';
    }
  }
  return '';
}

export function isStateChangingMethod(method) {
  return !['GET', 'HEAD', 'OPTIONS'].includes(String(method || 'GET').toUpperCase());
}
