// Pure resolution of a member's initial venue selection on dashboard load.
//
// Two member shapes:
//  - Venue-RESTRICTED (userVenueId is a number): hard-locked to that one venue,
//    regardless of URL/localStorage. A restricted member can never see "all".
//  - GLOBAL / unrestricted (userVenueId is null): defaults to "All venues" so
//    venue-scoped fetches (Payouts, etc.) are not silently filtered to a single
//    venue. An explicit prior choice — a "venue_id" in the URL or a still-valid
//    id in localStorage — is respected; stale/absent selections fall back to "all".
//
// Extracted from venue-context.tsx so the decision is unit-testable without a DOM.

export type VenueSelection = number | "all" | null

export function resolveInitialVenueSelection(params: {
  userVenueId: number | null
  activeVenueIds: number[]
  urlVenueId: string | null
  storedVenueId: string | null
}): VenueSelection {
  const { userVenueId, activeVenueIds, urlVenueId, storedVenueId } = params

  // Venue-restricted members are hard-locked to their assigned venue.
  if (userVenueId !== null) {
    return userVenueId
  }

  // Global members: honor an explicit URL selection first (shareable links).
  if (urlVenueId === "all") {
    return "all"
  }
  if (urlVenueId !== null && activeVenueIds.includes(Number(urlVenueId))) {
    return Number(urlVenueId)
  }

  // Then a persisted explicit selection, if still valid.
  if (storedVenueId === "all") {
    return "all"
  }
  if (storedVenueId !== null && activeVenueIds.includes(parseInt(storedVenueId, 10))) {
    return parseInt(storedVenueId, 10)
  }

  // Default for a Global member: All venues — never a silent single-venue filter.
  return "all"
}
