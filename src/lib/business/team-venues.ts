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

// ── TM-B3 (#15b) — editor-scoped venue assignment (managers + invite) ────────
//
// The team-edit UI and the invite dialog both restrict WHICH venues a given
// EDITOR may assign, and MUST preserve venues the editor can't see:
//
//   • owner / GLOBAL manager (own set empty) → unrestricted: every venue is
//     selectable and "All venues (global)" is offered.
//   • SCOPED manager (own set non-empty)     → may only toggle their OWN venues;
//     "All venues (global)" is hidden; a member's venues OUTSIDE the manager's
//     set are LOCKED — shown, always preserved on save, never removable.
//   • staff / promoter                       → cannot edit venue scope.
//
// The server is the authority (a disallowed assignment returns 403
// VENUE_SCOPE_FORBIDDEN, see {@link isVenueScopeForbidden}); this only shapes
// the options so the UI never OFFERS an edit that would silently strip access
// the editor can't see, and so the locked ids ride along in every PUT.

/** The editing user, reduced to what venue-scope decisions need. */
export interface EditorScope {
  /** The editing user's business role. */
  role: string
  /** The editing user's own effective venue ids ({@link userVenueIds}). [] = global. */
  venueIds: number[]
}

/** What an editor may do to one member's venue scope. */
export interface VenueEditorModel {
  /** Venues the editor may toggle on/off. */
  selectableVenues: NamedVenue[]
  /** Whether "All venues (global)" is offered (empty set = global). */
  allowGlobal: boolean
  /** Out-of-scope ids the editor must NOT touch. Empty since the 2026-07-27
   *  ruling — a scoped manager never sees out-of-scope venues, and the server
   *  (not the client) preserves them. Retained for the commit normalizer and the
   *  unrestricted (owner/global) path, which is empty anyway. */
  lockedVenueIds: number[]
  /** Whether this editor may edit venue scope at all. */
  canEdit: boolean
}

/** True when the editor is a manager confined to a venue subset (not owner, not global). */
export function isScopedEditor(scope: EditorScope): boolean {
  return scope.role === "manager" && scope.venueIds.length > 0
}

/**
 * What `scope` may do to a member currently assigned `currentMemberIds`, over the
 * business `allVenues`. See the doctrine comment above.
 */
export function venueEditorModel(
  scope: EditorScope,
  currentMemberIds: number[],
  allVenues: NamedVenue[],
): VenueEditorModel {
  const canEdit = scope.role === "owner" || scope.role === "manager"
  // Owner or GLOBAL manager: unrestricted — full list, global offered, nothing locked.
  if (scope.role === "owner" || scope.venueIds.length === 0) {
    return { selectableVenues: allVenues, allowGlobal: true, lockedVenueIds: [], canEdit }
  }
  // SCOPED manager: own venues only, global hidden. Per Luke's 2026-07-27 ruling
  // a scoped manager never SEES the member's out-of-scope venues at all — not as
  // options, not as locked chips. `lockedVenueIds` is therefore empty: the client
  // sends only the in-scope selection and the SERVER preserves the target's
  // out-of-scope assignments (merge semantics unchanged). `currentMemberIds` is
  // no longer read here — kept in the signature for the unrestricted call sites
  // and back-compat.
  const own = new Set(scope.venueIds)
  return {
    selectableVenues: allVenues.filter((v) => own.has(v.id)),
    allowGlobal: false,
    lockedVenueIds: [],
    canEdit,
  }
}

/**
 * The venue_ids to PUT for an edit: the editor's selection, deduped + sorted.
 * `lockedVenueIds` is empty for every editor since the 2026-07-27 ruling (the
 * server preserves a target's out-of-scope venues, not the client), so this is
 * exactly the selection — which MAY be empty ⇒ clear-to-global for an
 * unrestricted editor (a scoped editor is guarded by minimum-one at the UI).
 */
export function editorCommitVenueIds(model: VenueEditorModel, selectedIds: number[]): number[] {
  return memberVenuesPayload([...model.lockedVenueIds, ...selectedIds]).venue_ids
}

/**
 * The invite dialog's initial venue selection for a given editor:
 *   • owner / global manager → [] (defaults to "All venues (global)").
 *   • scoped manager         → all of their own venues (satisfies minimum-one;
 *     they can pare it down but never to empty/global).
 */
export function inviteDefaultVenueIds(scope: EditorScope): number[] {
  if (scope.role === "owner" || scope.venueIds.length === 0) return []
  return [...scope.venueIds].sort((a, b) => a - b)
}

/**
 * The venue portion of an invite body. Emits the new `venue_ids` array AND a
 * back-compat scalar `venue_id` mirror (single → that id, else null) so an older
 * services deploy that reads only `venue_id` still scopes single/global invites
 * exactly as before ("omitted ⇒ today's behavior"). A multi-venue set degrades
 * to global on such a deploy — sets simply aren't expressible there.
 */
export function inviteVenuePayload(venueIds: number[]): { venue_ids: number[]; venue_id: number | null } {
  const ids = memberVenuesPayload(venueIds).venue_ids
  return { venue_ids: ids, venue_id: ids.length === 1 ? ids[0] : null }
}

/** Trigger/summary label for a raw id list (the invite dialog has no member row). */
export function venueIdsLabel(ids: number[], allVenues: NamedVenue[] = []): string {
  if (ids.length === 0) return "All venues (global)"
  const names = ids.map((id) => allVenues.find((v) => v.id === id)?.name ?? `Venue #${id}`)
  if (ids.length === 1) return names[0]
  return `${ids.length} venues: ${names.join(", ")}`
}

/**
 * Detect the services 403 VENUE_SCOPE_FORBIDDEN so the team UI can surface a
 * clean inline error with no state corruption. Tolerant of where the code lands
 * (a `code`/`error` field or embedded in the message) since the exact Boom shape
 * is pinned with the services half — reconcile the precise field with TM-B3s.
 */
export function isVenueScopeForbidden(err: unknown): boolean {
  if (!err || typeof err !== "object") return false
  const e = err as { status?: number; body?: { code?: unknown; error?: unknown }; message?: unknown }
  const code = typeof e.body?.code === "string" ? e.body.code : ""
  const bodyErr = typeof e.body?.error === "string" ? e.body.error : ""
  const msg = typeof e.message === "string" ? e.message : ""
  return (
    e.status === 403 &&
    (code === "VENUE_SCOPE_FORBIDDEN" ||
      bodyErr === "VENUE_SCOPE_FORBIDDEN" ||
      /VENUE_SCOPE_FORBIDDEN/.test(msg))
  )
}
