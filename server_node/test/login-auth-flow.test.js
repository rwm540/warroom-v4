import './helpers/env.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { startTestServer, createMemoryStore, createFakeSms, createCookieJar } from './helpers/harness.js';

const { signChallengeToken } = await import('../src/lib/tokens.js');
const { hashNationalCodeForChallenge } = await import('../src/lib/identity.js');

/*
 * End-to-end login matrix for the real SMS OTP flow:
 *   POST /api/otp/send (password checked server-side) -> SMS -> POST /api/otp/verify
 *   -> POST /api/session/create (atomic, one-time proof consumption) -> session cookie.
 * Everything runs against the in-memory store, which mirrors the Supabase RPC semantics, and a
 * fake SMS sender. The real IPPanel endpoint is never called.
 */

const PASSWORD = 'Rz7kQm2Lp9x';
const WRONG_PASSWORD = 'Wrong-Password-1';
const NATIONAL_A = '1234567891';
const NATIONAL_B = '0499370899';
const PHONE_A = '09121112233';
const PHONE_B = '09351234567';

async function setup(seed = (store) => store.seedUser({
  id: 'user_flow_a',
  data: { national_code: NATIONAL_A, phone: PHONE_A },
  password: PASSWORD,
})) {
  const store = createMemoryStore();
  const sms = createFakeSms();
  const server = await startTestServer({ store, sms });
  seed(store);
  return { store, sms, server };
}

async function sendLogin(server, nationalCode, password, extra = {}) {
  return server.request('/api/otp/send', {
    body: { nationalCode, purpose: 'login', password, ...extra },
  });
}

test('valid user + correct password + correct OTP creates a session', async () => {
  const { store, sms, server } = await setup();
  try {
    const send = await sendLogin(server, NATIONAL_A, PASSWORD);
    assert.equal(send.status, 200);
    assert.equal(sms.sent.length, 1, 'exactly one SMS for the verified password');

    const verify = await server.request('/api/otp/verify', {
      body: { nationalCode: NATIONAL_A, code: sms.lastCode(), challengeToken: send.json.challengeToken },
    });
    assert.equal(verify.status, 200);
    assert.equal(verify.json.purpose, 'login');
    assert.ok(verify.json.otpProof);

    const jar = createCookieJar();
    const session = await server.request('/api/session/create', { body: { otpProof: verify.json.otpProof }, jar });
    assert.equal(session.status, 200);
    assert.equal(session.json.success, true);
    assert.equal(session.json.user.id, 'user_flow_a', 'the identity comes from the OTP row');
    assert.equal(jar.has('warroom_session'), true, 'HttpOnly session cookie is set');
    assert.equal(jar.has('warroom_csrf'), true);
    assert.equal(session.json.sessionId !== undefined, true);
    assert.equal(JSON.stringify(session.json).includes(jar.raw('warroom_session')), false, 'raw token not in body');

    const validate = await server.request('/api/session/validate', { jar, method: 'POST' });
    assert.equal(validate.status, 200);
    assert.equal(validate.json.userId, 'user_flow_a');

    // The proof is single use and the consumed record is stored server-side.
    const replay = await server.request('/api/session/create', { body: { otpProof: verify.json.otpProof }, jar: createCookieJar() });
    assert.equal(replay.status, 409);
    assert.equal(replay.json.error, 'OTP_PROOF_REUSED');
    assert.ok(store.state.securityKv.size >= 1);
  } finally {
    await server.close();
  }
});

test('a wrong password is rejected before any SMS or challenge exists', async () => {
  const { store, sms, server } = await setup();
  try {
    const send = await sendLogin(server, NATIONAL_A, WRONG_PASSWORD);
    assert.equal(send.status, 401);
    assert.equal(send.json.error, 'INVALID_CREDENTIALS');
    assert.equal(sms.sent.length, 0, 'no SMS for a wrong password');
    assert.equal(store.state.otpCodes.size, 0, 'no challenge row for a wrong password');
    assert.equal(send.json.challengeToken, undefined);
  } finally {
    await server.close();
  }
});

