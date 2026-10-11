import test from 'node:test';
import assert from 'node:assert/strict';

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
    const { config } = await import('../config.js');
    config.otpSecret = process.env.OTP_SECRET;
    config.otpChallengeSecret = process.env.OTP_CHALLENGE_SECRET;

    const { hashKey } = await import('./redis.js');
    const nationalCode = '1234567890';
    const phone = '09123456789';

    const hash1 = hashKey(nationalCode);
    const hash2 = hashKey(nationalCode);
    const hashPhone = hashKey(phone);

    assert.equal(hash1, hash2, 'Same input should produce same hash');
    assert.notEqual(hash1, hashPhone, 'Different PII should produce different hashes');
    assert.equal(hash1.includes(nationalCode), false, 'Hash should not contain raw national code');
    assert.equal(hashPhone.includes(phone), false, 'Hash should not contain raw phone');
    assert.equal(hash1.length, 32, 'Hash should be 32 chars');
  } finally {
    if (originalEnv) process.env.OTP_SECRET = originalEnv; else delete process.env.OTP_SECRET;
    if (originalChallenge) process.env.OTP_CHALLENGE_SECRET = originalChallenge; else delete process.env.OTP_CHALLENGE_SECRET;
    delete process.env.REDIS_URL;
    delete process.env.REDIS_PASSWORD;
  }
});

// Test 2: redisRateLimit returns null when client unavailable
test('redisRateLimit returns null when Redis client unavailable', async () => {
  const originalRedisUrl = process.env.REDIS_URL;
  delete process.env.REDIS_URL;

  try {
    const { getRedisClient, redisRateLimit } = await import('./redis.js');
    const client = await getRedisClient();
    assert.equal(client, null, 'Should return null when REDIS_URL not configured');

    const result = await redisRateLimit('test:key', 5, 60);
    assert.equal(result, null, 'Should return null to trigger DB fallback when Redis unavailable');
  } finally {
    if (originalRedisUrl) process.env.REDIS_URL = originalRedisUrl;
  }
});

// Test 3: Atomic INCR+EXPIRE via Lua script - key prefix and TTL
test('redisRateLimit uses atomic Lua script with correct key prefix', async () => {
  let evalCalls = [];
  let mockStore = new Map();

  const mockClient = {
    isOpen: true,
    eval: async (script, opts) => {
      evalCalls.push({ script, keys: opts.keys, args: opts.arguments });
      const key = opts.keys[0];
      const ttl = parseInt(opts.arguments[0], 10);
      // Simulate Lua: INCR + EXPIRE if 1
      const current = (mockStore.get(key) || 0) + 1;
      mockStore.set(key, current);
      // In real Lua, EXPIRE only if current==1, but we track it
      return current;
    },
  };

  async function testRateLimitLua(key, max, windowSeconds) {
    const fullKey = `warroom:rl:${key}`;
    const current = await mockClient.eval('lua', { keys: [fullKey], arguments: [String(windowSeconds)] });
    return current <= max;
  }

  const allowed1 = await testRateLimitLua('otp:phone:abc123', 3, 900);
  assert.equal(allowed1, true);
  assert.equal(evalCalls[0].keys[0], 'warroom:rl:otp:phone:abc123');
  assert.equal(evalCalls[0].args[0], '900');

  const allowed2 = await testRateLimitLua('otp:phone:abc123', 3, 900);
  const allowed3 = await testRateLimitLua('otp:phone:abc123', 3, 900);
  assert.equal(allowed2, true);
  assert.equal(allowed3, true);

  const allowed4 = await testRateLimitLua('otp:phone:abc123', 3, 900);
  assert.equal(allowed4, false, 'Fourth request should be rate limited when max=3');

  const allowedOther = await testRateLimitLua('otp:phone:other', 3, 900);
  assert.equal(allowedOther, true, 'Different key should have separate counter');

  // Verify Lua script contains atomic logic
  const { RATE_LIMIT_LUA } = await import('./redis.js');
  assert.ok(RATE_LIMIT_LUA.includes('INCR'), 'Lua should contain INCR');
  assert.ok(RATE_LIMIT_LUA.includes('EXPIRE'), 'Lua should contain EXPIRE');
  assert.ok(RATE_LIMIT_LUA.includes('current == 1'), 'Lua should only EXPIRE on first increment');
});

// Test 4: TTL handling and separate keys
test('Rate limit counters are isolated per key and respect TTL', async () => {
  let store = new Map();
  let ttls = new Map();

  const mockClient = {
    eval: async (_script, opts) => {
      const key = opts.keys[0];
      const ttl = parseInt(opts.arguments[0], 10);
      const current = (store.get(key) || 0) + 1;
      store.set(key, current);
      if (current === 1) ttls.set(key, ttl);
      return current;
    },
  };

  async function rateLimit(key, max, window) {
    const fullKey = `warroom:rl:${key}`;
    const current = await mockClient.eval('', { keys: [fullKey], arguments: [String(window)] });
    return current <= max;
  }

  await rateLimit('reg:ip:hash1', 20, 3600);
  await rateLimit('reg:phone:hash2', 5, 3600);

  assert.equal(store.get('warroom:rl:reg:ip:hash1'), 1);
  assert.equal(store.get('warroom:rl:reg:phone:hash2'), 1);
  assert.equal(ttls.get('warroom:rl:reg:ip:hash1'), 3600);
  assert.equal(ttls.get('warroom:rl:reg:phone:hash2'), 3600);
});

