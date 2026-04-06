"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/business/auth-context"
import { apiClient, ApiError } from "@/lib/business/api-client"
import StatusBadge from "@/components/business/dashboard/StatusBadge"
import type { EventDetail } from "@/lib/business/types"

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })
}

function formatCurrency(val: number) {
  return `$${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { user } = useAuth()
  const [event, setEvent] = useState<EventDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const canEdit = user?.business_role === "owner" || user?.business_role === "manager"

  useEffect(() => {
    async function fetchEvent() {
      try {
        const data = await apiClient.get<EventDetail>(`/business/events/${id}`)
        setEvent(data)
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to load event")
      } finally {
        setLoading(false)
      }
    }
    fetchEvent()
  }, [id])

  const handleDuplicate = async () => {
    try {
      const data = await apiClient.post<{ event_id: number }>(`/business/events/${id}/duplicate`)
      router.push(`/business/events/${data.event_id}/edit`)
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to duplicate event")
    }
  }


  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-gray-200 rounded w-48" />
        <div className="h-48 bg-gray-200 rounded-xl" />
        <div className="h-4 bg-gray-200 rounded w-64" />
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-red-500 mb-4">{error || "Event not found"}</p>
        <Link href="/business/events" className="text-sm text-primary hover:underline">
          Back to Events
        </Link>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link href="/business/events" className="text-xs text-gray-500 hover:text-primary mb-2 inline-block">
            &larr; Back to Events
          </Link>
          <h1 className="text-xl font-bold text-ink">{event.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <StatusBadge status={event.status} />
            <span className="text-xs text-gray-400">{event.type}</span>
            {event.is_21_plus && (
              <span className="text-xs text-gray-400 border border-gray-300 rounded px-1">21+</span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <Link
              href={`/business/events/${event.event_id}/manage`}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
            >
              Manage
            </Link>
          )}
          <Link
            href={`/business/scanner?eventId=${event.event_id}`}
            className="rounded-lg border border-gray-300 px-3 py-2 text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-1.5"
            title="Scan QR Code"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
            </svg>
            <span className="text-sm font-medium">Scan</span>
          </Link>
          {canEdit && (
            <button
              onClick={handleDuplicate}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Duplicate
            </button>
          )}
        </div>
      </div>

      {/* Moderation notice */}
      {event.status === "pending_review" && event.moderation_reason && (
        <div className="mb-6 rounded-lg bg-orange-50 border border-orange-200 p-4 text-sm text-orange-800">
          <strong>Under review:</strong> {event.moderation_reason}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Flyer */}
          {event.flyer_image_url && (
            <div className="rounded-xl overflow-hidden border border-gray-200">
              <img src={event.flyer_image_url} alt={event.name} className="w-full max-h-80 object-cover" />
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="text-sm font-semibold text-ink mb-2">Description</h2>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{event.description}</p>
            </div>
          )}

          {/* Ticket tiers */}
          {event.tickets && event.tickets.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="text-sm font-semibold text-ink mb-3">Ticket Tiers</h2>
              <div className="space-y-3">
                {event.tickets.map((ticket, i) => (
                  <div key={ticket.ticket_id || i} className="flex items-center justify-between border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-ink">{ticket.name}</p>
                      </div>
                      <p className="text-xs text-gray-500">
                        {ticket.ticket_type === "free" ? "Free" : formatCurrency(ticket.price_usd)}
                        {ticket.max_per_person ? ` · Max ${ticket.max_per_person}/person` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-ink">
                        {ticket.sold_count ?? 0} / {ticket.quantity}
                      </p>
                      <p className="text-xs text-gray-400">sold</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column — meta + stats */}
        <div className="space-y-4">
          {/* Date & Venue */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Date</p>
              <p className="text-sm text-ink">{formatDate(event.start_date_time)}</p>
              <p className="text-xs text-gray-500">
                {formatTime(event.start_date_time)} – {formatTime(event.end_date_time)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Venue</p>
              <p className="text-sm text-ink">{event.venue_name}</p>
              {event.venue_address && (
                <p className="text-xs text-gray-500">{event.venue_address}</p>
              )}
            </div>
          </div>

          {/* Sales stats */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="text-xs text-gray-500 uppercase tracking-wide mb-3">Sales Summary</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Attendees</span>
                <span className="text-sm font-medium text-ink">{event.sales?.total_attendees ?? event.total_attendees}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Revenue</span>
                <span className="text-sm font-medium text-ink">{formatCurrency(event.sales?.total_revenue ?? event.total_revenue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Check-in Rate</span>
                <span className="text-sm font-medium text-ink">{(event.sales?.checkin_rate ?? event.checkin_rate).toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
