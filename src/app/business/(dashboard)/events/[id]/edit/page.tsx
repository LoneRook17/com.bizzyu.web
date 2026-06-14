"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
import { apiClient, ApiError } from "@/lib/business/api-client"
import type { EventDetail, EventFormData } from "@/lib/business/types"
import { Skeleton } from "@/components/business/v2/ui/skeleton"
import { EmptyState } from "@/components/business/v2/ui/empty-state"
import { Button } from "@/components/business/v2/ui/button"
import { EventForm } from "@/components/business/v2/events/EventForm"
import { toDatetimeLocal } from "@/components/business/v2/events/eventStatus"
import { CalendarOff } from "lucide-react"

export default function V2EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [initialData, setInitialData] = useState<Partial<EventFormData> | null>(null)
  const [stripeOnboarded, setStripeOnboarded] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    async function load() {
      try {
        const event = await apiClient.get<EventDetail>(`/business/events/${id}`)
        setInitialData({
          name: event.name,
          description: event.description,
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
        })
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to load event")
      } finally {
        setLoading(false)
      }
    }
    load()
    apiClient
      .get<{ stripe_connect_onboarded: boolean }>("/business/profile")
      .then((p) => setStripeOnboarded(p.stripe_connect_onboarded))
      .catch(() => {})
  }, [id])

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

  return <EventForm initialData={initialData} eventId={Number(id)} stripeOnboarded={stripeOnboarded} />
}
