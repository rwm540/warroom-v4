import './helpers/env.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { startTestServer, createMemoryStore, createFakeSms, createCookieJar } from './helpers/harness.js';

const { config } = await import('../src/config.js');
const { createSessionToken, hashSessionToken, createCsrfToken } = await import('../src/lib/session.js');

const NATIONAL = '1234567891';
const PHONE = '09121112233';
const PASSWORD = 'Rz7kQm2Lp9x';

/** Valid Iranian national code (checksum appended) so server-side validation is realistic. */
function nationalCodeFrom(prefix9) {
  const digits = String(prefix9).padStart(9, '0').slice(0, 9).split('').map(Number);
  const sum = digits.reduce((total, digit, index) => total + digit * (10 - index), 0);
  const remainder = sum % 11;
  const check = remainder < 2 ? remainder : 11 - remainder;
  return `${digits.join('')}${check}`;
}

function registrationPayload(overrides = {}) {
  return {
    firstName: 'رزمنده',
    lastName: 'آزمایشی',
    nationalCode: NATIONAL,
    phone: PHONE,
    birthDate: '1388/06/20',
    gender: 'پسر',
    groupName: 'گروه آزمایشی',
    password: PASSWORD,
    province: 'تهران',
    city: 'تهران',
    schoolName: 'دبیرستان آزمایشی',
    ...overrides,
  };
}

function seedLoggedInAdmin(store, userId = 'user_admin') {
  store.seedUser({ id: userId, data: { role: 'admin', national_code: NATIONAL, phone: PHONE } });
  const sessionId = 'session-admin-ttl';
  const token = createSessionToken({ userId, sessionId, ttlMs: 60 * 60 * 1000 });
  store.state.sessions.set(sessionId, {
    id: sessionId,
    user_id: userId,
    token_hash: hashSessionToken(token),
    expires_at: new Date(Date.now() + 3600_000).toISOString(),
    revoked_at: null,
  });
  const jar = createCookieJar();
  jar.set('warroom_session', token);
  jar.set('warroom_csrf', createCsrfToken(sessionId));
  return jar;
}

/**
 * Simulates the passage of a server-side rate-limit window without sleeping, exactly like a
 * new window starting later in the real system. The application itself never clears counters
 * (see lib/rateLimit.js); only the window end is rewound, and only for keys the caller names.
 */
function expireRateLimitWindows(server, shouldExpire = () => true) {
  const past = Date.now() - 1;
  for (const [key, entry] of server.store.state.rateLimits) {
    if (shouldExpire(key)) entry.windowEnd = past;
  }
  for (const key of [...server.redis.counters.keys()]) {
    if (shouldExpire(key)) server.redis.counters.delete(key);
  }
}

const cooldownOnly = (key) => key.includes(':cooldown:');

test('OTP validity is 120 seconds and every layer shares one absolute deadline', async () => {
  assert.equal(config.otpTtlSeconds, 120, 'OTP_TTL_SECONDS default must be 120');
  assert.equal(config.otpResendCooldown, 120);

  const store = createMemoryStore();
  const sms = createFakeSms();
  const server = await startTestServer({ store, sms });
  try {
    store.seedUser({ id: 'user_ttl', data: { national_code: NATIONAL, phone: PHONE }, password: PASSWORD });
    const before = Date.now();
    const send = await server.request('/api/otp/send', { body: { nationalCode: NATIONAL, purpose: 'login', password: PASSWORD } });
    assert.equal(send.status, 200);
    assert.equal(send.json.success, true);
    assert.equal(send.json.deliveryStatus, 'accepted', 'acceptance must be stated explicitly');
    assert.equal(send.json.resendAvailableIn, 120);
    assert.ok(send.json.expiresIn > 0 && send.json.expiresIn <= 120, `expiresIn must fit the TTL: ${send.json.expiresIn}`);
    assert.ok(send.json.expiresIn >= 115, `expiresIn must reflect the real remaining TTL: ${send.json.expiresIn}`);
    assert.equal('code' in send.json, false, 'the OTP code is never returned');

    // The response deadline, the database row and the SMS text agree.
    const row = [...store.state.otpCodes.values()][0];
    assert.equal(row.expires_at, send.json.expiresAt, 'database expires_at must equal the API expiresAt');
    const absoluteMs = Date.parse(send.json.expiresAt);
    assert.ok(Math.abs(absoluteMs - (before + 120_000)) < 3_000, 'deadline is now + 120s');

    const meta = sms.sent[0].meta;
    assert.equal(meta.expiresAtMs - meta.issuedAtMs, 120_000, 'SMS validity window equals the TTL');
    assert.equal(row.expires_at, new Date(meta.expiresAtMs).toISOString());
  } finally {
    await server.close();
  }
});

