import { NextResponse } from 'next/server';
import { readSessionId } from '@/lib/session';
import { loadSession } from '@/lib/vault';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const sid = readSessionId();
  if (!sid) return NextResponse.json({ authenticated: false });
  const stored = await loadSession(sid);
  if (!stored) return NextResponse.json({ authenticated: false });
  return NextResponse.json({
    authenticated: true,
    account: {
      id: stored.accountId,
      name: stored.accountName,
      href: stored.accountHref,
    },
    user: {
      id: stored.userId,
      name: stored.userName,
      email: stored.userEmailAddress,
    },
  });
}
