"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { CalendarOff } from "lucide-react"
import { apiClient, ApiError } from "@/lib/business/api-client"
import type { BusinessProfile, RecurringOccurrence, RecurringSeriesDetail } from "@/lib/business/types"
import { programEditHref } from "@/lib/business/door-access"
import { isWeeklyCoverSeriesRef } from "@/lib/business/events-list"
import { Button } from "@/components/business/v2/ui/button"
import { EmptyState } from "@/components/business/v2/ui/empty-state"
import { Skeleton } from "@/components/business/v2/ui/skeleton"
import { SeriesForm } from "@/components/business/v2/recurring/SeriesForm"

export default function EditRecurringSeriesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [series, setSeries] = useState<RecurringSeriesDetail | null>(null)
  // Pre-edit occurrences let the post-save report label nights by date.
  const [occurrences, setOccurrences] = useState<RecurringOccurrence[]>([])
  const [stripeOnboarded, setStripeOnboarded] = useState(true)
  const [isPending, setIsPending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [redirecting, setRedirecting] = useState(false)

  useEffect(() => {
    apiClient
      .get<{ series: RecurringSeriesDetail; occurrences: RecurringOccurrence[] }>(`/business/recurring-series/${id}`)
      .then((data) => {
        if (data.series && isWeeklyCoverSeriesRef(data.series)) {
          setRedirecting(true)
          router.replace(programEditHref(data.series.id))
          return
        }
        setSeries(data.series)
        setOccurrences(data.occurrences ?? [])
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load the series"))
      .finally(() => setLoading(false))
    apiClient
      .get<BusinessProfile>("/business/profile")
      .then((p) => {
        setStripeOnboarded(p.stripe_connect_onboarded)
        setIsPending(p.status === "pending" || p.status === "pending_approval" || p.status === "pending_verification")
      })
      .catch(() => {})
  }, [id, router])

  if (loading || redirecting) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-64 max-w-3xl rounded-xl" />
      </div>
    )
  }

  if (error || !series) {
    return (
      <EmptyState
        icon={CalendarOff}
        title={error || "Series not found"}
        action={<Button asChild variant="secondary"><Link href="/business/recurring">Back to recurring</Link></Button>}
      />
    )
  }

  return (
    <SeriesForm
      mode="edit"
      seriesId={series.id}
      initialData={series}
      occurrences={occurrences}
      stripeOnboarded={stripeOnboarded}
      isPending={isPending}
    />
  )
}
