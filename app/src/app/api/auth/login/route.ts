import { NextResponse } from 'next/server';
import { authorizeUrl } from '@/lib/basecamp';
import { randomToken } from '@/lib/crypto';
import { setOAuthStateCookie } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const state = randomToken(24);
  setOAuthStateCookie(state);
  return NextResponse.redirect(authorizeUrl(state), { status: 302 });
}
