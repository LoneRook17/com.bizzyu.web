// PAYOUTS-PER-PERSON-ACCESS — venue-scoped payouts, the WEB half. Pure decision
// logic for the scoped-member experience, mirroring the line-skips "pick a venue"
// pattern:
//
//   1. picker-state decision — when to show the calm "pick a venue" chooser
//      instead of firing an all-venues fetch that the server would 403.
//   2. venue-list source — which venues the chooser offers (payouts_access.venues,
//      falling back to a VENUE_SCOPE_REQUIRED 403 body's venues).
//   3. sibling-hide decision — a summary with scope_restricted:true means render
//      ONLY the venue tiles (no combined-account table / caveat / account totals).
//   4. out-of-scope fallback — a scoped member's fetch that 404s (selected venue
//      not in their set) folds into the picker, never an error/coming-soon.
//   5. switcher-sync intent — picking a venue sets the GLOBAL venue switcher to it
//      (identical to line skips), which re-scopes every venue-aware fetch.
//
// No React, no api-client import → unit-testable under `node --test`, exactly like
// payouts-access.ts and team-payouts-access.ts. The page/ReconcileView only render
// / wire what these functions decide.
//
// Contract (services feat/payouts-per-person-access, audited):
//   GET /business/auth/me → user.payouts_access:
//     { granted: bool, all_venues: bool, venues?: [{id,name}] }
//     (venues present ONLY when granted AND venue-scoped; owner/global → all_venues:true).
//   A SCOPED granted member calling any payouts endpoint with NO venue_id →
//     403 { code:'VENUE_SCOPE_REQUIRED', venues:[{id,name},…] }. Out-of-scope
//     venue_id → 404. In-scope venue_id → single-venue payloads, with summary
//     carrying scope_restricted:true (account totals / breakdown / shared_with_venues
//     OMITTED). Owner/global responses are byte-identical to today.

/** A venue the scoped member may see, as carried by /me payouts_access.venues and
 *  by the VENUE_SCOPE_REQUIRED 403 body. */
export interface ScopeVenue {
  id: number
  name: string
}

/** /me → user.payouts_access. `granted` = owner or owner-granted. `all_venues` =
 *  the full-account view (owner OR a global/all-venues granted member). `venues`
 *  is present ONLY when granted AND venue-scoped (all_venues:false). ABSENT on a
 *  pre-contract /me — the 403 fallback (scopeRequiredVenuesFromError) covers that. */
export interface PayoutsAccess {
  granted: boolean
  all_venues: boolean
  venues?: ScopeVenue[]
}

/** A scoped payouts member: granted access but NOT all-venues. Owner / global
 *  granted members are all_venues:true → NOT scoped, so the picker + sibling-hide
 *  paths are unreachable for them (their view stays byte-identical to today).
 *  Absent payouts_access (pre-contract /me) → not scoped from THIS signal; a
 *  VENUE_SCOPE_REQUIRED 403 still forces the picker via `scopeForced`. */
export function isScopedPayoutsMember(access: PayoutsAccess | null | undefined): boolean {
  return access?.granted === true && access.all_venues === false
}

/**
 * The picker-state decision. Render the "pick a venue" chooser (no payouts data,
 * no error styling — a calm chooser, exactly like line skips) when:
 *   • the global switcher is on All venues AND the caller is a scoped member, OR
 *   • a fetch already forced it — a VENUE_SCOPE_REQUIRED 403 (no venue chosen) or
 *     a scoped member's out-of-scope 404. `scopeForced` is only ever set for a
 *     provably-scoped caller (the server 403s / the /me flag gated the 404), so
 *     owner/global members can never reach it.
 *
 * Owner / global members (all_venues:true, scopeForced never set) → ALWAYS false.
 */
export function shouldShowVenuePicker(params: {
  isAllVenues: boolean
  access: PayoutsAccess | null | undefined
  scopeForced?: boolean
}): boolean {
  if (params.scopeForced === true) return true
  return isScopedPayoutsMember(params.access) && params.isAllVenues
}

