import { NextResponse } from 'next/server';
import { BasecampClient, BasecampError } from '@/lib/basecamp';
import { readSessionId } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const sid = readSessionId();
  if (!sid) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const client = await BasecampClient.forSession(sid);
  if (!client) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try {
    const projects = await client.listProjects('active');
    return NextResponse.json({
      projects: projects.map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        url: p.app_url,
        dock: p.dock?.map((d: any) => ({
          name: d.name,
          enabled: d.enabled,
          id: d.id,
          title: d.title,
        })),
      })),
    });
  } catch (err) {
    if (err instanceof BasecampError) {
      if (err.kind === 'unauthorized') {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
      }
      return NextResponse.json(
        { error: 'basecamp_error', detail: err.arabicMessage },
        { status: 502 },
      );
    }
    console.error('[api/basecamp/projects] unexpected:', err);
    return NextResponse.json({ error: 'unknown' }, { status: 500 });
  }
}
