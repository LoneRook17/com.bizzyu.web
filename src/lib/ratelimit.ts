/**
 * Best-effort in-memory rate limiter for public form endpoints: a short burst
 * window plus a rolling daily cap, keyed by whatever the caller passes (the
 * client IP, normally).
 *
 * Per serverless instance, so a determined abuser spread across instances gets
 * a multiple of the limit. That is acceptable for a form that also sits behind
 * Turnstile and a honeypot: the goal is to stop a script hammering one
 * instance, not to be a WAF. If a form ever needs a hard global limit, swap in
 * Upstash Redis or a Vercel WAF rate rule without changing the call site.
 *
 * lib/support/ratelimit.ts predates this and keeps its own numbers; this one
 * exists so each form can pick limits that fit it.
 */

export interface RateLimitOptions {
  burstWindowMs: number;
  burstMax: number;
  dailyMax: number;
}

export type RateResult = { ok: true } | { ok: false; reason: "burst" | "daily" };

const DAY_MS = 24 * 60 * 60 * 1000;

export function createRateLimiter(opts: RateLimitOptions) {
  const hits = new Map<string, number[]>();

  return function check(key: string): RateResult {
    const now = Date.now();
    const arr = (hits.get(key) ?? []).filter((t) => now - t < DAY_MS);
    hits.set(key, arr);

    if (arr.length >= opts.dailyMax) return { ok: false, reason: "daily" };
    const recent = arr.filter((t) => now - t < opts.burstWindowMs).length;
    if (recent >= opts.burstMax) return { ok: false, reason: "burst" };

    arr.push(now);
    if (hits.size > 5000) {
      for (const [k, v] of hits) {
        if (v.every((t) => now - t >= DAY_MS)) hits.delete(k);
      }
    }
    return { ok: true };
  };
}
