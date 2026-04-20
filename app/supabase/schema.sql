-- Thmanyah Basecamp Agent — Supabase schema
-- Run once in the Supabase SQL editor.

create extension if not exists pgcrypto;

-- Per-session vault: one row per browser session.
-- Basecamp access_token and refresh_token are stored as AES-256-GCM ciphertext.
create table if not exists basecamp_sessions (
  sid               text primary key,
  account_id        bigint      not null,
  account_name      text,
  account_href      text,
  user_id           bigint,
  user_name         text,
  user_email_address text,
  access_token_enc  text        not null,
  refresh_token_enc text        not null,
  expires_at        timestamptz not null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Optional per-session chat history (for continuity across reloads)
create table if not exists agent_messages (
  id          bigserial primary key,
  sid         text not null references basecamp_sessions(sid) on delete cascade,
  role        text not null check (role in ('user','assistant','tool')),
  content     jsonb not null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_agent_messages_sid_created
  on agent_messages (sid, created_at);

-- RLS — service role bypasses this; no anon access is ever granted.
alter table basecamp_sessions enable row level security;
alter table agent_messages enable row level security;

-- Deny-all default policies. The server uses the service role key which
-- bypasses RLS; no client/anon key is ever used to read these tables.
drop policy if exists "deny all" on basecamp_sessions;
create policy "deny all" on basecamp_sessions for all using (false) with check (false);

drop policy if exists "deny all" on agent_messages;
create policy "deny all" on agent_messages for all using (false) with check (false);
