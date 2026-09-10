import { createHmac, timingSafeEqual } from 'node:crypto';

export function signingReady(secret = process.env.PNR_TOKEN_SECRET) {
  return typeof secret === 'string' && Buffer.byteLength(secret) >= 32;
}
export function issueToken(uid, secret = process.env.PNR_TOKEN_SECRET, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({uid, exp: now + 86400000, iat: now})).toString('base64');
  if (!secret) return payload; // Existing web deployment; cannot authorize native RPW writes.
  if (!signingReady(secret)) throw new Error('PNR_TOKEN_SECRET must contain at least 32 bytes');
  return payload + '.' + createHmac('sha256', secret).update(payload).digest('base64url');
}
export function readToken(token, secret = process.env.PNR_TOKEN_SECRET, now = Date.now()) {
  try {
    if (typeof token !== 'string' || token.length > 4096) return null;
    const parts = token.split('.');
    if (secret) {
      if (!signingReady(secret) || parts.length !== 2) return null;
      const expected = createHmac('sha256', secret).update(parts[0]).digest();
      const supplied = Buffer.from(parts[1], 'base64url');
      if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
    } else if (parts.length !== 1) return null;
    const decoded = JSON.parse(Buffer.from(parts[0], 'base64').toString('utf8'));
    if (typeof decoded.uid !== 'string' || !decoded.uid || !Number.isFinite(decoded.exp) || decoded.exp <= now) return null;
    return decoded;
  } catch { return null; }
}
