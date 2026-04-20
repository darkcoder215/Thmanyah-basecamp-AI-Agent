import { NextRequest, NextResponse } from 'next/server';
import { authorizeUrl } from '@/lib/basecamp';
import { randomToken } from '@/lib/crypto';
import { setOAuthStateCookie } from '@/lib/session';
import { rateLimit } from '@/lib/rateLimit';
import { auditLog, hashIp } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function clientIp(req: NextRequest): string | null {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]!.trim();
  return req.headers.get('x-real-ip');
}

export async function GET(req: NextRequest) {
  const ip = clientIp(req) ?? 'unknown';
  const rl = await rateLimit({
    bucket: `login:${ip}`,
    limit: 10,
    windowSeconds: 60,
  });
  if (!rl.allowed) {
    await auditLog({
      kind: 'auth.login.rate_limited',
      ok: false,
      meta: { ip: hashIp(ip) },
    });
    return NextResponse.json(
      { error: 'rate_limited', detail: 'محاولات كثيرة. انتظر دقيقة ثم حاول مجدداً.' },
      { status: 429, headers: { 'Retry-After': '60' } },
    );
  }

  const state = randomToken(32);
  setOAuthStateCookie(state);
  return NextResponse.redirect(authorizeUrl(state), { status: 302 });
}