test('a code is rejected once its 120 second deadline passes', async () => {
  const store = createMemoryStore();
  const sms = createFakeSms();
  const server = await startTestServer({ store, sms });
  try {
    store.seedUser({ id: 'user_expired', data: { national_code: NATIONAL, phone: PHONE }, password: PASSWORD });
    const send = await server.request('/api/otp/send', { body: { nationalCode: NATIONAL, purpose: 'login', password: PASSWORD } });
    const code = sms.lastCode();
    const token = send.json.challengeToken;

    // The code is correct, but its deadline is in the past (simulating the TTL elapsing).
    const row = [...store.state.otpCodes.values()][0];
    row.expires_at = new Date(Date.now() - 1_000).toISOString();
    const expired = await server.request('/api/otp/verify', { body: { nationalCode: NATIONAL, code, challengeToken: token } });
    assert.equal(expired.status, 400);
    assert.equal(expired.json.error, 'OTP_EXPIRED');
    assert.equal('otpProof' in expired.json, false, 'an expired code must never produce a proof');

    // The challenge token carries the same absolute deadline and is rejected by itself as well.
    const expiredToken = jwt.sign(
      { sub: 'user_expired', challengeId: row.challenge_id, purpose: 'login', typ: 'otp_challenge' },
      config.otpChallengeSecret,
      { issuer: 'warroom-otp-service', expiresIn: -10 },
    );
    const expiredJwt = await server.request('/api/otp/verify', {
      body: { nationalCode: NATIONAL, code, challengeToken: expiredToken },
    });
    assert.equal(expiredJwt.status, 401);
    assert.equal(expiredJwt.json.error, 'CHALLENGE_EXPIRED');
  } finally {
    await server.close();
  }
});

test('login resend keeps the password gate and issues a fresh usable challenge', async () => {
  const store = createMemoryStore();
  const sms = createFakeSms();
  const server = await startTestServer({ store, sms });
  try {
    store.seedUser({ id: 'user_resend', data: { national_code: NATIONAL, phone: PHONE }, password: PASSWORD });

    const first = await server.request('/api/otp/send', { body: { nationalCode: NATIONAL, purpose: 'login', password: PASSWORD } });
    assert.equal(first.status, 200);
    assert.equal(sms.sent.length, 1);

    // A login resend without the password is refused before any SMS is issued.
    expireRateLimitWindows(server);
    const withoutPassword = await server.request('/api/otp/resend', { body: { nationalCode: NATIONAL, purpose: 'login' } });
    assert.equal(withoutPassword.status, 401);
    assert.equal(withoutPassword.json.error, 'INVALID_CREDENTIALS');
    assert.equal(sms.sent.length, 1, 'no SMS without a verified password');

    expireRateLimitWindows(server);
    const wrongPassword = await server.request('/api/otp/resend', {
      body: { nationalCode: NATIONAL, purpose: 'login', password: 'WrongPassword1' },
    });
    assert.equal(wrongPassword.status, 401);
    assert.deepEqual(wrongPassword.json, withoutPassword.json, 'uniform answer for both cases');
    assert.equal(sms.sent.length, 1);

    // With the correct password the resend works after the cooldown window.
    expireRateLimitWindows(server);
    const resend = await server.request('/api/otp/resend', {
      body: { nationalCode: NATIONAL, purpose: 'login', password: PASSWORD },
    });
    assert.equal(resend.status, 200);
    assert.equal(resend.json.success, true);
    assert.equal(sms.sent.length, 2, 'the new code is delivered by SMS');
    assert.notEqual(resend.json.challengeToken, first.json.challengeToken);
    assert.equal(resend.json.deliveryStatus, 'accepted');

    // Exactly one live challenge remains: the first one is invalidated.
    const rows = [...store.state.otpCodes.values()];
    assert.equal(rows.length, 2);
    assert.equal(rows[0].is_used, true, 'the replaced challenge must not stay usable');
    assert.equal(rows[1].is_used, false);

    const verifyOld = await server.request('/api/otp/verify', {
      body: { nationalCode: NATIONAL, code: sms.sent[0].otp, challengeToken: first.json.challengeToken },
    });
    assert.equal(verifyOld.status, 400);
    assert.equal(verifyOld.json.error, 'OTP_EXPIRED');

    const verifyNew = await server.request('/api/otp/verify', {
      body: { nationalCode: NATIONAL, code: sms.lastCode(), challengeToken: resend.json.challengeToken },
    });
    assert.equal(verifyNew.status, 200);
    assert.equal(verifyNew.json.purpose, 'login');

    const session = await server.request('/api/session/create', {
      body: { otpProof: verifyNew.json.otpProof },
      jar: createCookieJar(),
    });
    assert.equal(session.status, 200);
    assert.ok(session.json.user?.id);
  } finally {
    await server.close();
  }
});

