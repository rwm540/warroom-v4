/**
 * Redis client - FRONTEND SAFE NO-OP
 * This file is intentionally a no-op in the browser bundle.
 * Real Redis connection lives only in server_node/src/lib/redis.js (server side).
 * Never import 'redis' or use REDIS_URL with VITE_ prefix here.
 */

export const isRedisEnabled = false;

export async function getRedisClient(): Promise<null> {
  // Frontend never connects to Redis
  return null;
}

export async function setRedisSession(_sessionId: string, _payload: Record<string, any>, _ttlSeconds = 86400): Promise<boolean> {
  return false;
}

export async function getRedisSession(_sessionId: string): Promise<null> {
  return null;
}

export async function clearRedisSession(_sessionId: string): Promise<boolean> {
  return false;
}

export async function validateSessionToken(_sessionId: string): Promise<boolean> {
  return false;
}

// Secure session handling should be done via HttpOnly cookies on server, not via this client
