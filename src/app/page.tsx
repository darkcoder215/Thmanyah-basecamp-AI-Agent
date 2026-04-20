import Link from 'next/link';
import { readSessionId } from '@/lib/session';
import { loadSession } from '@/lib/vault';

export const dynamic = 'force-dynamic';

export default async function HomePage({
  searchParams,
}: {
  searchParams: { error?: string; detail?: string };
}) {
  const sid = readSessionId();
  const session = sid ? await loadSession(sid) : null;
  const authed = !!session;
  const error = searchParams?.error;

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-[0.08]">
        <div className="absolute -top-24 -right-24 h-[32rem] w-[32rem] rounded-full bg-[var(--accent)] blur-3xl" />
        <div className="absolute -bottom-32 -left-20 h-[28rem] w-[28rem] rounded-full bg-[#E79547] blur-3xl" />
      </div>

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-8">
        <div className="flex items-center gap-3">
          <span className="diamond text-[var(--accent)]" />
          <span className="font-display text-xl tracking-tight">ثمانية</span>
        </div>
        <nav className="flex items-center gap-6 text-sm text-[var(--fg-muted)]">
          <a
            href="https://thmanyah.com"
            target="_blank"
            rel="noreferrer"
            className="hover:text-[var(--fg)]"
          >
            عن ثمانية
          </a>
          {authed ? (
            <Link
              href="/chat"
              className="rounded-full bg-[var(--accent)] px-4 py-2 font-medium text-[var(--accent-fg)] transition hover:bg-[var(--accent-hover)]"
            >
              فتح الوكيل
            </Link>
          ) : (
            <Link
              href="/connect"
              className="rounded-full border border-[var(--border-strong)] px-4 py-2 text-[var(--fg)] hover:bg-[var(--surface)]"
            >
              ربط بيسكامب
            </Link>
          )}
        </nav>
      </header>

      <section className="relative z-10 mx-auto max-w-4xl px-6 pt-16 pb-24 text-center">
        <p className="mb-6 text-sm uppercase tracking-[0.3em] text-[var(--fg-subtle)]">
          وكيل ثمانية الذكي
        </p>
        <h1 className="font-display text-5xl font-medium leading-tight text-[var(--fg)] md:text-7xl">
          مَجال
          <span className="mx-3 text-[var(--accent)]">·</span>
          <span className="text-[var(--fg-muted)]">إدارة بيسكامب بالعربية</span>
        </h1>
        <p className="mx-auto mt-8 max-w-2xl text-lg leading-loose text-[var(--fg-muted)] md:text-xl">
          اربط حسابك في <span className="text-[var(--fg)]">Basecamp</span> مرة واحدة، ثم اطلب ما
          تشاء بلغتك: افتح المشاريع، أضف مهام، ادعُ أعضاء جدد، علِّق على رسائل، وأغلق ما اكتمل.
          كلّ شيء يحدث على خوادم ثمانية بأمان كامل، دون أن تُخزَّن أسرارك في المتصفح.
        </p>

        <div className="mt-12 flex flex-col items-center justify-center gap-4 md:flex-row">
          {authed ? (
            <Link
              href="/chat"
              className="group inline-flex items-center gap-3 rounded-full bg-[var(--accent)] px-8 py-4 text-base font-medium text-[var(--accent-fg)] transition hover:bg-[var(--accent-hover)]"
            >
              افتح مَجال
              <span className="diamond transition group-hover:rotate-[135deg]" />
            </Link>
          ) : (
            <Link
              href="/connect"
              className="group inline-flex items-center gap-3 rounded-full bg-[var(--accent)] px-8 py-4 text-base font-medium text-[var(--accent-fg)] transition hover:bg-[var(--accent-hover)]"
            >
              ابدأ بربط بيسكامب
              <span className="diamond transition group-hover:rotate-[135deg]" />
            </Link>
          )}
          <a
            href="#features"
            className="rounded-full border border-[var(--border-strong)] px-8 py-4 text-[var(--fg-muted)] transition hover:bg-[var(--surface)] hover:text-[var(--fg)]"
          >
            ماذا يستطيع أن يفعل؟
          </a>
        </div>

        {error ? (
          <div className="mx-auto mt-10 max-w-md rounded-lg border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]">
            تعذّر إتمام الربط: {error === 'oauth_state' ? 'تحقّق أمني غير ناجح.' : 'خطأ من بيسكامب.'}
          </div>
        ) : null}
      </section>

      <section id="features" className="relative z-10 mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              title: 'مشاريع وفريق',
              body: 'اعرض المشاريع النشطة، أنشئ واحداً جديداً، وادعُ الأعضاء عبر الاسم أو البريد.',
            },
            {
              title: 'مهام وجدول',
              body: 'أضِف مهمة، أسندها لشخص، حدِّد تاريخ استحقاقها، أو اعرض قائمة اليوم عليك.',
            },
            {
              title: 'رسائل وتعليقات',
              body: 'انشر تحديثاً على لوحة المشروع، أو علِّق على مهمة، أو أرسل سطراً في Campfire.',
            },
          ].map((card) => (
            <div
              key={card.title}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/60 p-7 backdrop-blur"
            >
              <span className="diamond mb-5 block text-[var(--accent)]" />
              <h3 className="font-display text-2xl text-[var(--fg)]">{card.title}</h3>
              <p className="mt-3 leading-loose text-[var(--fg-muted)]">{card.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="relative z-10 border-t border-[var(--border)] px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-[var(--fg-subtle)] md:flex-row">
          <span>© ثمانية — صُنع في الرياض.</span>
          <span className="font-text">المصادقة تتم على الخادم. لا أسرار على المتصفح.</span>
        </div>
      </footer>
    </main>
  );
}
