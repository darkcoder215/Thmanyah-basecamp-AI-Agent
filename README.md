# مَجال · وكيل ثمانية لبيسكامب

**Majal** is a Thmanyah-branded, Arabic-first Agentic AI for Basecamp 4. Users connect their
Basecamp account once via server-side OAuth, then drive their projects in natural Arabic —
listing projects, creating todos, inviting people, posting messages, commenting, and chatting
in Campfires — all gated behind a server-enforced preview/confirm flow for any action that
changes state.

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

- **OAuth 2.0 (`web_server`)** against `launchpad.37signals.com`. Callback runs on the server;
  the browser never sees the code.
- **Token vault** — Basecamp access/refresh tokens encrypted with AES-256-GCM before being
  written to Supabase. RLS is deny-all for the anon role; only the service role (server-only)
  reads or writes.
- **Session cookie** — an httpOnly, sameSite=lax, HMAC-signed cookie carrying a random
  session id. No tokens, no PII.
- **Automatic refresh** — `BasecampClient.request()` transparently refreshes expired tokens
  (2-minute safety buffer) with retries on 429/5xx.
- **Agent loop** — `POST /api/agent` runs a manual Claude tool-use loop on `claude-opus-4-7`
  with adaptive thinking. System prompt + tools are cached with `cache_control`.
- **Arabic RTL UI** — authentic Thmanyah branding (Thmanyah Sans / Serif Display, cream on
  warm off-black, `#A1B650` accent, diamond mark).

---

## Safety model — how destructive actions are prevented

Layered defense, all of it server-enforced:

### 1. Risk classification (server-side)

Every tool is tagged:

| Risk | Examples |
| --- | --- |
| `readonly` | `list_projects`, `get_project`, `my_overdue` |
| `write` | `create_project`, `create_todo`, `post_message`, `complete_todo` |
| `destructive` | `trash_project`, `trash_todo`, `revoke_people_from_project` |

### 2. Server-enforced preview/confirm

- `readonly` tools execute immediately.
- `write` and `destructive` tools **require** `confirmed: true` in the input.
- Without `confirmed: true`, the dispatcher **refuses to execute** and instead returns a
  structured preview: `{ kind: "preview", risk, effect, warning }`.
- This gate is in `dispatchTool`, not the system prompt — so even a compromised or
  jailbroken model cannot bypass it.

### 3. Irreversible action warnings

`destructive` previews carry an explicit warning `هذا إجراء لا يمكن التراجع عنه بسهولة`.
The UI renders the confirm card in red with the copy "أؤكد، نفّذ رغم أنه لا رجعة فيه".

### 4. Runtime input validation

Every tool input is validated against a **Zod schema** before touching Basecamp. Malformed
input returns a structured error (`kind: "error"`) that the agent surfaces in Arabic —
never as a silent failure.

### 5. Typed Basecamp errors

`BasecampError` classifies HTTP failures into `unauthorized`, `forbidden`, `not_found`,
`rate_limited`, `conflict`, `validation`, `server`, `network`, `unknown`. Each carries an
Arabic message. A 401 from Basecamp inside the agent loop triggers an early stop and
redirects the user to `/connect` — no further LLM calls burned.

### 6. Retries with backoff

Basecamp 429s honor `Retry-After`. 5xx uses exponential backoff up to 3 attempts. Other
errors fail fast so the model can adjust strategy.

### 7. Agent loop guards

- Hard cap of 8 tool-use turns per request. On hit, the user is told plainly.
- User message cap of 8000 chars.
- Tool output sent back to the model is truncated at 8000 chars.

---

## Agent memory

- **Token-windowed history** — `loadWindowedHistory` loads up to ~80 messages then trims
  from the oldest end until under ~40k tokens, preserving assistant ↔ tool_result pairing.
- **Prompt caching** — system prompt + tool list are marked `cache_control: ephemeral` so
  Anthropic can reuse them across turns.
