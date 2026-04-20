'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

type ToolEvent = {
  name: string;
  risk: 'readonly' | 'write' | 'destructive';
  kind: 'ok' | 'preview' | 'error';
  effect?: string;
  warning?: string;
  error?: string;
  detail?: string;
  input?: unknown;
  output?: string;
};

type Turn =
  | {
      role: 'user' | 'assistant';
      text: string;
      at?: string;
      tools?: ToolEvent[];
      steps?: string[];
    }
  | { role: 'system'; text: string };

const FALLBACK_SUGGESTIONS = [
  'اعرض مشاريعي النشطة',
  'ما المهام المستحقّة عليّ اليوم؟',
  'أضف مهمة «مراجعة الحلقة» لقائمة الإنتاج واسندها لأحمد',
  'انشر تحديثاً على لوحة رسائل مشروع «موسم 4»',
];

const RISK_LABEL: Record<ToolEvent['risk'], string> = {
  readonly: 'قراءة',
  write: 'تعديل',
  destructive: 'لا رجعة فيه',
};

/** Rip tags out of a server-returned HTML error page so we can show the
 *  body text inline without rendering markup. */
function stripHtml(s: string): string {
  return s
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** RFC-4180 style CSV parser. Handles quoted fields, embedded quotes, and
 *  CRLF line endings. Auto-detects the delimiter as `,`, `;`, or `\t`. */
function parseDelimited(src: string): { headers: string[]; rows: string[][] } {
  const text = src.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const firstLine = text.split('\n', 1)[0] ?? '';
  const delims: Array<[string, number]> = [
    [',', (firstLine.match(/,/g) ?? []).length],
    [';', (firstLine.match(/;/g) ?? []).length],
    ['\t', (firstLine.match(/\t/g) ?? []).length],
  ];
  delims.sort((a, b) => b[1] - a[1]);
  const delim = delims[0][1] > 0 ? delims[0][0] : ',';

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let i = 0;
  let inQuotes = false;
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      cell += c;
      i++;
      continue;
    }
    if (c === '"' && cell === '') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === delim) {
      row.push(cell);
      cell = '';
      i++;
      continue;
    }
    if (c === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      i++;
      continue;
    }
    cell += c;
    i++;
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  const nonEmpty = rows.filter((r) => r.some((c) => c.trim().length > 0));
  if (nonEmpty.length === 0) return { headers: [], rows: [] };
  const [headers, ...rest] = nonEmpty;
  return { headers: headers.map((h) => h.trim()), rows: rest };
}

function toMarkdownTable(headers: string[], rows: string[][], maxRows = 200): string {
  const clip = rows.slice(0, maxRows);
  const esc = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ');
  const head = `| ${headers.map(esc).join(' | ')} |`;
  const sep = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = clip
    .map((r) => {
      const padded = [...r];
      while (padded.length < headers.length) padded.push('');
      return `| ${padded.slice(0, headers.length).map(esc).join(' | ')} |`;
    })
    .join('\n');
  const omitted = rows.length - clip.length;
  return `${head}\n${sep}\n${body}${omitted > 0 ? `\n| …تم حذف ${omitted} صفاً إضافياً لاختصار السياق |` : ''}`;
}

type Attachment = {
  name: string;
  rows: number;
  headers: string[];
  body: string[][];
  markdown: string;
};

type Bookmark = {
  id: string;
  content: string;
  note: string | null;
  source: string | null;
  createdAt: string;
};

