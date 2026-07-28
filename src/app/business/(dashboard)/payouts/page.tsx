"use client"

import { useState, useEffect, useCallback } from "react"
import { Lock, Banknote, Download, Loader2, Info, MapPin } from "lucide-react"
import { useAuth } from "@/lib/business/auth-context"
import { useVenue, useVenueParam } from "@/lib/business/venue-context"
import { PageHeader } from "@/components/business/v2/PageHeader"
import { EmptyState } from "@/components/business/v2/ui/empty-state"
import { Skeleton } from "@/components/business/v2/ui/skeleton"
import { cn } from "@/lib/v2/utils"
import {
  fetchPayouts,
  rangeForDays,
  DEFAULT_PAYOUT_RANGE_DAYS,
  buildPayoutsCsv,
  csvFilename,
  downloadCsv,
} from "@/lib/business/payouts"
import {
  fetchPayoutsSummary,
  fetchDeposits,
  type PayoutsSummary,
  type DepositListItem,
} from "@/lib/business/payouts-reconcile"
import {
  canAccessPayouts,
  reconcileOutcomeFromData,
  reconcileOutcomeFromError,
  PAYOUTS_ACCESS_COPY,
  type ReconcileOutcome,
} from "@/lib/business/payouts-access"
import ReconcileView, { RangePicker } from "@/components/business/v2/payouts/ReconcileView"

function PayoutsSkeleton() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-[84px] rounded-xl" />
        ))}
      </div>
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-[76px] rounded-xl" />
      ))}
    </div>
  )
}

// ── Access state (never an error) ────────────────────────────────────────────
// Payouts is owner-only (TF-B ruling). Non-owners never see a FAIL: the nav tab
// is hidden, and a direct visit — or a 403 on the reconcile endpoints despite an
// owner-looking session (a stale role) — lands on this clean, no-error state.

function PayoutsAccessState() {
  return (
    <>
      <PageHeader title="Payouts" description="Reconcile every deposit to the tickets and refunds inside it." />
      <div className="mt-6">
        <EmptyState icon={Lock} title={PAYOUTS_ACCESS_COPY.title} description={PAYOUTS_ACCESS_COPY.description} />
      </div>
    </>
  )
}

export default function PayoutsPage() {
  const { user } = useAuth()
  // Gate is the ONE predicate the sidebar nav also uses — tab and screen agree.
  if (!canAccessPayouts(user?.business_role)) return <PayoutsAccessState />
  return <ReconcileContainer />
}

// ── Global period-level Export CSV (PRESERVED — the existing accountant file) ──
// Kept on the old full-response endpoint so the period export is byte-for-byte
// the machinery it was before P2-B1w. Fetches on click (the new view doesn't hold
// the full row-grain response), builds the same CSV, and downloads it.

function GlobalCsvExportButton({ rangeDays, venueParam }: { rangeDays: number; venueParam: string }) {
  const [busy, setBusy] = useState(false)
  const onExport = useCallback(async () => {
    setBusy(true)
    try {
      const range = rangeForDays(rangeDays, new Date())
      const resp = await fetchPayouts({ range, status: "all", venueParam })
      if (resp) downloadCsv(csvFilename(range), buildPayoutsCsv(resp))
    } catch {
      // Non-fatal: the period export is a convenience, never blocks the page.
    } finally {
      setBusy(false)
    }
  }, [rangeDays, venueParam])

  return (
    <button
      type="button"
      onClick={onExport}
      disabled={busy}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800/60",
      )}
    >
      {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} Export CSV
    </button>
  )
}

// ── Owner reconciliation container ────────────────────────────────────────────
// Owner-only by the time we get here. Outcomes (payouts-access.ts):
//   ready       → the reconciliation view
//   notdeployed → P2-B1s not live yet (404 → null): graceful "coming soon"
//   forbidden   → 403 on an owner-looking session (stale role): access state
//   error       → genuine 5xx / network failure: error + retry (owner keeps this)

type ReconMode = "loading" | ReconcileOutcome

// ── Which-venue scope label ───────────────────────────────────────────────────
// The payouts view respects the global venue switcher. This pill makes the current
// scope explicit — "Showing: All venues" (whole business) or "Showing: <venue>"
// (that venue's contribution). Rendered in every owner outcome (loading, coming-
// soon, error, ready) so the scope is always visible.

