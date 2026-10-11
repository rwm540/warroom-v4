import { createHmac } from 'node:crypto';
import { config } from '../config.js';

let redisClient = null;
let redisConnectPromise = null;
let redisAvailable = null; // null = unknown, true/false = checked
let lastHealthCheck = 0;
const HEALTH_CHECK_TTL_MS = 15000;

// Atomic INCR + EXPIRE. Only sets EXPIRE when the key is created, so the counter can never
// become a permanently blocking key.
const RATE_LIMIT_LUA = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return current
`;

// Atomic "how many hits in this window" - the counter is never used to allow traffic,
// only to deny early (the authoritative counter lives in Postgres).
const DENY_LUA = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return current
`;

function getRedisUrl() {
  const url = String(process.env.REDIS_URL || '').trim();
  if (!url) return null;
  if (/^(replace_|your_|change_me|unset_|dummy_|example_)/i.test(url)) return null;
  if (!url.startsWith('redis://') && !url.startsWith('rediss://')) {
    console.warn('[redis] Invalid REDIS_URL format, expected redis:// or rediss://');
    return null;
  }
  return url;
}

function getRedisPassword() {
  const pwd = String(process.env.REDIS_PASSWORD || '').trim();
  if (!pwd) return null;
  if (/^(replace_|your_|change_me|unset_|warroom_local_redis_pass)/i.test(pwd)) {
    if (config.nodeEnv === 'production') {
      console.error('[redis] Insecure REDIS_PASSWORD placeholder rejected in production');
      return null;
    }
  }
  return pwd;
}

/**
 * Keyed hash for PII used as a rate-limit key.
 * There is intentionally NO hardcoded fallback secret: if the HMAC secret is missing we
 * refuse to derive a key instead of silently using a predictable one.
 */
export function hashKey(value) {
  const secret = config.otpSecret;
  if (!secret || secret.length < 32) {
    const error = new Error('OTP_SECRET_NOT_CONFIGURED');
    error.code = 'OTP_SECRET_NOT_CONFIGURED';
    error.status = 503;
    throw error;
  }
  return createHmac('sha256', secret).update(`redis-key:${String(value)}`).digest('hex').slice(0, 32);
}

async function loadRedis() {
  try {
    const { createClient } = await import('redis');
    return createClient;
  } catch (e) {
    console.warn('[redis] redis package not available:', e.message);
    throw e;
  }
}

export async function getRedisClient() {
  const url = getRedisUrl();
  if (!url) return null;

  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }

  if (redisConnectPromise) {
    return redisConnectPromise;
  }

  redisConnectPromise = (async () => {
    try {
      const createClient = await loadRedis();
      const client = createClient({
        url,
        socket: {
          connectTimeout: 5000,
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              console.error('[redis] Too many reconnection attempts, giving up');
              return new Error('Too many retries');
            }
            return Math.min(retries * 200, 3000);
          },
        },
      });

      client.on('error', (err) => {
        // Never log URL or password
        console.error('[redis] Client error:', err.message);
        redisAvailable = false;
      });

      client.on('ready', () => {
        redisAvailable = true;
      });

      client.on('end', () => {
        console.warn('[redis] Connection ended');
        redisAvailable = false;
      });

      await client.connect();
      redisClient = client;
      redisAvailable = true;
      lastHealthCheck = Date.now();
      console.info('[redis] Connected successfully');
      return client;
    } catch (e) {
      // Never log URL or password in error
      console.error('[redis] Failed to connect:', e.message);
      redisAvailable = false;
      lastHealthCheck = Date.now();
      return null;
    } finally {
      redisConnectPromise = null;
    }
  })();

  return redisConnectPromise;
}

export async function checkRedisHealth() {
  const now = Date.now();
  if (now - lastHealthCheck < HEALTH_CHECK_TTL_MS && redisAvailable !== null) {
    return { configured: Boolean(getRedisUrl()), available: redisAvailable };
  }

  const url = getRedisUrl();
  if (!url) {
    return { configured: false, available: false };
  }

  try {
    const client = await getRedisClient();
    if (!client) {
      redisAvailable = false;
      lastHealthCheck = now;
      return { configured: true, available: false };
    }
    const pingPromise = client.ping();
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('ping timeout')), 2000));
    await Promise.race([pingPromise, timeoutPromise]);
    redisAvailable = true;
    lastHealthCheck = now;
    return { configured: true, available: true };
  } catch (e) {
    console.warn('[redis] Health check failed:', e.message);
    redisAvailable = false;
    lastHealthCheck = now;
    return { configured: true, available: false };
  }
}

async function evalCounter(script, key, windowSeconds) {
  const client = await getRedisClient();
  if (!client) return null;
  const fullKey = `warroom:rl:${key}`;
  try {
    const current = await client.eval(script, {
      keys: [fullKey],
      arguments: [String(windowSeconds)],
    });
    const parsed = Number(current);
    if (!Number.isFinite(parsed)) return null;
    return parsed;
  } catch (e) {
    // No non-atomic INCR/EXPIRE fallback: if the atomic script cannot run we simply
    // report "no Redis opinion" and let the authoritative database counter decide.
    console.warn('[redis] Atomic counter failed:', e.message);
    redisAvailable = false;
    return null;
  }
}

/**
 * Redis rate limit. Returns true (allowed), false (denied) or null (Redis unavailable).
 * Only ever used as an authoritative store when the caller has no database - production
 * routes use createRateLimiter() where Postgres is authoritative.
 */
export async function redisRateLimit(key, max, windowSeconds) {
  const current = await evalCounter(RATE_LIMIT_LUA, key, windowSeconds);
  if (current === null) return null;
  return current <= max;
}

/**
 * Deny-only Redis check: returns true only when Redis is certain the caller is over the
 * limit. Anything else (unavailable, error, under limit) returns false so the caller falls
 * back to the authoritative database counter.
 */
export async function redisDenyCheck(key, max, windowSeconds) {
  const current = await evalCounter(DENY_LUA, key, windowSeconds);
  if (current === null) return false;
  return current > max;
}

export async function secureRedisRateLimit({ type, identifier, max, windowSeconds }) {
  const hashed = hashKey(identifier);
  const key = `${type}:${hashed}`;
  return redisRateLimit(key, max, windowSeconds);
}

export async function closeRedis() {
  if (redisClient) {
    try {
      await redisClient.quit();
      console.info('[redis] Closed gracefully');
    } catch (e) {
      console.warn('[redis] Error closing:', e.message);
      try {
        await redisClient.disconnect();
      } catch {}
    }
    redisClient = null;
    redisAvailable = false;
  }
}

// Graceful shutdown
if (typeof process !== 'undefined') {
  const shutdown = async () => {
    await closeRedis();
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

export { RATE_LIMIT_LUA };
