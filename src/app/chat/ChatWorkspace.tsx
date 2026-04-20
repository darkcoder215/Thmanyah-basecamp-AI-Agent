'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';

type ToolEvent = {
  name: string;
  risk: 'readonly' | 'write' | 'destructive';
  kind: 'ok' | 'preview' | 'error';
  effect?: string;
  warning?: string;
  error?: string;
  detail?: string;
};

type Turn =
  | { role: 'user' | 'assistant'; text: string; at?: string; tools?: ToolEvent[] }
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
  const scrollRef = useRef<HTMLDivElement>(null);

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

  const send = useCallback(
    async (message: string) => {
      const text = message.trim();
      if (!text || pending) return;
      setError(null);
      setPending(true);
      setTimeline((t) => [...t, { role: 'user', text }]);
      setInput('');
      try {
        const res = await fetch('/api/agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data?.detail || data?.error || 'تعذّر تنفيذ الطلب.');
        } else {
          if (data.reconnect) {
            window.location.href = '/connect';
            return;
          }
          setTimeline((t) => [
            ...t,
            { role: 'assistant', text: data.reply ?? '', tools: data.tools ?? [] },
          ]);
          // If the agent produced a preview, show an inline confirm card.
          const preview = (data.tools as ToolEvent[] | undefined)?.find((t) => t.kind === 'preview');
          setLastPendingAction(preview ?? null);
        }
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
    send(input);
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
                <Bubble key={i} turn={t} />
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
          <div className="flex items-end gap-3 rounded-2xl border border-[var(--border-strong)] bg-[var(--bg)] p-3 focus-within:border-[var(--accent)]">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder="اكتب طلبك لمَجال…"
              dir="rtl"
              rows={2}
              className="flex-1 resize-none bg-transparent px-2 py-1 text-[var(--fg)] outline-none placeholder:text-[var(--fg-subtle)]"
              disabled={pending}
            />
            <button
              type="submit"
              disabled={pending || !input.trim()}
              className="flex h-10 items-center gap-2 rounded-full bg-[var(--accent)] px-5 font-medium text-[var(--accent-fg)] transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              إرسال
              <span className="diamond" />
            </button>
          </div>
          {error ? <p className="mt-3 text-sm text-[var(--danger)]">⚠ {error}</p> : null}
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

        <Panel title="الأمان">
          <ul className="space-y-3 text-sm leading-loose text-[var(--fg-muted)]">
            <li>
              <span className="text-[var(--accent)]">•</span> أي إجراء غير «قراءة» يحتاج تأكيدك
              قبل التنفيذ، والخادم يرفضه دون تأكيد.
            </li>
            <li>
              <span className="text-[var(--accent)]">•</span> الإجراءات التي لا رجعة فيها تُعرض
              بتحذير أحمر.
            </li>
            <li>
              <span className="text-[var(--accent)]">•</span> رموز بيسكامب مُشفَّرة AES-256-GCM
              على الخادم.
            </li>
          </ul>
        </Panel>

        <Panel title="الذاكرة">
          <p className="mb-3 text-sm leading-loose text-[var(--fg-muted)]">
            يتذكّر مَجال آخر ~80 رسالة في هذه الجلسة.
          </p>
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

function Bubble({ turn }: { turn: Turn }) {
  if (turn.role === 'system') {
    return (
      <div className="mx-auto max-w-xl rounded-lg border border-[var(--border)] bg-[var(--surface)]/60 px-4 py-3 text-center text-xs text-[var(--fg-subtle)]">
        {turn.text}
      </div>
    );
  }
  const mine = turn.role === 'user';
  return (
    <div className={`flex flex-col ${mine ? 'items-start' : 'items-end'}`}>
      <div
        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-5 py-4 leading-loose ${
          mine
            ? 'bg-[var(--surface-elev)] text-[var(--fg)]'
            : 'border border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[var(--fg)]'
        }`}
      >
        {!mine ? (
          <div className="mb-2 flex items-center gap-2 text-xs text-[var(--accent)]">
            <span className="diamond" /> مَجال
          </div>
        ) : null}
        {turn.text || <span className="text-[var(--fg-subtle)]">…</span>}
      </div>
      {!mine && 'tools' in turn && turn.tools && turn.tools.length > 0 ? (
        <div className="mt-2 flex max-w-[85%] flex-wrap justify-end gap-2">
          {turn.tools.map((t, i) => (
            <ToolBadge key={i} event={t} />
          ))}
        </div>
      ) : null}
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