test('registration survives closing the OTP window: a later request issues a new code', async () => {
  const store = createMemoryStore();
  const sms = createFakeSms();
  const server = await startTestServer({ store, sms });
  try {
    const start = await server.request('/api/registration/start', { body: registrationPayload() });
    assert.equal(start.status, 200);

    const first = await server.request('/api/otp/send', { body: { nationalCode: NATIONAL, purpose: 'registration' } });
    assert.equal(first.status, 200);
    assert.equal(first.json.purpose, 'registration');

    // The browser closes the modal and later asks for a new code (cooldown passed).
    expireRateLimitWindows(server);
    const second = await server.request('/api/otp/resend', { body: { nationalCode: NATIONAL, purpose: 'registration' } });
    assert.equal(second.status, 200);
    assert.ok(second.json.challengeToken);
    assert.equal(sms.sent.length, 2);

    const verify = await server.request('/api/otp/verify', {
      body: { nationalCode: NATIONAL, code: sms.lastCode(), challengeToken: second.json.challengeToken },
    });
    assert.equal(verify.status, 200);
    assert.equal(verify.json.purpose, 'registration');

    const jar = createCookieJar();
    const session = await server.request('/api/session/create', { body: { otpProof: verify.json.otpProof }, jar });
    assert.equal(session.status, 200);
    assert.equal(session.json.isNewRegistration, true);
    assert.equal([...store.state.users.values()].length, 1);
  } finally {
    await server.close();
  }
});

test('resend cannot bypass the cooldown, the per-national quota or the per-IP limit', async () => {
  const store = createMemoryStore();
  const sms = createFakeSms();
  const server = await startTestServer({ store, sms });
  try {
    store.seedUser({ id: 'user_limits', data: { national_code: NATIONAL, phone: PHONE }, password: PASSWORD });
    const first = await server.request('/api/otp/send', { body: { nationalCode: NATIONAL, purpose: 'login', password: PASSWORD } });
    assert.equal(first.status, 200);

    const tooSoon = await server.request('/api/otp/resend', {
      body: { nationalCode: NATIONAL, purpose: 'login', password: PASSWORD },
    });
    assert.equal(tooSoon.status, 429);
    assert.equal(tooSoon.json.error, 'OTP_RESEND_COOLDOWN');
    assert.equal(tooSoon.json.retryAfterSeconds, 120);
    assert.equal(tooSoon.headers.get('retry-after'), '120');
    assert.equal(sms.sent.length, 1, 'the cooldown prevents a second SMS');

    // Per-national-code quota (OTP_MAX_SEND_PER_15MIN = 3): still enforced on every resend.
    const statuses = [];
    for (let attempt = 0; attempt < 5; attempt += 1) {
      expireRateLimitWindows(server, cooldownOnly);
      const response = await server.request('/api/otp/resend', {
        body: { nationalCode: NATIONAL, purpose: 'login', password: PASSWORD },
      });
      statuses.push(`${response.status}:${response.json.error}`);
    }
    assert.ok(
      statuses.some((entry) => entry === '429:RATE_LIMITED'),
      `the national quota must still limit sends: ${statuses.join(' | ')}`,
    );
    assert.ok(sms.sent.length <= 3, `at most OTP_MAX_SEND_PER_15MIN messages: ${sms.sent.length}`);
  } finally {
    await server.close();
  }
});

