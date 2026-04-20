import 'server-only';
import { cookies } from 'next/headers';
import { env } from './env';
import { hmacSign, hmacVerify, randomToken } from './crypto';

/**
 * Cookie names use the `__Host-` prefix in production, which the browser will
 * only send over HTTPS, from the exact origin, with path=/ and no Domain
 * attribute. This is the strongest cookie binding the platform offers.
 */
const COOKIE_NAME = env.isProd ? '__Host-thmanyah_session' : 'thmanyah_session';
const OAUTH_STATE_COOKIE = env.isProd ? '__Host-thmanyah_oauth_state' : 'thmanyah_oauth_state';

const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days
const OAUTH_STATE_MAX_AGE = 60 * 10; // 10 minutes

type SessionPayload = { sid: string; issuedAt: number };

function encodePayload(p: SessionPayload): string {
  return Buffer.from(JSON.stringify(p), 'utf8').toString('base64url');
}

function decodePayload(raw: string): SessionPayload | null {
  try {
    const obj = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
    if (
      typeof obj === 'object' &&
      obj !== null &&
      typeof obj.sid === 'string' &&
      obj.sid.length >= 16 &&
      obj.sid.length <= 128 &&
      typeof obj.issuedAt === 'number' &&
      Number.isFinite(obj.issuedAt)
    ) {
      return { sid: obj.sid, issuedAt: obj.issuedAt };
    }
    return null;
  } catch {
    return null;
  }
}

export function createSessionId(): string {
  return randomToken(32);
}

function baseCookieOpts() {
  return {
    httpOnly: true,
    secure: env.isProd,
    sameSite: 'lax' as const,
    path: '/',
  };
}

export function setSessionCookie(sid: string) {
  const payload = encodePayload({ sid, issuedAt: Date.now() });
  const signature = hmacSign(payload);
  cookies().set({
    ...baseCookieOpts(),
    name: COOKIE_NAME,
    value: `${payload}.${signature}`,
    maxAge: MAX_AGE_SECONDS,
  });
}

export function clearSessionCookie() {
  // Must match attributes of the cookie being cleared, including secure and
  // sameSite — browsers refuse overwrites that change the SameSite class.
  cookies().set({
    ...baseCookieOpts(),
    name: COOKIE_NAME,
    value: '',
    maxAge: 0,
  });
}

export function readSessionId(): string | null {
  const raw = cookies().get(COOKIE_NAME)?.value;
  if (!raw) return null;
  // Exactly one separator; reject otherwise.
  const dot = raw.indexOf('.');
  if (dot <= 0 || dot !== raw.lastIndexOf('.')) return null;
  const payload = raw.slice(0, dot);
  const signature = raw.slice(dot + 1);
  if (!hmacVerify(payload, signature)) return null;
  const decoded = decodePayload(payload);
  if (!decoded) return null;
  const ageMs = Date.now() - decoded.issuedAt;
  // Reject future-dated cookies (clock skew / tampering) and expired ones.
  if (ageMs < -60_000 || ageMs > MAX_AGE_SECONDS * 1000) return null;
  return decoded.sid;
}

export function setOAuthStateCookie(state: string) {
  cookies().set({
    ...baseCookieOpts(),
    name: OAUTH_STATE_COOKIE,
    value: state,
    maxAge: OAUTH_STATE_MAX_AGE,
  });
}

export function readOAuthStateCookie(): string | null {
  return cookies().get(OAUTH_STATE_COOKIE)?.value ?? null;
}

export function clearOAuthStateCookie() {
  cookies().set({
    ...baseCookieOpts(),
    name: OAUTH_STATE_COOKIE,
    value: '',
    maxAge: 0,
  });
}
