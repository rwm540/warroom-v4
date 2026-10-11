import './helpers/env.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { startTestServer, createMemoryStore, createFakeSms, createCookieJar } from './helpers/harness.js';

const { createSessionToken, hashSessionToken, createCsrfToken } = await import('../src/lib/session.js');

const HOUR = 60 * 60 * 1000;

/** Seeds a user plus a live session row and returns the cookie/csrf material. */
function seedSession(store, { userId, data = {}, ttlMs = HOUR }) {
  store.seedUser({ id: userId, data });
  const sessionId = randomUUID();
  const token = createSessionToken({ userId, sessionId, ttlMs });
  store.state.sessions.set(sessionId, {
    id: sessionId,
    user_id: userId,
    token_hash: hashSessionToken(token),
    expires_at: new Date(Date.now() + ttlMs).toISOString(),
    revoked_at: null,
  });
  return { sessionId, token, csrfToken: createCsrfToken(sessionId) };
}

function loggedInJar({ token, csrfToken }) {
  const jar = createCookieJar();
  jar.set('warroom_session', token);
  jar.set('warroom_csrf', csrfToken);
  return jar;
}

test('POST /api/session/revoke-all rejects unauthenticated callers (no cookie)', async () => {
  const store = createMemoryStore();
  const victim = seedSession(store, { userId: 'user_victim' });
  const server = await startTestServer({ store });
  try {
    const response = await server.request('/api/session/revoke-all', { body: { userId: 'user_victim' } });
    assert.equal(response.status, 401);
    assert.equal(response.json.error, 'NO_SESSION');
    assert.equal(store.state.sessions.get(victim.sessionId).revoked_at, null, 'victim session must stay live');
  } finally {
    await server.close();
  }
});

test('POST /api/session/revoke-all cannot be used for cross-user IDOR by a normal user', async () => {
  const store = createMemoryStore();
  const attacker = seedSession(store, { userId: 'user_attacker', data: { first_name: 'A' } });
  const victim = seedSession(store, { userId: 'user_victim' });
  const server = await startTestServer({ store });
  try {
    const jar = loggedInJar(attacker);
    const response = await server.request('/api/session/revoke-all', {
      body: { userId: 'user_victim', role: 'admin', is_admin: true, otpProof: randomUUID() },
      jar,
    });
    assert.equal(response.status, 403);
    assert.equal(response.json.error, 'FORBIDDEN');
    assert.equal(store.state.sessions.get(victim.sessionId).revoked_at, null, 'victim session must stay live');
  } finally {
    await server.close();
  }
});

test('a user can revoke their own sessions and the cookie session is invalidated server-side', async () => {
  const store = createMemoryStore();
  const user = seedSession(store, { userId: 'user_self' });
  const server = await startTestServer({ store });
  try {
    const jar = loggedInJar(user);
    const response = await server.request('/api/session/revoke-all', { body: {}, jar });
    assert.equal(response.status, 200);
    assert.equal(response.json.scope, 'self');
    assert.equal(response.json.revoked, 1);
    assert.notEqual(store.state.sessions.get(user.sessionId).revoked_at, null);

    const validate = await server.request('/api/session/validate', { body: {}, jar });
    assert.equal(validate.status, 401, 'revoked session must not validate');
  } finally {
    await server.close();
  }
});

