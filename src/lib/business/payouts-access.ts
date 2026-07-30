// Owner-only Payouts gating — the ONE source of truth shared by the sidebar nav
// filter and the /business/payouts route guard, so the tab and the screen can
// never disagree. Pure (no React, no api-client import) → unit-testable under
// `node --test`, mirroring payouts.ts's isNotDeployed helper.
//
// Ruling (Luke, TF-B): Payouts is owner-only. Non-owners never see a FAIL — the
// nav item is hidden, and a direct visit renders a clean access state, never an
// error wall. A 403 on the reconcile endpoints despite an owner-looking session
// (a stale role) collapses to the same access state, not an error.

export type BusinessRole = "owner" | "manager" | "staff" | "promoter"

/** The single predicate: only the business owner may see Payouts. Drives BOTH the
 *  sidebar nav visibility and the route guard. `null`/undefined (no session yet)
 *  is treated as no access — safe default. */
export function canAccessPayouts(role: BusinessRole | null | undefined): boolean {
  return role === "owner"
}

/** What /business/payouts renders before any fetch: the owner container, or the
 *  clean access state for every other role. */
export type PayoutsGate = "owner" | "denied"

export function payoutsRouteGate(role: BusinessRole | null | undefined): PayoutsGate {
  return canAccessPayouts(role) ? "owner" : "denied"
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

/** Copy for the access state — shared by the route guard (non-owner direct visit)
 *  and the 403 fallback (stale owner session). Short, no error styling. */
export const PAYOUTS_ACCESS_COPY = {
  title: "Owner access only",
  description: "Payouts are only available to the business owner.",
} as const
