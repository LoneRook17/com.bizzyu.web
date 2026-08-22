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
