"use client"

import { useState, useEffect, useCallback } from "react"
import { Lock, Banknote } from "lucide-react"
import { useAuth } from "@/lib/business/auth-context"
import { useVenueParam } from "@/lib/business/venue-context"
import { PageHeader } from "@/components/business/v2/PageHeader"
import { EmptyState } from "@/components/business/v2/ui/empty-state"
import { Skeleton } from "@/components/business/v2/ui/skeleton"
import {
  fetchPayouts,
  rangeForDays,
  DEFAULT_PAYOUT_RANGE_DAYS,
  type PayoutsResponse,
} from "@/lib/business/payouts"
import PayoutsView, {
  RangePicker,
  ExportButton,
  PayoutsDegraded,
} from "@/components/business/v2/payouts/PayoutsView"

function PayoutsSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-[72px] rounded-xl" />
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-[76px] rounded-xl" />
      ))}
    </div>
  )
}

export default function PayoutsPage() {
  const { user } = useAuth()
  const role = user?.business_role

  // Finance-sensitive: owner + manager only. The nav item is hidden from
  // staff/promoter, but a direct visit lands here — and the services endpoint
  // 403s them regardless (server is the source of truth).
  if (role !== "owner" && role !== "manager") {
    return (
      <>
        <PageHeader title="Payouts" description="Reconcile every Stripe deposit against the tickets inside it." />
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

  return <PayoutsContainer />
}

function PayoutsContainer() {
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
        // 404 → endpoint not deployed yet: degrade, never an error wall.
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
