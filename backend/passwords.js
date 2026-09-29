import { randomBytes, scrypt, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
const derive = promisify(scrypt);
const options = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
export function validPassword(value) { return typeof value === 'string' && value.length >= 12 && Buffer.byteLength(value) <= 256; }
export async function hashPassword(password) {
  if (!validPassword(password)) throw new Error('Kata laluan mesti sekurang-kurangnya 12 aksara (maksimum 256 bait).');
  return hashLegacy(password);
}
export async function hashLegacy(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = await derive(password, salt, 32, options);
  return `scrypt$${salt}$${hash.toString('hex')}`;
}
export async function verifyPassword(password, stored) {
  if (typeof password !== 'string' || Buffer.byteLength(password) > 256 || typeof stored !== 'string') return false;
  if (!stored.startsWith('scrypt$')) {
    return timingSafeEqual(createHash('sha256').update(password).digest(), createHash('sha256').update(stored).digest());
  }
  const parts = stored.split('$');
  if (parts.length !== 3 || !/^[a-f0-9]{32}$/.test(parts[1]) || !/^[a-f0-9]{64}$/.test(parts[2])) return false;
  return timingSafeEqual(await derive(password, parts[1], 32, options), Buffer.from(parts[2], 'hex'));
}
