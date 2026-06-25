import 'server-only';
import { env } from './env';
import { loadSession, saveSession, updateTokens, type StoredBasecampSession } from './vault';

const LAUNCHPAD = 'https://launchpad.37signals.com';
const API_BASE = 'https://3.basecampapi.com';

// Safety cap for exhaustive "pull everything" walks. Basecamp's geared
// pagination tops out near 100 rows/page, so 1000 pages is ~100k rows — far
// beyond any realistic single list, while still bounding a runaway loop.
const PULL_ALL_MAX_PAGES = 1000;

/** Result of walking a paginated endpoint, including whether it was truncated. */
export type PageWalk<T> = {
  rows: T[];
  pages: number;
  stop: 'done' | 'cutoff' | 'max_pages' | 'empty';
  totalCount: number | null;
  /** True when the walk stopped at the safety cap — the result is partial. */
  incomplete: boolean;
};

// ─────────────────────────── Typed errors ───────────────────────────

export class BasecampError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly kind:
      | 'unauthorized'
      | 'forbidden'
      | 'not_found'
      | 'rate_limited'
      | 'conflict'
      | 'validation'
      | 'server'
      | 'network'
      | 'unknown',
    public readonly body?: string,
  ) {
    super(message);
    this.name = 'BasecampError';
  }

  /** Human-readable Arabic summary for surfacing to the user/agent. */
  get arabicMessage(): string {
    switch (this.kind) {
      case 'unauthorized':
        return 'انتهت صلاحية الربط مع بيسكامب. أعد الاتصال من صفحة الربط.';
      case 'forbidden':
        return 'لا تملك صلاحيات لإجراء هذه العملية في بيسكامب.';
      case 'not_found':
        return 'العنصر المطلوب غير موجود (قد يكون مؤرشفاً أو محذوفاً).';
      case 'rate_limited':
        return 'تم تجاوز حدّ طلبات بيسكامب. سأحاول لاحقاً.';
      case 'conflict':
        return 'هناك تعارض مع الحالة الحالية في بيسكامب.';
      case 'validation':
        return 'البيانات المقدّمة غير صالحة في بيسكامب.';
      case 'server':
        return 'عُطل مؤقت في خوادم بيسكامب.';
      case 'network':
        return 'تعذّر الاتصال ببيسكامب.';
      default:
        return `خطأ من بيسكامب: ${this.message}`;
    }
  }
}

function kindFor(status: number): BasecampError['kind'] {
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status === 409) return 'conflict';
  if (status === 422) return 'validation';
  if (status === 429) return 'rate_limited';
  if (status >= 500) return 'server';
  return 'unknown';
}

// ─────────────────────────── OAuth ───────────────────────────

export function authorizeUrl(state: string): string {
  const params = new URLSearchParams({
    type: 'web_server',
    client_id: env.basecamp.clientId,
    redirect_uri: env.basecamp.redirectUri,
    state,
  });
  return `${LAUNCHPAD}/authorization/new?${params.toString()}`;
}

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};

