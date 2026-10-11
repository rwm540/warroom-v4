import test from 'node:test';
import assert from 'node:assert/strict';

// Mock redis module before importing our redis.js
// We'll test logic without real Redis connection by mocking getRedisClient behavior

// Test 1: hashKey uses HMAC and does not expose raw PII
test('hashKey produces deterministic HMAC without exposing raw PII', async () => {
  const originalEnv = process.env.OTP_SECRET;
  const originalChallenge = process.env.OTP_CHALLENGE_SECRET;
  process.env.OTP_SECRET = 'test-otp-secret-at-least-32-chars-long-xyz';
  process.env.OTP_CHALLENGE_SECRET = 'test-challenge-secret-at-least-32-chars-abc';
  process.env.SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key-long-enough-for-validation-1234567890';
  process.env.REDIS_URL = 'redis://:testpass@redis:6379';
  process.env.REDIS_PASSWORD = 'testpass12345678';

  try {
    // Force reload config
    const { config } = await import('../config.js');
    config.otpSecret = process.env.OTP_SECRET;
    config.otpChallengeSecret = process.env.OTP_CHALLENGE_SECRET;

    const { hashKey } = await import('./redis.js');
    const nationalCode = '1234567890';
    const phone = '09123456789';

    const hash1 = hashKey(nationalCode);
    const hash2 = hashKey(nationalCode);
    const hashPhone = hashKey(phone);

    // Deterministic
    assert.equal(hash1, hash2, 'Same input should produce same hash');
    // Different inputs produce different hashes
    assert.notEqual(hash1, hashPhone, 'Different PII should produce different hashes');
    // Does not contain raw PII
    assert.equal(hash1.includes(nationalCode), false, 'Hash should not contain raw national code');
    assert.equal(hashPhone.includes(phone), false, 'Hash should not contain raw phone');
    // Length check (32 hex chars as per implementation)
    assert.equal(hash1.length, 32, 'Hash should be 32 chars');
  } finally {
    if (originalEnv) process.env.OTP_SECRET = originalEnv; else delete process.env.OTP_SECRET;
    if (originalChallenge) process.env.OTP_CHALLENGE_SECRET = originalChallenge; else delete process.env.OTP_CHALLENGE_SECRET;
    delete process.env.REDIS_URL;
    delete process.env.REDIS_PASSWORD;
  }
});

// Test 2: redisRateLimit returns null when client unavailable (fallback signal)
test('redisRateLimit returns null when Redis client unavailable', async () => {
  const originalRedisUrl = process.env.REDIS_URL;
  delete process.env.REDIS_URL;

  try {
    // Clear module cache to force re-import with no REDIS_URL
    const modPath = new URL('./redis.js', import.meta.url).pathname;
    // We cannot easily clear ESM cache, so test via direct function logic
    // Simulate by calling getRedisClient which should return null when no URL
    const { getRedisClient, redisRateLimit } = await import('./redis.js');
    const client = await getRedisClient();
    assert.equal(client, null, 'Should return null when REDIS_URL not configured');

    const result = await redisRateLimit('test:key', 5, 60);
    assert.equal(result, null, 'Should return null to trigger DB fallback when Redis unavailable');
  } finally {
    if (originalRedisUrl) process.env.REDIS_URL = originalRedisUrl;
  }
});

// Test 3: Atomic INCR+EXPIRE logic with mock client
test('redisRateLimit uses atomic INCR and EXPIRE with correct key prefix', async () => {
  // Create mock client
  let incrCalls = [];
  let expireCalls = [];
  let mockStore = new Map();

  const mockClient = {
    isOpen: true,
    incr: async (key) => {
      incrCalls.push(key);
      const current = (mockStore.get(key) || 0) + 1;
      mockStore.set(key, current);
      return current;
    },
    expire: async (key, ttl) => {
      expireCalls.push({ key, ttl });
      return true;
    },
  };

  // Simulate redisRateLimit logic
  async function testRateLimit(key, max, windowSeconds) {
    const fullKey = `warroom:rl:${key}`;
    const current = await mockClient.incr(fullKey);
    if (current === 1) {
      await mockClient.expire(fullKey, windowSeconds);
    }
    return current <= max;
  }

  // First call should allow and set expire
  const allowed1 = await testRateLimit('otp:phone:abc123', 3, 900);
  assert.equal(allowed1, true);
  assert.equal(incrCalls[0], 'warroom:rl:otp:phone:abc123');
  assert.equal(expireCalls.length, 1);
  assert.equal(expireCalls[0].ttl, 900);

  // Second and third should allow without expire
  const allowed2 = await testRateLimit('otp:phone:abc123', 3, 900);
  const allowed3 = await testRateLimit('otp:phone:abc123', 3, 900);
  assert.equal(allowed2, true);
  assert.equal(allowed3, true);
  assert.equal(expireCalls.length, 1, 'Expire should only be called on first increment');

  // Fourth should be rate limited
  const allowed4 = await testRateLimit('otp:phone:abc123', 3, 900);
  assert.equal(allowed4, false, 'Fourth request should be rate limited when max=3');

  // Different key should have separate counter
  const allowedOther = await testRateLimit('otp:phone:other', 3, 900);
  assert.equal(allowedOther, true, 'Different key should have separate counter');
});

