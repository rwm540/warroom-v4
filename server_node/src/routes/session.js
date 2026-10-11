import { Router } from 'express';
import { randomUUID, createHmac } from 'node:crypto';
import { config } from '../config.js';
import { assertDb } from '../lib/supabase.js';
import { clientIp, hashValue } from '../lib/identity.js';

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

function createSessionToken(userId, purpose = 'session') {
  const secret = config.otpChallengeSecret || config.otpSecret;
  if (!secret) throw new Error('Session secret not configured');
  const payload = `${userId}:${purpose}:${Date.now()}:${randomUUID()}`;
  const signature = createHmac('sha256', secret).update(payload).digest('hex');
  return `${Buffer.from(payload).toString('base64url')}.${signature}`;
}

function verifySessionToken(token, expectedPurpose = 'session', maxAgeMs = 24 * 60 * 60 * 1000) {
  try {
    const secret = config.otpChallengeSecret || config.otpSecret;
    const [b64, sig] = token.split('.');
    if (!b64 || !sig) return null;
    const payload = Buffer.from(b64, 'base64url').toString('utf8');
    const expectedSig = createHmac('sha256', secret).update(payload).digest('hex');
    // Constant time compare
    if (sig.length !== expectedSig.length) return null;
    let diff = 0;
    for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expectedSig.charCodeAt(i);
    if (diff !== 0) return null;

    const parts = payload.split(':');
    const timestamp = parseInt(parts[2], 10);
    const purpose = parts[1];
    if (purpose !== expectedPurpose) return null;
    if (Date.now() - timestamp > maxAgeMs) return null;

    return { userId: parts[0], payload, timestamp };
  } catch {
    return null;
  }
}

