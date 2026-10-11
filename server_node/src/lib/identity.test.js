import test from 'node:test';
import assert from 'node:assert/strict';
import { config } from '../config.js';
import { createOtp, hashOtp, isValidNationalCode, normalizeDigits, safeEqualHex, toE164Iran } from './identity.js';

test('OTP generation uses six digits and HMAC rejects modified values', () => {
  const previousSecret = config.otpSecret;
  const previousJwtSecret = config.jwtSecret;
  config.otpSecret = 'test-only-otp-secret-0123456789abcdef';
  config.jwtSecret = 'test-only-jwt-secret-abcdef0123456789';
  try {
    const value = createOtp();
    assert.match(value, /^\d{6}$/);
    const hash = hashOtp('0123456789', '+989120000000', value);
    assert.equal(safeEqualHex(hash, hash), true);
    assert.equal(safeEqualHex(hash, hashOtp('0123456789', '+989120000000', `${value}0`)), false);
  } finally {
    config.otpSecret = previousSecret;
    config.jwtSecret = previousJwtSecret;
  }
});

test('identity helpers normalize Persian/Arabic digits and Iranian phone numbers', () => {
  assert.equal(normalizeDigits('۰۹۱۲٣٤٥٦٧٨٩'), '09123456789');
  assert.deepEqual(toE164Iran('09123456789'), { local: '09123456789', e164: '+989123456789' });
  assert.equal(toE164Iran('123'), null);
  assert.equal(isValidNationalCode('1111111111'), null);
});
