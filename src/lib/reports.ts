import 'server-only';

import { BasecampClient, BasecampError } from './basecamp';
import type { BcRecordingType, Recording } from './basecamp';

// ─────────────────────── Defaults / caps ───────────────────────
//
// Kept in one place so the tool wrappers can reference them when building
// Zod schemas and human-facing tool descriptions.

export const DEFAULT_PROJECT_REPORT_TYPES: BcRecordingType[] = [
  'Message',
  'Todo',
  'Comment',
  'Schedule::Entry',
];

export const DEFAULT_PERSON_REPORT_TYPES: BcRecordingType[] = [
  'Message',
  'Todo',
  'Comment',
];

export const DEFAULT_ACCOUNT_PULSE_TYPES: BcRecordingType[] = [
  'Message',
  'Todo',
  'Comment',
  'Schedule::Entry',
];

/** Cap on pages Recordings walks per report type. 20 × geared page size ≈ 300–2000 rows. */
const MAX_REPORT_PAGES_PER_TYPE = 20;
/** Recent activity array cap (keeps the JSON payload well under 8 KB). */
const MAX_RECENT_ACTIVITY_ROWS = 30;
/** Cap on `top_people` / `people_active` lists. */
const MAX_PEOPLE_ROWS = 10;
/** Cap on per-project project_touched lists. */
const MAX_PROJECTS_ROWS = 15;
/** Default since-window per report if caller omits `since`. */
const DEFAULT_SINCE_DAYS_PROJECT = 7;
const DEFAULT_SINCE_DAYS_PERSON = 14;
const DEFAULT_SINCE_HOURS_ACCOUNT = 24;

/** Truncate an excerpt so one report fits comfortably inside MAX_TOOL_OUTPUT_CHARS. */
const MAX_EXCERPT_CHARS = 200;
/** Truncate a recording title (some message titles run long). */
const MAX_TITLE_CHARS = 120;

// ─────────────────────── Helpers ───────────────────────

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

function trimText(value: string | undefined | null, max: number): string | undefined {
  if (!value) return undefined;
  // Strip HTML tags lightly — excerpts come from rich-text content and we
  // don't want angle brackets in Arabic prose. Keeps entities like &amp; as-is
  // because the UI will decode them when rendering.
  const stripped = String(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!stripped) return undefined;
  return stripped.length > max ? `${stripped.slice(0, Math.max(0, max - 1))}…` : stripped;
}

function errorSummary(err: unknown): string {
  if (err instanceof BasecampError) return `${err.kind}:${err.status || 0}`;
  if (err instanceof Error) return (err.message || err.name).slice(0, 140);
  try {
    return String(err).slice(0, 140);
  } catch {
    return 'unknown';
  }
}

function safeDate(value: string | Date | undefined, fallback: Date): Date {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value : fallback;
  if (typeof value === 'string') {
    const t = Date.parse(value);
    if (Number.isFinite(t)) return new Date(t);
  }
  return fallback;
}

function iso(d: Date): string {
  return d.toISOString();
}

function excerptOf(r: Recording): string | undefined {
  return trimText(r.excerpt ?? r.content ?? undefined, MAX_EXCERPT_CHARS);
}

function titleOf(r: Recording): string {
  return trimText(r.title, MAX_TITLE_CHARS) ?? '(بدون عنوان)';
}

function bucketNameOf(r: Recording): string | undefined {
  return r.bucket?.name ? String(r.bucket.name) : undefined;
}

type TypeCounts = Record<string, number>;

// ─────────────────────── Project report ───────────────────────

export type ProjectReport = {
  project: {
    id: number;
    name: string;
    description?: string;
    url?: string;
    status?: string;
  };
  since: string;
  generated_at: string;
  summary: {
    new_items: TypeCounts;
    total: number;
    active_people: number;
  };
  todo_progress?: {
    completed: number;
    remaining: number;
    completed_ratio: number;
    todolists_count: number;
  };
  recent_activity: Array<{
    type: string;
    id: number;
    title: string;
    updated_at: string;
    creator?: string;
    url?: string;
    excerpt?: string;
  }>;
  people_active: Array<{ id: number; name: string; count: number }>;
  fetch_stats: {
    types_fetched: string[];
    types_failed: Array<{ type: string; error: string }>;
    duration_ms: number;
  };
};

