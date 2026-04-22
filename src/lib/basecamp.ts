import 'server-only';
import { env } from './env';
import { loadSession, saveSession, updateTokens, type StoredBasecampSession } from './vault';

const LAUNCHPAD = 'https://launchpad.37signals.com';
const API_BASE = 'https://3.basecampapi.com';

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
 * Parse the `rel="next"` target out of an RFC-5988 `Link` header.
 *
 * Basecamp's response looks like:
 *   Link: <https://3.basecampapi.com/…/projects/recordings.json?page=2>; rel="next"
 * Multiple links may appear comma-separated. We only care about `next`.
 *
 * Returns `null` for missing header, malformed entries, or no next link.
 * Defensive against quoted/unquoted rel values and extra spaces.
 */
function parseNextLink(header: string | null): string | null {
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
  private async paginatedRequest<T>(
    path: string,
    opts: { until?: (row: T) => boolean; maxPages?: number; label?: string } = {},
  ): Promise<T[]> {
    const maxPages = Math.max(1, opts.maxPages ?? 20);
    const label = opts.label ?? `paginated ${path.split('?')[0]}`;
    const started = Date.now();
    const out: T[] = [];
    let nextPath: string | null = path;
    let page = 0;
    let totalCount: string | null = null;
    let stop: 'done' | 'cutoff' | 'max_pages' | 'empty' = 'done';

    while (nextPath && page < maxPages) {
      page += 1;
      const { body, headers } = await this.requestWithHeaders<T[]>('GET', nextPath);
      if (page === 1) totalCount = headers.get('x-total-count');
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
    return out;
  }

  // Projects
  //
  // Per the official Basecamp 3 API docs, `GET /projects.json` returns active
  // projects by default; the `status` query param is only valid for values
  // `archived` or `trashed`. Sending `?status=active` returns 400.
  listProjects(status: 'active' | 'archived' | 'trashed' = 'active') {
    const q = status === 'active' ? '' : `?status=${status}`;
    return this.request<any[]>('GET', `/projects.json${q}`);
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
    return this.request<any[]>('GET', `/people.json`);
  }
  listPeopleInProject(projectId: number) {
    return this.request<any[]>('GET', `/projects/${projectId}/people.json`);
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
    return this.request<any[]>('GET', `/buckets/${projectId}/todosets/${todoSetId}/todolists.json`);
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
    return this.request<any[]>('GET', `/buckets/${projectId}/todolists/${todoListId}/todos.json${q}`);
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
    return this.request<any[]>('GET', `/buckets/${projectId}/message_boards/${boardId}/messages.json`);
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
    return this.request<any[]>('GET', `/buckets/${projectId}/recordings/${recordingId}/comments.json`);
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
  /** Paginated cards in a given column/list. */
  listCardsInColumn(projectId: number, columnId: number) {
    return this.request<any[]>('GET', `/buckets/${projectId}/card_tables/lists/${columnId}/cards.json`);
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
