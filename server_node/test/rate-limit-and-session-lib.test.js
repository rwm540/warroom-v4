import './helpers/env.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createMemoryStore } from './helpers/memoryStore.js';

const { createRateLimiter } = await import('../src/lib/rateLimit.js');
const { config } = await import('../src/config.js');
const sessionLib = await import('../src/lib/session.js');
const redisLib = await import('../src/lib/redis.js');

test('rate limiter fails closed (503) when the authoritative store is unavailable', async () => {
  const store = createMemoryStore();
  store.failures.rateLimit = true;
  const limiter = createRateLimiter({ store, redis: null });
  await assert.rejects(
    () => limiter.hit('test:key', 5, 60),
    (error) => error.code === 'RATE_LIMIT_STORE_FAILED' && error.status === 503,
  );
});

test('an unhealthy or reset Redis can never raise a limit set by the database counter', async () => {
  const store = createMemoryStore();

  // Redis unavailable: the database counter alone must enforce the limit.
  const withoutRedis = createRateLimiter({ store, redis: null });
  const results = [];
  for (let i = 0; i < 5; i += 1) results.push(await withoutRedis.hit('limit:a', 3, 60));
  assert.deepEqual(results, [true, true, true, false, false]);

  // A brand-new (flushed/restarted) Redis must not hand out extra allowance either.
  const freshRedis = { denyCheck: async () => false };
  const afterFlush = createRateLimiter({ store, redis: freshRedis });
  const afterFlushResults = [];
  for (let i = 0; i < 3; i += 1) afterFlushResults.push(await afterFlush.hit('limit:a', 3, 60));
  assert.deepEqual(afterFlushResults, [false, false, false], 'database window still applies after a Redis flush');

  // A different store that has never seen the key starts from its own (correct) window.
  const otherStore = createMemoryStore();
  const otherLimiter = createRateLimiter({ store: otherStore, redis: null });
  assert.equal(await otherLimiter.hit('limit:a', 3, 60), true);
});

test('Redis is deny-only: it may reject earlier but cannot allow what the store denies', async () => {
  const store = createMemoryStore();
  const denyRedis = { denyCheck: async () => true };
  const limiter = createRateLimiter({ store, redis: denyRedis });
  assert.equal(await limiter.hit('limit:b', 5, 60), false, 'Redis denial is honoured');

  const errorRedis = {
    denyCheck: async () => {
      throw new Error('redis down');
    },
  };
  const resilient = createRateLimiter({ store, redis: errorRedis });
  assert.equal(await resilient.hit('limit:c', 5, 60), true, 'Redis errors fall back to the database decision');
  assert.equal(store.state.rateLimits.get('limit:c').count, 1, 'the database counter remains authoritative');
});

test('rate limit keys are keyed hashes - no predictable fallback secret', async () => {
  const original = config.otpSecret;
  try {
    config.otpSecret = '';
    assert.throws(() => redisLib.hashKey('1234567890'), (error) => error.code === 'OTP_SECRET_NOT_CONFIGURED');

    config.otpSecret = 'unit-test-secret-0123456789-0123456789-ok';
    const keyed = redisLib.hashKey('1234567890');
    assert.equal(keyed.length, 32);
    assert.equal(keyed.includes('1234567890'), false);
    assert.equal(redisLib.hashKey('1234567890'), keyed, 'deterministic for the same secret');
    assert.notEqual(redisLib.hashKey('0987654321'), keyed);
  } finally {
    config.otpSecret = original;
  }
});

test('redisDenyCheck never denies blindly when Redis is not configured', async () => {
  const result = await redisLib.redisDenyCheck('anything', 1, 60);
  assert.equal(result, false, 'without Redis the database counter stays authoritative');
});

