import 'server-only';
import { supabaseAdmin } from './supabase';
import { decrypt, encrypt } from './crypto';

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
};

export async function saveSession(session: StoredBasecampSession): Promise<void> {
  const row = {
    sid: session.sid,
    account_id: session.accountId,
    account_name: session.accountName,
    account_href: session.accountHref,
    user_id: session.userId,
    user_name: session.userName,
    user_email_address: session.userEmailAddress,
    access_token_enc: encrypt(session.accessToken),
    refresh_token_enc: encrypt(session.refreshToken),
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
  return {
    sid: r.sid,
    accountId: r.account_id,
    accountName: r.account_name,
    accountHref: r.account_href,
    userId: r.user_id,
    userName: r.user_name,
    userEmailAddress: r.user_email_address,
    accessToken: decrypt(r.access_token_enc),
    refreshToken: decrypt(r.refresh_token_enc),
    expiresAt: new Date(r.expires_at),
  };
}

export async function deleteSession(sid: string): Promise<void> {
  const { error } = await supabaseAdmin().from('basecamp_sessions').delete().eq('sid', sid);
  if (error) throw new Error(`Supabase delete failed: ${error.message}`);
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
      access_token_enc: encrypt(accessToken),
      refresh_token_enc: encrypt(refreshToken),
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
