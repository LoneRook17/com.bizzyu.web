// Unit tests for the deal-stats typed client — funnel math + normalization,
// runnable with the Node built-in test runner (no extra deps): `npm test`.
//
// Guards the three things a contract shift or bad data would break: (1) numeric
// coercion (MySQL SUM() can serialize as strings), (2) divide-by-zero-safe
// step-through rates, and (3) the range-window math the picker depends on.

import { test } from "node:test"
import assert from "node:assert/strict"
import {
  normalizeStatRow,
  normalizeStatsResponse,
  normalizeDailyResponse,
  indexStatsByDeal,
  emptyStatRow,
  computeFunnel,
  funnelRenderMode,
  funnelEmptyCaption,
  stepRate,
  formatRate,
  rangeForDays,
  isoDate,
  type DealStatsResponse,
} from "./deal-stats.ts"

// A representative pinned-contract payload with a real deal, a zeros deal, and
// a claims-without-tracking deal (post-4.2.6 tracking still dark for that one).
const FIXTURE: DealStatsResponse = {
  range: { from: "2026-06-17", to: "2026-07-17", timezone: "US/Eastern" },
  deals: [
    { deal_id: 101, impressions: 1204, unique_impressions: 310, views: 402, unique_views: 180, claims: 47 },
    { deal_id: 102, impressions: 0, unique_impressions: 0, views: 0, unique_views: 0, claims: 0 },
    { deal_id: 103, impressions: 0, unique_impressions: 0, views: 0, unique_views: 0, claims: 12 },
  ],
}

test("normalizeStatRow: coerces MySQL string numerics and defaults missing to 0", () => {
  // deal_id + counts arriving as strings (SUM()/COUNT() serialization).
  const row = normalizeStatRow({
    deal_id: "101",
    impressions: "1204",
    unique_impressions: "310",
    views: "402",
    // unique_views + claims intentionally absent → must default to 0, not NaN.
  } as never)
  assert.equal(row.deal_id, 101)
  assert.equal(row.impressions, 1204)
  assert.equal(row.unique_impressions, 310)
  assert.equal(row.views, 402)
  assert.equal(row.unique_views, 0)
  assert.equal(row.claims, 0)
})

test("normalizeStatsResponse: tolerates a missing deals array and bad range", () => {
  const resp = normalizeStatsResponse({} as never)
  assert.deepEqual(resp.deals, [])
  assert.equal(resp.range.from, "")
  assert.equal(resp.range.timezone, "")
})

test("normalizeDailyResponse: coerces day rows, tolerates missing days", () => {
  const resp = normalizeDailyResponse({ deal_id: "101", days: [{ date: "2026-07-01", impressions: "5" }] } as never)
  assert.equal(resp.deal_id, 101)
  assert.equal(resp.days[0].impressions, 5)
  assert.equal(resp.days[0].views, 0)
  const empty = normalizeDailyResponse({ deal_id: 9 } as never)
  assert.deepEqual(empty.days, [])
})

test("indexStatsByDeal: joins by deal_id", () => {
  const idx = indexStatsByDeal(FIXTURE)
  assert.equal(idx.get(101)?.impressions, 1204)
  assert.equal(idx.get(102)?.impressions, 0)
  assert.equal(idx.get(999), undefined)
})

test("stepRate: divide-by-zero → 0, and clamps to [0,1]", () => {
  assert.equal(stepRate(5, 0), 0) // no denominator
  assert.equal(stepRate(0, 0), 0)
  assert.equal(stepRate(1, 4), 0.25)
  assert.equal(stepRate(10, 5), 1) // impossible >1 clamped (data anomaly)
  assert.equal(stepRate(-3, 5), 0) // negative clamped
})

test("computeFunnel: real deal → correct step-through rates", () => {
  const f = computeFunnel(FIXTURE.deals[0])
  assert.equal(f.impressions, 1204)
  assert.equal(f.views, 402)
  assert.equal(f.claims, 47)
  assert.equal(f.uniqueImpressions, 310)
  // views/impressions = 402/1204, claims/views = 47/402
  assert.ok(Math.abs(f.viewRate - 402 / 1204) < 1e-9)
  assert.ok(Math.abs(f.claimRate - 47 / 402) < 1e-9)
  assert.equal(f.hasTrackingData, true)
})

