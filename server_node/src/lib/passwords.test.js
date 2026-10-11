import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { hashPassword, verifyPassword } from './passwords.js';

test('scrypt password hashes verify only the original password', async () => {
  const stored = await hashPassword('CorrectHorseBattery9');
  assert.match(stored, /^scrypt\$16384\$8\$1\$/);
  assert.deepEqual(await verifyPassword('CorrectHorseBattery9', stored), { valid: true, needsUpgrade: false });
  assert.deepEqual(await verifyPassword('incorrect', stored), { valid: false, needsUpgrade: false });
});

test('legacy SHA-256 passwords are accepted only for migration after a correct match', async () => {
  const legacy = createHash('sha256').update('LegacyPass123').digest('hex');
  assert.deepEqual(await verifyPassword('LegacyPass123', legacy), { valid: true, needsUpgrade: true });
  assert.deepEqual(await verifyPassword('', ''), { valid: false, needsUpgrade: false });
  assert.deepEqual(await verifyPassword('incorrect', legacy), { valid: false, needsUpgrade: true });
});