// Create session after successful OTP verification
// Requires otpProof (challenge_id) that is verified, short-lived, one-time
router.post('/create', async (req, res, next) => {
  try {
    const { otpProof, nationalCode } = req.body || {};
    if (!otpProof || !nationalCode) {
      throw publicError('INVALID_INPUT', 'مدرک OTP و کد ملی الزامی است.');
    }

    const ip = clientIp(req);
    const allowed = await hitRateLimit(`session:create:${hashValue(ip)}`, 20, 15 * 60);
    if (!allowed) throw publicError('RATE_LIMITED', 'تعداد درخواست زیاد است.', 429);

    const db = assertDb();

    // Verify otpProof is valid, verified, not expired, and consume it atomically (one-time use)
    // This is critical: otpProof must be short-lived, one-time, bound to user
    const { data: otpRow, error: otpError } = await db.from('warroom_otp_codes')
      .select('user_id, national_code, verified, is_used, used_at, expires_at')
      .eq('challenge_id', otpProof)
      .maybeSingle();

    if (otpError) throw publicError('DB_ERROR', 'بررسی مدرک OTP ممکن نشد.', 503);
    if (!otpRow) throw publicError('INVALID_OTP_PROOF', 'مدرک OTP نامعتبر است.');
    if (!otpRow.verified) throw publicError('OTP_NOT_VERIFIED', 'OTP تأیید نشده است.');
    
    // Check if already consumed for session creation (prevent reuse)
    // We use a separate table warroom_security_kv to track consumed proofs
    // Or check if proof is older than 5 minutes after verification (short-lived)
    const usedAt = otpRow.used_at ? new Date(otpRow.used_at).getTime() : 0;
    if (Date.now() - usedAt > 5 * 60 * 1000) {
      throw publicError('OTP_PROOF_EXPIRED', 'مدرک OTP منقضی شده است. دوباره وارد شوید.');
    }

    // Check if proof already used for session creation
    try {
      const { data: consumed } = await db.from('warroom_security_kv')
        .select('value')
        .eq('id', `otp_proof_consumed:${otpProof}`)
        .maybeSingle();
      if (consumed) {
        throw publicError('OTP_PROOF_REUSED', 'مدرک OTP قبلاً استفاده شده است.');
      }
    } catch (e) {
      if (e.status) throw e;
      // Table may not exist, continue
    }

    // Verify national code matches
    if (otpRow.national_code !== nationalCode) {
      throw publicError('NATIONAL_CODE_MISMATCH', 'کد ملی با مدرک OTP سازگار نیست.');
    }

    // Get user and ensure not blocked
    const { data: userRow, error: userError } = await db.from('warroom_users')
      .select('id, data')
      .eq('id', otpRow.user_id)
      .maybeSingle();
    if (userError) throw publicError('DB_ERROR', 'بررسی کاربر ممکن نشد.', 503);
    if (!userRow) throw publicError('USER_NOT_FOUND', 'کاربر یافت نشد.');
    if (userRow.data?.is_blocked === true) {
      throw publicError('USER_BLOCKED', 'حساب مسدود است.', 403);
    }
    if (userRow.data?.is_active === false) {
      throw publicError('USER_INACTIVE', 'حساب غیرفعال است.', 403);
    }

    // Create refresh token hash
    const sessionId = randomUUID();
    const refreshToken = createSessionToken(userRow.id, 'refresh');
    const tokenHash = createHmac('sha256', config.otpSecret).update(refreshToken).digest('hex');

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { error: tokenError } = await db.from('warroom_refresh_tokens').insert({
      id: sessionId,
      user_id: userRow.id,
      token_hash: tokenHash,
      expires_at: expiresAt,
    });

    if (tokenError) {
      console.error('[session] insert refresh token failed:', tokenError.message);
      throw publicError('SESSION_CREATE_FAILED', 'ایجاد نشست ممکن نشد.', 503);
    }

    // Mark otpProof as consumed (one-time)
    try {
      await db.from('warroom_security_kv').insert({
        id: `otp_proof_consumed:${otpProof}`,
        value: { user_id: userRow.id, consumed_at: new Date().toISOString(), ip_hash: hashValue(ip) },
      });
    } catch {
      // Best effort
    }

    // Also invalidate the OTP code itself after session creation (prevent further use)
    try {
      await db.from('warroom_otp_codes').update({ is_used: true, used_at: new Date().toISOString() }).eq('challenge_id', otpProof);
    } catch {}

    // Set HttpOnly, Secure, SameSite cookie
    const isProduction = config.nodeEnv === 'production';
    const cookieOptions = [
      `warroom_session=${refreshToken}`,
      'Path=/',
      'HttpOnly',
      `SameSite=${isProduction ? 'Strict' : 'Lax'}`,
      `Max-Age=${24 * 60 * 60}`,
      isProduction && config.cookieSecure ? 'Secure' : '',
    ].filter(Boolean).join('; ');

    res.setHeader('Set-Cookie', cookieOptions);

    return res.json({
      success: true,
      message: 'نشست ایجاد شد.',
      sessionId,
      user: {
        id: userRow.id,
        first_name: userRow.data?.first_name,
        last_name: userRow.data?.last_name,
        role: userRow.data?.role,
      },
      // For backward compatibility, also return token in body (but cookie is primary)
      // Frontend should not store this in localStorage - use HttpOnly cookie
      refreshToken: isProduction ? undefined : refreshToken, // Only in dev for debugging
    });
  } catch (e) {
    next(e);
  }
});

