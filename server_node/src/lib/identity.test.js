import test from 'node:test';
import assert from 'node:assert/strict';
import { config } from '../config.js';
import {
  createOtp,
  hashNationalCodeForChallenge,
  hashOtp,
  isValidNationalCode,
  normalizeDigits,
  normalizeOtpCode,
  safeEqualHex,
  toE164Iran,
} from './identity.js';

test('OTP generation uses six digits and keyed hashes reject modified or unrelated values', () => {
  const previousOtpSecret = config.otpSecret;
  const previousChallengeSecret = config.otpChallengeSecret;
  config.otpSecret = 'test-only-otp-secret-0123456789abcdef';
  config.otpChallengeSecret = 'test-only-challenge-secret-0123456789';
  try {
    const value = createOtp();
    assert.match(value, /^\d{6}$/);
    const hash = hashOtp('0123456789', '+989120000000', value);
    assert.equal(safeEqualHex(hash, hash), true);
    assert.equal(safeEqualHex(hash, hashOtp('0123456789', '+989120000000', `${value}0`)), false);
    assert.equal(
      safeEqualHex(hashNationalCodeForChallenge('0123456789'), hashNationalCodeForChallenge('0123456788')),
      false,
    );
  } finally {
    config.otpSecret = previousOtpSecret;
    config.otpChallengeSecret = previousChallengeSecret;
  }
});

test('OTP input accepts exactly six ASCII, Persian, or Arabic-Indic digits', () => {
  assert.equal(normalizeOtpCode('123456'), '123456');
  assert.equal(normalizeOtpCode('۱۲۳۴۵۶'), '123456');
  assert.equal(normalizeOtpCode('١٢٣٤٥٦'), '123456');
  assert.equal(normalizeOtpCode('12345'), null);
  assert.equal(normalizeOtpCode('12345a'), null);
  assert.equal(normalizeOtpCode(' 123456'), null);
});

test('identity helpers normalize Persian/Arabic digits and Iranian phone numbers', () => {
  assert.equal(normalizeDigits('۰۹۱۲٣٤٥٦٧٨٩'), '09123456789');
  assert.deepEqual(toE164Iran('09123456789'), { local: '09123456789', e164: '+989123456789' });
  assert.equal(toE164Iran('123'), null);
  assert.equal(isValidNationalCode('1234567891'), '1234567891');
  assert.equal(isValidNationalCode('1111111111'), null);
  assert.equal(isValidNationalCode('0012345678'), null);
});

test('random server OTPs include leading-zero codes and are not constant', () => {
  const old = [config.otpSecret, config.otpChallengeSecret];
  config.otpSecret = 'unit-test-otp-secret-0123456789abcdef';
  config.otpChallengeSecret = 'unit-test-challenge-secret-0123456789';
  try {
  const values = Array.from({ length: 300 }, () => createOtp());
  assert.ok(values.every(v => /^\d{6}$/.test(v)));
  assert.ok(values.some(v => v.startsWith('0')));
  assert.ok(new Set(values).size > 1);
  } finally {
    [config.otpSecret, config.otpChallengeSecret] = old;
  }
});
