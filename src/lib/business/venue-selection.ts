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

// What to persist to VENUE_STORAGE_KEY for a resolved selection (TF-ANALYTICS-
// EVENTS-F1). A concrete venue id is persisted so an explicit pick survives reload;
// "all" (the default AND the fallback the resolver returns when a stored/URL id is
// out of scope) returns null ⇒ CLEAR the key, so a stale out-of-scope id can never
// linger to be re-sent on the next load. Never persists a value the resolver didn't
// already clamp into scope.
export function persistedVenueValue(selection: VenueSelection): string | null {
  return typeof selection === "number" ? String(selection) : null
}

// ── Scope-404 degrade (TF-ANALYTICS-EVENTS-F1) ───────────────────────────────
//
// A venue-scoped dashboard fetch that carries a `?venue_id` OUTSIDE the caller's
// server effective scope is rejected by the services guard
// (intersectRequestedVenue, effectiveVenueScope.ts) with
//   Boom.notFound('Venue not found') → { statusCode: 404, error: 'Not Found',
//                                        message: 'Venue not found' }
// which the api-client surfaces as ApiError{ status:404, message:'Venue not
// found', body:{ statusCode:404, error:'Not Found', message:'Venue not found' } }.
// This happens when a stale/out-of-scope venue selection (persisted VENUE_STORAGE_
// KEY or a ?venue_id link) survives a scope narrowing — a true owner (global
// scope) never hits it. The dashboard must NOT wall on this: it means "your
// selected venue is no longer yours", which self-heals by resetting to All venues.
//
// Match echo-tolerantly: the 404 status plus the 'Venue not found' marker wherever
// the client landed it (ApiError.message, or body.message / body.error) — tolerant
// of the plain `{ error: 'Venue not found' }` variant some venue routes emit too.
// Deliberately narrow: a bare 404 with no venue marker stays a genuine error.

export function isVenueScopeNotFound(err: unknown): boolean {
  if (!err || typeof err !== "object") return false
  const e = err as {
    status?: number
    message?: unknown
    body?: { message?: unknown; error?: unknown }
  }
  if (e.status !== 404) return false
  const marker = "venue not found"
  const has = (v: unknown) => typeof v === "string" && v.toLowerCase().includes(marker)
  return has(e.message) || has(e.body?.message) || has(e.body?.error)
}
