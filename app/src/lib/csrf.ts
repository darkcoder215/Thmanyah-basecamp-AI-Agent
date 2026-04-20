import 'server-only';
import type { NextRequest } from 'next/server';
import { env } from './env';

/**
 * Same-origin guard for any state-changing request.
 *
 * `SameSite=lax` already blocks most cross-site POSTs, but we also hard-check
 * the Origin header (or Referer as a fallback) against APP_BASE_URL. This is
 * belt-and-braces CSRF protection and catches misconfigured proxies or
 * browser quirks.
 *
 * Returns null if the request is same-origin, or a reason string otherwise.
 */
export function assertSameOrigin(req: NextRequest): string | null {
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');

  const expected = env.appOrigin;

  if (origin) {
    if (origin === expected) return null;
    return `origin_mismatch:${origin}`;
  }

  if (referer) {
    try {
      if (new URL(referer).origin === expected) return null;
    } catch {
      return 'referer_malformed';
    }
    return 'referer_mismatch';
  }

  // No Origin and no Referer on a mutating request → reject. Legitimate
  // browser fetches from our SPA always carry at least one.
  return 'missing_origin';
}
