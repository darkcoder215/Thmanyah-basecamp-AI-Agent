import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BasecampClient, parseNextLink, describeError, BasecampError } from './basecamp';

// ───────────────────────── test helpers ─────────────────────────

const ACCOUNT_ID = 12345;
const API = `https://3.basecampapi.com/${ACCOUNT_ID}`;

function fakeSession() {
  return {
    sid: 'sid-1',
    accountId: ACCOUNT_ID,
    accountName: 'Acct',
    accountHref: null,
    userId: 1,
    userName: 'User',
    userEmailAddress: 'u@example.com',
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    // Far in the future so ensureFreshToken never triggers a refresh fetch.
    expiresAt: new Date(Date.now() + 3_600_000),
  } as any;
}

function client() {
  return new BasecampClient(fakeSession());
}

type RouteReply = { status?: number; body?: unknown; link?: string; totalCount?: number };

function reply(r: RouteReply): Response {
  const status = r.status ?? 200;
  const headers = new Headers({ 'content-type': 'application/json' });
  if (r.link) headers.set('link', r.link);
  if (r.totalCount != null) headers.set('x-total-count', String(r.totalCount));
  // Tiny retry-after so the 5xx/429 backoff doesn't stall the test suite.
  if (status === 429 || status >= 500) headers.set('retry-after', '1');
  const payload = status === 204 ? null : JSON.stringify(r.body ?? null);
  return new Response(payload, { status, headers });
}

/**
 * Install a fetch mock that dispatches on (urlSubstring, method) → reply.
 * Each route may be a single reply or an array consumed call-by-call (for
 * retry tests). The matcher is order-sensitive: first match wins.
 */
function mockFetch(
  routes: Array<{ url: string; method?: string; reply: RouteReply | RouteReply[] }>,
) {
  const counts: Record<string, number> = {};
  const fn = vi.fn(async (input: any, init: any) => {
    const url = String(input);
    const method = (init?.method ?? 'GET').toUpperCase();
    for (const route of routes) {
      if (!url.includes(route.url)) continue;
      if (route.method && route.method.toUpperCase() !== method) continue;
      const key = `${route.method ?? 'GET'} ${route.url}`;
      const n = (counts[key] = (counts[key] ?? 0) + 1);
      const r = Array.isArray(route.reply)
        ? route.reply[Math.min(n - 1, route.reply.length - 1)]
        : route.reply;
      return reply(r);
    }
    throw new Error(`Unmatched fetch: ${method} ${url}`);
  });
  vi.stubGlobal('fetch', fn);
  return { fn, counts };
}

