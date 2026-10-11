import { createHmac } from 'node:crypto';
import { config } from '../config.js';

let redisClient = null;
let redisConnectPromise = null;
let redisAvailable = null; // null = unknown, true/false = checked
let lastHealthCheck = 0;
const HEALTH_CHECK_TTL_MS = 15000;

function getRedisUrl() {
  // Only server-side env, never VITE_
  const url = String(process.env.REDIS_URL || '').trim();
  if (!url) return null;
  // Basic validation - must start with redis:// or rediss://
  if (!url.startsWith('redis://') && !url.startsWith('rediss://')) {
    console.warn('[redis] Invalid REDIS_URL format, expected redis:// or rediss://');
    return null;
  }
  return url;
}

function hashKey(value) {
  // Use OTP_SECRET as keyed hash for PII (national code, phone) to avoid raw storage in Redis
  const secret = config.otpSecret || config.otpChallengeSecret;
  if (!secret || secret.length < 16) {
    // Fallback to simple hash if secret not configured (should not happen in prod)
    return `fallback_${String(value).slice(0, 8)}`;
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
 * Atomic rate limit using Redis INCR + EXPIRE
 * Returns true if allowed, false if rate limited
 * If Redis unavailable, returns null to indicate fallback needed
 */
export async function redisRateLimit(key, max, windowSeconds) {
  const client = await getRedisClient();
  if (!client) {
    return null; // Signal to use fallback
  }

  try {
    const fullKey = `warroom:rl:${key}`;
    const current = await client.incr(fullKey);
    if (current === 1) {
      await client.expire(fullKey, windowSeconds);
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
 */
export async function combinedRateLimit({ redisKey, dbKey, max, windowSeconds, dbRateLimitFn }) {
  // Try Redis first
  const redisResult = await redisRateLimit(redisKey, max, windowSeconds);
  if (redisResult !== null) {
    // Redis succeeded
    return redisResult;
  }

  // Redis unavailable, try DB fallback
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
  // Except for health check or non-critical paths
  console.error('[rate-limit] Both Redis and DB unavailable, failing closed for key:', redisKey);
  // For critical security paths, we should deny. Return false to indicate rate limited.
  // This prevents bypass when both stores down.
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

export { hashKey };