test('the per-IP send limit still applies across different national codes', async () => {
  const store = createMemoryStore();
  const sms = createFakeSms();
  const server = await startTestServer({ store, sms });
  try {
    const statuses = [];
    for (let index = 0; index < 14; index += 1) {
      const nationalCode = nationalCodeFrom(200000000 + index * 7);
      store.seedUser({ id: `user_ip_${index}`, data: { national_code: nationalCode, phone: PHONE }, password: PASSWORD });
      const response = await server.request('/api/otp/send', {
        body: { nationalCode, purpose: 'login', password: PASSWORD },
        headers: { 'X-Forwarded-For': '203.0.113.10' },
      });
      statuses.push(response.status);
    }
    assert.equal(statuses[0], 200);
    assert.ok(
      statuses.includes(429),
      `12 requests per IP/15min must still be enforced: ${statuses.join(',')}`,
    );
    assert.ok(sms.sent.length <= 12, `at most 12 messages per IP window: ${sms.sent.length}`);
  } finally {
    await server.close();
  }
});

test('readiness reports the real SMS provider state without leaking configuration', async () => {
  const store = createMemoryStore();
  const server = await startTestServer({ store, sms: createFakeSms() });
  try {
    const ready = await server.request('/api/ready', { method: 'GET', body: undefined });
    assert.ok(ready.status === 200 || ready.status === 503);
    // The fake gateway reports provider=mock-test and the endpoint must echo a safe provider
    // label only - never a key, a sender number or any other configuration value.
    assert.equal(ready.json.dependencies.sms.configured, true);
    assert.equal(typeof ready.json.dependencies.sms.provider, 'string');
    const text = JSON.stringify(ready.json);
    assert.equal(text.includes('+983000505'), false);
    assert.equal(text.includes('test-key'), false);
  } finally {
    await server.close();
  }
});

test('no test ever reaches the real IPPanel endpoint', async () => {
  const store = createMemoryStore();
  const sms = createFakeSms();
  const server = await startTestServer({ store, sms });
  const realFetch = globalThis.fetch;
  const outbound = [];
  globalThis.fetch = async (url, options) => {
    const target = String(url);
    if (!target.startsWith(server.baseUrl)) outbound.push(target);
    return realFetch(url, options);
  };
  try {
    store.seedUser({ id: 'user_offline', data: { national_code: NATIONAL, phone: PHONE }, password: PASSWORD });
    const send = await server.request('/api/otp/send', { body: { nationalCode: NATIONAL, purpose: 'login', password: PASSWORD } });
    await server.request('/api/otp/verify', {
      body: { nationalCode: NATIONAL, code: sms.lastCode(), challengeToken: send.json.challengeToken },
    });
    assert.deepEqual(outbound, [], `no external SMS request may happen in tests: ${outbound.join(', ')}`);
    assert.equal(sms.sent.length, 1, 'the injected fake provider handled the message');
  } finally {
    globalThis.fetch = realFetch;
    await server.close();
  }
});