test('session tokens are signed with SESSION_SECRET, bound to the session row and expire', async () => {
  const userId = 'user_token_test';
  const sessionId = randomUUID();
  const token = sessionLib.createSessionToken({ userId, sessionId, ttlMs: 60_000 });
  const verified = sessionLib.verifySessionToken(token);
  assert.equal(verified.userId, userId);
  assert.equal(verified.sessionId, sessionId);

  // Tampering with the payload invalidates the signature.
  const [payload, signature] = token.split('.');
  const tamperedPayload = Buffer.from(
    Buffer.from(payload, 'base64url').toString('utf8').replace(sessionId, randomUUID()),
    'utf8',
  ).toString('base64url');
  assert.equal(sessionLib.verifySessionToken(`${tamperedPayload}.${signature}`), null);
  assert.equal(sessionLib.verifySessionToken(`${payload}.${'0'.repeat(signature.length)}`), null);

  // Expired tokens are rejected.
  const expired = sessionLib.createSessionToken({ userId, sessionId, ttlMs: 60_000, now: Date.now() - 120_000 });
  assert.equal(sessionLib.verifySessionToken(expired), null);

  // A token signed with another secret is rejected (no OTP-secret fallback).
  const originalSecret = config.sessionSecret;
  try {
    config.sessionSecret = 'a-totally-different-session-secret-value-32+';
    assert.equal(sessionLib.verifySessionToken(token), null);
  } finally {
    config.sessionSecret = originalSecret;
  }
});

test('CSRF tokens are bound to a session and are not transferable', async () => {
  const sessionA = randomUUID();
  const sessionB = randomUUID();
  const tokenA = sessionLib.createCsrfToken(sessionA);
  assert.equal(sessionLib.verifyCsrfToken(sessionA, tokenA), true);
  assert.equal(sessionLib.verifyCsrfToken(sessionB, tokenA), false);
  assert.equal(sessionLib.verifyCsrfToken(sessionA, 'nope'), false);
  assert.equal(sessionLib.verifyCsrfToken(sessionA, null), false);
});

test('session cookie carries HttpOnly plus configurable Secure/SameSite flags', async () => {
  const originalSecure = config.cookieSecure;
  const originalSameSite = config.cookieSameSite;
  try {
    config.cookieSecure = true;
    config.cookieSameSite = 'Strict';
    const cookie = sessionLib.serializeSessionCookie('token-value', { ttlSeconds: 60 });
    assert.match(cookie, /^warroom_session=token-value/);
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /Secure/);
    assert.match(cookie, /SameSite=Strict/);
    assert.match(cookie, /Path=\//);

    const cleared = sessionLib.clearSessionCookie();
    assert.match(cleared, /Max-Age=0/);

    const csrfCookie = sessionLib.serializeCsrfCookie('csrf-value', { ttlSeconds: 60 });
    assert.equal(/HttpOnly/.test(csrfCookie), false, 'CSRF cookie must be readable by the SPA');
  } finally {
    config.cookieSecure = originalSecure;
    config.cookieSameSite = originalSameSite;
  }
});

test('origin validation allows same-origin and allowlisted origins only', () => {
  const request = { headers: { host: 'warroom.example.com' } };
  assert.equal(sessionLib.isAllowedOriginForRequest(request, 'https://warroom.example.com'), true);
  assert.equal(sessionLib.isAllowedOriginForRequest(request, 'https://evil.example.com'), false);
  assert.equal(sessionLib.isAllowedOriginForRequest(request, 'not-a-url'), false);
  assert.equal(sessionLib.isAllowedOriginForRequest(request, ''), true, 'non-browser clients have no Origin');
});

test('cookie parsing and session extraction prefer the HttpOnly cookie', () => {
  const cookies = sessionLib.parseCookies('warroom_session=abc%2Fdef; warroom_csrf=xyz');
  assert.equal(cookies.warroom_session, 'abc/def');
  assert.equal(cookies.warroom_csrf, 'xyz');
  assert.equal(sessionLib.extractSessionToken({ headers: { cookie: 'warroom_session=abc' } }), 'abc');
  assert.equal(sessionLib.extractSessionToken({ headers: { authorization: 'Bearer header-token' } }), 'header-token');
  assert.equal(sessionLib.extractSessionToken({ headers: {} }), null);
});
