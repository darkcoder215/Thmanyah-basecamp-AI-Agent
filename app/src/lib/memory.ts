import 'server-only';
import type Anthropic from '@anthropic-ai/sdk';
import { supabaseAdmin } from './supabase';
import { loadAgentHistory } from './vault';

/**
 * Rough token estimator — 1 token ≈ 3.5 characters for mixed Arabic/English
 * rich content. Close enough for trimming decisions; we're not billing on it.
 */
export function estimateTokens(content: unknown): number {
  const text = typeof content === 'string' ? content : JSON.stringify(content ?? '');
  return Math.ceil(text.length / 3.5);
}

export type HistoryTurn = {
  role: 'user' | 'assistant' | 'tool';
  content: unknown;
  created_at: string;
};

/**
 * Load history, then trim from the oldest end to fit a token budget while
 * preserving message-pair integrity (never orphan a tool_result without its
 * originating assistant tool_use).
 */
export async function loadWindowedHistory(
  sid: string,
  budgetTokens = 40_000,
  maxTurns = 80,
): Promise<Anthropic.MessageParam[]> {
  const rows = (await loadAgentHistory(sid, maxTurns)) as HistoryTurn[];
  if (rows.length === 0) return [];

  // Convert to Anthropic param format; treat `tool` role as the user-side turn
  // carrying tool_result blocks (that's how Anthropic expects them).
  const params: Anthropic.MessageParam[] = rows.map((r) => ({
    role: r.role === 'assistant' ? 'assistant' : 'user',
    content: r.content as any,
  }));

  // Trim from the front until within budget. Always keep at least the last
  // user turn so the model has something to respond to.
  let total = params.reduce((sum, p) => sum + estimateTokens(p.content), 0);
  while (total > budgetTokens && params.length > 1) {
    const dropped = params.shift()!;
    total -= estimateTokens(dropped.content);
  }

  // Guarantee the first kept message is a user-role turn (Anthropic rejects
  // conversations that start with assistant).
  while (params.length > 0 && params[0].role !== 'user') {
    params.shift();
  }

  return params;
}

export async function clearAgentHistory(sid: string): Promise<void> {
  const { error } = await supabaseAdmin().from('agent_messages').delete().eq('sid', sid);
  if (error) throw new Error(`Supabase clear failed: ${error.message}`);
}
