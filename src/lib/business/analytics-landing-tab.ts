// Which analytics tab the page should land on (LSK-23).
//
// The page hardcoded <Tabs defaultValue="deals">. A venue that only sells line
// skips therefore opened on a blank Deals tab and had to know to click across.
//
// defaultValue cannot fix this: Radix consumes it on the FIRST render, which
// happens before any of the three fetches resolve, so there is nothing to be
// adaptive about yet. The page has to hold the tab itself and set it once the
// data is in — hence this module plus controlled `value` / `onValueChange`.
//
// `showEvents` is a ROLE gate (canViewEventAnalytics), not an offerings signal:
// it says whether the Events tab is RENDERED AT ALL. Landing on a tab that has
// no trigger and no content would show an empty page with no way back, so a
// hidden Events tab is never a candidate here.
//
// "Non-empty" is deliberately the same predicate each view uses to decide
// between its content and its EmptyState — DealsOverview `data.deals.length`,
// EventsOverview `data.events.length`, LineSkipsOverview `data.instances.length`.
// Anything else and the page could land on a tab that still looks blank.

export type AnalyticsTab = "deals" | "events" | "line-skips"

export interface AnalyticsTabData {
  /** False while any of the three fetches is still in flight. */
  settled: boolean
  /** Length of the array each view checks. A failed/forbidden fetch is 0. */
  dealsCount: number
  eventsCount: number
  lineSkipsCount: number
  /** Role gate. When false the Events tab does not exist in the DOM. */
  showEvents: boolean
}

/** The tab shown before anything resolves, and the fallback when all are empty. */
export const DEFAULT_ANALYTICS_TAB: AnalyticsTab = "deals"

/**
 * First non-empty of deals → events → line skips.
 *
 * All three empty (a brand-new business, or every fetch failed) falls back to
 * Deals: it is the leftmost tab and renders a "No deals yet" EmptyState that
 * tells the operator what to do, which beats an arbitrary pick.
 */
export function landingTab(d: AnalyticsTabData): AnalyticsTab {
  if (d.dealsCount > 0) return "deals"
  if (d.showEvents && d.eventsCount > 0) return "events"
  if (d.lineSkipsCount > 0) return "line-skips"
  return DEFAULT_ANALYTICS_TAB
}

/**
 * The set-once decision.
 *
 * Returns null — meaning "leave the tab alone" — unless this is the moment to
 * choose: the data has settled and nothing has pinned the tab yet. `pinned`
 * covers both the auto-selection already having happened and the user having
 * clicked a tab, so a later refetch (a venue switch, a revisit) never yanks the
 * operator off the tab they are reading.
 */
export function resolveLandingTab(d: AnalyticsTabData, pinned: boolean): AnalyticsTab | null {
  if (pinned || !d.settled) return null
  return landingTab(d)
}
