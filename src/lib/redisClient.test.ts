import { describe, it, expect } from 'vitest';
import { isRedisEnabled, getRedisClient, setRedisSession, getRedisSession, clearRedisSession } from './redisClient';

describe('redisClient frontend no-op', () => {
  it('isRedisEnabled is false in frontend', () => {
    expect(isRedisEnabled).toBe(false);
  });

  it('getRedisClient returns null', async () => {
    const client = await getRedisClient();
    expect(client).toBeNull();
  });

  it('session methods return false/null without connecting', async () => {
    expect(await setRedisSession('test', {})).toBe(false);
    expect(await getRedisSession('test')).toBeNull();
    expect(await clearRedisSession('test')).toBe(false);
  });

  it('does not bundle redis package or VITE_ REDIS_URL', async () => {
    // Ensure this file does not import redis or use VITE_ REDIS_URL at runtime
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.resolve(process.cwd(), 'src/lib/redisClient.ts');
    const content = fs.readFileSync(filePath, 'utf8');
    expect(content).not.toContain("from 'redis'");
    expect(content).not.toContain('from \"redis\"');
    expect(content).not.toContain('import(\"redis\")');
    // Should not use process.env.REDIS_URL or import.meta.env REDIS_URL at runtime
    expect(content).not.toContain('process.env.REDIS_URL');
    expect(content).not.toContain('import.meta.env.REDIS');
    // Should not have VITE_REDIS
    expect(content).not.toContain('VITE_REDIS');
    // Should be no-op
    expect(content).toContain('isRedisEnabled = false');
  });
});