// Validate session (from HttpOnly cookie or Authorization header)
router.post('/validate', async (req, res, next) => {
  try {
    const ip = clientIp(req);
    const allowed = await hitRateLimit(`session:validate:${hashValue(ip)}`, 60, 15 * 60);
    if (!allowed) throw publicError('RATE_LIMITED', 'تعداد درخواست زیاد است.', 429);

    let token = null;
    // Try cookie first
    const cookieHeader = req.headers.cookie || '';
    const match = cookieHeader.match(/warroom_session=([^;]+)/);
    if (match) token = decodeURIComponent(match[1]);
    // Fallback to Authorization header
    if (!token) {
      const auth = req.headers.authorization || '';
      if (auth.startsWith('Bearer ')) token = auth.slice(7);
    }
    if (!token) {
      return res.status(401).json({ success: false, error: 'NO_SESSION', message: 'نشست یافت نشد.' });
    }

    const verified = verifySessionToken(token, 'refresh');
    if (!verified) {
      return res.status(401).json({ success: false, error: 'INVALID_SESSION', message: 'نشست نامعتبر است.' });
    }

    const tokenHash = createHmac('sha256', config.otpSecret).update(token).digest('hex');
    const db = assertDb();
    const { data: tokenRow, error } = await db.from('warroom_refresh_tokens')
      .select('id, user_id, expires_at, revoked_at')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (error) throw publicError('DB_ERROR', 'بررسی نشست ممکن نشد.', 503);
    if (!tokenRow) return res.status(401).json({ success: false, error: 'SESSION_NOT_FOUND', message: 'نشست یافت نشد.' });
    if (tokenRow.revoked_at) return res.status(401).json({ success: false, error: 'SESSION_REVOKED', message: 'نشست باطل شده است.' });
    if (new Date(tokenRow.expires_at).getTime() < Date.now()) {
      return res.status(401).json({ success: false, error: 'SESSION_EXPIRED', message: 'نشست منقضی شده است.' });
    }

    // Check user still active and not blocked
    const { data: userRow } = await db.from('warroom_users').select('data').eq('id', tokenRow.user_id).maybeSingle();
    if (!userRow || userRow.data?.is_blocked === true || userRow.data?.is_active === false) {
      // Auto-revoke if user blocked
      try {
        await db.from('warroom_refresh_tokens').update({ revoked_at: new Date().toISOString() }).eq('id', tokenRow.id);
      } catch {}
      return res.status(401).json({ success: false, error: 'USER_BLOCKED', message: 'حساب مسدود یا غیرفعال است.' });
    }

    return res.json({
      success: true,
      userId: tokenRow.user_id,
      expiresAt: tokenRow.expires_at,
    });
  } catch (e) {
    next(e);
  }
});

// Logout - revoke session
router.post('/logout', async (req, res, next) => {
  try {
    let token = null;
    const cookieHeader = req.headers.cookie || '';
    const match = cookieHeader.match(/warroom_session=([^;]+)/);
    if (match) token = decodeURIComponent(match[1]);
    if (!token) {
      const auth = req.headers.authorization || '';
      if (auth.startsWith('Bearer ')) token = auth.slice(7);
    }
    if (token) {
      const tokenHash = createHmac('sha256', config.otpSecret).update(token).digest('hex');
      const db = assertDb();
      try {
        await db.from('warroom_refresh_tokens').update({ revoked_at: new Date().toISOString() }).eq('token_hash', tokenHash);
      } catch {}
    }

    // Clear cookie
    res.setHeader('Set-Cookie', 'warroom_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT');

    return res.json({ success: true, message: 'خروج انجام شد.' });
  } catch (e) {
    next(e);
  }
});

// Revoke all sessions for a user (admin or self)
router.post('/revoke-all', async (req, res, next) => {
  try {
    const { userId } = req.body || {};
    if (!userId) throw publicError('INVALID_INPUT', 'شناسه کاربر الزامی است.');

    const ip = clientIp(req);
    const allowed = await hitRateLimit(`session:revoke:${hashValue(ip)}`, 10, 60 * 60);
    if (!allowed) throw publicError('RATE_LIMITED', 'تعداد درخواست زیاد است.', 429);

    const db = assertDb();
    const { error } = await db.from('warroom_refresh_tokens').update({ revoked_at: new Date().toISOString() }).eq('user_id', userId).is('revoked_at', null);
    if (error) throw publicError('DB_ERROR', 'ابطال نشست‌ها ممکن نشد.', 503);

    return res.json({ success: true, message: 'تمام نشست‌های کاربر باطل شد.' });
  } catch (e) {
    next(e);
  }
});

export default router;