- **Clear memory** — `DELETE /api/agent` wipes `agent_messages` for the session. The UI
  has a "مسح السجل" button in the sidebar.
- **Per-session scope** — history is keyed on the signed session id; one browser ≙ one
  conversation. Logging out and re-authing gives a fresh conversation.

---

## Error & edge-case handling

| Scenario | How it's handled |
| --- | --- |
| Expired Basecamp token | Auto-refresh inside `request()`. If refresh itself 401s, the next call surfaces `unauthorized` → UI sends user to `/connect`. |
| Revoked tokens mid-conversation | Early-stop on 401 from any tool; response carries `reconnect: true`. |
| Basecamp 403 (permission denied) | Returned as Arabic error; agent suggests a softer action. |
| Basecamp 404 (deleted entity) | Returned as Arabic error; agent fetches a fresh listing. |
| Basecamp 429 | Honors `Retry-After`; up to 3 attempts. |
| Basecamp 5xx | Exponential backoff; up to 3 attempts. |
| Anthropic rate limit | 429 surfaced to the client with retry guidance. |
| Anthropic auth failure | 500 with a clear server-config error (not exposed to end user). |
| Malformed tool input from the model | Zod catches it; error returned to the model, which corrects on the next turn. |
| Max turns reached | Response flags `turn_limit_hit: true`; user is asked to simplify. |
| Supabase write failure | Thrown up; the UI shows the error and no corrupted state persists. |
| User sends empty / too-long message | 400 / 413 with Arabic detail. |
| Network drop to Basecamp | Classified as `network`; 3 retries then Arabic error. |
| Disallowed tool name | `dispatchTool` rejects with `أداة غير معروفة`. |

---

## Responses & actions — examples

### Example 1 · Read-only (executes immediately)

User: `اعرض مشاريعي النشطة`

→ Agent calls `list_projects({ status: "active" })`. No confirmation needed. Response:

> هذه مشاريعك النشطة (4):
> - موسم 4 · الإنتاج
> - بودكاست فنجان · 2026
> - فهمت؟ · الموسم 2
> - ثمانية · عمليات داخلية
>
> أيّها تريد أن نفتحه؟

### Example 2 · Write with preview → confirm

User: `أضف مهمة «مراجعة مونتاج الحلقة 5» في قائمة الإنتاج لمشروع موسم 4، مسندة لأحمد، تستحق بعد غد`

→ Agent calls `get_project` (readonly), then `create_todo` **without** `confirmed`. Server
returns preview. Agent says:

> سأنشئ مهمة «مراجعة مونتاج الحلقة 5» في القائمة 8823110، مسندة لأحمد (id=42)، تستحق
> 2026-04-22. هل أؤكد؟

UI shows a confirmation card with **أؤكد، نفّذ** and **إلغاء** buttons. On confirm, the agent
retries the call with `confirmed: true` and posts the result.

### Example 3 · Destructive (irreversible) action

User: `احذف مشروع "اختبار"`

→ Agent calls `list_projects`, finds the project, then `trash_project` without `confirmed`.
Preview carries a red warning. UI shows:

> ⚠ **تأكيد مطلوب — لا يمكن التراجع بسهولة**
>
> سأُرسل المشروع رقم 123456 إلى سلة المحذوفات. يمكن استعادته خلال 30 يوماً.
>
> هذا إجراء لا يمكن التراجع عنه بسهولة.
>
> [أؤكد، نفّذ رغم أنه لا رجعة فيه]  [إلغاء]

The server refuses to call `trashProject` until `confirmed: true` arrives.

### Example 4 · Basecamp error mid-loop

If `post_message` returns 403, the tool result to the model is:

```json
{
  "status": "error",
  "message": "لا تملك صلاحيات لإجراء هذه العملية في بيسكامب.",
  "detail": "Basecamp POST /buckets/.../messages.json → 403",
  "http_status": 403
}
```