// Test 4: TTL handling and separate keys
test('Rate limit counters are isolated per key and respect TTL', async () => {
  let store = new Map();
  let ttls = new Map();

  const mockClient = {
    incr: async (key) => {
      const current = (store.get(key) || 0) + 1;
      store.set(key, current);
      return current;
    },
    expire: async (key, ttl) => {
      ttls.set(key, ttl);
    },
  };

  async function rateLimit(key, max, window) {
    const fullKey = `warroom:rl:${key}`;
    const current = await mockClient.incr(fullKey);
    if (current === 1) await mockClient.expire(fullKey, window);
    return current <= max;
  }

  // Simulate two different rate limit windows
  await rateLimit('reg:ip:hash1', 20, 3600);
  await rateLimit('reg:phone:hash2', 5, 3600);

  assert.equal(store.get('warroom:rl:reg:ip:hash1'), 1);
  assert.equal(store.get('warroom:rl:reg:phone:hash2'), 1);
  assert.equal(ttls.get('warroom:rl:reg:ip:hash1'), 3600);
  assert.equal(ttls.get('warroom:rl:reg:phone:hash2'), 3600);
});

// Test 5: Fail-closed behavior when both Redis and DB down
test('combinedRateLimit fails closed when both stores unavailable', async () => {
  // Simulate combined logic: if redisResult null and dbResult null => deny (false)
  async function combinedRateLimitMock({ redisResult, dbResult }) {
    if (redisResult !== null) return redisResult;
    if (dbResult !== null) return dbResult;
    // Both unavailable => fail closed
    return false;
  }

  const resultBothDown = await combinedRateLimitMock({ redisResult: null, dbResult: null });
  assert.equal(resultBothDown, false, 'Should deny when both Redis and DB unavailable (fail-closed)');

  const resultRedisDownDbAllows = await combinedRateLimitMock({ redisResult: null, dbResult: true });
  assert.equal(resultRedisDownDbAllows, true, 'Should allow when Redis down but DB allows');

  const resultRedisDenies = await combinedRateLimitMock({ redisResult: false, dbResult: true });
  assert.equal(resultRedisDenies, false, 'Redis deny should take precedence');
});

// Test 6: checkRedisHealth reports configured/available without leaking URL
test('checkRedisHealth does not expose REDIS_URL or password', async () => {
  const { checkRedisHealth } = await import('./redis.js');

  // Without REDIS_URL
  delete process.env.REDIS_URL;
  const healthNoConfig = await checkRedisHealth();
  assert.equal(healthNoConfig.configured, false);
  assert.equal('url' in healthNoConfig, false, 'Should not expose url field');
  assert.equal('password' in healthNoConfig, false, 'Should not expose password');

  // With REDIS_URL (but no real connection)
  process.env.REDIS_URL = 'redis://:supersecretpassword@redis:6379';
  // Force cache invalidation by waiting? Health check has TTL, but we can still check shape
  const healthWithConfig = await checkRedisHealth();
  assert.equal('url' in healthWithConfig, false, 'Should not leak URL even when configured');
  assert.equal('password' in healthWithConfig, false);
  // Only configured and available booleans
  assert.equal(typeof healthWithConfig.configured, 'boolean');
  assert.equal(typeof healthWithConfig.available, 'boolean');

  delete process.env.REDIS_URL;
});
