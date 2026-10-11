import { createHmac } from 'node:crypto';
import { config } from '../config.js';

let redisClient = null;
let redisConnectPromise = null;
let redisAvailable = null; // null = unknown, true/false = checked
let lastHealthCheck = 0;
const HEALTH_CHECK_TTL_MS = 15000;

// Lua script for atomic INCR + EXPIRE
// Returns current counter after increment
// Only sets EXPIRE if key was newly created (current == 1)
// This prevents race where EXPIRE is lost and key lives forever
const RATE_LIMIT_LUA = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return current
`;

function getRedisUrl() {
  // Only server-side env, never VITE_
  // Validation is done in config.js, but double-check here
  const url = String(process.env.REDIS_URL || '').trim();
  if (!url) return null;
  if (/^(replace_|your_|change_me|unset_)/i.test(url)) return null;
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
    // Reject placeholder/default insecure passwords in production
    if (config.nodeEnv === 'production') {
      console.error('[redis] Insecure REDIS_PASSWORD placeholder rejected in production');
      return null;
    }
  }
  return pwd;
}

function hashKey(value) {
  // Use OTP_SECRET as keyed hash for PII (national code, phone) to avoid raw storage in Redis
  // Separate secret for HMAC would be ideal, but OTP_SECRET is server-only and >=32 chars
  const secret = config.otpSecret || config.otpChallengeSecret;
  if (!secret || secret.length < 16) {
    // Fallback to simple hash if secret not configured (should not happen in prod)
    // This still avoids raw PII but less secure
    return `fallback_${createHmac('sha256', 'fallback-not-secure').update(String(value)).digest('hex').slice(0, 16)}`;
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

      client.on('connect', () => {
        console.info('[redis] Connecting...');
      });

      client.on('ready', () => {
        console.info('[redis] Ready');
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
    // Ping with timeout
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

/**
 * Atomic rate limit using Redis Lua script: INCR + EXPIRE in one atomic operation
 * Returns true if allowed, false if rate limited
 * If Redis unavailable, returns null to indicate fallback needed
 * Key format: warroom:rl:{key} with TTL
 */
export async function redisRateLimit(key, max, windowSeconds) {
  const client = await getRedisClient();
  if (!client) {
    return null; // Signal to use fallback
  }

  try {
    const fullKey = `warroom:rl:${key}`;
    // Use Lua script for atomic INCR+EXPIRE
    // This prevents race where INCR succeeds but EXPIRE fails and key lives forever
    let current;
    try {
      // Try EVAL first (atomic)
      current = await client.eval(RATE_LIMIT_LUA, {
        keys: [fullKey],
        arguments: [String(windowSeconds)],
      });
    } catch (evalErr) {
      // Fallback to INCR+EXPIRE if EVAL not supported (should not happen in Redis 7)
      // But keep atomicity via MULTI if possible
      console.warn('[redis] EVAL failed, falling back to MULTI:', evalErr.message);
      const multi = client.multi();
      multi.incr(fullKey);
      multi.expire(fullKey, windowSeconds, 'NX'); // Only set expire if not exists, but we need conditional
      // Actually need to check current ==1 then expire, so we do separate
      // For fallback, we do incr then expire only if current==1
      const results = await multi.exec();
      // This fallback is not perfectly atomic but better than nothing
      current = results?.[0];
      // If this is first increment, ensure TTL
      if (current === 1) {
        try {
          await client.expire(fullKey, windowSeconds);
        } catch {}
      }
    }

    // If current > max, rate limited
    return current <= max;
  } catch (e) {
    console.error(`[redis] Rate limit error for ${key}:`, e.message);
    redisAvailable = false;
    return null; // Fallback to DB
  }
}

/**
 * Secure rate limit that hashes PII keys
 */
export async function secureRedisRateLimit({ type, identifier, max, windowSeconds }) {
  // Hash identifier to avoid storing raw national code/phone in Redis
  const hashed = hashKey(identifier);
  const key = `${type}:${hashed}`;
  return redisRateLimit(key, max, windowSeconds);
}

/**
 * Combined rate limiter: tries Redis first, falls back to DB, fails closed if both unavailable
 * This ensures no silent bypass when both stores down
 * 
 * Redis role: fast, ephemeral, high-throughput counters with TTL (in-memory)
 * DB role: persistent, slower, fallback for rate limit when Redis unavailable
 * Both must agree to allow - if both unavailable, deny (fail-closed)
 */
export async function combinedRateLimit({ redisKey, dbKey, max, windowSeconds, dbRateLimitFn }) {
  // Try Redis first (fast path)
  const redisResult = await redisRateLimit(redisKey, max, windowSeconds);
  if (redisResult !== null) {
    // Redis succeeded (allowed or denied)
    return redisResult;
  }

  // Redis unavailable, try DB fallback (persistent)
  if (dbRateLimitFn) {
    try {
      const dbResult = await dbRateLimitFn(dbKey, max, windowSeconds);
      if (dbResult !== null && dbResult !== undefined) {
        return dbResult;
      }
    } catch (e) {
      console.error('[rate-limit] DB fallback also failed:', e.message);
    }
  }

  // Both Redis and DB unavailable - fail closed (deny request) for security
  console.error('[rate-limit] Both Redis and DB unavailable, failing closed for key:', redisKey);
  return false;
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

export { hashKey, RATE_LIMIT_LUA };
