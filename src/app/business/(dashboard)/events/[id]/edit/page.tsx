"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { apiClient, ApiError } from "@/lib/business/api-client"
import { weeklyCoverNightEditHref } from "@/lib/business/door-access"
import type { EventDetail, EventFormData } from "@/lib/business/types"
import { Skeleton } from "@/components/business/v2/ui/skeleton"
import { EmptyState } from "@/components/business/v2/ui/empty-state"
import { Button } from "@/components/business/v2/ui/button"
import { EventForm } from "@/components/business/v2/events/EventForm"
import { toDatetimeLocal } from "@/components/business/v2/events/eventStatus"
import { SeriesNightBanner, type SeriesNightBannerEvent } from "@/components/business/v2/recurring/SeriesNightBanner"
import { CalendarOff } from "lucide-react"

export default function V2EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [initialData, setInitialData] = useState<Partial<EventFormData> | null>(null)
  const [seriesInfo, setSeriesInfo] = useState<SeriesNightBannerEvent | null>(null)
  const [stripeOnboarded, setStripeOnboarded] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    async function load() {
      try {
        const event = await apiClient.get<EventDetail>(`/business/events/${id}`)
        // WC FLAW 3 — never mount EventForm for a Weekly Cover night that
        // still follows its program. Saving here PUTs /business/events/:id,
        // which stamps series_customized_at and evicts the night from every
        // weekday-global restamp. The night-override editor is the edit
        // surface (date-local Custom; restamp still sees the night). A night
        // already customized is detached and keeps this form (nightIsEditable
        // points hosts back here).
        const wcNightEdit = weeklyCoverNightEditHref(event)
        if (wcNightEdit != null) {
          router.replace(wcNightEdit)
          return // keep the skeleton up while the redirect lands
        }
        setSeriesInfo({
          recurring_series_id: event.recurring_series_id ?? null,
          series_customized_at: event.series_customized_at ?? null,
          product_kind: event.product_kind ?? null,
          access_kind: event.access_kind ?? null,
        })
        setInitialData({
          name: event.name,
          description: event.description,
          venue_id: event.venue_id,
          venue_name: event.venue_name,
          venue_address: event.venue_address,
          start_date_time: toDatetimeLocal(event.start_date_time),
          end_date_time: toDatetimeLocal(event.end_date_time),
          type: event.type,
          is_21_plus: event.is_21_plus,
          flyer_image_url: event.flyer_image_url || "",
          tickets: event.tickets || [],
          promotion_enabled: !!event.promotion_enabled,
          promotion_commission_type: event.promotion_commission_type ?? undefined,
          promotion_commission_value: event.promotion_commission_value ?? null,
          lowstock_alerts_enabled: !!event.lowstock_alerts_enabled,
          lowstock_threshold_type: event.lowstock_threshold_type ?? undefined,
          lowstock_threshold_value: event.lowstock_threshold_value ?? null,
          lowstock_notify_business_team: !!event.lowstock_notify_business_team,
          artwork_template: event.artwork_template ?? null,
          artwork_accent: event.artwork_accent ?? null,
        })
        setLoading(false)
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to load event")
        setLoading(false)
      }
      // No `finally`: the redirect path above returns with loading still true,
      // so the skeleton (not "Event not found") shows until navigation lands.
    }
    load()
    apiClient
      .get<{ stripe_connect_onboarded: boolean }>("/business/profile")
      .then((p) => setStripeOnboarded(p.stripe_connect_onboarded))
      .catch(() => {})
  }, [id, router])

  if (loading) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  if (error || !initialData) {
    return (
      <EmptyState
        icon={CalendarOff}
        title={error || "Event not found"}
        action={<Button asChild variant="secondary"><Link href="/business/events">Back to events</Link></Button>}
      />
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {seriesInfo?.recurring_series_id != null && <SeriesNightBanner event={seriesInfo} />}
      <EventForm initialData={initialData} eventId={Number(id)} stripeOnboarded={stripeOnboarded} />
    </div>
  )
}
