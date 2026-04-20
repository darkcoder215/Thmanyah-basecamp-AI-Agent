'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';

type Turn = { role: 'user' | 'assistant'; text: string; at?: string };

const SUGGESTIONS = [
  'اعرض مشاريعي النشطة',
  'ما المهام المستحقّة عليّ اليوم؟',
  'أضف مهمة «مراجعة الحلقة» لقائمة الإنتاج واسندها لأحمد',
  'انشر تحديثاً على لوحة رسائل مشروع «موسم 4»',
];

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
  const [tools, setTools] = useState<Array<{ name: string; ok: boolean; error?: string }>>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [timeline, pending]);

  async function send(message: string) {
    const text = message.trim();
    if (!text || pending) return;
    setError(null);
    setTools([]);
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
        setTimeline((t) => [...t, { role: 'assistant', text: data.reply }]);
        setTools(data.tools ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطأ غير معروف');
    } finally {
      setPending(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    send(input);
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
            <Welcome accountName={accountName} onPick={send} />
          ) : (
            <div className="space-y-6">
              {timeline.map((t, i) => (
                <Bubble key={i} role={t.role} text={t.text} />
              ))}
              {pending ? <Thinking /> : null}
            </div>
          )}
        </div>

        <form
          onSubmit={onSubmit}
          className="border-t border-[var(--border)] px-4 py-4"
        >
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
          {error ? (
            <p className="mt-3 text-sm text-[var(--danger)]">⚠ {error}</p>
          ) : null}
        </form>
      </div>

      <aside className="space-y-6">
        <Panel title="اقتراحات">
          <ul className="space-y-2 text-sm">
            {SUGGESTIONS.map((s) => (
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

        <Panel title="الأدوات المُستدعاة">
          {tools.length === 0 ? (
            <p className="text-sm text-[var(--fg-subtle)]">لا توجد أدوات في الجلسة بعد.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {tools.map((t, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between rounded-md border border-[var(--border)] px-3 py-2"
                >
                  <code className="font-text text-[var(--fg)]">{t.name}</code>
                  <span
                    className={
                      t.ok
                        ? 'text-xs text-[var(--accent)]'
                        : 'text-xs text-[var(--danger)]'
                    }
                  >
                    {t.ok ? 'نجحت' : 'فشلت'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="الأمان">
          <p className="text-sm leading-loose text-[var(--fg-muted)]">
            كل الاتصالات ببيسكامب تتم من خادم ثمانية. رموز الوصول مُشفَّرة على Supabase ولا تغادر
            الخادم أبداً.
          </p>
        </Panel>
      </aside>
    </section>
  );
}

function Bubble({ role, text }: { role: 'user' | 'assistant'; text: string }) {
  const mine = role === 'user';
  return (
    <div className={`flex ${mine ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-5 py-4 leading-loose ${
          mine
            ? 'bg-[var(--surface-elev)] text-[var(--fg)]'
            : 'bg-[var(--accent)]/10 text-[var(--fg)] border border-[var(--accent)]/30'
        }`}
      >
        {!mine ? (
          <div className="mb-2 flex items-center gap-2 text-xs text-[var(--accent)]">
            <span className="diamond" /> مَجال
          </div>
        ) : null}
        {text}
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
  onPick,
}: {
  accountName: string;
  onPick: (s: string) => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center py-10 text-center">
      <span className="diamond mb-6 text-[var(--accent)] text-3xl" />
      <h2 className="font-display text-3xl text-[var(--fg)]">
        أهلاً بك في <span className="text-[var(--accent)]">مَجال</span>
      </h2>
      <p className="mt-3 max-w-md leading-loose text-[var(--fg-muted)]">
        متصل بحساب «{accountName}». اطلب أي شيء من مشاريع بيسكامب بلغتك الطبيعية، وسأتحقق منك
        قبل أي تغيير.
      </p>
      <div className="mt-8 grid w-full max-w-lg gap-2">
        {SUGGESTIONS.slice(0, 3).map((s) => (
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
