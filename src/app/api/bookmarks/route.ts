import { NextRequest, NextResponse } from 'next/server';
import { readSessionId } from '@/lib/session';
import { assertSameOrigin } from '@/lib/csrf';
import { saveBookmark, listBookmarks, deleteBookmark } from '@/lib/vault';
import { rateLimit } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_CONTENT = 8_000;
const MAX_NOTE = 500;

export async function GET() {
  const sid = readSessionId();
  if (!sid) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try {
    const bookmarks = await listBookmarks(sid);
    return NextResponse.json({ bookmarks });
  } catch (err) {
    return NextResponse.json(
      { error: 'server_error', detail: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const sid = readSessionId();
  if (!sid) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const csrf = assertSameOrigin(req);
  if (csrf) return NextResponse.json({ error: 'forbidden', detail: csrf }, { status: 403 });

  const rl = await rateLimit({ bucket: `bookmarks:${sid}`, limit: 30, windowSeconds: 60 });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }

  const b = (body ?? {}) as Record<string, unknown>;
  const content = typeof b.content === 'string' ? b.content.trim() : '';
  const note = typeof b.note === 'string' ? b.note.trim() : null;
  const source = typeof b.source === 'string' ? b.source.trim() : null;
  if (!content) return NextResponse.json({ error: 'content_required' }, { status: 400 });
  if (content.length > MAX_CONTENT) {
    return NextResponse.json({ error: 'content_too_long', max: MAX_CONTENT }, { status: 400 });
  }
  if (note && note.length > MAX_NOTE) {
    return NextResponse.json({ error: 'note_too_long', max: MAX_NOTE }, { status: 400 });
  }

  try {
    const bookmark = await saveBookmark(sid, content, note, source);
    return NextResponse.json({ bookmark }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    const status = msg.startsWith('bookmark limit reached') ? 409 : 500;
    return NextResponse.json({ error: 'save_failed', detail: msg }, { status });
  }
}

export async function DELETE(req: NextRequest) {
  const sid = readSessionId();
  if (!sid) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const csrf = assertSameOrigin(req);
  if (csrf) return NextResponse.json({ error: 'forbidden', detail: csrf }, { status: 403 });

  const id = req.nextUrl.searchParams.get('id');
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: 'id_required' }, { status: 400 });
  }

  try {
    await deleteBookmark(sid, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: 'delete_failed', detail: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    );
  }
}