test('OTP endpoints never log the code, the phone number or the password', async () => {
  const store = createMemoryStore();
  const sms = createFakeSms();
  const failing = {
    configured: () => true,
    providerName: () => 'mock-test',
    async send() {
      const error = new Error('SMS_SEND_FAILED');
      error.code = 'SMS_SEND_FAILED';
      error.status = 502;
      error.isPublic = true;
      throw error;
    },
  };
  const server = await startTestServer({ store, sms });
  const failingServer = await startTestServer({ store: createMemoryStore(), sms: failing });
  const captured = [];
  const realConsole = { info: console.info, warn: console.warn, error: console.error };
  const capture = (level) => (...args) => { captured.push(`${level} ${args.map(String).join(' ')}`); };
  console.info = capture('info');
  console.warn = capture('warn');
  console.error = capture('error');
  try {
    store.seedUser({ id: 'user_logs', data: { national_code: NATIONAL, phone: PHONE }, password: PASSWORD });
    const send = await server.request('/api/otp/send', { body: { nationalCode: NATIONAL, purpose: 'login', password: PASSWORD } });
    await server.request('/api/otp/verify', {
      body: { nationalCode: NATIONAL, code: '000000', challengeToken: send.json.challengeToken },
    });
    // A failing provider logs a 5xx line - it must stay free of secrets too.
    failingServer.store.seedUser({ id: 'user_logs2', data: { national_code: NATIONAL, phone: PHONE }, password: PASSWORD });
    await failingServer.request('/api/otp/send', { body: { nationalCode: NATIONAL, purpose: 'login', password: PASSWORD } });
  } finally {
    console.info = realConsole.info;
    console.warn = realConsole.warn;
    console.error = realConsole.error;
    await server.close();
    await failingServer.close();
  }

  const logText = captured.join('\n');
  assert.ok(logText.length > 0, 'the failing provider must produce a log line');
  assert.equal(logText.includes(sms.lastCode()), false, 'the OTP code must never be logged');
  assert.equal(logText.includes(PHONE), false, 'the full phone number must never be logged');
  assert.equal(logText.includes('+989121112233'), false, 'the E.164 phone number must never be logged');
  assert.equal(logText.includes(PASSWORD), false, 'the password must never be logged');
  assert.equal(logText.includes(NATIONAL), false, 'the national code must never be logged');
});

test('administrators can read the provider delivery report, other users cannot', async () => {
  const store = createMemoryStore();
  const sms = createFakeSms();
  const server = await startTestServer({ store, sms });
  try {
    const adminJar = seedLoggedInAdmin(store);
    const challengeId = '11111111-2222-4333-8444-555555555555';
    store.seedOtpChallenge({ challengeId, userId: 'user_admin', nationalCode: NATIONAL, purpose: 'login' });
    store.state.otpCodes.get(challengeId).sms_message_id = '1123544244';

    const byChallenge = await server.request('/api/admin/otp/sms-status', {
      body: { challengeId },
      jar: adminJar,
    });
    assert.equal(byChallenge.status, 200);
    assert.equal(byChallenge.json.messageId, '1123544244');
    assert.equal(byChallenge.json.delivered, true);
    assert.deepEqual(sms.statusCalls, ['1123544244']);
    assert.match(byChallenge.json.recipients[0].phone, /\*/ , 'recipient numbers stay masked');

    const byMessageId = await server.request('/api/admin/otp/sms-status', {
      body: { messageId: '995511' },
      jar: adminJar,
    });
    assert.equal(byMessageId.status, 200);

    const unknownChallenge = await server.request('/api/admin/otp/sms-status', {
      body: { challengeId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee' },
      jar: adminJar,
    });
    assert.equal(unknownChallenge.status, 404);

    const invalidInput = await server.request('/api/admin/otp/sms-status', { body: {}, jar: adminJar });
    assert.equal(invalidInput.status, 400);

    // A regular user session must not reach the delivery report.
    store.seedUser({ id: 'user_plain', data: { national_code: '0499370899', phone: PHONE } });
    const plainJar = (() => {
      const sessionId = 'session-plain-status';
      const token = createSessionToken({ userId: 'user_plain', sessionId, ttlMs: 3600_000 });
      store.state.sessions.set(sessionId, {
        id: sessionId,
        user_id: 'user_plain',
        token_hash: hashSessionToken(token),
        expires_at: new Date(Date.now() + 3600_000).toISOString(),
        revoked_at: null,
      });
      const jar = createCookieJar();
      jar.set('warroom_session', token);
      jar.set('warroom_csrf', createCsrfToken(sessionId));
      return jar;
    })();
    const forbidden = await server.request('/api/admin/otp/sms-status', { body: { messageId: '1' }, jar: plainJar });
    assert.equal(forbidden.status, 403);

    const anonymous = await server.request('/api/admin/otp/sms-status', { body: { messageId: '1' } });
    assert.equal(anonymous.status, 401);
  } finally {
    await server.close();
  }
});
