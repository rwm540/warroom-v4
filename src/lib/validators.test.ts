import { describe, it, expect } from 'vitest';
import { validateNationalCode, validatePhone, validatePasswordStrength, sanitizeText } from './validators';

describe('validators', () => {
  it('validates national code checksum', () => {
    expect(validateNationalCode('0499370899')).toBe(true);
    expect(validateNationalCode('1234567891')).toBe(true);
    expect(validateNationalCode('1111111111')).toBe(false);
    expect(validateNationalCode('0012345678')).toBe(false);
    expect(validateNationalCode('123')).toBe(false);
  });

  it('validates Iranian phone numbers', () => {
    expect(validatePhone('09123456789')).toBe(true);
    expect(validatePhone('+989123456789')).toBe(true);
    expect(validatePhone('989123456789')).toBe(true);
    expect(validatePhone('12345')).toBe(false);
  });

  it('rejects weak passwords', () => {
    expect(validatePasswordStrength('123').valid).toBe(false);
    expect(validatePasswordStrength('password').valid).toBe(false);
    expect(validatePasswordStrength('NoDigits').valid).toBe(false);
    expect(validatePasswordStrength('Strong123').valid).toBe(true);
    expect(validatePasswordStrength('has space 123A').valid).toBe(false);
  });

  it('sanitizes text and truncates', () => {
    expect(sanitizeText('  hello  ')).toBe('hello');
    expect(sanitizeText('a'.repeat(600), 500).length).toBe(500);
    expect(sanitizeText('test\x00\x01')).toBe('test');
  });
});
