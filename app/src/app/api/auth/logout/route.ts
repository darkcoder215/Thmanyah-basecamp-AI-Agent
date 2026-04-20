import { NextResponse } from 'next/server';
import { clearSessionCookie, readSessionId } from '@/lib/session';
import { deleteSession } from '@/lib/vault';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  const sid = readSessionId();
  if (sid) {
    try {
      await deleteSession(sid);
    } catch {
      // best-effort cleanup
    }
  }
  clearSessionCookie();
  return NextResponse.json({ ok: true });
}
