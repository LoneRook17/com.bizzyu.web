"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
import { apiClient, ApiError } from "@/lib/business/api-client"
import EventForm from "@/components/business/dashboard/EventForm"
import type { EventDetail, EventFormData } from "@/lib/business/types"

// Converts ISO date string to datetime-local input format.
// DB stores times in US/Eastern (set on pool init). new Date() parses to browser local time.
// This works correctly when the user's browser is in the same timezone as the server (US/Eastern).
// For cross-timezone support, a timezone library would be needed.
function toDatetimeLocal(dateStr: string) {
  if (!dateStr) return ""
  const d = new Date(dateStr)
  const pad = (n: number) => n.toString().padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [initialData, setInitialData] = useState<Partial<EventFormData> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    async function fetchEvent() {
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
    fetchEvent()
  }, [id])

  if (loading) {
    return (
      <div className="animate-pulse space-y-4 max-w-2xl">
        <div className="h-6 bg-gray-200 rounded w-32" />
        <div className="h-64 bg-gray-200 rounded-xl" />
      </div>
    )
  }

  if (error || !initialData) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-red-500 mb-4">{error || "Event not found"}</p>
        <Link href="/business/events" className="text-sm text-primary hover:underline">
          Back to Events
        </Link>
      </div>
    )
  }

  return <EventForm initialData={initialData} eventId={Number(id)} />
}
