// Role-based dashboard hardening for the deals + analytics surfaces
// (TF-K-WEB-HARDENING). Pure (no React, no api-client import) → unit-testable
// under `node --test`, mirroring payouts-access.ts.
//
// Two gates, both belt-and-suspenders for server-side authz — the server is the
// real block; these just stop the UI showing a control that will 403:
//
//  (1) Deal-create button — owner/manager only, mirroring the event-create gate
//      on the events page. Backstops the parallel services fix (TF-DEAL-AUTHZ-F1)
//      so staff never see a "Create deal" button that 403s.
//  (2) Events analytics tab — owner/manager only server-side (it exposes revenue,
//      403s for everyone else). Hide the tab for roles that would 403 (staff has
//      its own view already; this also covers promoter / blank / unknown reaching
//      the owner-manager view), and if the fetch still 403s (a stale or scoped
//      owner/manager session) degrade to a calm access state — never the generic
//      error wall. Genuine 5xx / network still shows the error + retry.

export type BusinessRole = "owner" | "manager" | "staff" | "promoter"

/** Deal-create visibility: owner or manager only. Mirrors the event-create gate
 *  (events/page.tsx). `null`/undefined (no session yet) → no button, safe default. */
export function canCreateDeal(role: BusinessRole | null | undefined): boolean {
  return role === "owner" || role === "manager"
}

/** Whether the Events analytics tab is rendered (and its fetch fired). Owner or
 *  manager only — it surfaces revenue and 403s for every other role. Any role
 *  that isn't explicitly owner/manager — staff, promoter, blank/undefined, or an
 *  unknown future value — is excluded, so no one is shown a tab that 403s. */
export function canViewEventAnalytics(role: BusinessRole | null | undefined): boolean {
  return role === "owner" || role === "manager"
}

/** What the Events tab renders after its fetch rejects. A 403 (an owner/manager
 *  session the server still refuses — a stale or venue-scoped role, or the
 *  parallel services gate) is NOT an error wall; it collapses to a calm access
 *  state. Every other failure (5xx / network) is a genuine error → error + retry. */
export type EventAnalyticsErrorOutcome = "forbidden" | "error"

export function eventAnalyticsOutcomeFromError(err: unknown): EventAnalyticsErrorOutcome {
  return (err as { status?: number } | null)?.status === 403 ? "forbidden" : "error"
}

// What a venue-SCOPED analytics/dashboard fetch does when it rejects, layering the
// scope-404 self-heal (TF-ANALYTICS-EVENTS-F1) over the 403 access wall:
//   - "reset-venue": a 404 "Venue not found" — a stale/out-of-scope venue selection
//     hit the services scope guard. Reset the switcher to All venues + refetch;
//     never the error wall (the user still owns their whole-scope data).
//   - "forbidden": a 403 — the revenue-gated role wall (Events tab). ForbiddenState.
//   - "error": anything else (5xx / network / a bare non-scope 404) → error + retry.
// Composed from the two pure predicates so each stays independently testable.
export type ScopedFetchOutcome = "reset-venue" | "forbidden" | "error"

export function scopedAnalyticsFetchOutcome(
  err: unknown,
  isVenueScopeNotFound: (e: unknown) => boolean,
): ScopedFetchOutcome {
  if (isVenueScopeNotFound(err)) return "reset-venue"
  return eventAnalyticsOutcomeFromError(err) === "forbidden" ? "forbidden" : "error"
}

/** Copy for the Events-tab access state — polite, no error language. Mirrors the
 *  funnel zero-state tone (TF-E-W1) and the payouts access copy. */
export const EVENT_ANALYTICS_ACCESS_COPY = {
  title: "Not available for your role",
  description: "Event analytics are only available to owners and managers.",
} as const
