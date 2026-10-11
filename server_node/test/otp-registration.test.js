import './helpers/env.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { startTestServer, createMemoryStore, createFakeSms, createFakeRedis, createCookieJar } from './helpers/harness.js';

const { createSessionToken, hashSessionToken, createCsrfToken } = await import('../src/lib/session.js');

const NATIONAL = '1234567891';
const PHONE = '09121112233';
const PASSWORD = 'Rz7kQm2Lp9x';

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

function seedLoggedInUser(store, { userId, data = {} }) {
  store.seedUser({ id: userId, data });
  const sessionId = randomUUID();
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

test('temporary registration flows end-to-end into a server session with a mocked SMS', async () => {
  const store = createMemoryStore();
  const sms = createFakeSms();
  const server = await startTestServer({ store, sms });
  try {
    const start = await server.request('/api/registration/start', { body: registrationPayload() });
    assert.equal(start.status, 200);
    assert.equal(start.json.success, true);
    assert.equal('pendingId' in start.json, false, 'must not expose internal identifiers');
    assert.equal('expiresAt' in start.json, false);

    const pendingRows = [...store.state.pending.values()];
    assert.equal(pendingRows.length, 1, 'exactly one pending registration exists');

    const send = await server.request('/api/otp/send', { body: { nationalCode: NATIONAL, purpose: 'registration' } });
    assert.equal(send.status, 200);
    assert.ok(send.json.challengeToken, 'registration OTP must return a challenge token');
    assert.equal(sms.sent.length, 1, 'mock SMS used (no real SMS)');
    assert.match(sms.lastCode(), /^\d{6}$/);

    const verify = await server.request('/api/otp/verify', {
      body: { nationalCode: NATIONAL, code: sms.lastCode(), challengeToken: send.json.challengeToken },
    });
    assert.equal(verify.status, 200);
    assert.equal(verify.json.purpose, 'registration');
    assert.equal('user' in verify.json, false, 'verification must not hand out an identity');

    // Verification must not create or activate any account by itself.
    assert.equal([...store.state.users.values()].length, 0, 'no user is created by OTP verification');

    const jar = createCookieJar();
    const create = await server.request('/api/session/create', { body: { otpProof: verify.json.otpProof }, jar });
    assert.equal(create.status, 200);
    assert.equal(create.json.isNewRegistration, true);
    assert.equal(create.json.user.role, 'user');
    assert.ok(jar.has('warroom_session'));

    const users = [...store.state.users.values()];
    assert.equal(users.length, 1);
    assert.equal(users[0].data.is_active, true);
    assert.equal(users[0].data.is_blocked, false);
    assert.equal(users[0].data.registration_source, 'pending_registration');
    assert.equal(String(store.state.credentials.get(users[0].id).data.password_hash), `test-hash::${PASSWORD}`);
    assert.equal(store.state.pending.get(pendingRows[0].id).is_verified, true);
    assert.equal(store.state.pending.get(pendingRows[0].id).password_hash, null, 'pending password hash is cleared');

    // The new account can log in with password + OTP afterwards.
    // (Test-only: clears the per-code resend cooldown in both stores so the login step can
    //  run immediately; production counters are never cleared by the application.)
    store.state.rateLimits.clear();
    server.redis.counters.clear();
    const login = await server.request('/api/otp/send', { body: { nationalCode: NATIONAL, purpose: 'login', password: PASSWORD } });
    assert.equal(login.status, 200);
    assert.ok(login.json.challengeToken);
    const loginVerify = await server.request('/api/otp/verify', {
      body: { nationalCode: NATIONAL, code: sms.lastCode(), challengeToken: login.json.challengeToken },
    });
    assert.equal(loginVerify.status, 200);
    assert.equal(loginVerify.json.purpose, 'login');
    const loginSession = await server.request('/api/session/create', {
      body: { otpProof: loginVerify.json.otpProof },
      jar: createCookieJar(),
    });
    assert.equal(loginSession.status, 200);
    assert.equal(loginSession.json.isNewRegistration, false);
  } finally {
    await server.close();
  }
});

test('a duplicate registration cannot create a second account or a usable OTP', async () => {
  const store = createMemoryStore();
  const sms = createFakeSms();
  const server = await startTestServer({ store, sms });
  try {
    store.seedUser({ id: 'user_existing', data: { national_code: NATIONAL, phone: PHONE, is_active: true }, password: PASSWORD });

    const start = await server.request('/api/registration/start', { body: registrationPayload() });
    assert.equal(start.status, 200, 'uniform response for an existing account');
    assert.equal([...store.state.pending.values()].length, 0, 'no pending registration is created for an existing account');

    const send = await server.request('/api/otp/send', { body: { nationalCode: NATIONAL, purpose: 'registration' } });
    assert.equal(send.status, 200);
    assert.equal(send.json.challengeToken, undefined, 'no registration challenge for an existing account');
    assert.equal(sms.sent.length, 0);
    assert.equal([...store.state.users.values()].length, 1);
  } finally {
    await server.close();
  }
});

test('registration start response is identical for a new and an existing national code', async () => {
  const store = createMemoryStore();
  const server = await startTestServer({ store });
  try {
    const fresh = await server.request('/api/registration/start', { body: registrationPayload() });
    store.seedUser({ id: 'user_dup', data: { national_code: NATIONAL, phone: PHONE }, password: PASSWORD });
    const duplicate = await server.request('/api/registration/start', { body: registrationPayload() });
    assert.equal(fresh.status, duplicate.status);
    assert.deepEqual(Object.keys(fresh.json).sort(), Object.keys(duplicate.json).sort());
    assert.deepEqual(fresh.json, duplicate.json);
  } finally {
    await server.close();
  }
});

test('an admin-disabled account is never activated or duplicated by the registration flow', async () => {
  const store = createMemoryStore();
  const server = await startTestServer({ store });
  try {
    const existingId = store.seedUser({ id: 'user_disabled', data: { national_code: NATIONAL, phone: PHONE, is_active: false, is_blocked: false }, password: PASSWORD });
    const pendingId = randomUUID();
    store.state.pending.set(pendingId, {
      id: pendingId,
      national_code: NATIONAL,
      phone: PHONE,
      phone_e164: `+98${PHONE.slice(1)}`,
      user_data: { first_name: 'x', last_name: 'y', national_code: NATIONAL, phone: PHONE },
      password_hash: 'test-hash::SomePassword123',
      expires_at: new Date(Date.now() + 600000).toISOString(),
      is_verified: false,
    });
    const challengeId = randomUUID();
    store.seedOtpChallenge({ challengeId, userId: pendingId, nationalCode: NATIONAL, purpose: 'registration', pendingId, verified: true, used: true, usedAt: Date.now() });

    const create = await server.request('/api/session/create', { body: { otpProof: challengeId } });
    assert.equal(create.status, 403);
    assert.equal(create.json.error, 'USER_BLOCKED');

    const user = store.state.users.get(existingId);
    assert.equal(user.data.is_active, false, 'administrator-disabled account stays disabled');
    assert.equal([...store.state.users.values()].length, 1, 'no duplicate account is created');
  } finally {
    await server.close();
  }
});

test('check-national returns a uniform, enumeration-safe answer', async () => {
  const store = createMemoryStore();
  const server = await startTestServer({ store });
  try {
    store.seedUser({ id: 'user_known', data: { national_code: NATIONAL, phone: PHONE }, password: PASSWORD });
    const known = await server.request('/api/registration/check-national', { body: { nationalCode: NATIONAL } });
    const unknown = await server.request('/api/registration/check-national', { body: { nationalCode: '0499370899' } });
    assert.equal(known.status, 200);
    assert.equal(unknown.status, 200);
    assert.equal('exists' in known.json, false, 'existence must not be disclosed');
    assert.equal('exists' in unknown.json, false);
    assert.deepEqual(known.json, unknown.json, 'identical payloads for both cases');
  } finally {
    await server.close();
  }
});

test('login OTP requires the password and never reveals whether the account exists', async () => {
  const store = createMemoryStore();
  const sms = createFakeSms();
  const server = await startTestServer({ store, sms });
  try {
    // Three distinct national codes so per-code cooldown limits do not interfere.
    store.seedUser({ id: 'user_login', data: { national_code: '2280146703', phone: PHONE }, password: PASSWORD });
    store.seedUser({ id: 'user_login_ok', data: { national_code: '0000000035', phone: PHONE }, password: PASSWORD });

    const wrongPassword = await server.request('/api/otp/send', { body: { nationalCode: '2280146703', purpose: 'login', password: 'WrongPassword1' } });
    const unknownUser = await server.request('/api/otp/send', { body: { nationalCode: '0499370899', purpose: 'login', password: PASSWORD } });
    const noPassword = await server.request('/api/otp/send', { body: { nationalCode: NATIONAL, purpose: 'login' } });
    assert.equal(noPassword.status, 401);
    assert.equal(wrongPassword.status, 401);
    assert.equal(unknownUser.status, 401);
    assert.deepEqual(noPassword.json, wrongPassword.json);
    assert.deepEqual(wrongPassword.json, unknownUser.json);
    assert.equal(sms.sent.length, 0);

    const ok = await server.request('/api/otp/send', { body: { nationalCode: '0000000035', purpose: 'login', password: PASSWORD } });
    assert.equal(ok.status, 200);
    assert.ok(ok.json.challengeToken);
    assert.equal(sms.sent.length, 1);
  } finally {
    await server.close();
  }
});

test('a blocked account cannot obtain a login OTP or a session', async () => {
  const store = createMemoryStore();
  const sms = createFakeSms();
  const server = await startTestServer({ store, sms });
  try {
    store.seedUser({ id: 'user_blocked', data: { national_code: NATIONAL, phone: PHONE, is_blocked: true }, password: PASSWORD });
    const send = await server.request('/api/otp/send', { body: { nationalCode: NATIONAL, purpose: 'login', password: PASSWORD } });
    assert.equal(send.status, 401);
    assert.equal(sms.sent.length, 0);

    const challengeId = randomUUID();
    store.seedOtpChallenge({ challengeId, userId: 'user_blocked', nationalCode: NATIONAL, purpose: 'login', verified: true, used: true, usedAt: Date.now() });
    const create = await server.request('/api/session/create', { body: { otpProof: challengeId } });
    assert.equal(create.status, 403);
    assert.equal(create.json.error, 'USER_BLOCKED');
  } finally {
    await server.close();
  }
});

test('wrong codes are rejected and the challenge locks after the maximum number of attempts', async () => {
  const store = createMemoryStore();
  const sms = createFakeSms();
  const server = await startTestServer({ store, sms });
  try {
    store.seedUser({ id: 'user_attempts', data: { national_code: NATIONAL, phone: PHONE }, password: PASSWORD });
    const send = await server.request('/api/otp/send', { body: { nationalCode: NATIONAL, purpose: 'login', password: PASSWORD } });
    const token = send.json.challengeToken;

    const wrong = await server.request('/api/otp/verify', { body: { nationalCode: NATIONAL, code: '000000', challengeToken: token } });
    assert.equal(wrong.status, 400);
    assert.equal(wrong.json.error, 'OTP_INVALID');

    const mismatch = await server.request('/api/otp/verify', { body: { nationalCode: '0499370899', code: '000000', challengeToken: token } });
    assert.equal(mismatch.status, 401);
    assert.equal(mismatch.json.error, 'CHALLENGE_MISMATCH');

    const statuses = [];
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await server.request('/api/otp/verify', { body: { nationalCode: NATIONAL, code: '000000', challengeToken: token } });
      statuses.push(`${response.status}:${response.json.error}`);
    }
    assert.ok(statuses.includes('429:OTP_LOCKED'), `challenge must lock after max attempts: ${statuses.join(' | ')}`);
    const row = [...store.state.otpCodes.values()][0];
    assert.equal(row.is_used, true, 'locked challenge must not stay usable');
    assert.notEqual(row.verified, true, 'failed attempts must never verify the challenge');
  } finally {
    await server.close();
  }
});

