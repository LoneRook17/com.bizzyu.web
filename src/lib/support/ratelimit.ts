// Best-effort in-memory rate limiter: a short burst window plus a daily cap.
// Per serverless instance, so a determined abuser spread across instances gets
// a multiple of the limit — acceptable because auth is required, per-message
// cost is capped (~$0.01 worst case), and the Anthropic workspace spend limit
// is the hard backstop. If support volume grows, swap this for Upstash Redis
// or a Vercel WAF rate rule without changing the call site.

const BURST_WINDOW_MS = 10 * 60 * 1000
const BURST_MAX = 20 // messages per 10 minutes
const DAY_MS = 24 * 60 * 60 * 1000
const DAILY_MAX = 60 // messages per rolling 24h

const hits = new Map<string, number[]>()

export type RateResult = { ok: true } | { ok: false; reason: "burst" | "daily" }

export function checkRateLimit(key: string): RateResult {
  const now = Date.now()
  const arr = (hits.get(key) ?? []).filter((t) => now - t < DAY_MS)
  hits.set(key, arr)

  if (arr.length >= DAILY_MAX) return { ok: false, reason: "daily" }
  const recent = arr.filter((t) => now - t < BURST_WINDOW_MS).length
  if (recent >= BURST_MAX) return { ok: false, reason: "burst" }

  arr.push(now)
  // Opportunistic cleanup so the map doesn't grow unbounded.
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (v.every((t) => now - t >= DAY_MS)) hits.delete(k)
    }
  }
  return { ok: true }
}