/**
 * The chooser's venue list, per the contract's source order: payouts_access.venues
 * first (the /me signal), then the VENUE_SCOPE_REQUIRED 403 body's venues (for a
 * pre-contract /me that omitted payouts_access). Empty only in a degenerate case
 * (a granted-but-scoped member the server didn't hydrate) — the caller may then
 * fall back to the venue switcher's own restricted list.
 */
export function pickerVenueList(
  access: PayoutsAccess | null | undefined,
  scopeRequiredVenues: ScopeVenue[] | null | undefined,
): ScopeVenue[] {
  if (access?.venues && access.venues.length > 0) return access.venues
  if (scopeRequiredVenues && scopeRequiredVenues.length > 0) return scopeRequiredVenues
  return []
}

/** The scope_restricted marker a scoped-member /summary carries. Additive; absent
 *  (undefined) on every owner/global response, so those render exactly as today. */
export interface ScopeRestrictable {
  scope_restricted?: boolean
}

/**
 * SIBLING-HIDE decision. When a summary is scope_restricted the account-level
 * siblings — the combined-account breakdown table, the "Also includes deposits
 * for…" caveat, and the raw account totals — are OMITTED by the server and MUST
 * NOT render (they'd show $0.00 / empty pieces). The strip shows only the venue
 * tiles, so the layout reads as complete, not as missing pieces. Owner/global
 * summaries have no scope_restricted flag → false → full combined view, unchanged.
 */
export function hideCombinedAccount(summary: ScopeRestrictable | null | undefined): boolean {
  return summary?.scope_restricted === true
}

/**
 * Detect the services VENUE_SCOPE_REQUIRED 403 (a scoped member hit a payouts
 * endpoint with no venue_id) and return its venues so the page builds the picker
 * without a second call. null when the error isn't that 403 (leave it to the
 * existing forbidden/error handling). Defensive about the venue rows (coerce id,
 * tolerate a missing name) since it rides an untyped error body.
 */
export function scopeRequiredVenuesFromError(err: unknown): ScopeVenue[] | null {
  if (!err || typeof err !== "object") return null
  const e = err as { status?: number; body?: { code?: unknown; venues?: unknown } }
  if (e.status !== 403 || e.body?.code !== "VENUE_SCOPE_REQUIRED") return null
  const raw = Array.isArray(e.body?.venues) ? (e.body!.venues as unknown[]) : []
  return raw
    .map((v) => {
      const o = (v ?? {}) as { id?: unknown; name?: unknown }
      return { id: Number(o.id), name: typeof o.name === "string" ? o.name : String(o.name ?? "") }
    })
    .filter((v) => Number.isFinite(v.id))
}

/**
 * OUT-OF-SCOPE fallback. A scoped member's fetch that 404s means the selected
 * venue isn't in their set (services: out-of-scope venue_id → 404) — fold it into
 * the picker so they can re-choose, never a crash/error/coming-soon screen. Gated
 * on the caller being a scoped /me member: a 404 for an owner/global member is the
 * genuine "endpoint not deployed" signal (→ coming soon), left untouched. Takes
 * the ALREADY-classified reconcile outcome ("notdeployed" == the fetchers' 404 →
 * null), so this file stays free of the fetch layer.
 */
export function scoped404IsOutOfScope(
  access: PayoutsAccess | null | undefined,
  outcome: "ready" | "computing" | "notdeployed" | "forbidden" | "error",
): boolean {
  return isScopedPayoutsMember(access) && outcome === "notdeployed"
}

/** What picking a venue from the chooser intends: set the GLOBAL venue switcher to
 *  that id (the line-skips tab's exact behavior — one switcher, one source of
 *  truth), and clear any fetch-forced picker flag so the page leaves the chooser
 *  and renders that venue's payouts. Never targets "all" — the chooser only offers
 *  concrete accessible venues. Pure so the sync wiring is unit-tested. */
export interface VenuePickIntent {
  switcherVenueId: number
  clearScopeForced: true
}

export function venuePickIntent(id: number): VenuePickIntent {
  return { switcherVenueId: id, clearScopeForced: true }
}

/** Copy for the calm chooser — mirrors the line-skips "Pick a venue" empty state,
 *  worded for payouts. No error styling; this is a chooser, not a fault. */
export const PAYOUTS_VENUE_PICKER_COPY = {
  prompt: "Pick a venue to see payouts history for:",
} as const
