import Link from 'next/link';
import { redirect } from 'next/navigation';
import { readSessionId } from '@/lib/session';
import { loadSession } from '@/lib/vault';

export const dynamic = 'force-dynamic';

export default async function ConnectPage() {
  const sid = readSessionId();
  const session = sid ? await loadSession(sid) : null;
  if (session) redirect('/chat');

  return (
    <main className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="diamond text-[var(--accent)]" />
          <span className="font-display text-xl">ثمانية</span>
        </Link>
      </header>

      <section className="mx-auto max-w-xl px-6 py-16">
        <p className="mb-4 text-sm uppercase tracking-[0.3em] text-[var(--fg-subtle)]">خطوة واحدة</p>
        <h1 className="font-display text-4xl leading-tight">اربط حسابك في بيسكامب</h1>
        <p className="mt-5 leading-loose text-[var(--fg-muted)]">
          سنفتح نافذة تسجيل الدخول الرسمية الخاصة ببيسكامب. بعد موافقتك، تعود إلى العفريت
          جاهزاً للعمل. يمكنك قطع الربط متى شئت.
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <a
            href="/api/auth/login"
            className="inline-flex flex-1 items-center justify-center gap-3 rounded-full bg-[var(--accent)] px-6 py-4 font-medium text-[var(--accent-fg)] transition hover:bg-[var(--accent-hover)]"
          >
            متابعة إلى بيسكامب
            <span className="diamond" />
          </a>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-[var(--border-strong)] px-6 py-4 text-[var(--fg-muted)] hover:bg-[var(--surface)] hover:text-[var(--fg)]"
          >
            رجوع
          </Link>
        </div>
      </section>
    </main>
  );
}