export function ChatWorkspace({
  initialTimeline,
  accountName,
}: {
  initialTimeline: Turn[];
  accountName: string;
}) {
  const [timeline, setTimeline] = useState<Turn[]>(initialTimeline);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>(FALLBACK_SUGGESTIONS);
  const [lastPendingAction, setLastPendingAction] = useState<ToolEvent | null>(null);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [bookmarkError, setBookmarkError] = useState<string | null>(null);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [timeline, pending]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/agent/suggestions')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d?.suggestions?.length) setSuggestions(d.suggestions);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshBookmarks = useCallback(async () => {
    try {
      const r = await fetch('/api/bookmarks');
      if (!r.ok) return;
      const d = await r.json();
      setBookmarks(Array.isArray(d?.bookmarks) ? d.bookmarks : []);
    } catch {
      /* ignore — bookmarks are not worth blocking on */
    }
  }, []);

  useEffect(() => {
    refreshBookmarks();
  }, [refreshBookmarks]);

  const saveAsBookmark = useCallback(
    async (content: string, source?: string) => {
      setBookmarkError(null);
      try {
        const res = await fetch('/api/bookmarks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ content, source: source ?? null }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => null);
          setBookmarkError(
            d?.detail ? `تعذّر الحفظ: ${d.detail}` : 'تعذّر حفظ الإشارة المرجعية.',
          );
          return;
        }
        await refreshBookmarks();
      } catch {
        setBookmarkError('تعذّر الوصول إلى الخادم.');
      }
    },
    [refreshBookmarks],
  );

  const removeBookmark = useCallback(
    async (id: string) => {
      setBookmarkError(null);
      try {
        const res = await fetch(`/api/bookmarks?id=${encodeURIComponent(id)}`, {
          method: 'DELETE',
        });
        if (!res.ok) {
          setBookmarkError('تعذّر حذف الإشارة.');
          return;
        }
        await refreshBookmarks();
      } catch {
        setBookmarkError('تعذّر الوصول إلى الخادم.');
      }
    },
    [refreshBookmarks],
  );

  const formatBookmarkQuote = useCallback((b: Bookmark): string => {
    const lines = b.content.split('\n');
    const quoted = lines
      .map((l, i) => (i === 0 ? `> [إشارة محفوظة]: ${l}` : `> ${l}`))
      .join('\n');
    return quoted + '\n';
  }, []);

  const insertBookmarkAsContext = useCallback(
    (b: Bookmark) => {
      const snippet = formatBookmarkQuote(b) + '\n';
      setInput((prev) => snippet + prev);
      requestAnimationFrame(() => textareaRef.current?.focus());
    },
    [formatBookmarkQuote],
  );

  // Filter bookmarks by what the user has typed after `@`. Simple case-insensitive
  // substring match against content + note. Top 8 shown.
  const mentionMatches = useMemo(() => {
    if (!mentionOpen) return [] as Bookmark[];
    const q = mentionQuery.trim().toLowerCase();
    const pool = bookmarks;
    const filtered = q
      ? pool.filter(
          (b) =>
            b.content.toLowerCase().includes(q) ||
            (b.note ?? '').toLowerCase().includes(q),
        )
      : pool;
    return filtered.slice(0, 8);
  }, [bookmarks, mentionOpen, mentionQuery]);

  // After typing, figure out whether the caret is currently inside a `@token`
  // at a mention-eligible position (start of input, or preceded by whitespace).
  const updateMentionStateFromInput = useCallback((next: string, caret: number) => {
    for (let i = caret - 1; i >= 0; i--) {
      const c = next[i];
      if (c === '@') {
        const prev = i === 0 ? '' : next[i - 1];
        if (!prev || /\s/.test(prev)) {
          const query = next.slice(i + 1, caret);
          if (!/\s/.test(query)) {
            setMentionOpen(true);
            setMentionStart(i);
            setMentionQuery(query);
            setMentionIndex(0);
            return;
          }
        }
        break;
      }
      if (/\s/.test(c)) break;
    }
    setMentionOpen(false);
    setMentionStart(null);
    setMentionQuery('');
  }, []);

  const closeMention = useCallback(() => {
    setMentionOpen(false);
    setMentionStart(null);
    setMentionQuery('');
  }, []);

  const selectMention = useCallback(
    (b: Bookmark) => {
      const ta = textareaRef.current;
      if (mentionStart == null || !ta) {
        closeMention();
        return;
      }
      const caret = ta.selectionStart ?? input.length;
      const before = input.slice(0, mentionStart);
      const after = input.slice(caret);
      const snippet = formatBookmarkQuote(b);
      const next = before + snippet + after;
      setInput(next);
      closeMention();
      const pos = (before + snippet).length;
      requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(pos, pos);
      });
    },
    [mentionStart, input, formatBookmarkQuote, closeMention],
  );

  const send = useCallback(
    async (message: string, opts?: { attachment?: Attachment | null }) => {
      const text = message.trim();
      const att = opts?.attachment ?? null;
      if ((!text && !att) || pending) return;
      setError(null);
      setPending(true);

      // If a CSV is attached, prepend the parsed table as a Markdown block
      // so the agent sees structured data alongside the user's instruction.
      const composed = att
        ? `${text || 'استخدم البيانات المرفقة لتنفيذ الطلب.'}\n\n**الملف المرفق:** \`${att.name}\` — ${att.rows} صفاً\n\n${att.markdown}`
        : text;

      setTimeline((t) => [
        ...t,
        {
          role: 'user',
          text: att ? `${text || '(طلب مع ملف مرفق)'}\n\n📎 ${att.name} — ${att.rows} صفاً` : text,
        },
      ]);
      setInput('');
      if (att) setAttachment(null);
      try {
        let res: Response;
        try {
          res = await fetch('/api/agent', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: JSON.stringify({ message: composed }),
          });
        } catch (netErr) {
          setError(
            `تعذّر الوصول إلى الخادم${netErr instanceof Error && netErr.message ? ` (${netErr.message})` : ''}.`,
          );
          return;
        }

        // Parse as text first then JSON.parse in a guarded block. A gateway or
        // a runtime crash returns HTML — res.json() would throw
        // "Unexpected token '<'..." and we'd lose the real error.
        const raw = await res.text();
        const contentType = res.headers.get('content-type') ?? '';
        let data: any = null;
        let parseError: string | null = null;
        if (raw) {
          try {
            data = JSON.parse(raw);
          } catch (parseErr) {
            data = null;
            parseError = parseErr instanceof Error ? parseErr.message : String(parseErr);
          }
        }

        if (!res.ok) {
          // Prefer the server's own error text over canned fallbacks so users
          // see the actual cause. If the server returned HTML/plain text, we
          // trim it so the UI stays sane. Fields like `detail` may be objects
          // (validation errors, Vercel gateway objects) — stringify them so
          // we never render "[object Object]".
          const pickString = (v: unknown): string | null => {
            if (v == null) return null;
            if (typeof v === 'string') return v;
            try {
              return JSON.stringify(v).slice(0, 500);
            } catch {
              return String(v).slice(0, 500);
            }
          };
          const serverSaid =
            pickString(data?.detail) ||
            pickString(data?.error) ||
            pickString(data?.message) ||
            (raw ? stripHtml(raw).slice(0, 500) : null) ||
            (res.status === 504
              ? 'انتهت المهلة قبل أن يكمل الوكيل العملية. جرّب تقسيم الطلب إلى خطوات أصغر.'
              : null);
          const prefix = `خطأ من الخادم (${res.status})`;
          setError(serverSaid ? `${prefix}: ${serverSaid}` : prefix);
          if (res.status === 401) {
            setTimeout(() => {
              window.location.href = '/connect';
            }, 1500);
          }
          return;
        }

        if (!data) {
          const snippet = raw ? stripHtml(raw).slice(0, 300) : '';
          setError(
            `ردّ غير صالح من الخادم${contentType ? ` (${contentType})` : ''}${parseError ? `: ${parseError}` : ''}${snippet ? ` — ${snippet}` : ''}`,
          );
          return;
        }

        if (data.reconnect) {
          window.location.href = '/connect';
          return;
        }
        setTimeline((t) => [
          ...t,
          {
            role: 'assistant',
            text: data.reply ?? '',
            tools: data.tools ?? [],
            steps: data.steps ?? [],
          },
        ]);
        const preview = (data.tools as ToolEvent[] | undefined)?.find((t) => t.kind === 'preview');
        setLastPendingAction(preview ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'خطأ غير معروف');
      } finally {
        setPending(false);
      }
    },
    [pending],
  );

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    send(input, { attachment });
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const name = file.name.toLowerCase();
    const okExt = /\.(csv|tsv|txt)$/.test(name);
    if (!okExt) {
      setError(
        'الصيغة المدعومة حالياً: CSV أو TSV فقط. من Excel: «حفظ باسم» → CSV UTF-8.',
      );
      return;
    }
    if (file.size > 2_000_000) {
      setError('حجم الملف أكبر من 2 ميغابايت. قسّمه أو قلّص الأعمدة.');
      return;
    }
    try {
      const src = await file.text();
      const { headers, rows } = parseDelimited(src);
      if (!headers.length || !rows.length) {
        setError('الملف فارغ أو لا يحتوي صفوف بيانات.');
        return;
      }
      setError(null);
      setAttachment({
        name: file.name,
        rows: rows.length,
        headers,
        body: rows,
        markdown: toMarkdownTable(headers, rows),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر قراءة الملف.');
    }
  }

  async function clearHistory() {
    if (!confirm('هل تريد مسح سجل المحادثة بالكامل؟')) return;
    try {
      await fetch('/api/agent', { method: 'DELETE' });
      setTimeline([]);
      setLastPendingAction(null);
    } catch {
      setError('تعذّر مسح السجل.');
    }
  }

  return (
    <section className="mx-auto grid max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[1fr_18rem]">
      <div className="flex min-h-[70vh] flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)]/50">
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-6 py-6"
          style={{ maxHeight: '70vh' }}
        >
          {timeline.length === 0 ? (
            <Welcome accountName={accountName} suggestions={suggestions} onPick={send} />
          ) : (
            <div className="space-y-6">
              {timeline.map((t, i) => (
                <Bubble key={i} turn={t} onBookmark={saveAsBookmark} />
              ))}
              {lastPendingAction ? (
                <PreviewCard
                  action={lastPendingAction}
                  disabled={pending}
                  onConfirm={() => {
                    setLastPendingAction(null);
                    send('أؤكد، نفّذ الإجراء المعروض.');
                  }}
                  onCancel={() => {
                    setLastPendingAction(null);
                    send('ألغِ الإجراء ولا تنفّذه.');
                  }}
                />
              ) : null}
              {pending ? <Thinking /> : null}
            </div>
          )}
        </div>

        <form onSubmit={onSubmit} className="border-t border-[var(--border)] px-4 py-4">
          {attachment ? (
            <div className="mb-3 flex items-center gap-3 rounded-xl border border-[var(--accent)]/40 bg-[var(--accent)]/5 px-3 py-2 text-sm">
              <span aria-hidden>📎</span>
              <div className="flex-1 overflow-hidden">
                <div className="truncate font-text text-[var(--fg)]">{attachment.name}</div>
                <div className="text-xs text-[var(--fg-subtle)]">
                  {attachment.rows} صفاً · {attachment.headers.length} عموداً
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAttachment(null)}
                className="rounded-md border border-[var(--border)] px-2 py-1 text-xs text-[var(--fg-muted)] transition hover:border-[var(--danger)] hover:text-[var(--danger)]"
              >
                إزالة
              </button>
            </div>
          ) : null}
          <div className="relative flex items-end gap-3 rounded-2xl border border-[var(--border-strong)] bg-[var(--bg)] p-3 focus-within:border-[var(--accent)]">
            {mentionOpen ? (
              <MentionPopover
                matches={mentionMatches}
                highlight={mentionIndex}
                query={mentionQuery}
                onPick={(b) => selectMention(b)}
                onHover={(i) => setMentionIndex(i)}
                onClose={closeMention}
              />
            ) : null}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain"
              onChange={onPickFile}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={pending}
              aria-label="إرفاق ملف CSV"
              title="إرفاق ملف CSV للعمليات الجماعية (من Excel: حفظ باسم → CSV)"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--border-strong)] text-[var(--fg-muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
            </button>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                const v = e.target.value;
                setInput(v);
                updateMentionStateFromInput(v, e.target.selectionStart ?? v.length);
              }}
              onKeyUp={(e) => {
                const ta = e.currentTarget;
                updateMentionStateFromInput(ta.value, ta.selectionStart ?? ta.value.length);
              }}
              onClick={(e) => {
                const ta = e.currentTarget;
                updateMentionStateFromInput(ta.value, ta.selectionStart ?? ta.value.length);
              }}
              onBlur={() => {
                // Delay so a click on the popover still fires before we close it.
                setTimeout(() => closeMention(), 120);
              }}
              onKeyDown={(e) => {
                if (mentionOpen && mentionMatches.length > 0) {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setMentionIndex((i) => (i + 1) % mentionMatches.length);
                    return;
                  }
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setMentionIndex(
                      (i) => (i - 1 + mentionMatches.length) % mentionMatches.length,
                    );
                    return;
                  }
                  if (e.key === 'Enter' || e.key === 'Tab') {
                    e.preventDefault();
                    selectMention(mentionMatches[mentionIndex]);
                    return;
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    closeMention();
                    return;
                  }
                }
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send(input, { attachment });
                }
              }}
              placeholder={
                attachment
                  ? 'صِف ما تريد عمله بالبيانات المرفقة (مثال: «أنشئ مهاماً من الأعمدة وأسندها بحسب عمود المسؤول»)…'
                  : 'اكتب طلبك لمَجال… (استخدم @ لإدراج إشارة محفوظة)'
              }
              dir="rtl"
              rows={2}
              className="flex-1 resize-none bg-transparent px-2 py-1 text-[var(--fg)] outline-none placeholder:text-[var(--fg-subtle)]"
              disabled={pending}
            />
            <button
              type="submit"
              disabled={pending || (!input.trim() && !attachment)}
              className="flex h-10 items-center gap-2 rounded-full bg-[var(--accent)] px-5 font-medium text-[var(--accent-fg)] transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              إرسال
              <span className="diamond" />
            </button>
          </div>
          {error ? (
            <p className="mt-3 whitespace-pre-wrap break-words text-sm text-[var(--danger)]">
              ⚠ {error}
            </p>
          ) : null}
        </form>
      </div>

      <aside className="space-y-6">
        <Panel title="اقتراحات">
          <ul className="space-y-2 text-sm">
            {suggestions.map((s) => (
              <li key={s}>
                <button
                  onClick={() => send(s)}
                  disabled={pending}
                  className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-right text-[var(--fg-muted)] transition hover:border-[var(--accent)] hover:text-[var(--fg)] disabled:opacity-50"
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="الإشارات المحفوظة">
          {bookmarkError ? (
            <p className="mb-2 rounded-md bg-[var(--danger)]/10 px-3 py-2 text-xs text-[var(--danger)]">
              {bookmarkError}
            </p>
          ) : null}
          {bookmarks.length === 0 ? (
            <p className="text-xs leading-loose text-[var(--fg-subtle)]">
              احفظ أي إجابة مهمة من مَجال بالضغط على «احفظ» فوق الرد. لاستدعاء إشارة محفوظة داخل رسالتك اكتب @ في صندوق الدردشة، أو اضغط «إدراج» هنا.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {bookmarks.map((b) => (
                <li
                  key={b.id}
                  className="rounded-lg border border-[var(--border)] bg-[var(--bg)]/40 p-3"
                >
                  <p className="line-clamp-3 text-xs leading-relaxed text-[var(--fg-muted)]">
                    {b.content}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-[var(--fg-subtle)]">
                    <button
                      onClick={() => insertBookmarkAsContext(b)}
                      className="rounded-md border border-[var(--border)] px-2 py-0.5 transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                    >
                      إدراج
                    </button>
                    <button
                      onClick={() => removeBookmark(b.id)}
                      className="rounded-md border border-transparent px-2 py-0.5 transition hover:border-[var(--danger)]/50 hover:text-[var(--danger)]"
                    >
                      حذف
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="التأكيد قبل التنفيذ">
          <ul className="space-y-3 text-sm leading-loose text-[var(--fg-muted)]">
            <li>
              <span className="text-[var(--accent)]">•</span> أي إجراء غير «قراءة» يُعرَض عليك
              للمراجعة قبل التنفيذ.
            </li>
            <li>
              <span className="text-[var(--accent)]">•</span> الإجراءات التي لا رجعة فيها تظهر
              بتحذير أحمر.
            </li>
          </ul>
        </Panel>

        <Panel title="السجل">
          <button
            onClick={clearHistory}
            disabled={pending}
            className="w-full rounded-lg border border-[var(--border-strong)] px-3 py-2 text-sm text-[var(--fg-muted)] transition hover:border-[var(--danger)] hover:text-[var(--danger)] disabled:opacity-50"
          >
            مسح السجل
          </button>
        </Panel>
      </aside>
    </section>
  );
}

function Bubble({
  turn,
  onBookmark,
}: {
  turn: Turn;
  onBookmark?: (content: string, source?: string) => void;
}) {
  const [saved, setSaved] = useState(false);

  if (turn.role === 'system') {
    return (
      <div className="mx-auto max-w-xl rounded-lg border border-[var(--border)] bg-[var(--surface)]/60 px-4 py-3 text-center text-xs text-[var(--fg-subtle)]">
        {turn.text}
      </div>
    );
  }
  const mine = turn.role === 'user';
  const tools = 'tools' in turn ? turn.tools ?? [] : [];
  const steps = 'steps' in turn ? turn.steps ?? [] : [];
  const hasTrace = !mine && (tools.length > 0 || steps.length > 0);
  const canBookmark = !mine && !!turn.text && !!onBookmark;

  return (
    <div className={`flex flex-col ${mine ? 'items-start' : 'items-end'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-5 py-4 leading-loose ${
          mine
            ? 'whitespace-pre-wrap bg-[var(--surface-elev)] text-[var(--fg)]'
            : 'border border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[var(--fg)]'
        }`}
      >
        {!mine ? (
          <div className="mb-2 flex items-center gap-2 text-xs text-[var(--accent)]">
            <span className="diamond" /> مَجال
            {canBookmark ? (
              <button
                type="button"
                onClick={() => {
                  onBookmark!(turn.text, 'assistant');
                  setSaved(true);
                  setTimeout(() => setSaved(false), 1800);
                }}
                className="mr-auto rounded-full border border-[var(--border)] bg-[var(--bg)]/60 px-2 py-0.5 text-[11px] text-[var(--fg-muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                title="احفظ هذه الإجابة في إشاراتي المرجعية"
              >
                {saved ? '✓ محفوظ' : '◷ احفظ'}
              </button>
            ) : null}
          </div>
        ) : null}
        {mine ? (
          turn.text || <span className="text-[var(--fg-subtle)]">…</span>
        ) : turn.text ? (
          <Markdown text={turn.text} />
        ) : (
          <span className="text-[var(--fg-subtle)]">…</span>
        )}
      </div>
      {!mine && tools.length > 0 ? (
        <div className="mt-2 flex max-w-[85%] flex-wrap justify-end gap-2">
          {tools.map((t, i) => (
            <ToolBadge key={i} event={t} />
          ))}
        </div>
      ) : null}
      {hasTrace ? <StepsPanel tools={tools} steps={steps} /> : null}
    </div>
  );
}

function StepsPanel({ tools, steps }: { tools: ToolEvent[]; steps: string[] }) {
  const stepCount = tools.length + steps.length;
  return (
    <details className="mt-2 max-w-[85%] rounded-xl border border-[var(--border)] bg-[var(--surface)]/40 text-sm">
      <summary className="cursor-pointer list-none select-none px-4 py-2 text-xs text-[var(--fg-muted)] hover:text-[var(--fg)]">
        <span className="diamond ml-2 text-[var(--accent)]" />
        سجل الخطوات والأدوات ({stepCount})
      </summary>
      <div className="space-y-3 border-t border-[var(--border)] px-4 py-3">
        {steps.map((s, i) => (
          <div
            key={`step-${i}`}
            className="rounded-md border border-dashed border-[var(--border)] bg-[var(--bg)]/40 px-3 py-2 text-xs leading-relaxed text-[var(--fg-muted)]"
          >
            <div className="mb-1 text-[var(--fg-subtle)]">تفكير وسيط</div>
            <div className="whitespace-pre-wrap">{s}</div>
          </div>
        ))}
        {tools.map((t, i) => (
          <ToolTraceCard key={`tool-${i}`} event={t} />
        ))}
      </div>
    </details>
  );
}

function ToolTraceCard({ event }: { event: ToolEvent }) {
  const badge =
    event.kind === 'error'
      ? { label: 'خطأ', color: 'text-[var(--danger)] border-[var(--danger)]/40' }
      : event.kind === 'preview'
        ? { label: 'معاينة', color: 'text-[#E79547] border-[#E79547]/40' }
        : { label: 'نجاح', color: 'text-[var(--fg-muted)] border-[var(--border)]' };
  const inputText =
    event.input !== undefined && event.input !== null
      ? JSON.stringify(event.input, null, 2)
      : null;
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--bg)]/40 px-3 py-2 text-xs">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <code className="font-text text-[var(--fg)]">{event.name}</code>
        <span className={`rounded-full border px-2 py-0.5 ${badge.color}`}>{badge.label}</span>
        <span className="text-[var(--fg-subtle)]">· {RISK_LABEL[event.risk]}</span>
      </div>
      {event.effect ? (
        <p className="mb-2 text-[var(--fg-muted)]">{event.effect}</p>
      ) : null}
      {event.warning ? (
        <p className="mb-2 text-[var(--danger)]">{event.warning}</p>
      ) : null}
      {event.error ? (
        <p className="mb-2 text-[var(--danger)]">{event.error}</p>
      ) : null}
      {inputText ? (
        <TraceBlock label="المدخلات" body={inputText} />
      ) : null}
      {event.output ? (
        <TraceBlock label="الناتج" body={event.output} />
      ) : null}
    </div>
  );
}

function TraceBlock({ label, body }: { label: string; body: string }) {
  return (
    <div className="mb-1 last:mb-0">
      <div className="mb-1 text-[var(--fg-subtle)]">{label}</div>
      <pre
        dir="ltr"
        className="max-h-48 overflow-auto rounded border border-[var(--border)] bg-[var(--bg)]/60 p-2 text-[11px] leading-relaxed text-[var(--fg-muted)]"
      >
        {body}
      </pre>
    </div>
  );
}

function ToolBadge({ event }: { event: ToolEvent }) {
  const color =
    event.kind === 'error'
      ? 'border-[var(--danger)]/50 text-[var(--danger)]'
      : event.kind === 'preview'
        ? 'border-[#E79547]/50 text-[#E79547]'
        : 'border-[var(--border)] text-[var(--fg-muted)]';
  const icon = event.kind === 'error' ? '⚠' : event.kind === 'preview' ? '◇' : '✓';
  return (
    <span
      title={event.error ?? event.effect ?? ''}
      className={`inline-flex items-center gap-1.5 rounded-full border bg-[var(--bg)] px-3 py-1 text-xs ${color}`}
    >
      <span aria-hidden>{icon}</span>
      <code className="font-text">{event.name}</code>
      <span className="text-[var(--fg-subtle)]">· {RISK_LABEL[event.risk]}</span>
    </span>
  );
}

function PreviewCard({
  action,
  onConfirm,
  onCancel,
  disabled,
}: {
  action: ToolEvent;
  onConfirm: () => void;
  onCancel: () => void;
  disabled: boolean;
}) {
  const irreversible = action.risk === 'destructive';
  return (
    <div
      className={`flex justify-end`}
    >
      <div
        className={`w-full max-w-[85%] rounded-2xl border p-5 ${
          irreversible
            ? 'border-[var(--danger)]/50 bg-[var(--danger)]/5'
            : 'border-[#E79547]/50 bg-[#E79547]/5'
        }`}
      >
        <div className="mb-3 flex items-center gap-2 text-sm">
          <span
            className={`diamond ${irreversible ? 'text-[var(--danger)]' : 'text-[#E79547]'}`}
          />
          <span className={irreversible ? 'text-[var(--danger)]' : 'text-[#E79547]'}>
            {irreversible ? 'تأكيد مطلوب — لا يمكن التراجع بسهولة' : 'تأكيد مطلوب'}
          </span>
          <code className="mr-auto font-text text-xs text-[var(--fg-subtle)]">{action.name}</code>
        </div>
        <p className="leading-loose text-[var(--fg)]">{action.effect}</p>
        {action.warning ? (
          <p className="mt-3 rounded-md bg-[var(--bg)]/50 px-3 py-2 text-sm text-[var(--danger)]">
            {action.warning}
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            onClick={onConfirm}
            disabled={disabled}
            className={`rounded-full px-5 py-2 text-sm font-medium text-[var(--accent-fg)] transition disabled:opacity-50 ${
              irreversible
                ? 'bg-[var(--danger)] hover:opacity-90'
                : 'bg-[var(--accent)] hover:bg-[var(--accent-hover)]'
            }`}
          >
            {irreversible ? 'أؤكد، نفّذ رغم أنه لا رجعة فيه' : 'أؤكد، نفّذ'}
          </button>
          <button
            onClick={onCancel}
            disabled={disabled}
            className="rounded-full border border-[var(--border-strong)] px-5 py-2 text-sm text-[var(--fg-muted)] transition hover:bg-[var(--surface)] hover:text-[var(--fg)] disabled:opacity-50"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────── Minimal Markdown renderer ───────────────────────
// Supports: ATX headings (#..###), GFM tables, ordered/unordered lists,
// fenced code blocks, blockquotes, paragraphs. Inline: **bold**, *italic*,
// `code`. Deliberately tiny — no HTML passthrough, no raw links — so user
// input rendered here cannot inject markup.

function Markdown({ text }: { text: string }) {
  const blocks = parseBlocks(text);
  return (
    <div className="space-y-3">
      {blocks.map((b, i) => renderBlock(b, i))}
    </div>
  );
}

type Block =
  | { kind: 'heading'; level: 1 | 2 | 3; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'table'; headers: string[]; rows: string[][] }
  | { kind: 'code'; body: string }
  | { kind: 'quote'; text: string };

function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    // Fenced code block.
    if (/^```/.test(line)) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) {
        body.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++;
      blocks.push({ kind: 'code', body: body.join('\n') });
      continue;
    }
    // Heading.
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) {
      blocks.push({ kind: 'heading', level: h[1].length as 1 | 2 | 3, text: h[2].trim() });
      i++;
      continue;
    }
    // Table: header row of pipes, followed by a divider row like |---|---|.
    if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1])) {
      const headers = splitTableRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
        rows.push(splitTableRow(lines[i]));
        i++;
      }
      blocks.push({ kind: 'table', headers, rows });
      continue;
    }
    // List (ordered or unordered).
    if (/^\s*(-|\*|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items: string[] = [];
      while (i < lines.length && /^\s*(-|\*|\d+\.)\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*(-|\*|\d+\.)\s+/, ''));
        i++;
      }
      blocks.push({ kind: 'list', ordered, items });
      continue;
    }
    // Blockquote.
    if (/^\s*>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      blocks.push({ kind: 'quote', text: buf.join('\n') });
      continue;
    }
    // Paragraph: consume consecutive non-blank lines.
    const buf: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,3})\s+/.test(lines[i]) &&
      !/^```/.test(lines[i]) &&
      !/^\s*(-|\*|\d+\.)\s+/.test(lines[i]) &&
      !/^\s*>\s?/.test(lines[i]) &&
      !/^\s*\|.*\|\s*$/.test(lines[i])
    ) {
      buf.push(lines[i]);
      i++;
    }
    blocks.push({ kind: 'paragraph', text: buf.join(' ') });
  }
  return blocks;
}

function splitTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
}

function renderBlock(b: Block, key: number): React.ReactNode {
  switch (b.kind) {
    case 'heading': {
      const cls =
        b.level === 1
          ? 'font-display text-xl'
          : b.level === 2
            ? 'font-display text-lg'
            : 'font-display text-base';
      return (
        <div key={key} className={`${cls} text-[var(--fg)]`}>
          <Inline text={b.text} />
        </div>
      );
    }
    case 'paragraph':
      return (
        <p key={key} className="whitespace-pre-wrap leading-loose">
          <Inline text={b.text} />
        </p>
      );
    case 'list':
      return b.ordered ? (
        <ol key={key} className="list-decimal space-y-1 pr-6 leading-loose">
          {b.items.map((it, i) => (
            <li key={i}>
              <Inline text={it} />
            </li>
          ))}
        </ol>
      ) : (
        <ul key={key} className="list-disc space-y-1 pr-6 leading-loose">
          {b.items.map((it, i) => (
            <li key={i}>
              <Inline text={it} />
            </li>
          ))}
        </ul>
      );
    case 'table':
      return (
        <div key={key} className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr>
                {b.headers.map((h, i) => (
                  <th
                    key={i}
                    className="border border-[var(--border)] bg-[var(--surface)]/60 px-3 py-2 text-right font-medium text-[var(--fg)]"
                  >
                    <Inline text={h} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {b.rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((c, ci) => (
                    <td
                      key={ci}
                      className="border border-[var(--border)] px-3 py-2 align-top text-[var(--fg-muted)]"
                    >
                      <Inline text={c} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'code':
      return (
        <pre
          key={key}
          dir="ltr"
          className="overflow-x-auto rounded-md border border-[var(--border)] bg-[var(--bg)]/60 p-3 text-xs leading-relaxed text-[var(--fg-muted)]"
        >
          {b.body}
        </pre>
      );
    case 'quote':
      return (
        <blockquote
          key={key}
          className="border-r-2 border-[var(--accent)]/60 pr-3 text-[var(--fg-muted)]"
        >
          <Inline text={b.text} />
        </blockquote>
      );
  }
}

/** Minimal inline parser: **bold**, *italic*, `code`. Everything else is text. */
function Inline({ text }: { text: string }) {
  const tokens: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) tokens.push(text.slice(last, m.index));
    const t = m[0];
    if (t.startsWith('**')) {
      tokens.push(
        <strong key={key++} className="font-semibold text-[var(--fg)]">
          {t.slice(2, -2)}
        </strong>,
      );
    } else if (t.startsWith('`')) {
      tokens.push(
        <code
          key={key++}
          className="rounded bg-[var(--bg)]/60 px-1 py-0.5 font-text text-[0.9em] text-[var(--fg)]"
        >
          {t.slice(1, -1)}
        </code>,
      );
    } else {
      tokens.push(
        <em key={key++} className="italic">
          {t.slice(1, -1)}
        </em>,
      );
    }
    last = m.index + t.length;
  }
  if (last < text.length) tokens.push(text.slice(last));
  return <>{tokens}</>;
}

function MentionPopover({
  matches,
  highlight,
  query,
  onPick,
  onHover,
  onClose,
}: {
  matches: Bookmark[];
  highlight: number;
  query: string;
  onPick: (b: Bookmark) => void;
  onHover: (i: number) => void;
  onClose: () => void;
}) {
  // Empty state — still render the popover so the user gets a hint that
  // their query matches nothing, but with no clickable rows.
  if (matches.length === 0) {
    return (
      <div
        className="absolute bottom-full right-0 z-20 mb-2 w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-xs text-[var(--fg-subtle)] shadow-lg"
        role="listbox"
      >
        {query
          ? `لا توجد إشارة محفوظة تطابق «${query}». احفظ رداً من مَجال ثم ارجع إليه هنا.`
          : 'لا توجد إشارات محفوظة بعد. اضغط «احفظ» فوق أي رد لإضافته.'}
      </div>
    );
  }
  return (
    <div
      className="absolute bottom-full right-0 z-20 mb-2 max-h-72 w-full max-w-md overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 shadow-lg"
      role="listbox"
      onMouseDown={(e) => {
        // Prevent the textarea blur from firing before the click registers.
        e.preventDefault();
      }}
    >
      <div className="px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">
        إشاراتك المحفوظة
        <button
          onClick={onClose}
          className="float-left text-[var(--fg-subtle)] transition hover:text-[var(--fg)]"
          aria-label="إغلاق"
        >
          ×
        </button>
      </div>
      <ul className="space-y-1">
        {matches.map((b, i) => (
          <li key={b.id}>
            <button
              type="button"
              role="option"
              aria-selected={i === highlight}
              onMouseEnter={() => onHover(i)}
              onClick={() => onPick(b)}
              className={`w-full rounded-md px-3 py-2 text-right text-xs leading-relaxed transition ${
                i === highlight
                  ? 'bg-[var(--accent)]/15 text-[var(--fg)]'
                  : 'text-[var(--fg-muted)] hover:bg-[var(--bg)]/60 hover:text-[var(--fg)]'
              }`}
            >
              <span className="line-clamp-3">{b.content}</span>
              {b.note ? (
                <span className="mt-1 block text-[10px] text-[var(--fg-subtle)]">
                  {b.note}
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Thinking() {
  return (
    <div className="flex justify-end">
      <div className="inline-flex items-center gap-2 rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-4 py-3 text-sm text-[var(--fg-muted)]">
        <span className="diamond animate-pulse text-[var(--accent)]" />
        يفكّر مَجال…
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/60 p-5">
      <h3 className="mb-3 text-xs uppercase tracking-[0.25em] text-[var(--fg-subtle)]">{title}</h3>
      {children}
    </div>
  );
}

function Welcome({
  accountName,
  suggestions,
  onPick,
}: {
  accountName: string;
  suggestions: string[];
  onPick: (s: string) => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center py-10 text-center">
      <span className="diamond mb-6 text-3xl text-[var(--accent)]" />
      <h2 className="font-display text-3xl text-[var(--fg)]">
        أهلاً بك في <span className="text-[var(--accent)]">مَجال</span>
      </h2>
      <p className="mt-3 max-w-md leading-loose text-[var(--fg-muted)]">
        متصل بحساب «{accountName}». اطلب أي شيء من بيسكامب بلغتك الطبيعية. قبل أي تغيير،
        سأعرض عليك معاينة وأنتظر تأكيدك.
      </p>
      <div className="mt-8 grid w-full max-w-lg gap-2">
        {suggestions.slice(0, 4).map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="rounded-xl border border-[var(--border)] px-4 py-3 text-right text-[var(--fg-muted)] transition hover:border-[var(--accent)] hover:text-[var(--fg)]"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
