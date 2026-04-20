import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { BasecampClient, BasecampError } from '@/lib/basecamp';
import { env } from '@/lib/env';
import { readSessionId } from '@/lib/session';
import { appendAgentMessage, loadAgentHistory } from '@/lib/vault';
import { AGENT_TOOLS, dispatchTool, findSpec } from '@/lib/agentTools';
import { clearAgentHistory, loadWindowedHistory } from '@/lib/memory';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Vercel: the whole agent loop (many tool calls → many LLM turns) can take a
// while. 60s is the Pro/Enterprise ceiling; Hobby caps at 10s and this route
// will need upgrading there. Keep streaming so we never hit request timeouts.
export const maxDuration = 60;

const MODEL = 'claude-opus-4-7';
const MAX_TURNS = 8;
const MAX_TOOL_OUTPUT_CHARS = 8000;
const HISTORY_TOKEN_BUDGET = 40_000;

const SYSTEM_PROMPT = `أنت "مجال"، وكيل ثمانية الذكي لإدارة Basecamp باللغة العربية.

# القواعد الذهبية
- أجب دائماً بالعربية الفصحى المُبسَّطة، بلهجة مهنية هادئة تعكس هوية ثمانية.
- نفّذ مهام المستخدم عبر الأدوات المتاحة فقط — لا تخترع معرفات (IDs) أو بيانات.
- استخدم list_projects أولاً إذا لم يحدّد المستخدم المشروع، ثم get_project للحصول على dock (يحوي معرفات todoset / message_board / campfire).
- لخّص النتائج في قائمة عربية موجزة، لا تُظهر JSON خاماً.

# السلامة (بالغة الأهمية)
- قبل أي أداة تُحدِث تغييراً (إنشاء، تحديث، إسناد، نشر، تعليق، Campfire) أو أي إجراء لا رجعة فيه (حذف، إزالة عضو، نقل إلى المهملات):
  1) استدعِ الأداة دون confirmed. ستحصل على معاينة رسمية (preview) توضّح تأثير الإجراء بدقة.
  2) اعرض المعاينة للمستخدم بلغة عربية واضحة، مع تحذير إضافي للإجراءات التي لا يمكن التراجع عنها بسهولة.
  3) انتظر موافقة المستخدم الصريحة في رسالة لاحقة. لا تفترض الموافقة.
  4) عند الموافقة، أعد استدعاء الأداة نفسها بنفس المدخلات مع confirmed=true.
- إذا رفض المستخدم أو تردّد: لا تنفّذ، واقترح بديلاً أخف.
- إذا فشلت أداة، اعرض السبب بالعربية (مثل: انتهاء صلاحية الربط، عدم وجود صلاحيات، عنصر غير موجود) واقترح الخطوة التالية بدلاً من المحاولة مجدداً بلا تعديل.

# اقتراحات ذكية
- بعد كل خطوة، اقترح على المستخدم خطوة منطقية تالية (مثال: بعد list_projects → "هل تريد فتح أحدها؟"؛ بعد my_overdue → "هل أُعيد جدولة إحدى المتأخرات؟").`;

type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown }
  | { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean };

type PublicToolEvent = {
  name: string;
  risk: 'readonly' | 'write' | 'destructive';
  kind: 'ok' | 'preview' | 'error';
  effect?: string;
  warning?: string;
  error?: string;
  detail?: string;
};

function truncate(value: unknown, max = MAX_TOOL_OUTPUT_CHARS): string {
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  return text.length > max ? `${text.slice(0, max)}\n… [تم اختصار الناتج]` : text;
}

