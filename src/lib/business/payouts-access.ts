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

/** Which state the owner's Payouts screen shows after the reconcile fetch. */
export type ReconcileOutcome = "ready" | "notdeployed" | "forbidden" | "error"

/** Both endpoints resolved: `null` from either means P2-B1s isn't deployed (404
 *  degrades to null in the typed client) → a graceful "coming soon", never an
 *  error. Both present → render the reconciliation view. */
export function reconcileOutcomeFromData(
  summary: unknown | null,
  deposits: unknown | null,
): "ready" | "notdeployed" {
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
