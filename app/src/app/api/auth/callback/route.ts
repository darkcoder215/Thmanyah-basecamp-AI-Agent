import { NextRequest, NextResponse } from 'next/server';
import { completeOAuthAndStore } from '@/lib/basecamp';
import { env } from '@/lib/env';
import {
  clearOAuthStateCookie,
  createSessionId,
  readOAuthStateCookie,
  setSessionCookie,
} from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const expected = readOAuthStateCookie();

  if (!code || !state || !expected || state !== expected) {
    clearOAuthStateCookie();
    return NextResponse.redirect(`${env.appBaseUrl}/?error=oauth_state`);
  }

  try {
    const sid = createSessionId();
    await completeOAuthAndStore(sid, code);
    setSessionCookie(sid);
    clearOAuthStateCookie();
    return NextResponse.redirect(`${env.appBaseUrl}/chat`);
  } catch (err) {
    clearOAuthStateCookie();
    const message = err instanceof Error ? err.message : 'unknown_error';
    return NextResponse.redirect(
      `${env.appBaseUrl}/?error=oauth_failed&detail=${encodeURIComponent(message)}`,
    );
  }
}
