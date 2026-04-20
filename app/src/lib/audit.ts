import 'server-only';
import { createHmac } from 'node:crypto';
import { env } from './env';
import { supabaseAdmin } from './supabase';

/**
 * Append-only audit log. Never exposed through any public route.
 *
 * Used for:
 *   - auth.login.success / auth.login.fail
 *   - auth.logout
 *   - agent.action.executed (destructive or write)
 *   - agent.action.rejected (bad CSRF, rate-limit, etc.)
 *   - security.suspicious (OAuth state mismatch, signature failure, etc.)
 */

type AuditEvent = {
  sid?: string | null;
  actor?: string | null;
  kind: string;
  ok?: boolean;
  meta?: Record<string, unknown>;
};

export async function auditLog(event: AuditEvent): Promise<void> {
  try {
    const { error } = await supabaseAdmin()
      .from('audit_log')
      .insert({
        sid: event.sid ?? null,
        actor: event.actor ?? null,
        kind: event.kind,
        ok: event.ok ?? true,
        meta: event.meta ?? {},
      });
    if (error) console.warn('[audit] insert failed:', error.message);
  } catch (err) {
    console.warn('[audit] threw:', err instanceof Error ? err.message : err);
  }
}

/**
 * Hash an IP address so we never store identifiers in plaintext. HMAC with the
 * session secret as a pepper: non-reversible, not correlatable across
 * deployments with different secrets.
 */
export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  return createHmac('sha256', `thmanyah:audit:v1:${env.session.secret}`)
    .update(ip)
    .digest('base64url')
    .slice(0, 22);
}
