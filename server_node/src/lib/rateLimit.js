import { publicError } from './errors.js';
import { config } from '../config.js';

/**
 * Rate limiting that cannot be reset by switching between stores.
 *
 * The database counter (warroom_hit_otp_rate_limit, an atomic upsert) is the single
 * authoritative counter for every limit. Redis is only used as an additional *deny* signal:
 * it can reject a request earlier, but it can never allow a request that the database would
 * deny. Consequences:
 *   - Redis going down (or being flushed/restarted) cannot raise a limit.
 *   - The database going down fails closed (503) instead of silently unlocking traffic.
 *   - There is no non-atomic INCR/EXPIRE fallback path.
 */
export function createRateLimiter({ store, redis }) {
  if (!store) throw new Error('createRateLimiter requires a store');

  async function redisDeny(key, max, windowSeconds) {
    if (!redis || typeof redis.denyCheck !== 'function') return false;
    try {
      return (await redis.denyCheck(key, max, windowSeconds)) === true;
    } catch {
      return false; // Redis trouble must never turn into an allow-by-absence decision
    }
  }

  async function hit(key, max, windowSeconds) {
    if (!key || !Number.isInteger(max) || max < 1 || !Number.isInteger(windowSeconds) || windowSeconds < 1) {
      throw new Error('RATE_LIMIT_ARGUMENTS_INVALID');
    }

    const blockedByRedis = await redisDeny(key, max, windowSeconds);
    if (blockedByRedis) return false;

    let allowed;
    try {
      allowed = await store.hitRateLimit(key, max, windowSeconds);
    } catch (error) {
      throw publicError(
        'RATE_LIMIT_STORE_FAILED',
        'محدودیت امنیتی موقتاً در دسترس نیست؛ بعداً تلاش کنید.',
        503,
      );
    }
    if (typeof allowed !== 'boolean') {
      throw publicError('RATE_LIMIT_STORE_FAILED', 'محدودیت امنیتی موقتاً در دسترس نیست؛ بعداً تلاش کنید.', 503);
    }
    return allowed;
  }

  return { hit };
}

export function rateLimitConfig() {
  return {
    otpMaxSend: config.otpMaxSend,
    otpResendCooldown: config.otpResendCooldown,
    registrationRateLimitPerHour: config.registrationRateLimitPerHour,
    passwordResetRateLimitPerHour: config.passwordResetRateLimitPerHour,
  };
}
