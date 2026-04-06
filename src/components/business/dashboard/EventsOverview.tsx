"use client"

import { useState } from "react"
import type { EventsOverview, EventOverviewItem, EventAnalytics } from "@/lib/business/types"
import { apiClient } from "@/lib/business/api-client"
import EventAnalyticsView from "./EventAnalyticsView"

function formatCurrency(val: number) {
  return `$${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function AggregateStats({ data }: { data: EventsOverview }) {
  const stats = [
    { label: "Total Events", value: String(data.total_events) },
    { label: "Tickets Sold", value: data.total_tickets_sold.toLocaleString() },
    { label: "Revenue", value: formatCurrency(data.total_revenue) },
    { label: "Checked In", value: data.total_checked_in.toLocaleString() },
    { label: "Avg Check-In", value: `${data.average_checkin_rate}%` },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
      {stats.map((s) => (
        <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">{s.label}</p>
          <p className="mt-1 text-2xl font-bold text-ink">{s.value}</p>
        </div>
      ))}
    </div>
  )
}

function statusBadge(status: string) {
  const now = new Date()
  const map: Record<string, { bg: string; text: string; label: string }> = {
    published: { bg: "bg-green-100", text: "text-green-700", label: "Published" },
    approved: { bg: "bg-green-100", text: "text-green-700", label: "Approved" },
    cancelled: { bg: "bg-red-100", text: "text-red-700", label: "Cancelled" },
    pending_approval: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Pending" },
    draft: { bg: "bg-gray-100", text: "text-gray-600", label: "Draft" },
  }
  const s = map[status] ?? { bg: "bg-gray-100", text: "text-gray-600", label: status }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  )
}

function EventCard({
  event,
  isExpanded,
  onToggle,
}: {
  event: EventOverviewItem
  isExpanded: boolean
  onToggle: () => void
}) {
  const [detail, setDetail] = useState<EventAnalytics | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const handleToggle = () => {
    if (!isExpanded && !detail) {
      setDetailLoading(true)
      apiClient
        .get<EventAnalytics>(`/business/analytics/events/${event.event_id}`)
        .then(setDetail)
        .catch(() => setDetail(null))
        .finally(() => setDetailLoading(false))
    }
    onToggle()
  }

  const dateLabel = new Date(event.start_date_time).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })

  const isPast = new Date(event.start_date_time) < new Date()

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={handleToggle}
        className="w-full text-left p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-4">
          {/* Thumbnail */}
          {event.flyer_image_url ? (
            <img
              src={event.flyer_image_url}
              alt=""
              className="h-12 w-12 rounded-lg object-cover flex-shrink-0 bg-gray-100"
            />
          ) : (
            <div className="h-12 w-12 rounded-lg bg-gray-100 flex-shrink-0" />
          )}

          {/* Title + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-ink truncate">{event.name}</p>
              {statusBadge(isPast ? "past" : event.status)}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {dateLabel} {event.venue_name ? `\u00B7 ${event.venue_name}` : ""}
            </p>
          </div>

          {/* Inline stats */}
          <div className="hidden sm:flex items-center gap-6 flex-shrink-0">
            <div className="text-right">
              <p className="text-xs text-gray-500">Tickets</p>
              <p className="text-sm font-semibold text-ink">
                {event.tickets_sold}{event.tickets_total > 0 ? ` / ${event.tickets_total}` : ""}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Revenue</p>
              <p className="text-sm font-semibold text-ink">{formatCurrency(event.revenue)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Check-In</p>
              <p className="text-sm font-semibold text-ink">{event.checkin_rate}%</p>
            </div>
            {event.door_sales_count > 0 && (
              <div className="text-right">
                <p className="text-xs text-gray-500">Door</p>
                <p className="text-sm font-semibold text-ink">{event.door_sales_count}</p>
              </div>
            )}
          </div>

          {/* Mobile stats */}
          <div className="flex sm:hidden items-center gap-3 flex-shrink-0">
            <div className="text-right">
              <p className="text-xs text-gray-500">Tickets</p>
              <p className="text-sm font-semibold text-ink">{event.tickets_sold}</p>
            </div>
          </div>

          {/* Chevron */}
          <svg
            className={`h-4 w-4 text-gray-400 flex-shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded detail */}
      {isExpanded && (
        <div className="border-t border-gray-100 p-4 bg-gray-50/50">
          {detailLoading ? (
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 rounded w-32" />
              <div className="h-24 bg-gray-200 rounded" />
            </div>
          ) : detail ? (
            <EventAnalyticsView data={detail} />
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">Unable to load detail.</p>
          )}
        </div>
      )}
    </div>
  )
}

export default function EventsOverviewComponent({ data }: { data: EventsOverview }) {
  const [expandedId, setExpandedId] = useState<number | null>(null)

  if (data.events.length === 0) {
    return (
      <div>
        <AggregateStats data={data} />
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
          No events yet. Create an event to see analytics here.
        </div>
      </div>
    )
  }

  return (
    <div>
      <AggregateStats data={data} />
      <div className="space-y-3">
        {data.events.map((event) => (
          <EventCard
            key={event.event_id}
            event={event}
            isExpanded={expandedId === event.event_id}
            onToggle={() => setExpandedId(expandedId === event.event_id ? null : event.event_id)}
          />
        ))}
      </div>
    </div>
  )
}
