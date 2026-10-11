import test from 'node:test';
import assert from 'node:assert/strict';
import { config } from '../config.js';
import { clearSessionCookies, setSessionCookies, signAccessToken, verifyToken } from './tokens.js';

test('access tokens are bound to a refresh-session ID', () => {
  const previousSecret = config.jwtSecret;
  config.jwtSecret = 'test-only-jwt-signing-secret-0123456789';
  try {
    const token = signAccessToken({ id: 'user-id', national_code: '0123456789', role: 'user' }, 'session-id');
    const claims = verifyToken(token, 'access');
    assert.equal(claims.sub, 'user-id');
    assert.equal(claims.sid, 'session-id');
    assert.throws(() => verifyToken(token, 'otp_challenge'));
  } finally {
    config.jwtSecret = previousSecret;
  }
});

test('session cookies are HttpOnly and cleared with matching paths', () => {
  const previousEnvironment = config.nodeEnv;
  config.nodeEnv = 'production';
  const written = [];
  const cleared = [];
  const response = {
    cookie: (...args) => written.push(args),
    clearCookie: (...args) => cleared.push(args),
  };
  try {
    setSessionCookies(response, 'access', 'refresh');
    clearSessionCookies(response);
    assert.equal(written[0][2].httpOnly, true);
    assert.equal(written[0][2].secure, true);
    assert.equal(written[0][2].path, '/');
    assert.equal(written[1][2].path, '/api/auth');
    assert.equal(cleared[0][1].path, '/');
    assert.equal(cleared[1][1].path, '/api/auth');
  } finally {
    config.nodeEnv = previousEnvironment;
  }
});