The agent explains the failure to the user in Arabic and suggests an alternative (e.g.
asking an admin to grant permission) rather than retrying blindly.

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
| `BASECAMP_USER_AGENT` | Basecamp requires one, e.g. `Thmanyah Basecamp Agent (contact@thmanyah.com)` |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Server-only — never expose |
| `ANTHROPIC_API_KEY` | Claude API key |
| `SESSION_SECRET` | 32-byte secret for HMAC cookie signing (`openssl rand -base64 32`) |
| `TOKEN_ENCRYPTION_KEY` | 32-byte AES key for at-rest token encryption |
| `APP_BASE_URL` | Public URL used for OAuth redirects |

### Supabase schema

Run `app/supabase/schema.sql` in your project SQL editor.

### Basecamp integration

Create an integration at **https://launchpad.37signals.com/integrations** with the redirect
URI matching `BASECAMP_REDIRECT_URI`.

---

## Deploying to Vercel

1. **Create a Vercel project** pointing at the `app/` subdirectory.
   - Root directory: `app`
   - Framework preset: **Next.js** (auto-detected)
   - Build command: `next build` (default)
2. **Configure environment variables** (all of `app/.env.example`). Mark every one as
   *server-only* — none of these should have the `NEXT_PUBLIC_` prefix.
3. **Update `BASECAMP_REDIRECT_URI`** to your Vercel URL, e.g.
   `https://majal.thmanyah.com/api/auth/callback`, and add the same URI to the Basecamp
   integration settings.
4. **Update `APP_BASE_URL`** to the same public URL.
5. **Apply `supabase/schema.sql`** on your Supabase project.
6. **Plan note:** `/api/agent` declares `maxDuration = 60`, which requires Vercel Pro or
   higher. On Hobby, the ceiling is 10s — the agent loop will time out on complex requests.
   `vercel.json` codifies the per-route function budgets.
7. Deploy. The first request may cold-start the function; subsequent ones are warm.

### Security checklist before going live

- [ ] `NEXT_PUBLIC_*` is not set on any secret.
- [ ] Supabase RLS is applied and the anon key is not used anywhere in `app/src`.
- [ ] `SESSION_SECRET` and `TOKEN_ENCRYPTION_KEY` are 32-byte random values, unique per
      environment.
- [ ] The OAuth redirect on Basecamp exactly matches `BASECAMP_REDIRECT_URI`.
- [ ] The Vercel project domain is added to any CSP/proxy you run in front of it.
- [ ] The Basecamp User-Agent identifies your org per 37signals guidelines.
- [ ] Anthropic and Supabase keys are rotated on first deploy and at any team change.

---

## Agent API surface

- `POST /api/agent` — `{ message }` → `{ reply, tools, reconnect?, turn_limit_hit? }`
- `GET  /api/agent` — returns the user/assistant timeline for rehydration
- `DELETE /api/agent` — clears history for the current session
- `GET  /api/agent/suggestions` — personalized suggestions grounded in live Basecamp data
- `GET  /api/session` — `{ authenticated, account, user }`
- `GET  /api/basecamp/projects` — proof-of-life REST route (used by debugging)
- `GET  /api/auth/login` — starts OAuth
- `GET  /api/auth/callback` — completes OAuth
- `POST /api/auth/logout` — revokes session

---

## Agent tools

`list_projects`, `get_project`, `create_project`, `trash_project`, `list_people_in_account`,
`list_people_in_project`, `grant_people_to_project`, `revoke_people_from_project`,
`list_todo_lists`, `create_todo_list`, `list_todos`, `get_todo`, `create_todo`,
`complete_todo`, `reopen_todo`, `update_todo`, `trash_todo`, `list_messages`, `post_message`,
`list_comments`, `post_comment`, `list_campfires`, `post_campfire_line`, `my_schedule`,
`my_assignments`, `my_overdue`.

See `app/src/lib/agentTools.ts` for the full schema, risk levels, and Arabic effect strings.

---

## Branch

Development happens on `claude/basecamp-ai-integration-HY5AD`.
