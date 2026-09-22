type RedisClientType = {
  connect: () => Promise<void>;
  set: (key: string, value: string, options?: Record<string, unknown>) => Promise<unknown>;
  get: (key: string) => Promise<string | null>;
  del: (key: string) => Promise<number>;
};

const redisUrl =
  (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.VITE_REDIS_URL as string | undefined)?.trim()) ||
  'redis://localhost:6379';

export const isRedisEnabled =
  Boolean(redisUrl && redisUrl.startsWith('redis://')) && typeof window === 'undefined';

let redisClient: RedisClientType | null = null;
let redisClientPromise: Promise<RedisClientType | null> | null = null;

async function loadRedisModule(): Promise<{ createClient: (options: { url: string }) => RedisClientType }> {
  try {
    const dynamicImport = new Function('return import("redis")') as () => Promise<{ createClient: (options: { url: string }) => RedisClientType }>;
    return await dynamicImport();
  } catch (error) {
    console.warn('[WarRoom Redis] redis package is unavailable in this environment:', error);
    throw error;
  }
}

export async function getRedisClient(): Promise<RedisClientType | null> {
  if (!isRedisEnabled) return null;
  if (redisClient) return redisClient;
  if (!redisClientPromise) {
    redisClientPromise = (async () => {
      try {
        const { createClient } = await loadRedisModule();
        const client = createClient({ url: redisUrl });
        await client.connect();
        redisClient = client;
        return client;
      } catch (error) {
        console.warn('[WarRoom Redis] unable to connect:', error);
        return null;
      }
    })();
  }

  return redisClientPromise;
}

export async function setRedisSession(sessionId: string, payload: Record<string, any>, ttlSeconds = 86400) {
  const client = await getRedisClient();
  if (!client) return false;
  await client.set(`warroom:session:${sessionId}`, JSON.stringify(payload), {
    EX: ttlSeconds,
  });
  return true;
}

export async function getRedisSession(sessionId: string) {
  const client = await getRedisClient();
  if (!client) return null;
  const raw = await client.get(`warroom:session:${sessionId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function clearRedisSession(sessionId: string) {
  const client = await getRedisClient();
  if (!client) return false;
  await client.del(`warroom:session:${sessionId}`);
  return true;
}

export async function validateSessionToken(sessionId: string): Promise<boolean> {
  if (!sessionId) return false;
  const session = await getRedisSession(sessionId);
  return Boolean(session && session.userId && session.expiresAt && Date.now() < Number(session.expiresAt));
}