test('a failed SMS delivery invalidates the challenge (no usable orphan code)', async () => {
  const store = createMemoryStore();
  const sms = {
    configured: () => true,
    async send() {
      const error = new Error('SMS_SEND_FAILED');
      error.code = 'SMS_SEND_FAILED';
      error.status = 502;
      error.isPublic = true;
      throw error;
    },
  };
  const server = await startTestServer({ store, sms });
  try {
    store.seedUser({ id: 'user_smsfail', data: { national_code: NATIONAL, phone: PHONE }, password: PASSWORD });
    const response = await server.request('/api/otp/send', { body: { nationalCode: NATIONAL, purpose: 'login', password: PASSWORD } });
    assert.equal(response.status, 502);
    const rows = [...store.state.otpCodes.values()];
    assert.equal(rows.length, 1);
    assert.equal(rows[0].is_used, true, 'undelivered challenge must be invalidated');
  } finally {
    await server.close();
  }
});

test('OTP sending is rate limited even when Redis is unavailable and when Redis denies early', async () => {
  const store = createMemoryStore();
  const sms = createFakeSms();
  const server = await startTestServer({ store, sms, redis: createFakeRedis({ available: false }) });
  try {
    store.seedUser({ id: 'user_rate', data: { national_code: NATIONAL, phone: PHONE }, password: PASSWORD });
    const statuses = [];
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await server.request('/api/otp/send', { body: { nationalCode: NATIONAL, purpose: 'login', password: PASSWORD } });
      statuses.push(response.status);
    }
    assert.equal(statuses[0], 200);
    assert.ok(statuses.includes(429), `database counter must still enforce the limit: ${statuses.join(',')}`);
  } finally {
    await server.close();
  }

  const denyServer = await startTestServer({
    store: createMemoryStore(),
    sms: createFakeSms(),
    redis: createFakeRedis({ denyAbove: true }),
  });
  try {
    denyServer.store.seedUser({ id: 'user_rate2', data: { national_code: NATIONAL, phone: PHONE }, password: PASSWORD });
    const denied = await denyServer.request('/api/otp/send', { body: { nationalCode: NATIONAL, purpose: 'login', password: PASSWORD } });
    assert.equal(denied.status, 429, 'Redis may deny earlier than the database');
  } finally {
    await denyServer.close();
  }
});

