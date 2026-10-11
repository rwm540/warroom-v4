import {
  extractSessionToken,
  hashSessionToken,
  isAllowedOriginForRequest,
  isStateChangingMethod,
  resolveRequestOrigin,
  verifyCsrfToken,
  verifySessionToken,
} from './session.js';
import { publicError } from './errors.js';

/**
 * Server-side authentication middleware.
 *
 * Every authorization decision is derived from:
 *   1. a signed HttpOnly session cookie,
 *   2. the server-side session row (revocable, expiring), and
 *   3. the role stored on the user row in the database.
 *
 * Nothing supplied by the browser (userId, role, is_admin, otpProof, ...) is ever trusted
 * as proof of identity or privilege.
 */
export function createAuthMiddleware({ store }) {
  if (!store) throw new Error('createAuthMiddleware requires a store');

  async function loadContext(req) {
    if (Object.prototype.hasOwnProperty.call(req, 'authContext')) return req.authContext;

    const token = extractSessionToken(req);
    if (!token) {
      req.authContext = null;
      return null;
    }

    const decoded = verifySessionToken(token);
    if (!decoded) {
      req.authContext = null;
      return null;
    }

    const sessionRow = await store.findSessionByTokenHash(hashSessionToken(token));
    if (!sessionRow || sessionRow.id !== decoded.sessionId || String(sessionRow.user_id) !== String(decoded.userId)) {
      req.authContext = null;
      return null;
    }
    if (sessionRow.revoked_at) {
      req.authContext = null;
      return null;
    }
    if (new Date(sessionRow.expires_at).getTime() <= Date.now()) {
      req.authContext = null;
      return null;
    }

    const userRow = await store.findUserById(sessionRow.user_id);
    const userData = userRow?.data || null;
    if (!userRow || !userData || userData.is_blocked === true || userData.is_active === false) {
      // Account no longer allowed to hold a session: revoke it immediately.
      try {
        await store.revokeSessionById(sessionRow.id);
      } catch {
        // Revocation failure must not turn into "session still valid": we still deny below.
      }
      req.authContext = null;
      return null;
    }

    req.authContext = {
      sessionId: sessionRow.id,
      userId: String(sessionRow.user_id),
      role: String(userData.role || 'user'),
      expiresAt: sessionRow.expires_at,
      user: { id: String(userRow.id), ...userData },
    };
    return req.authContext;
  }

  /** Rejects state-changing requests whose Origin/Referer is not same-origin/allowlisted. */
  function enforceOrigin(req, _res, next) {
    if (!isStateChangingMethod(req.method)) return next();
    const origin = resolveRequestOrigin(req);
    if (!origin) return next(); // non-browser client (no ambient cookie authority from a browser)
    if (!isAllowedOriginForRequest(req, origin)) {
      return next(publicError('ORIGIN_NOT_ALLOWED', 'مبدأ درخواست مجاز نیست.', 403));
    }
    return next();
  }

  async function requireSession(req, res, next) {
    try {
      const context = await loadContext(req);
      if (!context) {
        return res.status(401).json({ success: false, error: 'NO_SESSION', message: 'نشست معتبر یافت نشد.' });
      }
      return next();
    } catch (error) {
      return next(error);
    }
  }

  function requireCsrf(req, _res, next) {
    const context = req.authContext;
    if (!context) return next(publicError('NO_SESSION', 'نشست معتبر یافت نشد.', 401));
    if (!isStateChangingMethod(req.method)) return next();
    const headerToken = req.headers['x-csrf-token'];
    if (!verifyCsrfToken(context.sessionId, headerToken)) {
      return next(publicError('CSRF_VALIDATION_FAILED', 'اعتبارسنجی CSRF ناموفق بود.', 403));
    }
    return next();
  }

  function requireAdmin(req, res, next) {
    const context = req.authContext;
    if (!context) {
      return res.status(401).json({ success: false, error: 'NO_SESSION', message: 'نشست معتبر یافت نشد.' });
    }
    if (context.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'FORBIDDEN', message: 'دسترسی مدیریتی لازم است.' });
    }
    return next();
  }

  return { loadContext, enforceOrigin, requireSession, requireCsrf, requireAdmin };
}