test('admin revoking another user requires a fresh operation-bound OTP proof', async () => {
  const store = createMemoryStore();
  const admin = seedSession(store, { userId: 'user_admin', data: { role: 'admin' } });
  const victim = seedSession(store, { userId: 'user_victim' });
  const server = await startTestServer({ store });
  try {
    const jar = loggedInJar(admin);
    const withoutProof = await server.request('/api/admin/sessions/revoke', { body: { userId: 'user_victim' }, jar });
    assert.equal(withoutProof.status, 403);
    assert.equal(withoutProof.json.error, 'ADMIN_OTP_REQUIRED');
    assert.equal(store.state.sessions.get(victim.sessionId).revoked_at, null);

    const adminProof = randomUUID();
    store.seedOtpChallenge({ challengeId: adminProof, userId: 'user_admin', nationalCode: '1234567891', purpose: 'admin', verified: true, used: true, usedAt: Date.now() });

    const withProof = await server.request('/api/admin/sessions/revoke', {
      body: { userId: 'user_victim', adminOtpProof: adminProof },
      jar,
    });
    assert.equal(withProof.status, 200);
    assert.notEqual(store.state.sessions.get(victim.sessionId).revoked_at, null);

    // The same proof must not be replayable for another operation/target.
    const otherVictim = seedSession(store, { userId: 'user_victim2' });
    const replay = await server.request('/api/admin/sessions/revoke', {
      body: { userId: 'user_victim2', adminOtpProof: adminProof },
      jar,
    });
    assert.equal(replay.status, 409);
    assert.equal(replay.json.error, 'ADMIN_OTP_REUSED');
    assert.equal(store.state.sessions.get(otherVictim.sessionId).revoked_at, null);
  } finally {
    await server.close();
  }
});

test('a login OTP proof cannot be replayed to mint a second session', async () => {
  const store = createMemoryStore();
  store.seedUser({ id: 'user_proof', data: {} });
  const challengeId = randomUUID();
  store.seedOtpChallenge({ challengeId, userId: 'user_proof', nationalCode: '1234567891', purpose: 'login', verified: true, used: true, usedAt: Date.now() });
  const server = await startTestServer({ store });
  try {
    const first = await server.request('/api/session/create', { body: { otpProof: challengeId } });
    assert.equal(first.status, 200);
    assert.ok(first.json.user.id === 'user_proof');

    const replay = await server.request('/api/session/create', { body: { otpProof: challengeId } });
    assert.equal(replay.status, 409);
    assert.equal(replay.json.error, 'OTP_PROOF_REUSED');
  } finally {
    await server.close();
  }
});

test('two concurrent requests with the same proof create at most one session', async () => {
  const store = createMemoryStore({ latencyMs: 15 });
  store.seedUser({ id: 'user_race', data: {} });
  const challengeId = randomUUID();
  store.seedOtpChallenge({ challengeId, userId: 'user_race', nationalCode: '1234567891', purpose: 'login', verified: true, used: true, usedAt: Date.now() });
  const server = await startTestServer({ store });
  try {
    const [a, b] = await Promise.all([
      server.request('/api/session/create', { body: { otpProof: challengeId } }),
      server.request('/api/session/create', { body: { otpProof: challengeId } }),
    ]);
    const statuses = [a.status, b.status].sort();
    assert.deepEqual(statuses, [200, 409], `expected exactly one winner, got ${statuses.join(',')}`);
    const winners = [a, b].filter((response) => response.status === 200);
    assert.equal(winners.length, 1);
    const activeSessions = [...store.state.sessions.values()].filter((session) => session.user_id === 'user_race' && !session.revoked_at);
    assert.equal(activeSessions.length, 1, 'exactly one server-side session must exist');
  } finally {
    await server.close();
  }
});

test('expired, unverified, wrong-purpose and foreign proofs are rejected', async () => {
  const store = createMemoryStore();
  store.seedUser({ id: 'user_owner', data: {} });
  const server = await startTestServer({ store });
  try {
    const unknown = await server.request('/api/session/create', { body: { otpProof: randomUUID() } });
    assert.equal(unknown.status, 401);

    const unverified = randomUUID();
    store.seedOtpChallenge({ challengeId: unverified, userId: 'user_owner', nationalCode: '1234567891', purpose: 'login' });
    const unverifiedResponse = await server.request('/api/session/create', { body: { otpProof: unverified } });
    assert.equal(unverifiedResponse.status, 401);
    assert.equal(unverifiedResponse.json.error, 'OTP_NOT_VERIFIED');

    const expired = randomUUID();
    store.seedOtpChallenge({ challengeId: expired, userId: 'user_owner', nationalCode: '1234567891', purpose: 'login', verified: true, used: true, usedAt: Date.now() - 6 * 60 * 1000 });
    const expiredResponse = await server.request('/api/session/create', { body: { otpProof: expired } });
    assert.equal(expiredResponse.status, 401);
    assert.equal(expiredResponse.json.error, 'OTP_PROOF_EXPIRED');

    const adminPurpose = randomUUID();
    store.seedOtpChallenge({ challengeId: adminPurpose, userId: 'user_owner', nationalCode: '1234567891', purpose: 'admin', verified: true, used: true, usedAt: Date.now() });
    const adminResponse = await server.request('/api/session/create', { body: { otpProof: adminPurpose } });
    assert.equal(adminResponse.status, 401);
    assert.equal(adminResponse.json.error, 'OTP_PROOF_PURPOSE_MISMATCH');
  } finally {
    await server.close();
  }
});

