import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { BasecampClient } from '@/lib/basecamp';
import { env } from '@/lib/env';
import { readSessionId } from '@/lib/session';
import { appendAgentMessage, loadAgentHistory } from '@/lib/vault';
import { AGENT_TOOLS, dispatchTool } from '@/lib/agentTools';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MODEL = 'claude-opus-4-7';
const MAX_TURNS = 8;

const SYSTEM_PROMPT = `أنت "مجال"، وكيل ثمانية الذكي لإدارة Basecamp باللغة العربية.

# القواعد
- أجب دائماً باللغة العربية الفصحى المُبسَّطة، بلهجة مهنية هادئة تعكس هوية ثمانية.
- نفّذ مهام المستخدم عبر الأدوات المتاحة؛ لا تخترع معرفات (IDs) أو بيانات لم تطلبها الأداة.
- قبل استدعاء أي أداة تُحدِث تغييراً (إنشاء مشروع، دعوة/إزالة أشخاص، إنشاء/تحديث/إنهاء/إعادة فتح مهمة، نشر رسالة/تعليق، إرسال Campfire): اعرض ملخصاً للخطوة واطلب تأكيداً صريحاً من المستخدم، ثم نفّذ. إذا قال المستخدم في رسالته "نفّذ" أو "أكّدت" فلا حاجة لطلب التأكيد مرة أخرى لنفس الخطوة.
- استخدم list_projects أولاً إذا لم يحدّد المستخدم المشروع، ثم get_project للحصول على dock (يحتوي على معرفات todoset, message_board, campfire).
- كن موجزاً في الردود: لا تُظهر JSON خاماً، بل لخّص النتائج في قائمة عربية قصيرة.
- إن فشلت أداة، اعرض الخطأ بلغة واضحة واقترح بديلاً.`;

type Anthro = Anthropic;

type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown }
  | { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean };

type StoredTurn = { role: 'user' | 'assistant' | 'tool'; content: unknown };

function truncate(value: unknown, max = 8000): string {
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  return text.length > max ? `${text.slice(0, max)}\n… [تم اختصار الناتج]` : text;
}

function toMessages(history: StoredTurn[]): Anthropic.MessageParam[] {
  const out: Anthropic.MessageParam[] = [];
  for (const turn of history) {
    if (turn.role === 'user' || turn.role === 'assistant') {
      out.push({
        role: turn.role,
        content: turn.content as Anthropic.MessageParam['content'],
      });
    }
  }
  return out;
}

export async function POST(req: NextRequest) {
  const sid = readSessionId();
  if (!sid) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const basecamp = await BasecampClient.forSession(sid);
  if (!basecamp) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: { message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const userText = body.message?.trim();
  if (!userText) return NextResponse.json({ error: 'empty_message' }, { status: 400 });

  const client: Anthro = new Anthropic({ apiKey: env.anthropic.apiKey });

  const history = (await loadAgentHistory(sid)) as StoredTurn[];
  const messages: Anthropic.MessageParam[] = toMessages(history);

  const userBlocks: ContentBlock[] = [{ type: 'text', text: userText }];
  messages.push({ role: 'user', content: userBlocks as any });
  await appendAgentMessage(sid, 'user', userBlocks);

  const toolInvocations: Array<{ name: string; input: unknown; output: unknown; error?: string }> = [];

  let finalText = '';

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    let response: Anthropic.Message;
    try {
      const stream = client.messages.stream({
        model: MODEL,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        thinking: { type: 'adaptive' },
        tools: AGENT_TOOLS,
        messages,
      });
      response = await stream.finalMessage();
    } catch (err) {
      if (err instanceof Anthropic.RateLimitError) {
        return NextResponse.json(
          { error: 'rate_limited', detail: 'تم تجاوز حدّ الاستخدام. حاول بعد قليل.' },
          { status: 429 },
        );
      }
      if (err instanceof Anthropic.APIError) {
        return NextResponse.json(
          { error: 'anthropic_error', detail: err.message },
          { status: 502 },
        );
      }
      throw err;
    }

    messages.push({ role: 'assistant', content: response.content });
    await appendAgentMessage(sid, 'assistant', response.content);

    const textBlocks = response.content.filter(
      (b): b is Extract<Anthropic.ContentBlock, { type: 'text' }> => b.type === 'text',
    );
    if (textBlocks.length) finalText = textBlocks.map((b) => b.text).join('\n').trim();

    if (response.stop_reason !== 'tool_use') break;

    const toolUses = response.content.filter(
      (b): b is Extract<Anthropic.ContentBlock, { type: 'tool_use' }> => b.type === 'tool_use',
    );
    if (toolUses.length === 0) break;

    const toolResultBlocks: ContentBlock[] = [];
    for (const tu of toolUses) {
      try {
        const output = await dispatchTool(tu.name, tu.input, basecamp);
        toolInvocations.push({ name: tu.name, input: tu.input, output });
        toolResultBlocks.push({
          type: 'tool_result',
          tool_use_id: tu.id,
          content: truncate(output ?? 'ok'),
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        toolInvocations.push({ name: tu.name, input: tu.input, output: null, error: message });
        toolResultBlocks.push({
          type: 'tool_result',
          tool_use_id: tu.id,
          content: `فشل التنفيذ: ${message}`,
          is_error: true,
        });
      }
    }

    messages.push({ role: 'user', content: toolResultBlocks as any });
    await appendAgentMessage(sid, 'tool', toolResultBlocks);
  }

  return NextResponse.json({
    reply: finalText || 'تم.',
    tools: toolInvocations.map((t) => ({
      name: t.name,
      ok: !t.error,
      error: t.error,
    })),
  });
}

export async function GET() {
  const sid = readSessionId();
  if (!sid) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const history = await loadAgentHistory(sid);
  const timeline = history
    .filter((h) => h.role !== 'tool')
    .flatMap((h) => {
      const blocks = Array.isArray(h.content) ? h.content : [];
      const text = blocks
        .filter((b: any) => b?.type === 'text')
        .map((b: any) => b.text)
        .join('\n')
        .trim();
      return text ? [{ role: h.role, text, at: h.created_at }] : [];
    });
  return NextResponse.json({ timeline });
}
