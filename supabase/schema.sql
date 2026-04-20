-- Thmanyah Basecamp Agent — Supabase schema
-- Run once in the Supabase SQL editor, then re-run on schema changes.

create extension if not exists pgcrypto;

-- ───────── Basecamp per-session vault ─────────
-- One row per browser session. Basecamp access_token and refresh_token are
-- stored as AES-256-GCM ciphertext, with AAD binding to (sid, role) so the
-- ciphertexts cannot be swapped between rows.
create table if not exists basecamp_sessions (
  sid                text primary key,
  account_id         bigint      not null,
  account_name       text,
  account_href       text,
  user_id            bigint,
  user_name          text,
  user_email_address text,
  access_token_enc   text        not null,
  refresh_token_enc  text        not null,
  expires_at         timestamptz not null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists idx_basecamp_sessions_user
  on basecamp_sessions (user_id, account_id);

-- ───────── Agent chat history ─────────
create table if not exists agent_messages (
  id          bigserial primary key,
  sid         text not null references basecamp_sessions(sid) on delete cascade,
  role        text not null check (role in ('user','assistant','tool')),
  content     jsonb not null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_agent_messages_sid_created
  on agent_messages (sid, created_at);

-- ───────── Agent bookmarks (pinned memory) ─────────
-- User-saved messages the agent can reference later. One row per bookmark.
-- Cascaded on session deletion so bookmarks never outlive their owning
-- session. Soft cap of 100 rows/session is enforced in vault.ts.
create table if not exists agent_bookmarks (
  id         uuid primary key default gen_random_uuid(),
  sid        text not null references basecamp_sessions(sid) on delete cascade,
  content    text not null,
  note       text,
  source     text,
  created_at timestamptz not null default now()
);

create index if not exists idx_agent_bookmarks_sid_created
  on agent_bookmarks (sid, created_at desc);

-- ───────── Audit log ─────────
-- Append-only. Never exposed via any public route. Keeps hashed IPs and
-- anonymized metadata only — no secrets, no plaintext Basecamp IDs beyond
-- what the user already controls.
create table if not exists audit_log (
  id         bigserial primary key,
  sid        text,
  actor      text,
  kind       text not null,
  ok         boolean not null default true,
  meta       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_log_kind_created on audit_log (kind, created_at desc);
create index if not exists idx_audit_log_sid_created  on audit_log (sid, created_at desc);

-- ───────── Rate limits ─────────
-- Fixed-window counter. Keyed by `"bucket|window_start_iso"` so concurrent
-- requests in the same window collide on the primary key and serialize via
-- upsert semantics.
create table if not exists rate_limits (
  key        text primary key,
  count      integer not null default 0,
  reset_at   timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_rate_limits_reset on rate_limits (reset_at);

-- Atomic increment. Returns the new count. Callers compare against their
-- configured limit client-side.
create or replace function rl_incr(p_key text, p_limit int, p_reset timestamptz)
returns int
language plpgsql
security definer
as $$
declare
  v_count int;
begin
  insert into rate_limits (key, count, reset_at)
    values (p_key, 1, p_reset)
    on conflict (key) do update
      set count = rate_limits.count + 1
    returning count into v_count;
  return v_count;
end;
$$;

-- ───────── RLS — deny all ─────────
-- The server uses the service role key which bypasses RLS. No anon/auth key
-- is ever used against these tables, so the default policy locks them down
-- hard as defense-in-depth.

alter table basecamp_sessions enable row level security;
alter table agent_messages    enable row level security;
alter table agent_bookmarks   enable row level security;
alter table audit_log         enable row level security;
alter table rate_limits       enable row level security;

drop policy if exists "deny all" on basecamp_sessions;
create policy "deny all" on basecamp_sessions for all using (false) with check (false);

drop policy if exists "deny all" on agent_messages;
create policy "deny all" on agent_messages for all using (false) with check (false);

drop policy if exists "deny all" on agent_bookmarks;
create policy "deny all" on agent_bookmarks for all using (false) with check (false);

drop policy if exists "deny all" on audit_log;
create policy "deny all" on audit_log for all using (false) with check (false);

drop policy if exists "deny all" on rate_limits;
create policy "deny all" on rate_limits for all using (false) with check (false);

-- ───────── Hygiene ─────────
-- Periodic cleanup you can wire into pg_cron (optional but recommended):
--
--   select cron.schedule(
--     'thmanyah-cleanup',
--     '*/15 * * * *',
--     $$
--       delete from basecamp_sessions where created_at < now() - interval '30 days';
--       delete from rate_limits      where reset_at   < now() - interval '1 hour';
--       delete from audit_log        where created_at < now() - interval '180 days';
--     $$
--   );
