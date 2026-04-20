import { NextRequest, NextResponse } from 'next/server';

// Nonce-based CSP. Next.js auto-injects the nonce onto every inline script it
// emits when it sees the `x-nonce` request header, so hydration scripts run
// without `'unsafe-inline'`. `'strict-dynamic'` lets those nonce'd scripts
// load their dependent chunks from `/_next/static/*` via trust propagation.
//
// `script-src 'self'` alone (as next.config.js used to set it) blocks Next's
// inline bootstrap and breaks hydration silently — pages render from SSR HTML
// but no React attaches, so onClick handlers never fire.

const isProd = process.env.NODE_ENV === 'production';

function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    isProd
      ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`
      : "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    'upgrade-insecure-requests',
  ].join('; ');
}

export function middleware(req: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const csp = buildCsp(nonce);

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('content-security-policy', csp);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set('content-security-policy', csp);
  return res;
}

export const config = {
  matcher: [
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