/**
 * Deterministic "what's new in project X" builder.
 *
 * Fans out a parallel Recordings call per type, each paginated newest-first
 * until the `since` cutoff is crossed. Merges results, attaches todoset
 * progress, and returns a compact payload sized to fit inside
 * `MAX_TOOL_OUTPUT_CHARS` (8 KB) after JSON serialization.
 *
 * Partial failures: if some types fail (e.g. rate limit, transient 5xx),
 * the report is still returned with the successful types, and the failures
 * are listed in `fetch_stats.types_failed`. Only a failure on `getProject`
 * itself aborts the report — we need at least the project metadata.
 */
export async function buildProjectReport(
  client: BasecampClient,
  projectId: number,
  opts: {
    since?: Date;
    types?: BcRecordingType[];
    includeTodoProgress?: boolean;
  } = {},
): Promise<ProjectReport> {
  if (!Number.isInteger(projectId) || projectId <= 0) {
    throw new Error(`buildProjectReport: invalid project_id ${projectId}`);
  }

  const started = Date.now();
  const since = safeDate(opts.since, daysAgo(DEFAULT_SINCE_DAYS_PROJECT));
  const types = (opts.types && opts.types.length > 0 ? opts.types : DEFAULT_PROJECT_REPORT_TYPES).slice(0, 8);
  const includeTodoProgress = opts.includeTodoProgress !== false;

  console.info(
    `[report.project] start project_id=${projectId} since=${iso(since)} types=[${types.join(',')}] todo_progress=${includeTodoProgress}`,
  );

  // Fail fast if the project is unreachable — no point continuing.
  let project: any;
  try {
    project = await client.getProject(projectId);
  } catch (err) {
    console.warn(`[report.project] getProject failed project_id=${projectId} err=${errorSummary(err)}`);
    throw err;
  }

  // Parallel fan-out. `allSettled` so a single failed type doesn't sink it.
  const recordingResults = await Promise.allSettled(
    types.map((t) =>
      client.listRecordings({
        type: t,
        bucket: projectId,
        sort: 'updated_at',
        direction: 'desc',
        since,
        maxPages: MAX_REPORT_PAGES_PER_TYPE,
      }),
    ),
  );

  const todoProgress = await fetchTodoProgress(client, projectId, project, includeTodoProgress);

  const typesFetched: string[] = [];
  const typesFailed: Array<{ type: string; error: string }> = [];
  const allRows: Recording[] = [];
  const countsByType: TypeCounts = {};
  recordingResults.forEach((res, idx) => {
    const t = types[idx];
    if (res.status === 'fulfilled') {
      typesFetched.push(t);
      countsByType[t] = res.value.length;
      for (const row of res.value) allRows.push(row);
    } else {
      typesFailed.push({ type: t, error: errorSummary(res.reason) });
      console.warn(`[report.project] type_failed type=${t} err=${errorSummary(res.reason)}`);
    }
  });

  allRows.sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));

  const peopleCounter = new Map<number, { name: string; count: number }>();
  for (const r of allRows) {
    const pid = r.creator?.id;
    if (!pid) continue;
    const name = r.creator?.name?.trim() || `#${pid}`;
    const prev = peopleCounter.get(pid);
    if (prev) prev.count += 1;
    else peopleCounter.set(pid, { name, count: 1 });
  }

  const recent = allRows.slice(0, MAX_RECENT_ACTIVITY_ROWS).map((r) => ({
    type: r.type,
    id: r.id,
    title: titleOf(r),
    updated_at: r.updated_at,
    creator: r.creator?.name,
    url: r.app_url ?? r.url,
    excerpt: excerptOf(r),
  }));

  const peopleActive = [...peopleCounter.entries()]
    .map(([id, v]) => ({ id, name: v.name, count: v.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_PEOPLE_ROWS);

  const report: ProjectReport = {
    project: {
      id: Number(project?.id ?? projectId),
      name: String(project?.name ?? `#${projectId}`),
      description: trimText(project?.description, 300),
      url: project?.app_url ?? project?.url,
      status: project?.status,
    },
    since: iso(since),
    generated_at: iso(new Date()),
    summary: {
      new_items: countsByType,
      total: allRows.length,
      active_people: peopleCounter.size,
    },
    todo_progress: todoProgress,
    recent_activity: recent,
    people_active: peopleActive,
    fetch_stats: {
      types_fetched: typesFetched,
      types_failed: typesFailed,
      duration_ms: Date.now() - started,
    },
  };

  console.info(
    `[report.project] done project_id=${projectId} total=${report.summary.total} ok=${typesFetched.length} fail=${typesFailed.length} dur_ms=${report.fetch_stats.duration_ms}`,
  );
  return report;
}

async function fetchTodoProgress(
  client: BasecampClient,
  projectId: number,
  project: any,
  include: boolean,
): Promise<ProjectReport['todo_progress']> {
  if (!include) return undefined;
  const dock = Array.isArray(project?.dock) ? project.dock : [];
  const todosetDock = dock.find(
    (d: any) => d && d.name === 'todoset' && d.enabled !== false && typeof d.id === 'number',
  );
  if (!todosetDock?.id) {
    console.info(`[report.project] todoset dock entry missing for project_id=${projectId}`);
    return undefined;
  }
  try {
    const ts = await client.getTodoSet(projectId, todosetDock.id);
    const completed = Math.max(0, Number(ts?.completed_todos_count ?? 0));
    const remaining = Math.max(0, Number(ts?.remaining_todos_count ?? 0));
    const total = completed + remaining;
    return {
      completed,
      remaining,
      completed_ratio: total > 0 ? Number((completed / total).toFixed(3)) : 0,
      todolists_count: Math.max(0, Number(ts?.todolists_count ?? 0)),
    };
  } catch (err) {
    console.warn(`[report.project] todoset lookup failed project_id=${projectId} err=${errorSummary(err)}`);
    return undefined;
  }
}

// ─────────────────────── Person report ───────────────────────

export type PersonReport = {
  person: {
    id: number;
    name?: string;
    email_address?: string;
    title?: string;
  };
  since: string;
  generated_at: string;
  authored: {
    total: number;
    counts_by_type: TypeCounts;
    projects_touched: Array<{ id: number; name?: string; count: number }>;
    recent: Array<{
      type: string;
      id: number;
      title: string;
      updated_at: string;
      bucket?: string;
      url?: string;
      excerpt?: string;
    }>;
  };
  assigned?: {
    total_active: number;
    overdue: number;
    by_project: Array<{ id: number; name?: string; count: number }>;
    samples: Array<{ id: number; content: string; due_on?: string; bucket?: string; url?: string }>;
  };
  fetch_stats: {
    types_fetched: string[];
    types_failed: Array<{ type: string; error: string }>;
    rows_scanned: number;
    duration_ms: number;
  };
};

/**
 * Deterministic "what did person P do recently" builder.
 *
 * Basecamp has no native creator filter, so we walk Recordings (no bucket
 * filter) per type newest-first, filter client-side on `creator.id`, and
 * stop paginating at `since`. The walker will typically go further than the
 * filtered results suggest — this is expected and fine; pagination is still
 * bounded by `MAX_REPORT_PAGES_PER_TYPE`.
 *
 * Active assignments come from `/reports/todos/assigned/{id}.json` which IS
 * natively person-scoped — one call, grouped by bucket.
 */
export async function buildPersonReport(
  client: BasecampClient,
  personId: number,
  opts: {
    since?: Date;
    types?: BcRecordingType[];
    includeAssignments?: boolean;
    maxPagesPerType?: number;
  } = {},
): Promise<PersonReport> {
  if (!Number.isInteger(personId) || personId <= 0) {
    throw new Error(`buildPersonReport: invalid person_id ${personId}`);
  }

  const started = Date.now();
  const since = safeDate(opts.since, daysAgo(DEFAULT_SINCE_DAYS_PERSON));
  const types = (opts.types && opts.types.length > 0 ? opts.types : DEFAULT_PERSON_REPORT_TYPES).slice(0, 6);
  const includeAssignments = opts.includeAssignments !== false;
  const maxPages = Math.max(1, Math.min(opts.maxPagesPerType ?? MAX_REPORT_PAGES_PER_TYPE, MAX_REPORT_PAGES_PER_TYPE));

  console.info(
    `[report.person] start person_id=${personId} since=${iso(since)} types=[${types.join(',')}] assignments=${includeAssignments}`,
  );

  // Person metadata and Recordings fan-out can run in parallel. Person is
  // soft-required: if it fails with 404 we bail; anything else we continue
  // with partial metadata.
  const personPromise = client.getPerson(personId).catch((err) => {
    if (err instanceof BasecampError && err.kind === 'not_found') throw err;
    console.warn(`[report.person] getPerson soft-failed person_id=${personId} err=${errorSummary(err)}`);
    return null;
  });

  const recordingPromises = Promise.allSettled(
    types.map((t) =>
      client.listRecordings({
        type: t,
        sort: 'updated_at',
        direction: 'desc',
        since,
        maxPages,
      }),
    ),
  );

  const assignmentsPromise = includeAssignments
    ? client.reportTodosAssignedToPerson(personId, 'bucket').catch((err) => {
        console.warn(`[report.person] assignments fetch failed person_id=${personId} err=${errorSummary(err)}`);
        return null;
      })
    : Promise.resolve(null);

  const [personFetched, recordingResults, assignmentsData] = await Promise.all([
    personPromise,
    recordingPromises,
    assignmentsPromise,
  ]);

  const typesFetched: string[] = [];
  const typesFailed: Array<{ type: string; error: string }> = [];
  let rowsScanned = 0;
  const filtered: Recording[] = [];
  const countsByType: TypeCounts = {};
  recordingResults.forEach((res, idx) => {
    const t = types[idx];
    if (res.status === 'fulfilled') {
      typesFetched.push(t);
      rowsScanned += res.value.length;
      let countForType = 0;
      for (const row of res.value) {
        if (row.creator?.id === personId) {
          filtered.push(row);
          countForType += 1;
        }
      }
      countsByType[t] = countForType;
    } else {
      typesFailed.push({ type: t, error: errorSummary(res.reason) });
      console.warn(`[report.person] type_failed type=${t} err=${errorSummary(res.reason)}`);
    }
  });

  filtered.sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));

  // Projects touched → count rows per bucket.
  const projectCounter = new Map<number, { name?: string; count: number }>();
  for (const r of filtered) {
    const bid = r.bucket?.id;
    if (!bid) continue;
    const prev = projectCounter.get(bid);
    if (prev) prev.count += 1;
    else projectCounter.set(bid, { name: r.bucket?.name, count: 1 });
  }
  const projectsTouched = [...projectCounter.entries()]
    .map(([id, v]) => ({ id, name: v.name, count: v.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_PROJECTS_ROWS);

  const recent = filtered.slice(0, MAX_RECENT_ACTIVITY_ROWS).map((r) => ({
    type: r.type,
    id: r.id,
    title: titleOf(r),
    updated_at: r.updated_at,
    bucket: bucketNameOf(r),
    url: r.app_url ?? r.url,
    excerpt: excerptOf(r),
  }));

  const assigned = includeAssignments ? summarizeAssignments(assignmentsData) : undefined;

  const report: PersonReport = {
    person: {
      id: personId,
      name: personFetched?.name,
      email_address: personFetched?.email_address,
      title: personFetched?.title,
    },
    since: iso(since),
    generated_at: iso(new Date()),
    authored: {
      total: filtered.length,
      counts_by_type: countsByType,
      projects_touched: projectsTouched,
      recent,
    },
    assigned,
    fetch_stats: {
      types_fetched: typesFetched,
      types_failed: typesFailed,
      rows_scanned: rowsScanned,
      duration_ms: Date.now() - started,
    },
  };

  console.info(
    `[report.person] done person_id=${personId} authored=${report.authored.total} rows_scanned=${rowsScanned} assigned=${assigned?.total_active ?? 'n/a'} dur_ms=${report.fetch_stats.duration_ms}`,
  );
  return report;
}

function summarizeAssignments(data: any): PersonReport['assigned'] {
  if (!data) return undefined;
  const groups = Array.isArray(data?.todos) ? data.todos : [];
  const byProject: Array<{ id: number; name?: string; count: number }> = [];
  const samples: NonNullable<PersonReport['assigned']>['samples'] = [];
  let total = 0;
  let overdue = 0;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  for (const group of groups) {
    const bucket = group?.bucket ?? {};
    const bucketName = bucket?.name ? String(bucket.name) : undefined;
    const todos = Array.isArray(group?.todos) ? group.todos : [];
    if (todos.length === 0) continue;
    const groupId = Number(bucket?.id);
    if (Number.isFinite(groupId)) {
      byProject.push({ id: groupId, name: bucketName, count: todos.length });
    }
    total += todos.length;
    for (const t of todos) {
      if (t?.due_on) {
        const due = Date.parse(t.due_on);
        if (Number.isFinite(due) && due < today.getTime()) overdue += 1;
      }
      if (samples.length < 10) {
        samples.push({
          id: Number(t?.id ?? 0),
          content: trimText(t?.content ?? t?.title, MAX_TITLE_CHARS) ?? '(بدون عنوان)',
          due_on: t?.due_on ?? undefined,
          bucket: bucketName,
          url: t?.app_url ?? t?.url,
        });
      }
    }
  }
  byProject.sort((a, b) => b.count - a.count);
  return {
    total_active: total,
    overdue,
    by_project: byProject.slice(0, MAX_PROJECTS_ROWS),
    samples,
  };
}

// ─────────────────────── Account pulse ───────────────────────

export type AccountPulse = {
  since: string;
  generated_at: string;
  total: number;
  by_project: Array<{
    id: number;
    name?: string;
    count: number;
    last_update: string;
    by_type: TypeCounts;
  }>;
  top_people: Array<{ id: number; name: string; count: number }>;
  highlights: Array<{
    type: string;
    title: string;
    updated_at: string;
    project?: string;
    creator?: string;
    url?: string;
  }>;
  fetch_stats: {
    types_fetched: string[];
    types_failed: Array<{ type: string; error: string }>;
    duration_ms: number;
  };
};

/**
 * "What happened today across the whole account" digest. Uses Recordings with
 * no bucket filter, grouped client-side by project after the fetch.
 *
 * Default window is 24 hours, but caller can widen it. Pagination is more
 * aggressive here (walks until cutoff is hit across the whole account), so we
 * keep the type list short by default.
 */
export async function buildAccountPulse(
  client: BasecampClient,
  opts: {
    since?: Date;
    types?: BcRecordingType[];
    maxPagesPerType?: number;
  } = {},
): Promise<AccountPulse> {
  const started = Date.now();
  const since = safeDate(opts.since, hoursAgo(DEFAULT_SINCE_HOURS_ACCOUNT));
  const types = (opts.types && opts.types.length > 0 ? opts.types : DEFAULT_ACCOUNT_PULSE_TYPES).slice(0, 6);
  const maxPages = Math.max(1, Math.min(opts.maxPagesPerType ?? 10, MAX_REPORT_PAGES_PER_TYPE));

  console.info(
    `[report.pulse] start since=${iso(since)} types=[${types.join(',')}] max_pages=${maxPages}`,
  );

  const recordingResults = await Promise.allSettled(
    types.map((t) =>
      client.listRecordings({
        type: t,
        sort: 'updated_at',
        direction: 'desc',
        since,
        maxPages,
      }),
    ),
  );

  const typesFetched: string[] = [];
  const typesFailed: Array<{ type: string; error: string }> = [];
  const allRows: Recording[] = [];
  recordingResults.forEach((res, idx) => {
    const t = types[idx];
    if (res.status === 'fulfilled') {
      typesFetched.push(t);
      for (const row of res.value) allRows.push(row);
    } else {
      typesFailed.push({ type: t, error: errorSummary(res.reason) });
      console.warn(`[report.pulse] type_failed type=${t} err=${errorSummary(res.reason)}`);
    }
  });

  allRows.sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));

  type ProjectBucket = { id: number; name?: string; count: number; last_update: string; by_type: TypeCounts };
  const projectMap = new Map<number, ProjectBucket>();
  const peopleMap = new Map<number, { name: string; count: number }>();

  for (const r of allRows) {
    const bid = r.bucket?.id;
    if (bid) {
      const prev = projectMap.get(bid);
      if (prev) {
        prev.count += 1;
        prev.by_type[r.type] = (prev.by_type[r.type] ?? 0) + 1;
        if (Date.parse(r.updated_at) > Date.parse(prev.last_update)) {
          prev.last_update = r.updated_at;
        }
      } else {
        projectMap.set(bid, {
          id: bid,
          name: r.bucket?.name ? String(r.bucket.name) : undefined,
          count: 1,
          last_update: r.updated_at,
          by_type: { [r.type]: 1 },
        });
      }
    }
    const pid = r.creator?.id;
    if (pid) {
      const name = r.creator?.name?.trim() || `#${pid}`;
      const prev = peopleMap.get(pid);
      if (prev) prev.count += 1;
      else peopleMap.set(pid, { name, count: 1 });
    }
  }

  const byProject = [...projectMap.values()]
    .sort((a, b) => Date.parse(b.last_update) - Date.parse(a.last_update))
    .slice(0, MAX_PROJECTS_ROWS);

  const topPeople = [...peopleMap.entries()]
    .map(([id, v]) => ({ id, name: v.name, count: v.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_PEOPLE_ROWS);

  const highlights = allRows.slice(0, MAX_RECENT_ACTIVITY_ROWS).map((r) => ({
    type: r.type,
    title: titleOf(r),
    updated_at: r.updated_at,
    project: bucketNameOf(r),
    creator: r.creator?.name,
    url: r.app_url ?? r.url,
  }));

  const pulse: AccountPulse = {
    since: iso(since),
    generated_at: iso(new Date()),
    total: allRows.length,
    by_project: byProject,
    top_people: topPeople,
    highlights,
    fetch_stats: {
      types_fetched: typesFetched,
      types_failed: typesFailed,
      duration_ms: Date.now() - started,
    },
  };

  console.info(
    `[report.pulse] done total=${pulse.total} projects=${byProject.length} top_people=${topPeople.length} dur_ms=${pulse.fetch_stats.duration_ms}`,
  );
  return pulse;
}
