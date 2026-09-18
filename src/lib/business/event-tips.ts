// Tips on event analytics (Tipping Slice 3).
//
// `revenue.revenue` on `GET /business/insights/events/:id` is door-only host
// take-home. Customer tips are NOT in it. The API reports them separately as
// `revenue.tips` (USD, e.g. 1.5). Tips are never revenue: the views render
// them as their own tile and never add them into a Revenue figure.
//
// The field is absent on services deploys that predate Slice 3, so every
// reader goes through eventTips() and treats missing / null / NaN / negative
// as 0. The Tips tile always renders, showing $0.00 when there are none, with
// TIPS_INFO_NOTE under the amount.
//
// No imports on purpose, so `node --test` can load this file on its own.

type RevenueWithTips = {
  tips?: unknown
  take_home_with_tips?: unknown
} | null | undefined

export const TIPS_TILE_TITLE = "Tips"

/** Info note under the Tips amount. Shared by every analytics view. */
export const TIPS_INFO_NOTE =
  "Tips are not included in Revenue. They are transferred to your business. Paying out workers from tips is your responsibility, however you choose to do it."

/** Revenue caption when the event has tips: the Stripe payout also carries them, so Revenue alone no longer matches it. */
export const REVENUE_CAPTION_WITH_TIPS = "Your take-home from sales. Tips are shown separately."

function safeUsd(value: unknown): number {
  const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value
  if (typeof n !== "number" || !Number.isFinite(n) || n <= 0) return 0
  return n
}

/** Customer tips for the event in USD. Missing, null, NaN or negative reads as 0. */
export function eventTips(revenue: RevenueWithTips): number {
  return safeUsd(revenue?.tips)
}

/** Header of the per-scanner Tips column on Door Performance. */
export const DOOR_TIPS_COLUMN_TITLE = "Tips"

/** Short hint under the Door Performance title. */
export const DOOR_TIPS_HINT = "Tips are shown separately and are not included in sales."

/** One Door Performance row's tips in USD. Missing, null, NaN or negative reads as 0. */
export function scannerTips(row: { tips?: unknown } | null | undefined): number {
  return safeUsd(row?.tips)
}

/** True when the event has tips. Picks the Revenue caption only, the Tips tile itself always renders. */
export function hasTips(revenue: RevenueWithTips): boolean {
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