test('rate limit store outage fails closed instead of allowing traffic', async () => {
  const store = createMemoryStore();
  const sms = createFakeSms();
  const server = await startTestServer({ store, sms });
  try {
    store.seedUser({ id: 'user_failclosed', data: { national_code: NATIONAL, phone: PHONE }, password: PASSWORD });
    store.failures.rateLimit = true;
    const response = await server.request('/api/otp/send', { body: { nationalCode: NATIONAL, purpose: 'login', password: PASSWORD } });
    assert.equal(response.status, 503);
    assert.equal(response.json.error, 'RATE_LIMIT_STORE_FAILED');
    assert.equal(sms.sent.length, 0);
  } finally {
    await server.close();
  }
});

test('admin OTP challenge issues an operation-bound proof only for the signed-in admin', async () => {
  const store = createMemoryStore();
  const sms = createFakeSms();
  const server = await startTestServer({ store, sms });
  try {
    const adminJar = seedLoggedInUser(store, { userId: 'user_admin', data: { role: 'admin', national_code: NATIONAL, phone: PHONE } });

    const challenge = await server.request('/api/admin/otp/challenge', { body: {}, jar: adminJar });
    assert.equal(challenge.status, 200);
    assert.ok(challenge.json.challengeToken);

    const verify = await server.request('/api/otp/verify', {
      body: { nationalCode: NATIONAL, code: sms.lastCode(), challengeToken: challenge.json.challengeToken },
    });
    assert.equal(verify.status, 200);
    assert.equal(verify.json.purpose, 'admin');

    const victimJar = seedLoggedInUser(store, { userId: 'user_admin_victim_target' });
    const revoked = await server.request('/api/admin/sessions/revoke', {
      body: { userId: 'user_admin_victim_target', adminOtpProof: verify.json.otpProof },
      jar: adminJar,
    });
    assert.equal(revoked.status, 200);
    assert.notEqual(store.state.sessions.get([...store.state.sessions.values()].find((s) => s.user_id === 'user_admin_victim_target').id).revoked_at, null);
    assert.ok(victimJar);

    // An admin proof must never mint a user session.
    const freshAdminProof = randomUUID();
    store.seedOtpChallenge({ challengeId: freshAdminProof, userId: 'user_admin', nationalCode: NATIONAL, purpose: 'admin', verified: true, used: true, usedAt: Date.now() });
    const adminSession = await server.request('/api/session/create', { body: { otpProof: freshAdminProof } });
    assert.equal(adminSession.status, 401);
    assert.equal(adminSession.json.error, 'OTP_PROOF_PURPOSE_MISMATCH');
  } finally {
    await server.close();
  }
});

test('registration validation rejects malformed data before touching the database', async () => {
  const store = createMemoryStore();
  const server = await startTestServer({ store });
  try {
    const badNational = await server.request('/api/registration/start', { body: registrationPayload({ nationalCode: '1111111111' }) });
    assert.equal(badNational.status, 400);
    assert.equal(badNational.json.error, 'INVALID_NATIONAL_CODE');

    const weakPassword = await server.request('/api/registration/start', { body: registrationPayload({ password: '12345678' }) });
    assert.equal(weakPassword.status, 400);

    const badPhone = await server.request('/api/registration/start', { body: registrationPayload({ phone: '12345' }) });
    assert.equal(badPhone.status, 400);
    assert.equal([...store.state.pending.values()].length, 0);
  } finally {
    await server.close();
  }
});
