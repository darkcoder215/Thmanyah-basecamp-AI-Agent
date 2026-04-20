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
    let lastError: unknown;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      let res: Response;
      try {
        res = await fetch(url, {
          method,
          headers,
          body: body === undefined ? undefined : JSON.stringify(body),
          cache: 'no-store',
        });
      } catch (err) {
        lastError = new BasecampError(
          err instanceof Error ? err.message : 'network error',
          0,
          'network',
        );
        if (attempt < MAX_ATTEMPTS) {
          await sleep(attempt * 400);
          continue;
        }
        throw lastError;
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
  listProjects(status: 'active' | 'archived' | 'trashed' = 'active') {
    return this.request<any[]>('GET', `/projects.json?status=${status}`);
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

  // My stuff
  mySchedule() {
    return this.request<any>('GET', `/my/schedule.json`);
  }
  myAssignments() {
    return this.request<any>('GET', `/my/assignments.json`);
  }
  myOverdue() {
    return this.request<any>('GET', `/my/overdue.json`);
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
