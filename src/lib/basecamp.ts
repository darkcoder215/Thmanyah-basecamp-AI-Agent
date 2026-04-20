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
        if (res.status === 204) return undefined as T;
        const text = await res.text();
        return text ? (JSON.parse(text) as T) : (undefined as T);
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
  listPeopleInAccount() {
    return this.request<any[]>('GET', `/people.json`);
  }
  listPeopleInProject(projectId: number) {
    return this.request<any[]>('GET', `/projects/${projectId}/people.json`);
  }
  grantPeopleToProject(projectId: number, grantIds: number[]) {
    return this.request<any>('PUT', `/projects/${projectId}/people/users.json`, { grant: grantIds });
  }
  revokePeopleFromProject(projectId: number, revokeIds: number[]) {
    return this.request<any>('PUT', `/projects/${projectId}/people/users.json`, { revoke: revokeIds });
  }
  me() {
    return this.request<any>('GET', `/my/profile.json`);
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
