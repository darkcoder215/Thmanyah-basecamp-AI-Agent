import 'server-only';
import { cookies } from 'next/headers';
import { hmacSign, hmacVerify, randomToken } from './crypto';

const COOKIE_NAME = 'thmanyah_session';
const OAUTH_STATE_COOKIE = 'thmanyah_oauth_state';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

type SessionPayload = { sid: string; issuedAt: number };

function encodePayload(p: SessionPayload): string {
  return Buffer.from(JSON.stringify(p), 'utf8').toString('base64url');
}

function decodePayload(raw: string): SessionPayload | null {
  try {
    const obj = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
    if (typeof obj?.sid === 'string' && typeof obj?.issuedAt === 'number') return obj;
    return null;
  } catch {
    return null;
  }
}

export function createSessionId(): string {
  return randomToken(24);
}

export function setSessionCookie(sid: string) {
  const payload = encodePayload({ sid, issuedAt: Date.now() });
  const signature = hmacSign(payload);
  cookies().set({
    name: COOKIE_NAME,
    value: `${payload}.${signature}`,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  });
}

export function clearSessionCookie() {
  cookies().set({ name: COOKIE_NAME, value: '', httpOnly: true, path: '/', maxAge: 0 });
}

export function readSessionId(): string | null {
  const raw = cookies().get(COOKIE_NAME)?.value;
  if (!raw) return null;
  const [payload, signature] = raw.split('.');
  if (!payload || !signature) return null;
  if (!hmacVerify(payload, signature)) return null;
  const decoded = decodePayload(payload);
  if (!decoded) return null;
  const ageMs = Date.now() - decoded.issuedAt;
  if (ageMs > MAX_AGE_SECONDS * 1000) return null;
  return decoded.sid;
}

export function setOAuthStateCookie(state: string) {
  cookies().set({
    name: OAUTH_STATE_COOKIE,
    value: state,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 10,
  });
}

export function readOAuthStateCookie(): string | null {
  return cookies().get(OAUTH_STATE_COOKIE)?.value ?? null;
}

export function clearOAuthStateCookie() {
  cookies().set({ name: OAUTH_STATE_COOKIE, value: '', httpOnly: true, path: '/', maxAge: 0 });
}
