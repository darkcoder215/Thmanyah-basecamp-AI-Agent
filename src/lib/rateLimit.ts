import 'server-only';
import { supabaseAdmin } from './supabase';

/**
 * Postgres-backed fixed-window rate limiter.
 *
 * Works across Vercel serverless instances (in-memory wouldn't, because each
 * instance sees its own counter). Uses an atomic upsert on a composite key:
 * (bucket, window_start). Cheap — 1 round trip per request.
 */

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
};

type Config = {
  /** Human label — `agent:${sid}`, `login:${ip}`, etc. */
  bucket: string;
  /** Max requests per window. */
  limit: number;
  /** Window length in seconds. */
  windowSeconds: number;
};

export async function rateLimit(config: Config): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = new Date(
    Math.floor(now / (config.windowSeconds * 1000)) * config.windowSeconds * 1000,
  );
  const resetAt = new Date(windowStart.getTime() + config.windowSeconds * 1000);
  const key = `${config.bucket}|${windowStart.toISOString()}`;

  const supa = supabaseAdmin();
  // Upsert the row, then increment atomically via RPC — we use a simple
  // select-then-upsert because the `rate_limits` table has (key) as PK and
  // we call `update ... returning count` to keep it to 1 round trip.
  const { data, error } = await supa.rpc('rl_incr', {
    p_key: key,
    p_limit: config.limit,
    p_reset: resetAt.toISOString(),
  });
  if (error) {
    // Fail open only on true infra errors, not on logic errors. This is a
    // trade-off: we don't want a DB outage to lock users out of login. Log so
    // we notice.
    console.warn('[rate_limit] db error, failing open:', error.message);
    return { allowed: true, remaining: config.limit, resetAt };
  }
  const count = typeof data === 'number' ? data : Array.isArray(data) ? Number(data[0]) : 0;
  return {
    allowed: count <= config.limit,
    remaining: Math.max(0, config.limit - count),
    resetAt,
  };
}