function stringifyResultForModel(result: any, specName: string): { text: string; isError: boolean } {
  if (result.kind === 'ok') {
    return { text: truncate(result.output ?? 'ok'), isError: false };
  }
  if (result.kind === 'preview') {
    const payload = {
      status: 'preview_required',
      risk: result.risk,
      effect: result.effect,
      warning: result.warning,
      instruction:
        'اعرض هذه المعاينة للمستخدم بالعربية ثم انتظر موافقته الصريحة. لا تنفّذ دون إعادة الاستدعاء بـ confirmed=true.',
      how_to_execute: `أعد استدعاء ${specName} بنفس المدخلات مع إضافة confirmed=true.`,
    };
    return { text: JSON.stringify(payload, null, 2), isError: false };
  }
  return {
    text: JSON.stringify(
      {
        status: 'error',
        message: result.message,
        detail: result.detail,
        http_status: result.httpStatus,
      },
      null,
      2,
    ),
    isError: true,
  };
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
  if (userText.length > 8000) {
    return NextResponse.json(
      { error: 'message_too_long', detail: 'الرسالة طويلة جداً. حدّها 8000 حرف.' },
      { status: 413 },
    );
  }

  const client = new Anthropic({ apiKey: env.anthropic.apiKey });

  // Load trimmed, token-aware history.
  const messages = await loadWindowedHistory(sid, HISTORY_TOKEN_BUDGET);

  const userBlocks: ContentBlock[] = [{ type: 'text', text: userText }];
  messages.push({ role: 'user', content: userBlocks as any });
  await appendAgentMessage(sid, 'user', userBlocks);

  const toolEvents: PublicToolEvent[] = [];
  let finalText = '';
  let stoppedEarly: string | null = null;

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    let response: Anthropic.Message;
    try {
      const stream = client.messages.stream({
        model: MODEL,
        max_tokens: 4096,
        system: [
          {
            type: 'text',
            text: SYSTEM_PROMPT,
            // System prompt + tool list rarely change → cache them across turns.
            cache_control: { type: 'ephemeral' },
          },
        ] as any,
        thinking: { type: 'adaptive' },
        tools: AGENT_TOOLS,
        messages,
      });
      response = await stream.finalMessage();
    } catch (err) {
      if (err instanceof Anthropic.RateLimitError) {
        return NextResponse.json(
          { error: 'rate_limited', detail: 'تم تجاوز حدّ Anthropic. انتظر ثوانٍ ثم حاول مجدداً.' },
          { status: 429 },
        );
      }
      if (err instanceof Anthropic.AuthenticationError) {
        return NextResponse.json(
          { error: 'anthropic_auth', detail: 'مفتاح Anthropic غير صالح. راجع إعدادات الخادم.' },
          { status: 500 },
        );
      }
      if (err instanceof Anthropic.APIError) {
        return NextResponse.json(
          { error: 'anthropic_error', detail: err.message, status: err.status },
          { status: 502 },
        );
      }
      return NextResponse.json(
        { error: 'unknown', detail: err instanceof Error ? err.message : 'خطأ غير معروف' },
        { status: 500 },
      );
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
      const spec = findSpec(tu.name);
      const risk = spec?.risk ?? 'readonly';
      const result = await dispatchTool(tu.name, tu.input, basecamp);

      toolEvents.push({
        name: tu.name,
        risk,
        kind: result.kind,
        effect: result.kind === 'preview' ? result.effect : undefined,
        warning: result.kind === 'preview' ? result.warning : undefined,
        error: result.kind === 'error' ? result.message : undefined,
        detail: result.kind === 'error' ? result.detail : undefined,
      });

      // Auth failure inside a tool → the session is dead. Stop early so the
      // client can redirect to /connect instead of burning more LLM calls.
      if (result.kind === 'error' && result.httpStatus === 401) {
        stoppedEarly = 'basecamp_unauthorized';
      }

      const { text, isError } = stringifyResultForModel(result, tu.name);
      toolResultBlocks.push({
        type: 'tool_result',
        tool_use_id: tu.id,
        content: text,
        is_error: isError,
      });
    }

    messages.push({ role: 'user', content: toolResultBlocks as any });
    await appendAgentMessage(sid, 'tool', toolResultBlocks);

    if (stoppedEarly) break;

    if (turn === MAX_TURNS - 1) {
      stoppedEarly = 'max_turns';
    }
  }

  if (stoppedEarly === 'basecamp_unauthorized') {
    return NextResponse.json(
      {
        reply:
          finalText ||
          'انتهت صلاحية الربط مع بيسكامب أثناء التنفيذ. يرجى إعادة الربط من صفحة الاتصال.',
        tools: toolEvents,
        reconnect: true,
      },
      { status: 200 },
    );
  }

  if (stoppedEarly === 'max_turns') {
    finalText =
      finalText ||
      'توقفتُ بعد الوصول إلى الحد الأقصى لخطوات التفكير. يرجى إعادة صياغة الطلب بصيغة أبسط أو تقسيمه.';
  }

  return NextResponse.json({
    reply: finalText || 'تم.',
    tools: toolEvents,
    turn_limit_hit: stoppedEarly === 'max_turns',
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

export async function DELETE() {
  const sid = readSessionId();
  if (!sid) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  await clearAgentHistory(sid);
  return NextResponse.json({ ok: true });
}