test("computeFunnel: all-zero deal → zero rates, no tracking data (no NaN)", () => {
  const f = computeFunnel(FIXTURE.deals[1])
  assert.equal(f.viewRate, 0)
  assert.equal(f.claimRate, 0)
  assert.equal(f.hasTrackingData, false)
  assert.ok(!Number.isNaN(f.viewRate) && !Number.isNaN(f.claimRate))
})

test("computeFunnel: claims but no tracking → hasTrackingData false (zero-state)", () => {
  // Deal 103: claims predate 4.2.6, impressions/views still dark.
  const f = computeFunnel(FIXTURE.deals[2])
  assert.equal(f.claims, 12)
  assert.equal(f.impressions, 0)
  assert.equal(f.views, 0)
  assert.equal(f.hasTrackingData, false) // → funnel shows zero-state copy
})

test("emptyStatRow: all-zero baseline for a deal with no rows", () => {
  const f = computeFunnel(emptyStatRow(555))
  assert.equal(f.impressions, 0)
  assert.equal(f.hasTrackingData, false)
})

// ── Render-mode decision (TF-E-W1: no more zero-state "coming soon" box) ─────
test("funnelRenderMode: all-zero funnel still renders the REAL funnel", () => {
  // Revert-check: pre-fix this rendered the 4.2.6 ZeroState box. A zeroed funnel
  // (no tracking data) must now resolve to 'funnel', NOT a special zero-state.
  const zeroed = computeFunnel(emptyStatRow(555))
  assert.equal(zeroed.hasTrackingData, false)
  assert.equal(funnelRenderMode({ loading: false, error: false, funnel: zeroed }), "funnel")
})

test("funnelRenderMode: claims-without-tracking funnel renders the funnel", () => {
  const f = computeFunnel(FIXTURE.deals[2]) // claims=12, impressions/views=0
  assert.equal(f.hasTrackingData, false)
  assert.equal(funnelRenderMode({ loading: false, error: false, funnel: f }), "funnel")
})

test("funnelRenderMode: populated funnel renders the funnel", () => {
  const f = computeFunnel(FIXTURE.deals[0])
  assert.equal(funnelRenderMode({ loading: false, error: false, funnel: f }), "funnel")
})

test("funnelRenderMode: loading and error win over any funnel", () => {
  const f = computeFunnel(FIXTURE.deals[0])
  assert.equal(funnelRenderMode({ loading: true, error: false, funnel: f }), "loading")
  assert.equal(funnelRenderMode({ loading: false, error: true, funnel: f }), "error")
  // loading takes precedence over a set error flag.
  assert.equal(funnelRenderMode({ loading: true, error: true, funnel: null }), "loading")
})

test("funnelRenderMode: no funnel (pre-fetch) → 'empty' (renders nothing)", () => {
  assert.equal(funnelRenderMode({ loading: false, error: false, funnel: null }), "empty")
})

test("funnelEmptyCaption: unavailable → subtle 'No data yet', not the 4.2.6 copy", () => {
  const cap = funnelEmptyCaption({ unavailable: true, loading: false, error: false })
  assert.equal(cap, "No data yet")
  assert.ok(!/4\.2\.6|app update/i.test(cap ?? "")) // never the retired coming-soon copy
})

test("funnelEmptyCaption: available / loading / error → no caption", () => {
  assert.equal(funnelEmptyCaption({ unavailable: false, loading: false, error: false }), null)
  assert.equal(funnelEmptyCaption({ unavailable: true, loading: true, error: false }), null)
  assert.equal(funnelEmptyCaption({ unavailable: true, loading: false, error: true }), null)
})

test("formatRate: one-decimal percent", () => {
  assert.equal(formatRate(0), "0.0%")
  assert.equal(formatRate(0.25), "25.0%")
  assert.equal(formatRate(402 / 1204), "33.4%")
  assert.equal(formatRate(1), "100.0%")
})

test("rangeForDays: inclusive window ending on the given day", () => {
  const now = new Date(2026, 6, 17) // 2026-07-17 (month is 0-indexed)
  assert.deepEqual(rangeForDays(30, now), { from: "2026-06-18", to: "2026-07-17" })
  assert.deepEqual(rangeForDays(7, now), { from: "2026-07-11", to: "2026-07-17" })
  assert.deepEqual(rangeForDays(1, now), { from: "2026-07-17", to: "2026-07-17" })
})

test("isoDate: zero-pads month and day", () => {
  assert.equal(isoDate(new Date(2026, 0, 5)), "2026-01-05")
  assert.equal(isoDate(new Date(2026, 11, 31)), "2026-12-31")
})
