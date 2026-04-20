# مَجال · وكيل ثمانية لبيسكامب

**Majal** is a Thmanyah-branded, Arabic-first Agentic AI for Basecamp 4. Users connect their
Basecamp account once via server-side OAuth, then drive their projects in natural Arabic —
listing projects, creating todos, inviting people, posting messages, commenting, and chatting
in Campfires — all gated behind a confirmation flow for destructive actions.

The entire authentication path and every secret live on the server. The browser never sees
the Basecamp client secret, the Supabase service-role key, the Anthropic key, or the Basecamp
access/refresh tokens.

---

## Architecture

```
Browser  ──▶  Next.js App Router (server)  ──▶  Basecamp 4 API
                     │                      ──▶  Anthropic (Claude Opus 4.7)
                     ▼
                 Supabase
                 (encrypted tokens + chat history)
```

- **OAuth 2.0 (`web_server` flow)** against `launchpad.37signals.com` — the callback runs on the
  server; the code never touches the client.
- **Token vault** — Basecamp access/refresh tokens are encrypted with AES-256-GCM using a
  server-only key before they are stored in Supabase. RLS is deny-all for the anon role; only
  the service role (server-only) can read/write.
- **Session cookie** — an httpOnly, sameSite=lax, HMAC-signed cookie holds a random session
  id that maps to the encrypted Supabase row. No tokens, no PII.
- **Automatic refresh** — `BasecampClient.request()` transparently refreshes expired tokens
  (2-minute safety buffer).
- **Agent loop** — `POST /api/agent` runs a manual Claude tool-use loop with `claude-opus-4-7`
  and adaptive thinking. Every tool maps to a `BasecampClient` method. History is persisted to
  `agent_messages` so multi-turn context survives page reloads.
- **Arabic RTL UI** — authentic Thmanyah branding (Thmanyah Sans / Serif Display, cream on
  warm off-black, `#A1B650` accent, diamond mark).

---

## Setup

```bash
cd app
cp .env.example .env.local
# fill in every key — see below
npm install
npm run dev
```

### Required env

| Key | Purpose |
| --- | --- |
| `BASECAMP_CLIENT_ID` / `BASECAMP_CLIENT_SECRET` | From https://launchpad.37signals.com/integrations |
| `BASECAMP_REDIRECT_URI` | Must match the integration; default is `http://localhost:3000/api/auth/callback` |
| `BASECAMP_USER_AGENT` | Basecamp requires a User-Agent. e.g. `Thmanyah Basecamp Agent (contact@thmanyah.com)` |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Server-only — never expose |
| `ANTHROPIC_API_KEY` | Claude API key |
| `SESSION_SECRET` | 32-byte secret for HMAC cookie signing (`openssl rand -base64 32`) |
| `TOKEN_ENCRYPTION_KEY` | 32-byte AES key for at-rest token encryption |
| `APP_BASE_URL` | Public URL used for OAuth redirects |

### Supabase schema

Run `app/supabase/schema.sql` in your project SQL editor. It creates `basecamp_sessions` and
`agent_messages` with RLS deny-all (service-role bypasses).

### Basecamp integration

Create an integration at **https://launchpad.37signals.com/integrations** with the redirect URI
matching `BASECAMP_REDIRECT_URI`.

---

## Security model

1. **Nothing sensitive on the client.** The session cookie holds an opaque random id signed
   with HMAC — it's only meaningful to the server. The client never receives any Basecamp
   or Anthropic token.
2. **Encryption at rest.** Tokens are AES-256-GCM encrypted with a key that lives only in the
   server environment; the Supabase row alone cannot be decrypted.
3. **CSRF-safe OAuth.** A cryptographically random `state` cookie is issued on login and
   validated in the callback.
4. **Destructive action gate.** The agent's system prompt requires explicit user confirmation
   before any tool call that creates, modifies, grants/revokes, or posts. Users remain in
   control of every change.
5. **Server-only imports.** `lib/*` uses `import 'server-only'` so a client bundle cannot
   accidentally pull secrets.
6. **Hardened response headers.** `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
   strict `Referrer-Policy`, and a minimal `Permissions-Policy` are applied globally.

---

## Agent tools

The agent can call: `list_projects`, `get_project`, `create_project`, `list_people_in_account`,
`list_people_in_project`, `grant_people_to_project`, `revoke_people_from_project`,
`list_todo_lists`, `create_todo_list`, `list_todos`, `create_todo`, `complete_todo`,
`reopen_todo`, `update_todo`, `list_messages`, `post_message`, `list_comments`, `post_comment`,
`list_campfires`, `post_campfire_line`, `my_schedule`, `my_assignments`, `my_overdue`.

See `app/src/lib/agentTools.ts` for the full schema and `app/src/lib/basecamp.ts` for the
underlying client.

---

## Branch

Development happens on `claude/basecamp-ai-integration-HY5AD`.
