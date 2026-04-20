import 'server-only';
import { supabaseAdmin } from './supabase';
import { decrypt, encrypt } from './crypto';

/**
 * Server-side max session lifetime. Matches cookie max-age. If a cookie is
 * replayed after this, we refuse to hydrate the session even though HMAC
 * verify would pass.
 */
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export type StoredBasecampSession = {
  sid: string;
  accountId: number;
  accountName: string | null;
  accountHref: string | null;
  userId: number | null;
  userName: string | null;
  userEmailAddress: string | null;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
};

type Row = {
  sid: string;
  account_id: number;
  account_name: string | null;
  account_href: string | null;
  user_id: number | null;
  user_name: string | null;
  user_email_address: string | null;
  access_token_enc: string;
  refresh_token_enc: string;
  expires_at: string;
  created_at?: string;
};

/** AAD binds each ciphertext to its owning session id + role. Tamper-evident. */
function tokenAAD(sid: string, kind: 'access' | 'refresh'): string {
  return `bc:${kind}:${sid}`;
}

export async function saveSession(session: StoredBasecampSession): Promise<void> {
  const row = {
    sid: session.sid,
    account_id: session.accountId,
    account_name: session.accountName,
    account_href: session.accountHref,
    user_id: session.userId,
    user_name: session.userName,
    user_email_address: session.userEmailAddress,
    access_token_enc: encrypt(session.accessToken, tokenAAD(session.sid, 'access')),
    refresh_token_enc: encrypt(session.refreshToken, tokenAAD(session.sid, 'refresh')),
    expires_at: session.expiresAt.toISOString(),
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabaseAdmin()
    .from('basecamp_sessions')
    .upsert(row, { onConflict: 'sid' });
  if (error) throw new Error(`Supabase upsert failed: ${error.message}`);
}

export async function loadSession(sid: string): Promise<StoredBasecampSession | null> {
  const { data, error } = await supabaseAdmin()
    .from('basecamp_sessions')
    .select('*')
    .eq('sid', sid)
    .maybeSingle();
  if (error) throw new Error(`Supabase load failed: ${error.message}`);
  if (!data) return null;
  const r = data as Row;

  // Server-side max-age: refuse to hydrate sessions older than the policy
  // even if the signed cookie somehow outlived it.
  if (r.created_at) {
    const age = Date.now() - new Date(r.created_at).getTime();
    if (age > SESSION_MAX_AGE_MS) {
      await deleteSession(sid);
      return null;
    }
  }

  let accessToken: string;
  let refreshToken: string;
  try {
    accessToken = decrypt(r.access_token_enc, tokenAAD(sid, 'access'));
    refreshToken = decrypt(r.refresh_token_enc, tokenAAD(sid, 'refresh'));
  } catch {
    // Tag failure → the row was tampered with, key rotated, or the AAD doesn't
    // match. Treat as no session rather than crashing.
    console.warn('[vault] token decrypt failed; refusing session');
    return null;
  }

  return {
    sid: r.sid,
    accountId: r.account_id,
    accountName: r.account_name,
    accountHref: r.account_href,
    userId: r.user_id,
    userName: r.user_name,
    userEmailAddress: r.user_email_address,
    accessToken,
    refreshToken,
    expiresAt: new Date(r.expires_at),
  };
}

export async function deleteSession(sid: string): Promise<void> {
  const { error } = await supabaseAdmin().from('basecamp_sessions').delete().eq('sid', sid);
  if (error) throw new Error(`Supabase delete failed: ${error.message}`);
}

/**
 * Invalidate every prior session for the same Basecamp identity. Called right
 * after a successful fresh login so a stolen old session can't survive a
 * re-auth from the legitimate user.
 */
export async function deleteSessionsByUser(
  userId: number,
  accountId: number,
  exceptSid: string,
): Promise<void> {
  const { error } = await supabaseAdmin()
    .from('basecamp_sessions')
    .delete()
    .eq('user_id', userId)
    .eq('account_id', accountId)
    .neq('sid', exceptSid);
  if (error) console.warn('[vault] sibling session cleanup failed:', error.message);
}

export async function updateTokens(
  sid: string,
  accessToken: string,
  refreshToken: string,
  expiresAt: Date,
): Promise<void> {
  const { error } = await supabaseAdmin()
    .from('basecamp_sessions')
    .update({
      access_token_enc: encrypt(accessToken, tokenAAD(sid, 'access')),
      refresh_token_enc: encrypt(refreshToken, tokenAAD(sid, 'refresh')),
      expires_at: expiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('sid', sid);
  if (error) throw new Error(`Supabase token update failed: ${error.message}`);
}

export async function appendAgentMessage(
  sid: string,
  role: 'user' | 'assistant' | 'tool',
  content: unknown,
): Promise<void> {
  const { error } = await supabaseAdmin()
    .from('agent_messages')
    .insert({ sid, role, content });
  if (error) throw new Error(`Supabase append failed: ${error.message}`);
}

export async function loadAgentHistory(
  sid: string,
  limit = 40,
): Promise<Array<{ role: 'user' | 'assistant' | 'tool'; content: unknown; created_at: string }>> {
  const { data, error } = await supabaseAdmin()
    .from('agent_messages')
    .select('role, content, created_at')
    .eq('sid', sid)
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) throw new Error(`Supabase history failed: ${error.message}`);
  return (data ?? []) as Array<{ role: 'user' | 'assistant' | 'tool'; content: unknown; created_at: string }>;
}
