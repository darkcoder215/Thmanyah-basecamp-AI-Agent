import { NextRequest, NextResponse } from 'next/server';
import { completeOAuthAndStore } from '@/lib/basecamp';
import { env } from '@/lib/env';
import {
  clearOAuthStateCookie,
  createSessionId,
  readOAuthStateCookie,
  setSessionCookie,
} from '@/lib/session';
import { safeEqual } from '@/lib/crypto';
import { auditLog, hashIp } from '@/lib/audit';
import { deleteSessionsByUser } from '@/lib/vault';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function clientIp(req: NextRequest): string | null {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]!.trim();
  return req.headers.get('x-real-ip');
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  // The callback must come to our own origin. If a reverse proxy rewrites the
  // host, the caller is already downstream of our perimeter.
  if (url.origin !== env.appOrigin) {
    await auditLog({ kind: 'auth.login.fail', ok: false, meta: { reason: 'origin_mismatch' } });
    return NextResponse.redirect(`${env.appBaseUrl}/?error=oauth_origin`);
  }

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const expected = readOAuthStateCookie();

  // Constant-time state compare. Any missing piece → abort.
  if (!code || !state || !expected || !safeEqual(state, expected)) {
    clearOAuthStateCookie();
    await auditLog({
      kind: 'auth.login.fail',
      ok: false,
      meta: {
        reason: 'state_mismatch',
        ip: hashIp(clientIp(req)),
      },
    });
    return NextResponse.redirect(`${env.appBaseUrl}/?error=oauth_state`);
  }

  try {
    const sid = createSessionId();
    const stored = await completeOAuthAndStore(sid, code);
    setSessionCookie(sid);
    clearOAuthStateCookie();

    // Kill any older sessions belonging to the same Basecamp identity on a
    // fresh login — a stolen cookie for the same user doesn't survive.
    if (stored.userId && stored.accountId) {
      await deleteSessionsByUser(stored.userId, stored.accountId, sid);
    }

    await auditLog({
      sid,
      actor: stored.userId ? `bc:${stored.userId}` : null,
      kind: 'auth.login.success',
      meta: { ip: hashIp(clientIp(req)) },
    });
    return NextResponse.redirect(`${env.appBaseUrl}/chat`);
  } catch (err) {
    clearOAuthStateCookie();
    // Never leak `err.message` into the redirect URL. Log server-side only.
    console.error('[auth/callback] oauth exchange failed:', err);
    await auditLog({
      kind: 'auth.login.fail',
      ok: false,
      meta: {
        reason: 'exchange_failed',
        ip: hashIp(clientIp(req)),
      },
    });
    return NextResponse.redirect(`${env.appBaseUrl}/?error=oauth_failed`);
  }
}
