// Payouts gating — the ONE source of truth shared by the sidebar nav filter and
// the /business/payouts route guard, so the tab and the screen can never
// disagree. Pure (no React, no api-client import) → unit-testable under
// `node --test`, mirroring payouts.ts's isNotDeployed helper.
//
// PAYOUTS-PER-PERSON-ACCESS: Payouts was owner-only (TF-B). It is now the OWNER
// **OR** any member the owner has granted — the server tells us via /me
// (user.can_view_payouts, true for owner OR granted). Users WITHOUT access never
// see a FAIL: the nav item is hidden, and a direct visit renders a clean access
// state, never an error wall. A 403 on the reconcile endpoints despite an
// access-looking session (a just-revoked grant / stale role) collapses to the
// same access state, not an error.

export type BusinessRole = "owner" | "manager" | "staff" | "promoter"

/** The single predicate: may this user see Payouts? Drives BOTH the sidebar nav
 *  visibility and the route guard.
 *
 *  `canViewPayouts` is the server's per-user grant signal from /business/auth/me
 *  (true for the owner OR an owner-granted member) — the source of truth. The
 *  `role === "owner"` clause is (a) the backward-compat fallback for a
 *  pre-contract /me deploy that omits the field (owners never lose access), and
 *  (b) a belt-and-suspenders for owners on new deploys. `null`/undefined role +
 *  no grant (no session yet) → no access, a safe default with no flash. */
export function canAccessPayouts(
  role: BusinessRole | null | undefined,
  canViewPayouts?: boolean | null,
): boolean {
  return canViewPayouts === true || role === "owner"
}

/** What /business/payouts renders before any fetch: the access container, or the
 *  clean access state for a user without access. */
export type PayoutsGate = "owner" | "denied"

export function payoutsRouteGate(
  role: BusinessRole | null | undefined,
  canViewPayouts?: boolean | null,
): PayoutsGate {
  return canAccessPayouts(role, canViewPayouts) ? "owner" : "denied"
}

// ── Owner reconcile-fetch outcomes ───────────────────────────────────────────

/** Which state the owner's Payouts screen shows after the reconcile fetch.
 *  `computing` (services :125 cached-serve contract) = the cache key has never
 *  been computed; the page shows a non-alarming crunching state and polls. */
export type ReconcileOutcome = "ready" | "computing" | "notdeployed" | "forbidden" | "error"

/** Discriminated fetch results from the typed client (payouts-reconcile.ts);
 *  structural here so this file keeps zero imports (pure, node --test). */
interface FetchResultLike {
  kind: "ready" | "computing"
}

/** Both endpoints resolved. `computing` from either wins and is checked FIRST —
 *  during a mixed deploy one endpoint can be cold while the other 404s, and
 *  polling until ready is the safe read (never "coming soon" over a warming
 *  cache). Then `null` from either means the contract isn't deployed (404
 *  degrades to null in the typed client) → a graceful "coming soon", never an
 *  error. Both present and ready → render the reconciliation view. */
export function reconcileOutcomeFromData(
  summary: FetchResultLike | null,
  deposits: FetchResultLike | null,
): "ready" | "computing" | "notdeployed" {
  if (summary?.kind === "computing" || deposits?.kind === "computing") return "computing"
  return summary === null || deposits === null ? "notdeployed" : "ready"
}

/** A rejected reconcile fetch. A 403 (owner-looking session but the server says
 *  no — a stale role) is NOT an error wall; it collapses to the access state.
 *  Every other failure (5xx / network) is a genuine error → error + retry. */
export function reconcileOutcomeFromError(err: unknown): "forbidden" | "error" {
  return (err as { status?: number } | null)?.status === 403 ? "forbidden" : "error"
}

/** Copy for the access state — shared by the route guard (no-access direct visit)
 *  and the 403 fallback (a just-revoked grant / stale session). Short, no error
 *  styling. Reflects the grant model: owner OR a member they've granted. */
export const PAYOUTS_ACCESS_COPY = {
  title: "Payouts access needed",
  description: "Payouts are available to the business owner and any team member they grant access to.",
} as const
