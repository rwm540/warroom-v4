import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePasswordStrength, generateSecurePassword } from './password.js';
import { isValidIranianNationalCodeChecksum, validatePhone } from './validators.js';
import { isValidNationalCode, normalizeOtpCode } from './identity.js';

test('password strength rejects weak passwords and accepts strong ones', () => {
  assert.equal(validatePasswordStrength('123').valid, false);
  assert.equal(validatePasswordStrength('password123').valid, false);
  assert.equal(validatePasswordStrength('short1A').valid, false);
  assert.equal(validatePasswordStrength('NoDigitsHere').valid, false);
  assert.equal(validatePasswordStrength('12345678').valid, false);
  assert.equal(validatePasswordStrength('StrongPass123').valid, true);
  assert.equal(validatePasswordStrength('My$ecureP@ss123').valid, true);
  assert.equal(validatePasswordStrength('has space 123A').valid, false);
});

test('secure password generator uses crypto and produces required charset', () => {
  const pwd = generateSecurePassword(24);
  assert.equal(pwd.length, 24);
  assert.match(pwd, /^[A-Za-z0-9!@#$%]+$/);
  // Ensure not all same char (extremely unlikely with secure RNG)
  const unique = new Set(pwd.split('')).size;
  assert.ok(unique > 4, 'generated password should have diversity');
});

test('national code checksum validation', () => {
  // Known valid Iranian national codes (examples)
  // 1234567891 is considered valid by simple checksum? Our function should validate checksum
  assert.equal(isValidIranianNationalCodeChecksum('1234567891'), true);
  assert.equal(isValidIranianNationalCodeChecksum('1111111111'), false);
  assert.equal(isValidIranianNationalCodeChecksum('0000000000'), false);
  assert.equal(isValidIranianNationalCodeChecksum('0012345678'), false); // repeated pattern fails
  // Test with known valid: 0499370899 (common test)
  assert.equal(isValidIranianNationalCodeChecksum('0499370899'), true);
});

test('phone validation normalizes Iranian numbers', () => {
  assert.equal(validatePhone('09123456789'), '09123456789');
  assert.equal(validatePhone('+989123456789'), '09123456789');
  assert.equal(validatePhone('989123456789'), '09123456789');
  assert.equal(validatePhone('9123456789'), '09123456789');
  assert.equal(validatePhone('12345'), null);
});

test('OTP code normalization rejects invalid inputs', () => {
  assert.equal(normalizeOtpCode('123456'), '123456');
  assert.equal(normalizeOtpCode(' 123456'), null);
  assert.equal(normalizeOtpCode('12345'), null);
  assert.equal(normalizeOtpCode('abcdef'), null);
});

test('isValidNationalCode from identity rejects invalid', () => {
  assert.equal(isValidNationalCode('1111111111'), null);
  assert.equal(isValidNationalCode('0012345678'), null);
  assert.equal(isValidNationalCode('123'), null);
  assert.ok(isValidNationalCode('0499370899'));
});
