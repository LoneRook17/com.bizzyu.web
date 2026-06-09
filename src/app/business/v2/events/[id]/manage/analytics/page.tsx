"use client"

import { useState, useEffect, use } from "react"
import { BarChart3 } from "lucide-react"
import { apiClient, ApiError } from "@/lib/business/api-client"
import type { EventAnalytics, PerScannerResponse, PerScannerRow } from "@/lib/business/types"
import { Skeleton } from "@/components/business/v2/ui/skeleton"
import { EmptyState } from "@/components/business/v2/ui/empty-state"
import { ManageSubheader } from "@/components/business/v2/events/ManageSubheader"
import { EventAnalyticsView } from "@/components/business/v2/events/EventAnalyticsView"
import { DoorPerformanceCard } from "@/components/business/v2/events/DoorPerformanceCard"

export default function V2EventAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [data, setData] = useState<EventAnalytics | null>(null)
  const [perScanner, setPerScanner] = useState<PerScannerRow[] | null>(null)
  const [perScannerError, setPerScannerError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    apiClient
      .get<EventAnalytics>(`/business/analytics/events/${id}`)
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load analytics"))
      .finally(() => setLoading(false))

    apiClient
      .get<PerScannerResponse>(`/business/analytics/events/${id}/per-scanner`)
      .then((res) => {
        setPerScanner(res.rows ?? [])
        setPerScannerError(null)
      })
      .catch((err) => {
        setPerScannerError(err instanceof ApiError ? err.message : "Couldn't load door performance")
        setPerScanner([])
      })
  }, [id])

  if (loading) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    )
  }

  return (
    <>
      <ManageSubheader eventId={id} title="Event analytics" subtitle="Revenue, ticket access, and check-in rates." />

      {error ? (
        <EmptyState icon={BarChart3} title={error} />
      ) : data ? (
        <div className="flex flex-col gap-5">
          <EventAnalyticsView data={data} />
          {perScanner !== null && <DoorPerformanceCard rows={perScanner} error={perScannerError} />}
        </div>
      ) : (
        <EmptyState icon={BarChart3} title="No analytics yet" description="Data appears once tickets are sold and scanned." />
      )}
    </>
  )
}
