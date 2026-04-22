import Link from 'next/link';
import { redirect } from 'next/navigation';
import { readSessionId } from '@/lib/session';
import { loadAgentHistory, loadSession } from '@/lib/vault';
import { ChatWorkspace } from './ChatWorkspace';
import { LogoutButton } from './LogoutButton';

export const dynamic = 'force-dynamic';

export default async function ChatPage() {
  const sid = readSessionId();
  const session = sid ? await loadSession(sid) : null;
  if (!session) redirect('/connect');

  const history = await loadAgentHistory(sid!);
  const timeline = history
    .filter((h) => h.role !== 'tool')
    .flatMap((h) => {
      const blocks = Array.isArray(h.content) ? (h.content as any[]) : [];
      const text = blocks
        .filter((b) => b?.type === 'text')
        .map((b) => b.text)
        .join('\n')
        .trim();
      return text ? [{ role: h.role as 'user' | 'assistant', text, at: h.created_at }] : [];
    });

  return (
    <main className="min-h-screen">
      <header className="border-b border-[var(--border)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-3">
            <span className="diamond text-[var(--accent)]" />
            <span className="font-display text-xl">ثمانية · العفريت</span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <div className="hidden text-right md:block">
              <div className="text-[var(--fg)]">{session.userName}</div>
              <div className="text-[var(--fg-subtle)]">{session.accountName}</div>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      <ChatWorkspace initialTimeline={timeline} accountName={session.accountName ?? 'حسابك'} />
    </main>
  );
}