test('a wrong OTP is rejected and cannot be exchanged for a session', async () => {
  const { sms, server, store } = await setup();
  try {
    const send = await sendLogin(server, NATIONAL_A, PASSWORD);
    const real = sms.lastCode();
    const wrongCode = real === '000000' ? '000001' : '000000';

    const verify = await server.request('/api/otp/verify', {
      body: { nationalCode: NATIONAL_A, code: wrongCode, challengeToken: send.json.challengeToken },
    });
    assert.equal(verify.status, 400);
    assert.equal(verify.json.error, 'OTP_INVALID');
    assert.equal(verify.json.otpProof, undefined);

    // Without a verified proof there is no session.
    const session = await server.request('/api/session/create', { body: { otpProof: randomUUID() }, jar: createCookieJar() });
    assert.equal(session.status, 401);
    assert.equal(session.json.error, 'INVALID_OTP_PROOF');

    // The wrong attempt is counted; the failed attempt does not spend the code for the real owner.
    const row = [...store.state.otpCodes.values()][0];
    assert.equal(row.attempt_count, 1);
    assert.equal(row.is_used, false);
  } finally {
    await server.close();
  }
});

test('an expired OTP is rejected even with the right code, and yields no proof', async () => {
  const { sms, server, store } = await setup();
  try {
    const send = await sendLogin(server, NATIONAL_A, PASSWORD);
    const code = sms.lastCode();
    const row = [...store.state.otpCodes.values()][0];
    row.expires_at = new Date(Date.now() - 1_000).toISOString();

    const verify = await server.request('/api/otp/verify', {
      body: { nationalCode: NATIONAL_A, code, challengeToken: send.json.challengeToken },
    });
    assert.equal(verify.status, 400);
    assert.equal(verify.json.error, 'OTP_EXPIRED');
    assert.equal(verify.json.otpProof, undefined);
    assert.equal(row.verified, false);
  } finally {
    await server.close();
  }
});

test('a challenge that belongs to another user is rejected', async () => {
  const { sms, server, store } = await setup((s) => {
    s.seedUser({ id: 'user_flow_a', data: { national_code: NATIONAL_A, phone: PHONE_A }, password: PASSWORD });
    s.seedUser({ id: 'user_flow_b', data: { national_code: NATIONAL_B, phone: PHONE_B }, password: PASSWORD });
  });
  try {
    // User A starts a legitimate login and receives a code.
    const sendA = await sendLogin(server, NATIONAL_A, PASSWORD);
    assert.equal(sendA.status, 200);
    const codeA = sms.lastCode();

    // User B presents A's challenge token with B's own national code: binding mismatch.
    const crossNational = await server.request('/api/otp/verify', {
      body: { nationalCode: NATIONAL_B, code: codeA, challengeToken: sendA.json.challengeToken },
    });
    assert.equal(crossNational.status, 401);
    assert.equal(crossNational.json.error, 'CHALLENGE_MISMATCH');

    // A token whose subject is B but whose challenge row belongs to A is rejected as well.
    const rowA = [...store.state.otpCodes.values()][0];
    const forgedForB = signChallengeToken(
      {
        sub: 'user_flow_b',
        challengeId: rowA.challenge_id,
        purpose: 'login',
        nationalCodeBinding: hashNationalCodeForChallenge(NATIONAL_A),
      },
      Date.now() + 120_000,
    );
    const forged = await server.request('/api/otp/verify', {
      body: { nationalCode: NATIONAL_A, code: codeA, challengeToken: forgedForB },
    });
    assert.equal(forged.status, 400);
    assert.equal(forged.json.otpProof, undefined);
    assert.equal(rowA.is_used, false, "the owner's challenge is not spent by the attempt");

    // The legitimate owner can still complete the login with the original token.
    const ok = await server.request('/api/otp/verify', {
      body: { nationalCode: NATIONAL_A, code: codeA, challengeToken: sendA.json.challengeToken },
    });
    assert.equal(ok.status, 200);
  } finally {
    await server.close();
  }
});

