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
          سنفتح نافذة تسجيل الدخول الرسمية من 37signals. بعد موافقتك، نحفظ رمز الوصول مُشفَّراً
          على خوادم ثمانية فقط — لا يُرسَل إلى متصفحك في أي وقت، ويمكنك قطع الربط متى شئت.
        </p>

        <div className="mt-10 space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/60 p-6">
          <Row
            label="المصادقة"
            value="OAuth 2.0 (web_server) عبر launchpad.37signals.com"
          />
          <Row label="تخزين الرموز" value="AES-256-GCM داخل Supabase بمفتاح على الخادم" />
          <Row
            label="الملف الشخصي"
            value="قراءة هوية المستخدم الأساسية + الحساب الرئيسي في Basecamp 4"
          />
          <Row label="الصلاحيات" value="كل ما يستطيع حسابك فعله على بيسكامب" />
        </div>

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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-[var(--border)] pb-4 last:border-0 last:pb-0">
      <span className="text-sm text-[var(--fg-subtle)]">{label}</span>
      <span className="text-left text-sm text-[var(--fg)] font-text">{value}</span>
    </div>
  );
}
