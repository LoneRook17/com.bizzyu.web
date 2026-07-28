// Composition model for an expanded deal row in the Analytics → Deals accordion
// (DealsOverview). Splitting the "what renders" decision out of the JSX keeps it
// unit-testable under the repo's pure-helper test pattern (no JSX renderer).
//
// TF-ANALYTICS-W-F1: the engagement funnel (DealFunnel) now renders inside every
// expanded panel, wired with the deal's own id. It is INDEPENDENT of the
// claims-detail fetch (/business/analytics/deals/:id): the funnel self-fetches
// its own DI-B3s stats and self-degrades to a zero-filled funnel, so it must NOT
// be gated behind the claims-detail load/error branch. This model captures that
// contract — funnelDealId is always present; `claims` only drives the separate
// claims-over-time + supply sub-section.

export type ClaimsDetailState = "loading" | "loaded" | "error"

export interface DealPanelModel {
  /** The funnel is always rendered when expanded, wired with this deal id. */
  funnelDealId: number
  /** Independent state of the claims-over-time / supply-usage sub-section. */
  claims: ClaimsDetailState
}

/**
 * Resolve what an expanded deal panel renders. The funnel is unconditional
 * (given the deal id); the claims sub-section reflects the lazy detail fetch.
 */
export function dealPanelModel(args: {
  dealId: number
  detailLoading: boolean
  detail: unknown | null
}): DealPanelModel {
  const claims: ClaimsDetailState = args.detailLoading
    ? "loading"
    : args.detail
      ? "loaded"
      : "error"
  return { funnelDealId: args.dealId, claims }
}