test('a proof always mints a session for its own owner, never for a userId supplied by the client', async () => {
  const store = createMemoryStore();
  store.seedUser({ id: 'user_owner', data: { first_name: 'Owner' } });
  store.seedUser({ id: 'user_other', data: { first_name: 'Other' } });
  const challengeId = randomUUID();
  store.seedOtpChallenge({ challengeId, userId: 'user_owner', nationalCode: '1234567891', purpose: 'login', verified: true, used: true, usedAt: Date.now() });
  const server = await startTestServer({ store });
  try {
    const jar = createCookieJar();
    const response = await server.request('/api/session/create', {
      body: { otpProof: challengeId, userId: 'user_other', role: 'admin', is_admin: true },
      jar,
    });
    assert.equal(response.status, 200);
    assert.equal(response.json.user.id, 'user_owner');
    assert.equal(response.json.user.role, 'user');

    const validate = await server.request('/api/session/validate', { body: {}, jar });
    assert.equal(validate.json.userId, 'user_owner');
    const sessions = [...store.state.sessions.values()];
    assert.equal(sessions.filter((session) => session.user_id === 'user_other').length, 0);
  } finally {
    await server.close();
  }
});

test('session cookie is HttpOnly and the raw token never appears in the response body', async () => {
  const store = createMemoryStore();
  store.seedUser({ id: 'user_cookie', data: {} });
  const challengeId = randomUUID();
  store.seedOtpChallenge({ challengeId, userId: 'user_cookie', nationalCode: '1234567891', purpose: 'login', verified: true, used: true, usedAt: Date.now() });
  const server = await startTestServer({ store });
  try {
    const response = await server.request('/api/session/create', { body: { otpProof: challengeId } });
    const setCookies = response.headers.getSetCookie();
    const sessionCookie = setCookies.find((cookie) => cookie.startsWith('warroom_session='));
    assert.ok(sessionCookie, 'session cookie must be set');
    assert.match(sessionCookie, /HttpOnly/i);
    assert.equal(/refreshToken|token"/.test(JSON.stringify(response.json)), false, 'no raw token in body');
  } finally {
    await server.close();
  }
});

test('cookie-authenticated state changes require a CSRF header and an allowed origin', async () => {
  const store = createMemoryStore();
  const user = seedSession(store, { userId: 'user_csrf' });
  const server = await startTestServer({ store });
  try {
    const jar = loggedInJar(user);
    const noCsrf = await server.request('/api/session/logout', { body: {}, jar, csrf: false });
    assert.equal(noCsrf.status, 403);
    assert.equal(noCsrf.json.error, 'CSRF_VALIDATION_FAILED');

    const wrongOrigin = await server.request('/api/session/logout', {
      body: {},
      jar,
      csrf: false,
      headers: { 'X-CSRF-Token': user.csrfToken },
      origin: 'https://evil.example.com',
    });
    assert.equal(wrongOrigin.status, 403);
    assert.equal(wrongOrigin.json.error, 'ORIGIN_NOT_ALLOWED');

    const ok = await server.request('/api/session/logout', {
      body: {},
      jar,
      csrf: false,
      headers: { 'X-CSRF-Token': user.csrfToken },
    });
    assert.equal(ok.status, 200);
    assert.notEqual(store.state.sessions.get(user.sessionId).revoked_at, null, 'logout must revoke server-side');
  } finally {
    await server.close();
  }
});

test('csrf token minted for one session is rejected for another session', async () => {
  const store = createMemoryStore();
  const userA = seedSession(store, { userId: 'user_a' });
  const userB = seedSession(store, { userId: 'user_b' });
  const server = await startTestServer({ store });
  try {
    const jar = loggedInJar(userB);
    const response = await server.request('/api/session/logout', {
      body: {},
      jar,
      csrf: false,
      headers: { 'X-CSRF-Token': userA.csrfToken },
    });
    assert.equal(response.status, 403);
    assert.equal(response.json.error, 'CSRF_VALIDATION_FAILED');
    assert.equal(store.state.sessions.get(userB.sessionId).revoked_at, null);
  } finally {
    await server.close();
  }
});

test('validate rejects missing, expired, revoked and blocked-user sessions', async () => {
  const store = createMemoryStore();
  const blocked = seedSession(store, { userId: 'user_blocked', data: { is_blocked: true } });
  const expired = seedSession(store, { userId: 'user_expired', ttlMs: -1000 });
  const revoked = seedSession(store, { userId: 'user_revoked' });
  store.state.sessions.get(revoked.sessionId).revoked_at = new Date().toISOString();
  const server = await startTestServer({ store });
  try {
    const anonymous = await server.request('/api/session/validate', { body: {} });
    assert.equal(anonymous.status, 401);

    for (const [label, session] of [['blocked', blocked], ['expired', expired], ['revoked', revoked]]) {
      const response = await server.request('/api/session/validate', { body: {}, jar: loggedInJar(session) });
      assert.equal(response.status, 401, `${label} session must be rejected`);
    }
    assert.notEqual(store.state.sessions.get(blocked.sessionId).revoked_at, null, 'blocked session is auto-revoked');
  } finally {
    await server.close();
  }
});

test('change-password uses the session identity, rejects a wrong current password and revokes sessions', async () => {
  const store = createMemoryStore();
  const user = seedSession(store, { userId: 'user_pwd' });
  store.seedUser({ id: 'user_pwd', data: {} });
  const server = await startTestServer({ store });
  try {
    const jar = loggedInJar(user);
    const wrong = await server.request('/api/session/change-password', {
      body: { currentPassword: 'WrongPassword123', newPassword: 'NewStrongPass123' },
      jar,
      headers: { 'X-CSRF-Token': user.csrfToken },
    });
    assert.equal(wrong.status, 401);

    const ok = await server.request('/api/session/change-password', {
      body: { currentPassword: 'TestPassword123', newPassword: 'NewStrongPass123' },
      jar,
      headers: { 'X-CSRF-Token': user.csrfToken },
    });
    assert.equal(ok.status, 200);
    assert.equal(ok.json.reauthRequired, true);
    assert.notEqual(store.state.sessions.get(user.sessionId).revoked_at, null);
    assert.equal(store.state.credentials.get('user_pwd').data.password_hash, 'test-hash::NewStrongPass123');
  } finally {
    await server.close();
  }
});

test('fake SMS never leaks and inactive accounts cannot start a login OTP', async () => {
  const store = createMemoryStore();
  const sms = createFakeSms();
  store.seedUser({ id: 'user_inactive', data: { is_active: false, national_code: '1234567891', phone: '09121112233' } });
  const server = await startTestServer({ store, sms });
  try {
    const response = await server.request('/api/otp/send', {
      body: { nationalCode: '1234567891', purpose: 'login', password: 'TestPassword123' },
    });
    assert.equal(response.status, 401);
    assert.equal(response.json.error, 'INVALID_CREDENTIALS');
    assert.equal(sms.sent.length, 0, 'no SMS may be sent for an inactive account');
  } finally {
    await server.close();
  }
});
