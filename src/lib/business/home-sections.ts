// Which product sections the business dashboard HOME page shows (LSK-19).
//
// The bug: a venue that only sells line skips opened /business to Revenue $0,
// Attendees 0, Upcoming events 0 and a "Create an event" button for a product
// it does not run. Nephews sold three passes this morning and its dashboard was
// indistinguishable from a venue that has never sold anything.
//
// The rule is PRESENCE, never revenue:
//   • the EVENTS section shows iff the business has ANY event, past or upcoming
//   • the SKIP THE LINE section shows iff the business has ANY night scheduled
// Paddock Bar has 27 nights and no sales; Munchies has 23 events and $0. A
// revenue gate would hand both an empty page instead of a truthful zero.
//
// Presence is ANDed with the dashboard mode, which stays the operator's own
// switch: presence decides whether a product is REAL for this business, mode
// decides whether they want to see it.
//
// Kept as a pure function (and not inline in page.tsx) so every shape can be
// pinned by `npm test` without rendering React — same shape as the LSK-23
// analytics landing-tab decision next door.

export type HomeSectionsInput = {
  /** Every event ever posted (any status but deleted) — DashboardSummary.total_events. */
  totalEvents: number
  /** Has this business EVER scheduled a night — QuickStats.has_line_skip_nights. */
  hasLineSkipNights: boolean
  /** Dashboard-mode flags, from MODE_CONFIG. */
  showEvents: boolean
  showLineSkips: boolean
  showDeals: boolean
}

export type HomeSections = {
  /** Event tiles, the upcoming-events card, and its "Create an event" empty state. */
  events: boolean
  /** The "Skip the Line" figure row. */
  lineSkips: boolean
  /**
   * The event revenue tile. NOT simply `events`: this tile rendered in EVERY
   * mode before LSK-19, so gating it on events alone would quietly take it off
   * a deals-only business's page — a change nobody asked for. It goes only in
   * the case that motivated LSK-19, a venue with neither events nor deals,
   * where it can only ever read $0 and the Skip the Line row carries the money.
   */
  revenueTile: boolean
  /** The live-deals card. It only ever rendered when the events card did not. */
  dealsCard: boolean
  /** How many tiles the top row will render — drives its column count. */
  tileCount: number
}

export function homeSections(input: HomeSectionsInput): HomeSections {
  const { totalEvents, hasLineSkipNights, showEvents, showLineSkips, showDeals } = input

  const events = showEvents && totalEvents > 0
  const lineSkips = showLineSkips && hasLineSkipNights
  const revenueTile = events || showDeals
  const dealsCard = !events && showDeals

  // Mirrors the tiles page.tsx renders: revenue, active deals, claims
  // (deals-mode only), then attendees + upcoming as a pair.
  const tileCount =
    (revenueTile ? 1 : 0) +
    (showDeals ? 1 : 0) +
    (showDeals && !showEvents ? 1 : 0) +
    (events ? 2 : 0)

  return { events, lineSkips, revenueTile, dealsCard, tileCount }
}
