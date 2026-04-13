"use client"

import { useState } from "react"
import type { EventsOverview, EventOverviewItem, EventAnalytics } from "@/lib/business/types"
import { apiClient } from "@/lib/business/api-client"
import EventAnalyticsView from "./EventAnalyticsView"
import CollapsibleSection from "./CollapsibleSection"

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

function statusBadge(event: EventOverviewItem) {
  const now = new Date()
  const endDate = event.end_date_time ? new Date(event.end_date_time) : new Date(event.start_date_time)
  const isPast = endDate <= now

  if (isPast) {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-500">
        Past
      </span>
    )
  }

  const startDate = new Date(event.start_date_time)
  if (startDate <= now && endDate > now) {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-green-100 text-green-700">
        Live
      </span>
    )
  }

  const map: Record<string, { bg: string; text: string; label: string }> = {
    published: { bg: "bg-green-100", text: "text-green-700", label: "Upcoming" },
    approved: { bg: "bg-green-100", text: "text-green-700", label: "Upcoming" },
    cancelled: { bg: "bg-red-100", text: "text-red-700", label: "Cancelled" },
    pending_approval: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Pending" },
    draft: { bg: "bg-gray-100", text: "text-gray-600", label: "Draft" },
  }
  const s = map[event.status] ?? { bg: "bg-green-100", text: "text-green-700", label: "Upcoming" }
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
              {statusBadge(event)}
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

function groupByVenue(events: EventOverviewItem[]): { venue: string; items: EventOverviewItem[] }[] {
  const map = new Map<string, EventOverviewItem[]>()
  for (const e of events) {
    const key = e.venue_name || "Unknown Venue"
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(e)
  }
  return Array.from(map.entries()).map(([venue, items]) => ({ venue, items }))
}

function VenueGroup({
  venue,
  items,
  expandedId,
  onToggle,
}: {
  venue: string
  items: EventOverviewItem[]
  expandedId: number | null
  onToggle: (id: number) => void
}) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2 ml-1">
        <svg className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
        </svg>
        <span className="text-xs font-semibold text-gray-600">{venue}</span>
        <span className="text-xs text-gray-400">({items.length})</span>
      </div>
      <div className="space-y-2 ml-5">
        {items.map((event) => (
          <EventCard
            key={event.event_id}
            event={event}
            isExpanded={expandedId === event.event_id}
            onToggle={() => onToggle(event.event_id)}
          />
        ))}
      </div>
    </div>
  )
}

function EventList({
  events,
  isAllVenues,
  expandedId,
  onToggle,
}: {
  events: EventOverviewItem[]
  isAllVenues: boolean
  expandedId: number | null
  onToggle: (id: number) => void
}) {
  if (events.length === 0) return null

  if (isAllVenues) {
    const groups = groupByVenue(events)
    return (
      <>
        {groups.map((g) => (
          <VenueGroup
            key={g.venue}
            venue={g.venue}
            items={g.items}
            expandedId={expandedId}
            onToggle={onToggle}
          />
        ))}
      </>
    )
  }

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <EventCard
          key={event.event_id}
          event={event}
          isExpanded={expandedId === event.event_id}
          onToggle={() => onToggle(event.event_id)}
        />
      ))}
    </div>
  )
}

export default function EventsOverviewComponent({
  data,
  isAllVenues = false,
}: {
  data: EventsOverview
  isAllVenues?: boolean
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const now = new Date()
  const upcoming = data.events.filter((e) => {
    const endDate = e.end_date_time ? new Date(e.end_date_time) : new Date(e.start_date_time)
    return endDate > now
  })
  const past = data.events.filter((e) => {
    const endDate = e.end_date_time ? new Date(e.end_date_time) : new Date(e.start_date_time)
    return endDate <= now
  })

  const toggleExpand = (id: number) => setExpandedId(expandedId === id ? null : id)

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

      {upcoming.length > 0 && (
        <CollapsibleSection title="Upcoming Events" count={upcoming.length} defaultOpen={true}>
          <EventList
            events={upcoming}
            isAllVenues={isAllVenues}
            expandedId={expandedId}
            onToggle={toggleExpand}
          />
        </CollapsibleSection>
      )}

      {past.length > 0 && (
        <CollapsibleSection title="Past Events" count={past.length} defaultOpen={false}>
          <EventList
            events={past}
            isAllVenues={isAllVenues}
            expandedId={expandedId}
            onToggle={toggleExpand}
          />
        </CollapsibleSection>
      )}
    </div>
  )
}
