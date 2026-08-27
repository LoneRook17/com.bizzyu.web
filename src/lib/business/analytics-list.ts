// Compact Analytics list preview (Luke QA).
//
// Upcoming events was rendering every row as a full-width ledger and growing
// the page. Weekly Access program nights already show a ~4-item PREVIEW, not
// the whole calendar. Analytics lists use the same idea: cap visible height
// at about 4 collapsed rows, then scroll (overflow-y auto). Do not paginate
// with 4 weeks / 12 weeks / 6 months.
//
// Collapsed Event / Deal row ≈ 82px (p-4 + 48px thumb + card border).
// Weekly Access instance row is a few px taller. 24rem (384px) fits about
// four of either, with a sliver of the next row as a scroll hint.
// Badge counts stay as the full list length. Metrics and API are unchanged.

export const ANALYTICS_LIST_PREVIEW_ROW_COUNT = 4

export const ANALYTICS_LIST_PREVIEW_CLASS =
  "max-h-[24rem] overflow-y-auto overscroll-contain"

export const ANALYTICS_LIST_FULL_CLASS = "min-h-0"

export type AnalyticsListSection = "upcoming" | "past"

function eventSortKey(event: { start_date_time?: string | null; end_date_time?: string | null }): string {
  return event.start_date_time || event.end_date_time || ""
}

/**
 * Most recent (soonest / just-happened) at the top, furthest at the bottom.
 * Upcoming is nearest-first. Past is most-recently-ended first.
 */
export function sortAnalyticsEvents<
  T extends { start_date_time?: string | null; end_date_time?: string | null },
>(events: T[], section: AnalyticsListSection): T[] {
  const copy = [...events]
  copy.sort((a, b) => {
    const cmp = eventSortKey(a).localeCompare(eventSortKey(b))
    return section === "past" ? -cmp : cmp
  })
  return copy
}
