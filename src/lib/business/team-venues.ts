// TM-B2 — Venue-SET team membership: the ONE typed client for the #15 contract.
//
// Everything that touches the TM-B1 wire shape lives here so drift is a single
// file to reconcile. The contract (pinned with the services half):
//
//   • Team list rows gain  venues: [{ venue_id, name }]
//       - EMPTY / ABSENT array  ⇒ legacy: fall back to the scalar venue_id
//         (venue_id != null ⇒ single venue; venue_id == null ⇒ global). This is
//         what every current member sends today, so they render byte-identically.
//   • PUT /business/team/members/:id/venues { venue_ids: number[] }
//       - sets the pivot; an EMPTY array clears it ⇒ reverts to scalar/global.
//       - 400 when a venue isn't owned by the business.
//   • /business/auth/me MAY gain  user.venue_ids: number[]  (the caller's own
//     set) — absent on legacy deploys, where the scalar venue_id still governs.
//
// The additive-pivot / empty-is-legacy doctrine (recon TEAM_VENUESET_RECON.md):
// an empty set is GLOBAL, matching today's venue_id == null. Nothing here is a
// permission gate — venue scoping only narrows which venue's data is shown.
//
// This module is import-pure (no apiClient) so it runs under the repo's
// `node --test` runner. Callers do the transport:
//   apiClient.put(memberVenuesPath(id), memberVenuesPayload(venueIds))

/** One venue in a member's assigned set, as served by the set-aware team list. */
export interface MemberVenue {
  venue_id: number
  name: string
}

/** The subset of a team member this module reasons about (scalar + optional set). */
export interface MemberVenueScope {
  venue_id: number | null
  venue_name?: string | null
  venues?: MemberVenue[] | null
}

/** A `{ id, name }` venue as carried by the dashboard venue list. */
export interface NamedVenue {
  id: number
  name: string
}

/**
 * A member's EFFECTIVE venue scope as a plain id list, reconciling the additive
 * `venues` pivot against the legacy scalar `venue_id`:
 *
 *   • venues present & non-empty        → the set (the pivot rows)
 *   • venues absent/empty & venue_id set → [venue_id]  (legacy single-venue)
 *   • venues absent/empty & venue_id null→ []          (legacy global)
 *
 * An empty result means GLOBAL (all venues) — never "no access".
 */
export function memberVenueIds(member: MemberVenueScope): number[] {
  if (member.venues && member.venues.length > 0) {
    return member.venues.map((v) => v.venue_id)
  }
  return member.venue_id != null ? [member.venue_id] : []
}

/**
 * The logged-in user's own effective scope. Same reconciliation as
 * {@link memberVenueIds} but over the `/me` shape: an optional `venue_ids`
 * (new) layered over the scalar `venue_id` (always present). Legacy `/me`
 * payloads (no `venue_ids`) collapse to exactly today's scalar behavior.
 */
export function userVenueIds(user: { venue_id: number | null; venue_ids?: number[] | null } | null | undefined): number[] {
  if (!user) return []
  if (user.venue_ids && user.venue_ids.length > 0) return user.venue_ids
  return user.venue_id != null ? [user.venue_id] : []
}

/** Resolve a single venue id to a display name, preferring the member's own set. */
function venueName(id: number, member: MemberVenueScope, allVenues: NamedVenue[]): string {
  const fromSet = member.venues?.find((v) => v.venue_id === id)?.name
  if (fromSet) return fromSet
  if (member.venue_id === id && member.venue_name) return member.venue_name
  return allVenues.find((v) => v.id === id)?.name ?? `Venue #${id}`
}

/**
 * Human label for a member's scope, set-aware:
 *   • []        → "Global"
 *   • [X]       → "1 venue: X"
 *   • [X, Y, …] → "N venues: X, Y, …"
 */
export function venueScopeLabel(member: MemberVenueScope, allVenues: NamedVenue[] = []): string {
  const ids = memberVenueIds(member)
  if (ids.length === 0) return "Global"
  const names = ids.map((id) => venueName(id, member, allVenues))
  if (ids.length === 1) return `1 venue: ${names[0]}`
  return `${ids.length} venues: ${names.join(", ")}`
}

/**
 * Normalize a chosen id list into the PUT body: de-dup, drop non-finite, sort so
 * the pivot write is deterministic. An empty array is the "clear to global" signal.
 */
export function memberVenuesPayload(venueIds: number[]): { venue_ids: number[] } {
  const unique = Array.from(new Set(venueIds.filter((n) => Number.isFinite(n)))).sort((a, b) => a - b)
  return { venue_ids: unique }
}

/**
 * The set-aware PUT endpoint for a member's venue assignment. The transport:
 *   apiClient.put(memberVenuesPath(id), memberVenuesPayload(venueIds))
 * `[]` clears the pivot back to global; a 400 comes back when a venue isn't
 * owned by the business.
 */
export const memberVenuesPath = (memberId: number): string =>
  `/business/team/members/${memberId}/venues`

/**
 * The venue-switcher scope for the current user, derived from their effective
 * id set and the active venue list:
 *
 *   • 0 ids (global) → mode "global": no restriction, caller keeps today's
 *     default-selection logic untouched (grandfathered).
 *   • 1 id  (single) → mode "single": restrict to that one venue and HARD-LOCK
 *     to it — byte-identical to today's single-venue lock.
 *   • N ids (set)    → mode "set": restrict to those N venues; the switcher is
 *     usable across them + an "all-of-mine" (union) default.
 */
export function resolveSwitcherScope<T extends NamedVenue>(
  userIds: number[],
  activeVenues: T[],
): { mode: "global" | "single" | "set"; venues: T[]; lockedVenueId: number | null } {
  if (userIds.length === 0) {
    return { mode: "global", venues: activeVenues, lockedVenueId: null }
  }
  const restricted = activeVenues.filter((v) => userIds.includes(v.id))
  if (userIds.length === 1) {
    return { mode: "single", venues: restricted, lockedVenueId: userIds[0] }
  }
  return { mode: "set", venues: restricted, lockedVenueId: null }
}

/**
 * Initial switcher selection for a SET-scoped member, honoring a URL/stored
 * preference only when it points inside the set; otherwise defaults to
 * "all" (all-of-mine, the union). Never selects a venue outside the set.
 */
export function initialSetSelection(
  setVenueIds: number[],
  urlVenueId: string | null,
  stored: string | null,
): number | "all" {
  const inSet = (raw: string | null): number | null => {
    if (raw == null) return null
    const id = Number(raw)
    return Number.isInteger(id) && setVenueIds.includes(id) ? id : null
  }
  if (urlVenueId === "all") return "all"
  const fromUrl = inSet(urlVenueId)
  if (fromUrl != null) return fromUrl
  if (stored === "all") return "all"
  const fromStored = inSet(stored)
  if (fromStored != null) return fromStored
  return "all"
}