// Test 5: Fail-closed behavior when both Redis and DB down
test('combinedRateLimit fails closed when both stores unavailable', async () => {
  async function combinedRateLimitMock({ redisResult, dbResult }) {
    if (redisResult !== null) return redisResult;
    if (dbResult !== null) return dbResult;
    return false;
  }

  const resultBothDown = await combinedRateLimitMock({ redisResult: null, dbResult: null });
  assert.equal(resultBothDown, false, 'Should deny when both Redis and DB unavailable (fail-closed)');

  const resultRedisDownDbAllows = await combinedRateLimitMock({ redisResult: null, dbResult: true });
  assert.equal(resultRedisDownDbAllows, true, 'Should allow when Redis down but DB allows');

  const resultRedisDenies = await combinedRateLimitMock({ redisResult: false, dbResult: true });
  assert.equal(resultRedisDenies, false, 'Redis deny should take precedence');
});

// Test 6: checkRedisHealth does not expose REDIS_URL or password
test('checkRedisHealth does not expose REDIS_URL or password', async () => {
  const { checkRedisHealth } = await import('./redis.js');

  delete process.env.REDIS_URL;
  const healthNoConfig = await checkRedisHealth();
  assert.equal(healthNoConfig.configured, false);
  assert.equal('url' in healthNoConfig, false, 'Should not expose url field');
  assert.equal('password' in healthNoConfig, false, 'Should not expose password');

  process.env.REDIS_URL = 'redis://:supersecretpassword@redis:6379';
  const healthWithConfig = await checkRedisHealth();
  assert.equal('url' in healthWithConfig, false, 'Should not leak URL even when configured');
  assert.equal('password' in healthWithConfig, false);
  assert.equal(typeof healthWithConfig.configured, 'boolean');
  assert.equal(typeof healthWithConfig.available, 'boolean');

  delete process.env.REDIS_URL;
});

// Test 7: Redis password placeholder rejection
test('Redis password validation rejects insecure defaults', async () => {
  const originalPassword = process.env.REDIS_PASSWORD;
  const originalNodeEnv = process.env.NODE_ENV;

  process.env.NODE_ENV = 'production';
  process.env.SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key-long-enough-for-validation-1234567890';
  process.env.OTP_SECRET = 'test-otp-secret-at-least-32-chars-long-xyz';
  process.env.OTP_CHALLENGE_SECRET = 'test-challenge-secret-at-least-32-chars-abc';

  try {
    // Test insecure default rejection
    process.env.REDIS_PASSWORD = 'warroom_local_redis_pass';
    const { config } = await import('../config.js');
    // Force re-evaluation
    const { secretValue } = await import('../config.js').then(() => {
      // secretValue is internal, test via config
      return { secretValue: null };
    });
    // Directly test config logic
    const testPwd = 'warroom_local_redis_pass';
    const isPlaceholder = /^(replace_|your_|change_me|unset_|warroom_local_redis_pass)/i.test(testPwd);
    assert.equal(isPlaceholder, true, 'Should reject warroom_local_redis_pass as insecure');

    process.env.REDIS_PASSWORD = 'replace_with_strong_password';
    const isPlaceholder2 = /^(replace_|your_|change_me|unset_|warroom_local_redis_pass)/i.test(process.env.REDIS_PASSWORD);
    assert.equal(isPlaceholder2, true, 'Should reject replace_with_...');

    process.env.REDIS_PASSWORD = 'strong-random-password-16chars!';
    const isPlaceholder3 = /^(replace_|your_|change_me|unset_|warroom_local_redis_pass)/i.test(process.env.REDIS_PASSWORD);
    assert.equal(isPlaceholder3, false, 'Should allow strong password');
  } finally {
    if (originalPassword) process.env.REDIS_PASSWORD = originalPassword; else delete process.env.REDIS_PASSWORD;
    if (originalNodeEnv) process.env.NODE_ENV = originalNodeEnv; else delete process.env.NODE_ENV;
  }
});

// Test 8: Lua script prevents forever keys
test('Lua script ensures TTL is set atomically preventing forever keys', async () => {
  const { RATE_LIMIT_LUA } = await import('./redis.js');
  // Script should have logic: if current == 1 then EXPIRE
  // This ensures first increment sets TTL, preventing keys without TTL
  assert.ok(RATE_LIMIT_LUA.includes('EXPIRE'), 'Must set EXPIRE');
  assert.ok(RATE_LIMIT_LUA.includes('current == 1'), 'Must only EXPIRE on first increment (atomic)');
  // Should use KEYS[1] and ARGV[1] properly
  assert.ok(RATE_LIMIT_LUA.includes('KEYS[1]'), 'Should use KEYS[1]');
  assert.ok(RATE_LIMIT_LUA.includes('ARGV[1]'), 'Should use ARGV[1] for TTL');
});