test('the phone number is always the stored one, never one supplied by the browser', async () => {
  const { sms, server } = await setup();
  try {
    const send = await sendLogin(server, NATIONAL_A, PASSWORD, { phone: '09390000000' });
    assert.equal(send.status, 200);
    assert.equal(sms.sent[0].phone, '+989121112233');
  } finally {
    await server.close();
  }
});

test('a token signed for one purpose cannot verify a challenge stored for another purpose', async () => {
  const { sms, server, store } = await setup();
  try {
    const send = await sendLogin(server, NATIONAL_A, PASSWORD);
    const code = sms.lastCode();
    const row = [...store.state.otpCodes.values()][0];
    const adminToken = signChallengeToken(
      {
        sub: row.user_id,
        challengeId: row.challenge_id,
        purpose: 'admin',
        nationalCodeBinding: hashNationalCodeForChallenge(NATIONAL_A),
      },
      Date.now() + 120_000,
    );
    const verify = await server.request('/api/otp/verify', {
      body: { nationalCode: NATIONAL_A, code, challengeToken: adminToken },
    });
    assert.equal(verify.status, 401);
    assert.equal(verify.json.error, 'CHALLENGE_MISMATCH');
    assert.equal(row.attempt_count, 0, 'a purpose mismatch does not spend an attempt');

    const real = await server.request('/api/otp/verify', {
      body: { nationalCode: NATIONAL_A, code, challengeToken: send.json.challengeToken },
    });
    assert.equal(real.status, 200);
  } finally {
    await server.close();
  }
});

test('a login proof for an account that becomes blocked gets no session and is not spent', async () => {
  const { sms, server, store } = await setup();
  try {
    const send = await sendLogin(server, NATIONAL_A, PASSWORD);
    const verify = await server.request('/api/otp/verify', {
      body: { nationalCode: NATIONAL_A, code: sms.lastCode(), challengeToken: send.json.challengeToken },
    });
    assert.equal(verify.status, 200);

    // An admin blocks the account between verification and session creation.
    store.state.users.get('user_flow_a').data.is_blocked = true;
    const jar = createCookieJar();
    const session = await server.request('/api/session/create', { body: { otpProof: verify.json.otpProof }, jar });
    assert.equal(session.status, 403);
    assert.equal(session.json.error, 'USER_BLOCKED');
    assert.equal(jar.has('warroom_session'), false, 'no cookie for a blocked account');
    assert.equal(store.state.securityKv.size, 0, 'the proof is not consumed for a blocked account');
  } finally {
    await server.close();
  }
});

test('a failed database step never reports success and never sets a session cookie', async () => {
  const { sms, server, store } = await setup();
  try {
    const send = await sendLogin(server, NATIONAL_A, PASSWORD);
    const verify = await server.request('/api/otp/verify', {
      body: { nationalCode: NATIONAL_A, code: sms.lastCode(), challengeToken: send.json.challengeToken },
    });
    assert.equal(verify.status, 200);

    const originalInsert = store.insertSession;
    store.insertSession = async () => {
      throw new Error('simulated database outage');
    };
    try {
      const jar = createCookieJar();
      const session = await server.request('/api/session/create', { body: { otpProof: verify.json.otpProof }, jar });
      assert.ok(session.status >= 500, `must not succeed: ${session.status}`);
      assert.notEqual(session.json?.success, true);
      assert.equal(jar.has('warroom_session'), false);
      assert.equal(jar.has('warroom_csrf'), false);
    } finally {
      store.insertSession = originalInsert;
    }
  } finally {
    await server.close();
  }
});
