import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, 64, SCRYPT_OPTIONS);
  return `scrypt$16384$8$1$${salt.toString('hex')}$${derived.toString('hex')}`;
}

export async function verifyPassword(password, storedHash) {
  const encoded = String(storedHash || '');
  if (!encoded || !password) return { valid: false, needsUpgrade: false };
  if (/^[a-f\d]{64}$/i.test(encoded)) {
    const submitted = createHash('sha256').update(password).digest();
    const legacy = Buffer.from(encoded, 'hex');
    return { valid: legacy.length === submitted.length && timingSafeEqual(legacy, submitted), needsUpgrade: true };
  }

  if (!encoded.startsWith('scrypt$')) {
    const supplied = Buffer.from(password);
    const legacy = Buffer.from(encoded);
    return { valid: supplied.length === legacy.length && timingSafeEqual(legacy, supplied), needsUpgrade: true };
  }

  const [, n, r, p, saltHex, hashHex] = encoded.split('$');
  if (!n || !r || !p || !saltHex || !hashHex) return { valid: false, needsUpgrade: false };
  const expected = Buffer.from(hashHex, 'hex');
  if (expected.length !== 64) return { valid: false, needsUpgrade: false };
  const actual = await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length, {
    N: Number(n), r: Number(r), p: Number(p), maxmem: SCRYPT_OPTIONS.maxmem,
  });
  return { valid: timingSafeEqual(expected, actual), needsUpgrade: false };
}