function ScopePill({ label }: { label: string }) {
  return (
    <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-medium text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
      <MapPin className="size-3.5 text-neutral-400 dark:text-neutral-500" />
      Showing: <span className="text-neutral-900 dark:text-neutral-100">{label}</span>
    </div>
  )
}

function ReconcileContainer() {
  const venueParam = useVenueParam()
  const { selectedVenue, isAllVenues } = useVenue()
  // Bare venue name for the per-deposit share callout (undefined ⇒ "This venue").
  const venueName = isAllVenues ? undefined : selectedVenue?.name
  // Scope pill label: concrete venue name, else "All venues" (also the transient
  // pre-resolution default, matching the switcher's own fallback).
  const scopeLabel = !isAllVenues && selectedVenue?.name ? selectedVenue.name : "All venues"
  const [rangeDays, setRangeDays] = useState(DEFAULT_PAYOUT_RANGE_DAYS)
  const [summary, setSummary] = useState<PayoutsSummary | null>(null)
  const [deposits, setDeposits] = useState<DepositListItem[] | null>(null)
  const [mode, setMode] = useState<ReconMode>("loading")

  // fetchAll does NO state work (just returns the two payloads) so the effect
  // never contains a synchronous state update. Applying the result happens in the
  // async .then, after the await.
  const fetchAll = useCallback(
    () =>
      Promise.all([
        fetchPayoutsSummary({ days: rangeDays, venueParam }),
        fetchDeposits({ days: rangeDays, venueParam }),
      ]),
    [rangeDays, venueParam],
  )

  const apply = useCallback((s: PayoutsSummary | null, d: DepositListItem[] | null) => {
    const outcome = reconcileOutcomeFromData(s, d)
    if (outcome === "ready") {
      setSummary(s)
      setDeposits(d)
    }
    setMode(outcome)
  }, [])

  useEffect(() => {
    // `mode` initializes to "loading"; on a range re-fetch the current deposits
    // stay on screen until the new data resolves (no skeleton flash).
    let active = true
    fetchAll()
      .then(([s, d]) => {
        if (active) apply(s, d)
      })
      .catch((err) => {
        if (active) setMode(reconcileOutcomeFromError(err))
      })
    return () => {
      active = false
    }
  }, [fetchAll, apply])

  const retry = () => {
    fetchAll()
      .then(([s, d]) => apply(s, d))
      .catch((err) => setMode(reconcileOutcomeFromError(err)))
  }

  // A 403 on an owner-looking session (stale role) → the clean access state, not
  // an error wall (Luke's ruling — never a FAIL on this surface for lack of access).
  if (mode === "forbidden") return <PayoutsAccessState />

  return (
    <>
      <PageHeader
        title="Payouts"
        description="Reconcile every deposit to the tickets and refunds inside it."
        actions={
          <>
            <RangePicker value={rangeDays} onChange={setRangeDays} disabled={mode === "loading"} />
            <GlobalCsvExportButton rangeDays={rangeDays} venueParam={venueParam} />
          </>
        }
      />
      <ScopePill label={scopeLabel} />
      <div className="mt-6">
        {mode === "loading" ? (
          <PayoutsSkeleton />
        ) : mode === "notdeployed" ? (
          <EmptyState
            icon={Info}
            title="Payout reconciliation is coming soon"
            description="Detailed payout breakdowns aren't available yet. Your deposits still land in your bank on Stripe's normal schedule — this tab will show exactly what each one paid for once it's live."
          />
        ) : mode === "error" ? (
          <EmptyState
            icon={Banknote}
            title="Couldn't load payouts"
            description="Something went wrong fetching your deposits. Please try again in a moment."
            action={
              <button
                type="button"
                onClick={retry}
                className="rounded-lg bg-[#05EB54] px-4 py-2 text-sm font-semibold text-neutral-900 transition-colors hover:brightness-95"
              >
                Retry
              </button>
            }
          />
        ) : summary && deposits ? (
          <ReconcileView summary={summary} deposits={deposits} venueParam={venueParam} venueName={venueName} />
        ) : null}
      </div>
    </>
  )
}
