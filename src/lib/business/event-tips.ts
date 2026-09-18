// Tips on event analytics (Tipping Slice 3).
//
// `revenue.revenue` on `GET /business/insights/events/:id` is door-only host
// take-home. Customer tips are NOT in it. The API reports them separately as
// `revenue.tips` (USD, e.g. 1.5). Tips are never revenue: the views render
// them as their own tile and never add them into a Revenue figure.
//
// The field is absent on services deploys that predate Slice 3, so every
// reader goes through eventTips() and treats missing / null / NaN / negative
// as 0. At 0 the Tips tile is hidden, so a business with tipping off sees the
// same analytics as before.
//
// No imports on purpose, so `node --test` can load this file on its own.

type RevenueWithTips = {
  tips?: unknown
  take_home_with_tips?: unknown
} | null | undefined

export const TIPS_TILE_TITLE = "Tips"

export const TIPS_TILE_CAPTION = "Customer tips. Not included in Revenue."

function safeUsd(value: unknown): number {
  const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value
  if (typeof n !== "number" || !Number.isFinite(n) || n <= 0) return 0
  return n
}

/** Customer tips for the event in USD. Missing, null, NaN or negative reads as 0. */
export function eventTips(revenue: RevenueWithTips): number {
  return safeUsd(revenue?.tips)
}

/** The Tips tile renders only when there are tips to show. */
export function showTipsTile(revenue: RevenueWithTips): boolean {
  return eventTips(revenue) > 0
}

/**
 * API-computed Revenue plus tips in USD, or null when the API did not send it.
 * Display only, as a secondary caption on the Tips tile. The web never
 * computes this sum itself and never shows it in place of Revenue.
 */
export function takeHomeWithTips(revenue: RevenueWithTips): number | null {
  const n = safeUsd(revenue?.take_home_with_tips)
  return n > 0 ? n : null
}