beforeEach(() => {
  vi.restoreAllMocks();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

// ───────────────────────── parseNextLink ─────────────────────────

describe('parseNextLink', () => {
  it('returns null for missing/empty headers', () => {
    expect(parseNextLink(null)).toBeNull();
    expect(parseNextLink('')).toBeNull();
  });

  it('extracts a single rel="next" target', () => {
    expect(parseNextLink('<https://x/p?page=2>; rel="next"')).toBe('https://x/p?page=2');
  });

  it('picks next among multiple links', () => {
    const h = '<https://x/p?page=1>; rel="prev", <https://x/p?page=3>; rel="next"';
    expect(parseNextLink(h)).toBe('https://x/p?page=3');
  });

  it('handles unquoted rel values', () => {
    expect(parseNextLink('<https://x/p?page=2>; rel=next')).toBe('https://x/p?page=2');
  });

  it('does not split on commas inside the URL', () => {
    const h = '<https://x/p?bucket=1,2,3&page=2>; rel="next"';
    expect(parseNextLink(h)).toBe('https://x/p?bucket=1,2,3&page=2');
  });

  it('returns null when there is no next (only prev/last)', () => {
    expect(parseNextLink('<https://x/p?page=1>; rel="prev"')).toBeNull();
  });

  it('returns null for malformed entries', () => {
    expect(parseNextLink('garbage; rel="next"')).toBeNull();
  });
});

// ───────────────────────── describeError ─────────────────────────

describe('describeError', () => {
  it('maps a BasecampError to its Arabic message', () => {
    const e = new BasecampError('x', 404, 'not_found');
    expect(describeError(e)).toBe(e.arabicMessage);
  });
  it('falls back to Error.message and a generic string', () => {
    expect(describeError(new Error('boom'))).toBe('boom');
    expect(describeError('weird')).toBe('خطأ غير معروف');
  });
});

// ───────────────────── exhaustive pagination ─────────────────────

describe('pagination exhausts every page', () => {
  it('follows rel="next" across many pages until it runs out', async () => {
    // Most-specific URLs first — the matcher is substring + first-match.
    const { fn } = mockFetch([
      { url: '/projects.json?page=3', reply: { body: [{ id: 5 }] } },
      { url: '/projects.json?page=2', reply: { body: [{ id: 3 }, { id: 4 }], link: `<${API}/projects.json?page=3>; rel="next"` } },
      { url: '/projects.json', reply: { body: [{ id: 1 }, { id: 2 }], link: `<${API}/projects.json?page=2>; rel="next"` } },
    ]);
    const projects = await client().listProjects('active');
    expect(projects.map((p: any) => p.id)).toEqual([1, 2, 3, 4, 5]);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('stops cleanly on an empty page', async () => {
    mockFetch([{ url: '/projects.json', reply: { body: [] } }]);
    expect(await client().listProjects('active')).toEqual([]);
  });

  it('breaks the loop if next points back at the current page', async () => {
    // Without the self-loop guard this would spin until the 1000-page cap.
    const { fn } = mockFetch([
      { url: '/projects.json?page=2', reply: { body: [{ id: 2 }], link: `<${API}/projects.json?page=2>; rel="next"` } },
      { url: '/projects.json', reply: { body: [{ id: 1 }], link: `<${API}/projects.json?page=2>; rel="next"` } },
    ]);
    const projects = await client().listProjects('active');
    expect(projects.map((p: any) => p.id)).toEqual([1, 2]);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

// ───────────────────────── retry behaviour ─────────────────────────

describe('request retries', () => {
  it('retries 5xx then succeeds', async () => {
    const { fn } = mockFetch([
      { url: '/projects/7.json', reply: [{ status: 500, body: { error: 'oops' } }, { status: 200, body: { id: 7 } }] },
    ]);
    const p = await client().getProject(7);
    expect(p).toEqual({ id: 7 });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('does NOT retry a 404 and throws a typed not_found error', async () => {
    const { fn } = mockFetch([{ url: '/projects/9.json', reply: { status: 404, body: {} } }]);
    await expect(client().getProject(9)).rejects.toMatchObject({
      name: 'BasecampError',
      kind: 'not_found',
      status: 404,
    });
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

// ─────────────────── deterministic bulk pulls ───────────────────

describe('pullProjectsForPerson', () => {
  it('returns only projects the person is a member of, and records read failures', async () => {
    mockFetch([
      { url: '/projects.json', reply: { body: [{ id: 1, name: 'A', status: 'active' }, { id: 2, name: 'B', status: 'active' }, { id: 3, name: 'C', status: 'active' }] } },
      { url: '/projects/1/people.json', reply: { body: [{ id: 99 }, { id: 50 }] } },
      { url: '/projects/2/people.json', reply: { status: 403, body: {} } },
      { url: '/projects/3/people.json', reply: { body: [{ id: 99 }] } },
    ]);
    const res = await client().pullProjectsForPerson(99);
    expect(res.projects.map((p) => p.id).sort()).toEqual([1, 3]);
    expect(res.scanned).toBe(3);
    expect(res.errors).toHaveLength(1);
    expect(res.errors[0].scope).toContain('project.2');
    // A project we couldn't read might contain the person → result is partial.
    expect(res.incomplete).toBe(true);
  });

  it('is complete with no errors when every project reads cleanly', async () => {
    mockFetch([
      { url: '/projects.json', reply: { body: [{ id: 1, name: 'A', status: 'active' }] } },
      { url: '/projects/1/people.json', reply: { body: [{ id: 99 }] } },
    ]);
    const res = await client().pullProjectsForPerson(99);
    expect(res.projects).toHaveLength(1);
    expect(res.incomplete).toBe(false);
    expect(res.errors).toHaveLength(0);
  });
});

describe('pullAllCardsInTable', () => {
  it('aggregates cards across all columns and isolates a failing column', async () => {
    mockFetch([
      { url: '/card_tables/10.json', reply: { body: { id: 10, lists: [{ id: 100, title: 'Todo' }, { id: 200, title: 'Doing' }] } } },
      { url: '/card_tables/lists/100/cards.json', reply: { body: [{ id: 1, title: 'c1' }, { id: 2, title: 'c2' }] } },
      { url: '/card_tables/lists/200/cards.json', reply: { status: 404, body: {} } },
    ]);
    const res = await client().pullAllCardsInTable(5, 10);
    expect(res.totalCards).toBe(2);
    expect(res.columns).toHaveLength(2);
    expect(res.columns.find((c) => c.id === 100)?.cardsCount).toBe(2);
    expect(res.errors).toHaveLength(1);
    expect(res.incomplete).toBe(true);
  });

  it('walks multiple pages of cards within a single column', async () => {
    mockFetch([
      { url: '/card_tables/10.json', reply: { body: { id: 10, lists: [{ id: 100, title: 'Todo' }] } } },
      { url: '/card_tables/lists/100/cards.json?page=2', reply: { body: [{ id: 3 }] } },
      { url: '/card_tables/lists/100/cards.json', reply: { body: [{ id: 1 }, { id: 2 }], link: `<${API}/buckets/5/card_tables/lists/100/cards.json?page=2>; rel="next"` } },
    ]);
    const res = await client().pullAllCardsInTable(5, 10);
    expect(res.totalCards).toBe(3);
    expect(res.incomplete).toBe(false);
  });
});

describe('pullAllProjects', () => {
  it('de-duplicates projects that appear under multiple statuses', async () => {
    mockFetch([
      { url: '/projects.json?status=archived', reply: { body: [{ id: 2, name: 'B' }] } },
      { url: '/projects.json', reply: { body: [{ id: 1, name: 'A' }, { id: 2, name: 'B' }] } },
    ]);
    const res = await client().pullAllProjects(['active', 'archived']);
    expect(res.projects.map((p) => p.id).sort()).toEqual([1, 2]);
    expect(res.incomplete).toBe(false);
  });
});

describe('pullProjectEverything', () => {
  it('assembles people, todos, messages and cards from the dock, tolerating a missing tool', async () => {
    mockFetch([
      {
        url: '/projects/5.json',
        reply: {
          body: {
            id: 5,
            name: 'Proj',
            dock: [
              { name: 'todoset', id: 70, enabled: true },
              { name: 'message_board', id: 80, enabled: true },
              { name: 'kanban_board', id: 90, enabled: true },
              { name: 'chat', id: 95, enabled: false },
            ],
          },
        },
      },
      { url: '/projects/5/people.json', reply: { body: [{ id: 99, name: 'P' }] } },
      { url: '/todosets/70/todolists.json', reply: { body: [{ id: 700, name: 'List' }] } },
      { url: '/todolists/700/todos.json?completed=true', reply: { body: [{ id: 2, content: 'done' }] } },
      { url: '/todolists/700/todos.json', reply: { body: [{ id: 1, content: 'open' }] } },
      { url: '/message_boards/80/messages.json', reply: { body: [{ id: 11, subject: 'Hi' }] } },
      { url: '/card_tables/90.json', reply: { body: { id: 90, lists: [{ id: 900, title: 'Col' }] } } },
      { url: '/card_tables/lists/900/cards.json', reply: { body: [{ id: 21, title: 'card' }] } },
    ]);
    const d = await client().pullProjectEverything(5);
    expect(d.counts).toEqual({ people: 1, todoLists: 1, todos: 2, messages: 1, cards: 1 });
    expect(d.incomplete).toBe(false);
    expect(d.errors).toHaveLength(0);
    expect(d.todoLists[0].active).toHaveLength(1);
    expect(d.todoLists[0].completed).toHaveLength(1);
  });

  it('records a section error and marks the dump incomplete', async () => {
    mockFetch([
      {
        url: '/projects/5.json',
        reply: { body: { id: 5, name: 'Proj', dock: [{ name: 'message_board', id: 80, enabled: true }] } },
      },
      { url: '/projects/5/people.json', reply: { status: 403, body: {} } },
      { url: '/message_boards/80/messages.json', reply: { body: [{ id: 11, subject: 'Hi' }] } },
    ]);
    const d = await client().pullProjectEverything(5);
    expect(d.counts.messages).toBe(1);
    expect(d.incomplete).toBe(true);
    expect(d.errors.some((e) => e.scope === 'people')).toBe(true);
  });
});
