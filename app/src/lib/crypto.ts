import 'server-only';
import crypto from 'node:crypto';
import { env } from './env';

const ALGO = 'aes-256-gcm';
const IV_BYTES = 12;

function deriveKey(secret: string): Buffer {
  // SHA-256 is fine when the secret already has ≥256 bits of entropy (env
  // validates this). We still domain-separate by label to avoid key reuse if
  // this function is ever called for something else.
  return crypto.createHash('sha256').update(`thmanyah:token:v1:${secret}`, 'utf8').digest();
}

/**
 * AES-256-GCM encrypt with optional AAD.
 *
 * Pass `aad` whenever the ciphertext is stored against a specific row
 * identifier (e.g. the session id). It binds the ciphertext to that row so an
 * attacker who can write to the DB cannot swap ciphertexts between rows.
 */
export function encrypt(plaintext: string, aad?: string): string {
  const key = deriveKey(env.tokenEncryptionKey);
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  if (aad) cipher.setAAD(Buffer.from(aad, 'utf8'));
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, ciphertext].map((b) => b.toString('base64url')).join('.');
}

export function decrypt(payload: string, aad?: string): string {
  const key = deriveKey(env.tokenEncryptionKey);
  const parts = payload.split('.');
  if (parts.length !== 3) throw new Error('Invalid ciphertext envelope');
  const [ivB64, tagB64, ctB64] = parts;
  const iv = Buffer.from(ivB64, 'base64url');
  const tag = Buffer.from(tagB64, 'base64url');
  const ct = Buffer.from(ctB64, 'base64url');
  if (iv.length !== IV_BYTES) throw new Error('Invalid IV');
  if (tag.length !== 16) throw new Error('Invalid auth tag');
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  if (aad) decipher.setAAD(Buffer.from(aad, 'utf8'));
  decipher.setAuthTag(tag);
  // If authenticity fails (bad tag, wrong AAD, tampered ciphertext), this
  // throws — and that's exactly what we want.
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString('utf8');
}

export function hmacSign(payload: string): string {
  return crypto
    .createHmac('sha256', `thmanyah:session:v1:${env.session.secret}`)
    .update(payload)
    .digest('base64url');
}

export function hmacVerify(payload: string, signature: string): boolean {
  const expected = hmacSign(payload);
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

/** Timing-safe string compare. */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}