export async function exchangeCodeForToken(code: string): Promise<TokenResponse> {
  const params = new URLSearchParams({
    type: 'web_server',
    client_id: env.basecamp.clientId,
    client_secret: env.basecamp.clientSecret,
    redirect_uri: env.basecamp.redirectUri,
    code,
  });
  const res = await fetch(`${LAUNCHPAD}/authorization/token?${params.toString()}`, {
    method: 'POST',
    headers: { 'User-Agent': env.basecamp.userAgent },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new BasecampError(
      `Basecamp token exchange failed: ${res.status}`,
      res.status,
      kindFor(res.status),
      body,
    );
  }
  return (await res.json()) as TokenResponse;
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const params = new URLSearchParams({
    type: 'refresh',
    client_id: env.basecamp.clientId,
    client_secret: env.basecamp.clientSecret,
    redirect_uri: env.basecamp.redirectUri,
    refresh_token: refreshToken,
  });
  const res = await fetch(`${LAUNCHPAD}/authorization/token?${params.toString()}`, {
    method: 'POST',
    headers: { 'User-Agent': env.basecamp.userAgent },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new BasecampError(
      `Basecamp refresh failed: ${res.status}`,
      res.status,
      kindFor(res.status),
      body,
    );
  }
  return (await res.json()) as TokenResponse;
}

type AuthorizationResponse = {
  identity: { id: number; first_name: string; last_name: string; email_address: string };
  accounts: Array<{ product: string; id: number; name: string; href: string; app_href: string }>;
};

export async function fetchAuthorization(accessToken: string): Promise<AuthorizationResponse> {
  const res = await fetch(`${LAUNCHPAD}/authorization.json`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': env.basecamp.userAgent,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new BasecampError(
      `Basecamp authorization lookup failed: ${res.status}`,
      res.status,
      kindFor(res.status),
      body,
    );
  }
  return (await res.json()) as AuthorizationResponse;
}

// ─────────────────────────── Client ───────────────────────────

async function ensureFreshToken(session: StoredBasecampSession): Promise<string> {
  const buffer = 2 * 60 * 1000;
  if (session.expiresAt.getTime() - Date.now() > buffer) return session.accessToken;
  const next = await refreshAccessToken(session.refreshToken);
  const expiresAt = new Date(Date.now() + next.expires_in * 1000);
  await updateTokens(session.sid, next.access_token, next.refresh_token, expiresAt);
  session.accessToken = next.access_token;
  session.refreshToken = next.refresh_token;
  session.expiresAt = expiresAt;
  return next.access_token;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Run `fn` over `items` with at most `limit` in flight at once, preserving
 * input order in the result array. Used by the deterministic bulk pulls, where
 * we fan out across columns/projects but must not hammer Basecamp's rate limit.
 * Never rejects on a single item — callers pass a `fn` that captures its own
 * errors so one bad project/column cannot abort the whole sweep.
 */
async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const workers = new Array(Math.max(1, Math.min(limit, items.length || 1)))
    .fill(0)
    .map(async () => {
      while (true) {
        const i = cursor++;
        if (i >= items.length) return;
        results[i] = await fn(items[i], i);
      }
    });
  await Promise.all(workers);
  return results;
}

/** Compact, safe-to-surface description of a thrown value (no stack/internal IPs). */
export function describeError(err: unknown): string {
  if (err instanceof BasecampError) return err.arabicMessage;
  if (err instanceof Error) return err.message;
  return 'خطأ غير معروف';
}

/**
 * Parse the `rel="next"` target out of an RFC-5988 `Link` header.
 *
 * Basecamp's response looks like:
 *   Link: <https://3.basecampapi.com/…/projects/recordings.json?page=2>; rel="next"
 * Multiple links may appear comma-separated. We only care about `next`.
 *
 * Returns `null` for missing header, malformed entries, or no next link.
 * Defensive against quoted/unquoted rel values and extra spaces.
 */
export function parseNextLink(header: string | null): string | null {
  if (!header) return null;
  // Split on commas that sit outside angle brackets — some values embed commas
  // inside the URL query string. We do a simple state split instead of regex.
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < header.length; i++) {
    const ch = header[i];
    if (ch === '<') depth += 1;
    else if (ch === '>') depth -= 1;
    else if (ch === ',' && depth === 0) {
      parts.push(header.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(header.slice(start));
  for (const raw of parts) {
    const part = raw.trim();
    const m = part.match(/^<([^>]+)>\s*;\s*(.*)$/);
    if (!m) continue;
    const url = m[1];
    const params = m[2];
    // Attribute parsing: rel may be quoted or unquoted per RFC.
    const relMatch = params.match(/\brel\s*=\s*"?([^";\s]+)"?/i);
    if (relMatch && relMatch[1].toLowerCase() === 'next') {
      return url;
    }
  }
  return null;
}

/**
 * Basecamp 3 "recording" envelope — the shared shape returned by the
 * Recordings API (`/projects/recordings.json`). All activity items (messages,
 * todos, comments, uploads, schedule entries, …) round-trip through this
 * wrapper, so report builders can treat them uniformly.
 *
 * Fields marked optional are present on most — but not all — recording types;
 * e.g. `comments_count` is undefined on things that can't be commented on.
 */
export type BcRecordingType =
  | 'Comment'
  | 'Document'
  | 'Message'
  | 'Question::Answer'
  | 'Schedule::Entry'
  | 'Todo'
  | 'Todolist'
  | 'Upload'
  | 'Vault';

export type Recording = {
  id: number;
  type: string;
  status?: string;
  visible_to_clients?: boolean;
  created_at: string;
  updated_at: string;
  title?: string;
  inherits_status?: boolean;
  url?: string;
  app_url?: string;
  bookmark_url?: string;
  subscription_url?: string;
  comments_count?: number;
  comments_url?: string;
  position?: number;
  parent?: { id: number; title?: string; type?: string; url?: string; app_url?: string };
  bucket?: { id: number; name?: string; type?: string };
  creator?: {
    id: number;
    name?: string;
    email_address?: string;
    title?: string;
    avatar_url?: string;
  };
  excerpt?: string;
  content?: string;
};

export type BcEvent = {
  id: number;
  recording_id?: number;
  action: string;
  details?: Record<string, unknown>;
  created_at: string;
  creator?: { id: number; name?: string; email_address?: string };
};

export class BasecampClient {
  constructor(private readonly session: StoredBasecampSession) {}

  static async forSession(sid: string): Promise<BasecampClient | null> {
    const stored = await loadSession(sid);
    if (!stored) return null;
    return new BasecampClient(stored);
  }

  get accountId(): number {
    return this.session.accountId;
  }

  get identity() {
    return {
      accountId: this.session.accountId,
      accountName: this.session.accountName,
      userId: this.session.userId,
      userName: this.session.userName,
      userEmailAddress: this.session.userEmailAddress,
    };
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: unknown,
  ): Promise<T> {
    const res = await this.requestWithHeaders<T>(method, path, body);
    return res.body;
  }

  /**
   * Lower-level version of `request` that also exposes response headers and
   * status. Used by `paginatedRequest` to read the RFC-5988 `Link` header for
   * Basecamp's geared pagination, and by anything that needs `X-Total-Count`
   * or conditional-request headers later on.
   */
  private async requestWithHeaders<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: unknown,
  ): Promise<{ body: T; headers: Headers; status: number }> {
    const token = await ensureFreshToken(this.session);
    const url = path.startsWith('http')
      ? path
      : `${API_BASE}/${this.session.accountId}${path.startsWith('/') ? path : `/${path}`}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'User-Agent': env.basecamp.userAgent,
      Accept: 'application/json',
    };
    if (body !== undefined) headers['Content-Type'] = 'application/json; charset=utf-8';

    const MAX_ATTEMPTS = 3;
    const TIMEOUT_MS = 25_000;
    let lastError: unknown;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      let res: Response;
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort('basecamp_timeout'), TIMEOUT_MS);
      try {
        res = await fetch(url, {
          method,
          headers,
          body: body === undefined ? undefined : JSON.stringify(body),
          cache: 'no-store',
          signal: ac.signal,
          redirect: 'error',
        });
      } catch (err) {
        // Don't echo raw fetch error text back to the model — it can contain
        // internal IPs, proxy hints, etc. Use a generic message.
        lastError = new BasecampError(
          ac.signal.aborted ? 'network timeout' : 'network error',
          0,
          'network',
        );
        if (attempt < MAX_ATTEMPTS) {
          await sleep(attempt * 400);
          continue;
        }
        throw lastError;
      } finally {
        clearTimeout(timer);
      }

      if (res.ok) {
        if (res.status === 204) {
          return { body: undefined as T, headers: res.headers, status: res.status };
        }
        const text = await res.text();
        const parsed = text ? (JSON.parse(text) as T) : (undefined as T);
        return { body: parsed, headers: res.headers, status: res.status };
      }

      const text = await res.text();
      const err = new BasecampError(
        `Basecamp ${method} ${path} → ${res.status}`,
        res.status,
        kindFor(res.status),
        text,
      );

      // Retry only on 429 and 5xx
      if ((err.kind === 'rate_limited' || err.kind === 'server') && attempt < MAX_ATTEMPTS) {
        const retryAfter = Number(res.headers.get('retry-after')) || attempt * 800;
        await sleep(retryAfter * (err.kind === 'rate_limited' ? 1000 : 1));
        continue;
      }
      throw err;
    }
    throw lastError ?? new BasecampError('unknown error', 0, 'unknown');
  }

  /**
   * Walk an endpoint that returns a list with RFC-5988 Link-header pagination.
   *
   * Basecamp 3 pages are "geared": ~15 rows on page 1, climbing toward 100 on
   * later pages — the server picks, there is no client `per_page`. We follow
   * `Link: <…>; rel="next"` blindly and stop when any of these happen:
   *   • no next link remains on the current page (walk completed cleanly)
   *   • `opts.until(row)` returns true for some row (caller-supplied cutoff —
   *     e.g. `row.updated_at < since_date`; we stop BEFORE that row and do
   *     not include it in the output)
   *   • `opts.maxPages` pages have been fetched (safety cap; logged as such)
   *
   * Errors mid-walk are thrown — reports decide whether to treat partial data
   * as acceptable. The server already retries 429/5xx inside `requestWithHeaders`.
   */
  private async walkPages<T>(
    path: string,
    opts: { until?: (row: T) => boolean; maxPages?: number; label?: string } = {},
  ): Promise<PageWalk<T>> {
    const maxPages = Math.max(1, opts.maxPages ?? 20);
    const label = opts.label ?? `paginated ${path.split('?')[0]}`;
    const started = Date.now();
    const out: T[] = [];
    let nextPath: string | null = path;
    let page = 0;
    let totalCount: number | null = null;
    let stop: PageWalk<T>['stop'] = 'done';

    while (nextPath && page < maxPages) {
      page += 1;
      const { body, headers } = await this.requestWithHeaders<T[]>('GET', nextPath);
      if (page === 1) {
        const raw = headers.get('x-total-count');
        const n = raw == null ? NaN : Number(raw);
        totalCount = Number.isFinite(n) ? n : null;
      }
      const rows = Array.isArray(body) ? body : [];
      if (rows.length === 0) {
        stop = 'empty';
        break;
      }
      let cutoff = false;
      for (const row of rows) {
        if (opts.until?.(row)) {
          cutoff = true;
          break;
        }
        out.push(row);
      }
      if (cutoff) {
        stop = 'cutoff';
        break;
      }
      const link = headers.get('link');
      const next = parseNextLink(link);
      if (!next) break;
      // Guard against a server that points `next` back at a page we just
      // fetched — would otherwise loop forever until maxPages.
      if (next === nextPath) break;
      nextPath = next;
    }
    if (nextPath && page >= maxPages && stop === 'done') stop = 'max_pages';

    const dur = Date.now() - started;
    console.info(
      `[basecamp.paginated] label=${label} pages=${page} rows=${out.length} total_count=${totalCount ?? '?'} stop=${stop} dur_ms=${dur}`,
    );
    if (stop === 'max_pages') {
      console.warn(
        `[basecamp.paginated] label=${label} hit max_pages=${maxPages} — results may be incomplete`,
      );
    }
    return { rows: out, pages: page, stop, totalCount, incomplete: stop === 'max_pages' };
  }

  /** Convenience wrapper that returns only the rows (see `walkPages`). */
  private async paginatedRequest<T>(
    path: string,
    opts: { until?: (row: T) => boolean; maxPages?: number; label?: string } = {},
  ): Promise<T[]> {
    return (await this.walkPages<T>(path, opts)).rows;
  }

  /**
   * Exhaustively walk EVERY page of a Link-paginated list endpoint with no
   * early cutoff. This is the deterministic "pull everything" primitive: it
   * keeps following `rel="next"` until the server stops handing out links, and
   * only gives up at a very high safety cap (1000 pages). The returned walk
   * carries `incomplete` so callers can tell the user the data was truncated
   * rather than silently returning a partial set.
   */
  private collectAll<T>(path: string, label: string): Promise<PageWalk<T>> {
    return this.walkPages<T>(path, { maxPages: PULL_ALL_MAX_PAGES, label });
  }

  // Projects
  //
  // Per the official Basecamp 3 API docs, `GET /projects.json` returns active
  // projects by default; the `status` query param is only valid for values
  // `archived` or `trashed`. Sending `?status=active` returns 400.
  listProjects(status: 'active' | 'archived' | 'trashed' = 'active') {
    const q = status === 'active' ? '' : `?status=${status}`;
    // Exhaustive: /projects.json is Link-paginated; the old single-page call
    // silently dropped every project past the first ~15.
    return this.paginatedRequest<any>(`/projects.json${q}`, {
      maxPages: PULL_ALL_MAX_PAGES,
      label: `projects.${status}`,
    });
  }
  getProject(projectId: number) {
    return this.request<any>('GET', `/projects/${projectId}.json`);
  }
  createProject(name: string, description?: string) {
    return this.request<any>('POST', '/projects.json', { name, description });
  }
  trashProject(projectId: number) {
    return this.request<void>('DELETE', `/projects/${projectId}.json`);
  }

  // People
  //
  // Per the official BC3 People API:
  //   GET  /people.json                     → all people visible to current user
  //   GET  /projects/:p/people.json         → people on a project
  //   PUT  /projects/:p/people/users.json   → grant/revoke/create access
  //   GET  /circles/people.json             → pingable people (unpaginated)
  //   GET  /people/:id.json                 → a single person's profile
  //   GET  /my/profile.json                 → current user's profile
  //   PUT  /my/profile.json                 → update current user's profile
  //   GET  /my/preferences.json             → current user's preferences
  //   PUT  /my/preferences.json             → update preferences
  listPeopleInAccount() {
    return this.paginatedRequest<any>(`/people.json`, {
      maxPages: PULL_ALL_MAX_PAGES,
      label: 'people.account',
    });
  }
  listPeopleInProject(projectId: number) {
    return this.paginatedRequest<any>(`/projects/${projectId}/people.json`, {
      maxPages: PULL_ALL_MAX_PAGES,
      label: `people.project.${projectId}`,
    });
  }
  listPingablePeople() {
    return this.request<any[]>('GET', `/circles/people.json`);
  }
  getPerson(personId: number) {
    return this.request<any>('GET', `/people/${personId}.json`);
  }
  /**
   * Update who can access a project. `create` entries add brand-new people,
   * which is a destructive/side-effectful operation — the agent gates it
   * behind preview/confirm.
   */
  updateProjectAccess(
    projectId: number,
    changes: {
      grant?: number[];
      revoke?: number[];
      create?: Array<{ name: string; email_address: string; title?: string; company_name?: string }>;
    },
  ) {
    return this.request<any>('PUT', `/projects/${projectId}/people/users.json`, changes);
  }
  grantPeopleToProject(projectId: number, grantIds: number[]) {
    return this.updateProjectAccess(projectId, { grant: grantIds });
  }
  revokePeopleFromProject(projectId: number, revokeIds: number[]) {
    return this.updateProjectAccess(projectId, { revoke: revokeIds });
  }
  me() {
    return this.request<any>('GET', `/my/profile.json`);
  }
  updateMyProfile(patch: {
    name?: string;
    email_address?: string;
    title?: string;
    bio?: string;
    location?: string;
    time_zone_name?: string;
    first_week_day?: 0 | 1;
    time_format?: 'twelve_hour' | 'twenty_four_hour';
  }) {
    return this.request<any>('PUT', `/my/profile.json`, patch);
  }
  myPreferences() {
    return this.request<any>('GET', `/my/preferences.json`);
  }
  updateMyPreferences(patch: {
    time_zone_name?: string;
    first_week_day?: 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
    time_format?: 'twelve_hour' | 'twenty_four_hour';
  }) {
    return this.request<any>('PUT', `/my/preferences.json`, { person: patch });
  }

  // Todo sets & lists
  getTodoSet(projectId: number, todoSetId: number) {
    return this.request<any>('GET', `/buckets/${projectId}/todosets/${todoSetId}.json`);
  }
  listTodoLists(projectId: number, todoSetId: number) {
    return this.paginatedRequest<any>(
      `/buckets/${projectId}/todosets/${todoSetId}/todolists.json`,
      { maxPages: PULL_ALL_MAX_PAGES, label: `todolists.${todoSetId}` },
    );
  }
  createTodoList(projectId: number, todoSetId: number, name: string, description?: string) {
    return this.request<any>('POST', `/buckets/${projectId}/todosets/${todoSetId}/todolists.json`, {
      name,
      description,
    });
  }

  // Todos
  listTodos(projectId: number, todoListId: number, status: 'active' | 'completed' = 'active') {
    const q = status === 'completed' ? '?completed=true' : '';
    return this.paginatedRequest<any>(
      `/buckets/${projectId}/todolists/${todoListId}/todos.json${q}`,
      { maxPages: PULL_ALL_MAX_PAGES, label: `todos.${todoListId}.${status}` },
    );
  }
  getTodo(projectId: number, todoId: number) {
    return this.request<any>('GET', `/buckets/${projectId}/todos/${todoId}.json`);
  }
  createTodo(
    projectId: number,
    todoListId: number,
    content: string,
    opts: { description?: string; assignee_ids?: number[]; due_on?: string; notify?: boolean } = {},
  ) {
    return this.request<any>('POST', `/buckets/${projectId}/todolists/${todoListId}/todos.json`, {
      content,
      ...opts,
    });
  }
  completeTodo(projectId: number, todoId: number) {
    return this.request<void>('POST', `/buckets/${projectId}/todos/${todoId}/completion.json`);
  }
  reopenTodo(projectId: number, todoId: number) {
    return this.request<void>('DELETE', `/buckets/${projectId}/todos/${todoId}/completion.json`);
  }
  updateTodo(projectId: number, todoId: number, patch: Record<string, unknown>) {
    return this.request<any>('PUT', `/buckets/${projectId}/todos/${todoId}.json`, patch);
  }
  trashTodo(projectId: number, todoId: number) {
    return this.request<void>('DELETE', `/buckets/${projectId}/recordings/${todoId}.json`);
  }

  // Messages
  listMessages(projectId: number, boardId: number) {
    return this.paginatedRequest<any>(
      `/buckets/${projectId}/message_boards/${boardId}/messages.json`,
      { maxPages: PULL_ALL_MAX_PAGES, label: `messages.${boardId}` },
    );
  }
  postMessage(projectId: number, boardId: number, subject: string, content: string, status: 'active' | 'draft' = 'active') {
    return this.request<any>('POST', `/buckets/${projectId}/message_boards/${boardId}/messages.json`, {
      subject,
      content,
      status,
    });
  }

  // Comments
  listComments(projectId: number, recordingId: number) {
    return this.paginatedRequest<any>(
      `/buckets/${projectId}/recordings/${recordingId}/comments.json`,
      { maxPages: PULL_ALL_MAX_PAGES, label: `comments.${recordingId}` },
    );
  }
  postComment(projectId: number, recordingId: number, content: string) {
    return this.request<any>('POST', `/buckets/${projectId}/recordings/${recordingId}/comments.json`, {
      content,
    });
  }

  // Campfire (chat)
  listCampfires() {
    return this.request<any[]>('GET', `/chats.json`);
  }
  postCampfireLine(projectId: number, campfireId: number, content: string) {
    return this.request<any>('POST', `/buckets/${projectId}/chats/${campfireId}/lines.json`, { content });
  }

  // Card Tables (Kanban)
  //
  // Per the official BC3 docs, flat routes (e.g. /card_tables/2.json) are the
  // canonical form, but the legacy project-scoped routes (/buckets/:p/card_tables/…)
  // remain supported and fit our existing bucket-aware request pattern.

  /** Get a card table with its columns/lists. */
  getCardTable(projectId: number, cardTableId: number) {
    return this.request<any>('GET', `/buckets/${projectId}/card_tables/${cardTableId}.json`);
  }
  /** All cards in a given column/list, walked across every page. */
  listCardsInColumn(projectId: number, columnId: number) {
    return this.paginatedRequest<any>(
      `/buckets/${projectId}/card_tables/lists/${columnId}/cards.json`,
      { maxPages: PULL_ALL_MAX_PAGES, label: `cards.col.${columnId}` },
    );
  }
  /** A single card, including its steps. */
  getCard(projectId: number, cardId: number) {
    return this.request<any>('GET', `/buckets/${projectId}/card_tables/cards/${cardId}.json`);
  }
  createCard(
    projectId: number,
    columnId: number,
    title: string,
    opts: { content?: string; due_on?: string; notify?: boolean } = {},
  ) {
    return this.request<any>(
      'POST',
      `/buckets/${projectId}/card_tables/lists/${columnId}/cards.json`,
      { title, ...opts },
    );
  }
  updateCard(projectId: number, cardId: number, patch: Record<string, unknown>) {
    return this.request<any>(
      'PUT',
      `/buckets/${projectId}/card_tables/cards/${cardId}.json`,
      patch,
    );
  }
  /** Move a card to a different column; position is 1-indexed, defaults to top. */
  moveCard(projectId: number, cardId: number, columnId: number, position?: number) {
    return this.request<void>(
      'POST',
      `/buckets/${projectId}/card_tables/cards/${cardId}/moves.json`,
      { column_id: columnId, ...(position !== undefined ? { position } : {}) },
    );
  }
  getCardColumn(projectId: number, columnId: number) {
    return this.request<any>('GET', `/buckets/${projectId}/card_tables/columns/${columnId}.json`);
  }
  createCardColumn(projectId: number, cardTableId: number, title: string, description?: string) {
    return this.request<any>(
      'POST',
      `/buckets/${projectId}/card_tables/${cardTableId}/columns.json`,
      { title, ...(description ? { description } : {}) },
    );
  }
  updateCardColumn(projectId: number, columnId: number, patch: Record<string, unknown>) {
    return this.request<any>(
      'PUT',
      `/buckets/${projectId}/card_tables/columns/${columnId}.json`,
      patch,
    );
  }
  /** Toggle the "on hold" section on a column. */
  setColumnOnHold(projectId: number, columnId: number, onHold: boolean) {
    return this.request<any>(
      onHold ? 'POST' : 'DELETE',
      `/buckets/${projectId}/card_tables/columns/${columnId}/on_hold.json`,
    );
  }
  setColumnColor(
    projectId: number,
    columnId: number,
    color: 'white' | 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'aqua' | 'purple' | 'gray' | 'pink' | 'brown',
  ) {
    return this.request<any>(
      'PUT',
      `/buckets/${projectId}/card_tables/columns/${columnId}/color.json`,
      { color },
    );
  }

  // My stuff
  //
  // Per the official BC3 docs:
  //   GET /my/assignments.json                       → {priorities, non_priorities}
  //   GET /my/assignments/due.json?scope=…           → todos filtered by due-date scope
  //   GET /my/assignments/completed.json             → completed todos
  //   GET /reports/todos/overdue.json                → {under_a_week_late, over_a_week_late, over_a_month_late, over_three_months_late}
  //   GET /reports/schedules/upcoming.json?window_starts_on&window_ends_on
  //   GET /reports/todos/assigned.json               → list of people who can have todos assigned
  //   GET /reports/todos/assigned/{id}.json          → todos assigned to a specific person

  /** Schedule entries + assignables within a rolling 7-day window (today → +7d). */
  mySchedule(windowDays: number = 7) {
    const start = new Date();
    const end = new Date(start.getTime() + windowDays * 24 * 60 * 60 * 1000);
    const q = new URLSearchParams({
      window_starts_on: start.toISOString().slice(0, 10),
      window_ends_on: end.toISOString().slice(0, 10),
    });
    return this.request<{
      schedule_entries: any[];
      recurring_schedule_entry_occurrences: any[];
      assignables: any[];
    }>('GET', `/reports/schedules/upcoming.json?${q.toString()}`);
  }

  /** Todos assigned to the current user, grouped into priorities / non_priorities. */
  myAssignments() {
    return this.request<{ priorities: any[]; non_priorities: any[] }>(
      'GET',
      `/my/assignments.json`,
    );
  }

  /** Todos assigned to the current user filtered by due-date scope. */
  myAssignmentsDue(
    scope: 'overdue' | 'due_today' | 'due_tomorrow' | 'due_later_this_week' | 'due_next_week' | 'due_later' = 'overdue',
  ) {
    return this.request<any[]>('GET', `/my/assignments/due.json?scope=${scope}`);
  }

  /** Completed todos assigned to the current user. */
  myAssignmentsCompleted() {
    return this.request<any[]>('GET', `/my/assignments/completed.json`);
  }

  /** All overdue todos across projects, grouped by how late they are. */
  myOverdue() {
    return this.request<{
      under_a_week_late: any[];
      over_a_week_late: any[];
      over_a_month_late: any[];
      over_three_months_late: any[];
    }>('GET', `/reports/todos/overdue.json`);
  }

  /** List of people who can have to-dos assigned to them. */
  reportTodosAssignable() {
    return this.request<any[]>('GET', `/reports/todos/assigned.json`);
  }

  /** All active, pending to-dos assigned to a specific person. */
  reportTodosAssignedToPerson(personId: number, groupBy: 'bucket' | 'date' = 'bucket') {
    return this.request<{ person: any; grouped_by: string; todos: any[] }>(
      'GET',
      `/reports/todos/assigned/${personId}.json?group_by=${groupBy}`,
    );
  }

  // ─────── Freshness primitives (Recordings + Events) ───────
  //
  // These are the deterministic building blocks for the report workflows in
  // `src/lib/reports.ts`. They hit native Basecamp endpoints that support
  // server-side sort + pagination, so the agent doesn't have to reassemble
  // "what's new in project X" from half-sorted list calls.

  /**
   * List recordings across the account, optionally filtered to one or more
   * projects (`bucket`) and one recording `type`. Default sort is
   * `updated_at desc`, so paginating with a `since` cutoff yields newest-first
   * activity until the cutoff is crossed.
   *
   * Edge cases:
   * - Empty `bucket` list is the same as omitting it (account-wide).
   * - `since` in the future returns an empty list (cutoff hits row 1).
   * - `maxPages` caps runaway walks; default 20 pages is ~300–2000 rows
   *   depending on Basecamp's geared page size for the query.
   */
  async listRecordings(params: {
    type: BcRecordingType;
    bucket?: number | number[];
    status?: 'active' | 'archived' | 'trashed';
    sort?: 'created_at' | 'updated_at';
    direction?: 'asc' | 'desc';
    since?: Date;
    maxPages?: number;
  }): Promise<Recording[]> {
    const qs = new URLSearchParams();
    qs.set('type', params.type);
    if (params.bucket !== undefined) {
      const list = Array.isArray(params.bucket) ? params.bucket : [params.bucket];
      if (list.length > 0) qs.set('bucket', list.join(','));
    }
    if (params.status) qs.set('status', params.status);
    qs.set('sort', params.sort ?? 'updated_at');
    qs.set('direction', params.direction ?? 'desc');

    const cutoff = params.since?.getTime();
    const sortField = params.sort ?? 'updated_at';
    const direction = params.direction ?? 'desc';
    // `until` only makes sense for the common "newest-first, stop when we
    // pass the cutoff" case. For ascending order we'd reject rows on the way
    // up, which is not useful — skip the optimization then.
    const until =
      cutoff !== undefined && direction === 'desc'
        ? (row: Recording) => {
            const raw = sortField === 'created_at' ? row.created_at : row.updated_at;
            if (!raw) return false;
            const t = Date.parse(raw);
            return Number.isFinite(t) && t < cutoff;
          }
        : undefined;

    return this.paginatedRequest<Recording>(`/projects/recordings.json?${qs.toString()}`, {
      until,
      maxPages: params.maxPages,
      label: `recordings.${params.type}${params.bucket !== undefined ? `.bucket=${Array.isArray(params.bucket) ? params.bucket.join('+') : params.bucket}` : ''}`,
    });
  }

  /**
   * Event-level timeline for a single recording (message, todo, card, etc.).
   * Returns `created`, `commented`, `completed`, `rescheduled`, etc. — one row
   * per action, newest-first.
   */
  async listEvents(
    projectId: number,
    recordingId: number,
    opts: { since?: Date; maxPages?: number } = {},
  ): Promise<BcEvent[]> {
    const cutoff = opts.since?.getTime();
    const until =
      cutoff !== undefined
        ? (row: BcEvent) => {
            const t = Date.parse(row.created_at);
            return Number.isFinite(t) && t < cutoff;
          }
        : undefined;
    return this.paginatedRequest<BcEvent>(
      `/buckets/${projectId}/recordings/${recordingId}/events.json`,
      { until, maxPages: opts.maxPages ?? 5, label: `events.${recordingId}` },
    );
  }

  /**
   * Messages on a board, walked newest-first and stopped at a cutoff. Uses
   * the Recordings API under the hood (filtered to `Message` + bucket) rather
   * than `/messages.json`, because the latter does not accept `sort=updated_at`
   * reliably across Basecamp accounts.
   */
  async listMessagesSorted(
    projectId: number,
    opts: { since?: Date; maxPages?: number } = {},
  ): Promise<Recording[]> {
    return this.listRecordings({
      type: 'Message',
      bucket: projectId,
      sort: 'updated_at',
      direction: 'desc',
      since: opts.since,
      maxPages: opts.maxPages ?? 10,
    });
  }

  // ─────────── Deterministic bulk pulls ("pull EVERYTHING") ───────────
  //
  // These methods exhaust pagination and fan out across sub-resources so the
  // agent gets a complete, deterministic snapshot in a single tool call — no
  // model-driven looping that quits after a couple of pages. Every aggregate
  // reports `incomplete` (a paginated walk hit the safety cap) and `errors`
  // (a sub-resource failed) so partial results are never mistaken for complete.

  /** Every project on the account across the requested statuses, de-duplicated. */
  async pullAllProjects(
    statuses: Array<'active' | 'archived' | 'trashed'> = ['active'],
  ): Promise<{ projects: any[]; incomplete: boolean; errors: Array<{ scope: string; error: string }> }> {
    const errors: Array<{ scope: string; error: string }> = [];
    const byId = new Map<number, any>();
    let incomplete = false;
    for (const status of statuses) {
      try {
        const walk = await this.collectAll<any>(
          `/projects.json${status === 'active' ? '' : `?status=${status}`}`,
          `pull.projects.${status}`,
        );
        incomplete = incomplete || walk.incomplete;
        for (const p of walk.rows) if (p && typeof p.id === 'number') byId.set(p.id, p);
      } catch (err) {
        errors.push({ scope: `projects.${status}`, error: describeError(err) });
      }
    }
    return { projects: [...byId.values()], incomplete, errors };
  }

  /**
   * Every card in a card table, across every column AND the "on hold" /
   * triage columns the table exposes via its `lists` array. One slow/failed
   * column is captured in `errors` instead of aborting the whole pull.
   */
  async pullAllCardsInTable(
    projectId: number,
    cardTableId: number,
  ): Promise<{
    cardTableId: number;
    columns: Array<{ id: number; title: string; cardsCount: number; incomplete: boolean }>;
    cards: any[];
    totalCards: number;
    incomplete: boolean;
    errors: Array<{ scope: string; error: string }>;
  }> {
    const table = await this.getCardTable(projectId, cardTableId);
    // BC3 calls columns "lists" on the card table payload.
    const columns: any[] = Array.isArray(table?.lists) ? table.lists : [];
    const errors: Array<{ scope: string; error: string }> = [];

    const perColumn = await mapWithConcurrency(columns, 4, async (col) => {
      const id = Number(col?.id);
      const title = String(col?.title ?? '');
      if (!Number.isFinite(id)) {
        errors.push({ scope: `column.${col?.id}`, error: 'معرّف عمود غير صالح' });
        return { id: 0, title, cards: [] as any[], incomplete: false };
      }
      try {
        const walk = await this.collectAll<any>(
          `/buckets/${projectId}/card_tables/lists/${id}/cards.json`,
          `pull.cards.col.${id}`,
        );
        return { id, title, cards: walk.rows, incomplete: walk.incomplete };
      } catch (err) {
        errors.push({ scope: `column.${id} (${title})`, error: describeError(err) });
        return { id, title, cards: [] as any[], incomplete: true };
      }
    });

    const cards = perColumn.flatMap((c) => c.cards);
    return {
      cardTableId,
      columns: perColumn.map((c) => ({
        id: c.id,
        title: c.title,
        cardsCount: c.cards.length,
        incomplete: c.incomplete,
      })),
      cards,
      totalCards: cards.length,
      incomplete: perColumn.some((c) => c.incomplete),
      errors,
    };
  }

  /**
   * Every project a given person is a member of. Basecamp has no
   * "projects for person" endpoint, so this is computed deterministically:
   * pull all projects, then check each project's people list for the person.
   * Per-project read failures are captured, not fatal.
   */
  async pullProjectsForPerson(
    personId: number,
    opts: { includeArchived?: boolean } = {},
  ): Promise<{
    personId: number;
    projects: Array<{ id: number; name: string; status: string }>;
    scanned: number;
    incomplete: boolean;
    errors: Array<{ scope: string; error: string }>;
  }> {
    const statuses: Array<'active' | 'archived'> = opts.includeArchived
      ? ['active', 'archived']
      : ['active'];
    const all = await this.pullAllProjects(statuses);
    const errors = [...all.errors];

    const flags = await mapWithConcurrency(all.projects, 5, async (p) => {
      try {
        const people = await this.listPeopleInProject(p.id);
        return Array.isArray(people) && people.some((person) => Number(person?.id) === personId);
      } catch (err) {
        errors.push({ scope: `project.${p.id} (${p?.name ?? ''})`, error: describeError(err) });
        return false;
      }
    });

    const projects = all.projects
      .filter((_p, i) => flags[i])
      .map((p) => ({ id: p.id, name: String(p.name ?? ''), status: String(p.status ?? 'active') }));

    return {
      personId,
      projects,
      scanned: all.projects.length,
      // Incomplete if we couldn't enumerate all projects, or any membership
      // check failed (the person might belong to a project we couldn't read).
      incomplete: all.incomplete || errors.length > 0,
      errors,
    };
  }

  /**
   * A complete snapshot of one project: people, every to-do list with all its
   * to-dos (active + completed), every message, and every card across the
   * Kanban board. Each section is fetched independently so one failure yields a
   * partial dump with a recorded error rather than nothing.
   */
  async pullProjectEverything(projectId: number): Promise<{
    project: { id: number; name: string };
    people: any[];
    todoLists: Array<{ id: number; name: string; active: any[]; completed: any[] }>;
    messages: any[];
    cards: Awaited<ReturnType<BasecampClient['pullAllCardsInTable']>> | null;
    counts: { people: number; todoLists: number; todos: number; messages: number; cards: number };
    incomplete: boolean;
    errors: Array<{ scope: string; error: string }>;
  }> {
    const project = await this.getProject(projectId);
    const dock: any[] = Array.isArray(project?.dock) ? project.dock : [];
    const tool = (name: string) =>
      dock.find((d) => d?.name === name && d?.enabled !== false);
    const errors: Array<{ scope: string; error: string }> = [];
    let incomplete = false;

    // People
    let people: any[] = [];
    try {
      people = await this.listPeopleInProject(projectId);
    } catch (err) {
      errors.push({ scope: 'people', error: describeError(err) });
      incomplete = true;
    }

    // To-do lists + their to-dos (active + completed)
    let todoLists: Array<{ id: number; name: string; active: any[]; completed: any[] }> = [];
    const todoset = tool('todoset');
    if (todoset?.id) {
      try {
        const lists = await this.listTodoLists(projectId, todoset.id);
        todoLists = await mapWithConcurrency(lists, 4, async (list: any) => {
          const id = Number(list?.id);
          const name = String(list?.name ?? list?.title ?? '');
          const entry = { id, name, active: [] as any[], completed: [] as any[] };
          if (!Number.isFinite(id)) return entry;
          try {
            entry.active = await this.listTodos(projectId, id, 'active');
          } catch (err) {
            errors.push({ scope: `todolist.${id}.active`, error: describeError(err) });
            incomplete = true;
          }
          try {
            entry.completed = await this.listTodos(projectId, id, 'completed');
          } catch (err) {
            errors.push({ scope: `todolist.${id}.completed`, error: describeError(err) });
            incomplete = true;
          }
          return entry;
        });
      } catch (err) {
        errors.push({ scope: 'todolists', error: describeError(err) });
        incomplete = true;
      }
    }

    // Messages
    let messages: any[] = [];
    const board = tool('message_board');
    if (board?.id) {
      try {
        messages = await this.listMessages(projectId, board.id);
      } catch (err) {
        errors.push({ scope: 'messages', error: describeError(err) });
        incomplete = true;
      }
    }

    // Cards (Kanban)
    let cards: Awaited<ReturnType<BasecampClient['pullAllCardsInTable']>> | null = null;
    const kanban = tool('kanban_board');
    if (kanban?.id) {
      try {
        cards = await this.pullAllCardsInTable(projectId, kanban.id);
        if (cards.incomplete) incomplete = true;
        for (const e of cards.errors) errors.push({ scope: `cards.${e.scope}`, error: e.error });
      } catch (err) {
        errors.push({ scope: 'cards', error: describeError(err) });
        incomplete = true;
      }
    }

    const todoCount = todoLists.reduce((n, l) => n + l.active.length + l.completed.length, 0);
    return {
      project: { id: projectId, name: String(project?.name ?? '') },
      people,
      todoLists,
      messages,
      cards,
      counts: {
        people: people.length,
        todoLists: todoLists.length,
        todos: todoCount,
        messages: messages.length,
        cards: cards?.totalCards ?? 0,
      },
      incomplete,
      errors,
    };
  }
}

export async function completeOAuthAndStore(
  sid: string,
  code: string,
): Promise<StoredBasecampSession> {
  const token = await exchangeCodeForToken(code);
  const auth = await fetchAuthorization(token.access_token);
  const bc3 = auth.accounts.find((a) => a.product === 'bc3');
  if (!bc3) throw new Error('No Basecamp 4 account is linked to this login');
  const expiresAt = new Date(Date.now() + token.expires_in * 1000);
  const stored: StoredBasecampSession = {
    sid,
    accountId: bc3.id,
    accountName: bc3.name,
    accountHref: bc3.app_href,
    userId: auth.identity.id,
    userName: `${auth.identity.first_name} ${auth.identity.last_name}`.trim(),
    userEmailAddress: auth.identity.email_address,
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresAt,
  };
  await saveSession(stored);
  return stored;
}
