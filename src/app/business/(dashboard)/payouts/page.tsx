"use client"

import { useState, useEffect, useCallback } from "react"
import { Lock, Banknote, Download, Loader2 } from "lucide-react"
import { useAuth } from "@/lib/business/auth-context"
import { useVenueParam } from "@/lib/business/venue-context"
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
  type PayoutsResponse,
} from "@/lib/business/payouts"
import {
  fetchPayoutsSummary,
  fetchDeposits,
  type PayoutsSummary,
  type DepositListItem,
} from "@/lib/business/payouts-reconcile"
import PayoutsView, {
  RangePicker,
  ExportButton,
  PayoutsDegraded,
} from "@/components/business/v2/payouts/PayoutsView"
import ReconcileView from "@/components/business/v2/payouts/ReconcileView"

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

export default function PayoutsPage() {
  const { user } = useAuth()
  const role = user?.business_role
  const venueId = user?.venue_id ?? null

  // Finance-sensitive: owner + manager only. Nav is hidden from staff/promoter,
  // but a direct visit lands here — and the services endpoints 403 them anyway.
  if (role !== "owner" && role !== "manager") {
    return (
      <>
        <PageHeader title="Payouts" description="Reconcile every deposit to the tickets and refunds inside it." />
        <div className="mt-6">
          <EmptyState
            icon={Lock}
            title="Not available for your role"
            description="Payout reconciliation is limited to business owners and managers."
          />
        </div>
      </>
    )
  }

  // Reconciliation + ticket-level details are for owner / GLOBAL managers only.
  // A venue-scoped manager (assigned to a single venue) degrades to today's
  // scoped view — no error wall, just the pre-P2-B1w experience for their venue.
  const isGlobalFinance = role === "owner" || (role === "manager" && venueId == null)
  if (isGlobalFinance) return <ReconcileContainer />
  return <LegacyPayoutsPanel />
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

// ── New reconciliation container (owner / global manager) ─────────────────────

type ReconMode = "loading" | "new" | "legacy" | "error"

function ReconcileContainer() {
  const venueParam = useVenueParam()
  const [rangeDays, setRangeDays] = useState(DEFAULT_PAYOUT_RANGE_DAYS)
  const [summary, setSummary] = useState<PayoutsSummary | null>(null)
  const [deposits, setDeposits] = useState<DepositListItem[] | null>(null)
  const [mode, setMode] = useState<ReconMode>("loading")

  // fetchAll does NO state work (just returns the two payloads) so the effect
  // never contains a synchronous state update. Applying the result — including
  // the P2-B1s-not-deployed fall-back to the scoped view — happens in the async
  // .then, after the await.
  const fetchAll = useCallback(
    () =>
      Promise.all([
        fetchPayoutsSummary({ days: rangeDays, venueParam }),
        fetchDeposits({ days: rangeDays, venueParam }),
      ]),
    [rangeDays, venueParam],
  )

  const apply = useCallback((s: PayoutsSummary | null, d: DepositListItem[] | null) => {
    // A 404 on either endpoint means P2-B1s isn't deployed yet → fall back to
    // today's scoped view (the old, live endpoint), never an error wall.
    if (s === null || d === null) {
      setMode("legacy")
      return
    }
    setSummary(s)
    setDeposits(d)
    setMode("new")
  }, [])

  useEffect(() => {
    // `mode` initializes to "loading"; on a range re-fetch the current deposits
    // stay on screen until the new data resolves (no skeleton flash).
    let active = true
    fetchAll()
      .then(([s, d]) => {
        if (active) apply(s, d)
      })
      .catch(() => {
        if (active) setMode("error")
      })
    return () => {
      active = false
    }
  }, [fetchAll, apply])

  const retry = () => {
    fetchAll()
      .then(([s, d]) => apply(s, d))
      .catch(() => setMode("error"))
  }

  // The P2-B1s contract isn't live here → show today's scoped view for everyone.
  if (mode === "legacy") return <LegacyPayoutsPanel />

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
      <div className="mt-6">
        {mode === "loading" ? (
          <PayoutsSkeleton />
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
          <ReconcileView summary={summary} deposits={deposits} venueParam={venueParam} />
        ) : null}
      </div>
    </>
  )
}

// ── Legacy scoped view (PRESERVED — venue-scoped members + not-deployed fallback)
// This is the pre-P2-B1w Payouts tab verbatim: old typed client, old view.

function LegacyPayoutsPanel() {
  const venueParam = useVenueParam()
  const [rangeDays, setRangeDays] = useState(DEFAULT_PAYOUT_RANGE_DAYS)
  const [data, setData] = useState<PayoutsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [unavailable, setUnavailable] = useState(false)
  const [errored, setErrored] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setErrored(false)
    const range = rangeForDays(rangeDays, new Date())
    try {
      const resp = await fetchPayouts({ range, status: "all", venueParam })
      if (resp === null) {
        setUnavailable(true)
        setData(null)
      } else {
        setUnavailable(false)
        setData(resp)
      }
    } catch {
      setErrored(true)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [rangeDays, venueParam])

  useEffect(() => {
    load()
  }, [load])

  return (
    <>
      <PageHeader
        title="Payouts"
        description="Reconcile every Stripe deposit against the tickets and refunds inside it."
        actions={
          <>
            <RangePicker value={rangeDays} onChange={setRangeDays} disabled={loading} />
            <ExportButton data={data} disabled={loading || unavailable} />
          </>
        }
      />

      <div className="mt-6">
        {loading ? (
          <PayoutsSkeleton />
        ) : unavailable ? (
          <PayoutsDegraded />
        ) : errored ? (
          <EmptyState
            icon={Banknote}
            title="Couldn't load payouts"
            description="Something went wrong fetching your deposits. Please try again in a moment."
            action={
              <button
                type="button"
                onClick={load}
                className="rounded-lg bg-[#05EB54] px-4 py-2 text-sm font-semibold text-neutral-900 transition-colors hover:brightness-95"
              >
                Retry
              </button>
            }
          />
        ) : data ? (
          <PayoutsView data={data} />
        ) : null}
      </div>
    </>
  )
}
