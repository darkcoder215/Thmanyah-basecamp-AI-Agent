import { NextResponse } from 'next/server';
import { BasecampClient, BasecampError } from '@/lib/basecamp';
import { readSessionId } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Produces a handful of suggestions grounded in the user's real Basecamp
 * state. Falls back to generic suggestions on any failure — suggestions are
 * not worth blocking the UI over.
 */
export async function GET() {
  const sid = readSessionId();
  if (!sid) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const client = await BasecampClient.forSession(sid);
  if (!client) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const suggestions: string[] = [];

  try {
    const [projects, overdue, assignments] = await Promise.allSettled([
      client.listProjects('active'),
      client.myOverdue(),
      client.myAssignments(),
    ]);

    if (overdue.status === 'fulfilled') {
      const o = (overdue.value ?? {}) as Record<string, any[]>;
      const count =
        (o.under_a_week_late?.length ?? 0) +
        (o.over_a_week_late?.length ?? 0) +
        (o.over_a_month_late?.length ?? 0) +
        (o.over_three_months_late?.length ?? 0);
      if (count > 0) suggestions.push(`استعرِض ${count} مهمة متأخرة عليّ وأعطني أولوياتها`);
    }

    if (assignments.status === 'fulfilled') {
      const a = (assignments.value ?? {}) as { priorities?: any[]; non_priorities?: any[] };
      const count = (a.priorities?.length ?? 0) + (a.non_priorities?.length ?? 0);
      if (count > 0) suggestions.push(`لخّص مهامي المسندة (${count}) وقسّمها حسب المشروع`);
    }

    if (projects.status === 'fulfilled' && Array.isArray(projects.value)) {
      const first = projects.value[0];
      if (first?.name) {
        suggestions.push(`أعطني نظرة عامة على مشروع «${first.name}»`);
        suggestions.push(`أضف مهمة جديدة في مشروع «${first.name}»`);
      }
      if (projects.value.length > 1) {
        suggestions.push(`قارن بين ${projects.value.length} من مشاريعي النشطة`);
      }
    }
  } catch (err) {
    if (err instanceof BasecampError && err.kind === 'unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    // Otherwise fall through to generic suggestions below.
  }

  if (suggestions.length < 4) {
    const generic = [
      'اعرض مشاريعي النشطة',
      'ما جدولي لهذا الأسبوع؟',
      'لخّص آخر رسائل أحد مشاريعي',
      'أنشئ قائمة مهام جديدة',
    ];
    for (const g of generic) {
      if (suggestions.length >= 5) break;
      if (!suggestions.includes(g)) suggestions.push(g);
    }
  }

  return NextResponse.json({ suggestions: suggestions.slice(0, 5) });
}
