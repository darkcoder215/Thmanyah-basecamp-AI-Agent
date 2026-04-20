import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookie, readSessionId } from '@/lib/session';
import { deleteSession } from '@/lib/vault';
import { assertSameOrigin } from '@/lib/csrf';
import { auditLog } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const originFail = assertSameOrigin(req);
  if (originFail) {
    await auditLog({ kind: 'auth.logout.rejected', ok: false, meta: { reason: originFail } });
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const sid = readSessionId();
  if (sid) {
    try {
      await deleteSession(sid);
    } catch {
      // best-effort cleanup — we still clear the cookie below so the client
      // session is terminated regardless of DB state.
    }
    await auditLog({ sid, kind: 'auth.logout' });
  }
  clearSessionCookie();
  return NextResponse.json({ ok: true });
}
