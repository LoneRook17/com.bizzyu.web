"use client"

import { useState } from "react"
import { ChevronDown, CalendarDays } from "lucide-react"
import type { EventsOverview, EventOverviewItem, EventAnalytics } from "@/lib/business/types"
import { apiClient } from "@/lib/business/api-client"
import { usd } from "@/lib/v2/utils"
import { cn } from "@/lib/v2/utils"
import { Card } from "@/components/business/v2/ui/card"
import { Badge } from "@/components/business/v2/ui/badge"
import { Skeleton } from "@/components/business/v2/ui/skeleton"
import { EmptyState } from "@/components/business/v2/ui/empty-state"
import { StatTile, StatGrid, Section, VenueGroupLabel, RowStat } from "./shared"

function eventBadge(event: EventOverviewItem): { variant: "success" | "neutral" | "warning" | "danger"; label: string } {
  const now = new Date()
  const endDate = event.end_date_time ? new Date(event.end_date_time) : new Date(event.start_date_time)
  if (endDate <= now) return { variant: "neutral", label: "Past" }
  const startDate = new Date(event.start_date_time)
  if (startDate <= now && endDate > now) return { variant: "success", label: "Live" }
  const map: Record<string, { variant: "success" | "neutral" | "warning" | "danger"; label: string }> = {
    published: { variant: "success", label: "Upcoming" },
    approved: { variant: "success", label: "Upcoming" },
    cancelled: { variant: "danger", label: "Cancelled" },
    pending_approval: { variant: "warning", label: "Pending" },
    draft: { variant: "neutral", label: "Draft" },
  }
  return map[event.status] ?? { variant: "success", label: "Upcoming" }
}

function ChannelBar({ segments }: { segments: { value: number; color: string }[] }) {
  const total = segments.reduce((s, x) => s + x.value, 0)
  return (
    <div className="mb-3 flex h-4 overflow-hidden rounded-full">
      {segments.map((s, i) =>
        s.value > 0 ? <div key={i} className={s.color} style={{ width: `${(s.value / total) * 100}%` }} /> : null
      )}
    </div>
  )
}

function LegendDot({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1">
      <span className={cn("size-2 rounded-full", color)} /> {children}
    </span>
  )
}

function EventDetail({ data }: { data: EventAnalytics }) {
  const ticketTotal = data.ticketAccess.paid + data.ticketAccess.free + data.ticketAccess.guest
  const tierTotal = data.tierBreakdown.reduce((s, t) => s + t.revenue, 0)
  const promoterTakeHome = (data.revenue?.promoter_attributed_take_home_cents ?? 0) / 100

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <h4 className="mb-3 text-sm font-semibold text-neutral-900">Revenue</h4>
        <p className="text-2xl font-semibold text-green-600">{usd(data.revenue?.revenue ?? 0)}</p>
        <p className="mt-1 text-xs text-neutral-500">Your take-home — matches Stripe payout.</p>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="p-5">
          <h4 className="mb-3 text-sm font-semibold text-neutral-900">Ticket access</h4>
          {ticketTotal > 0 ? (
            <>
              <ChannelBar
                segments={[
                  { value: data.ticketAccess.paid, color: "bg-blue-500" },
                  { value: data.ticketAccess.free, color: "bg-green-500" },
                  { value: data.ticketAccess.guest, color: "bg-purple-500" },
                ]}
              />
              <div className="flex flex-wrap gap-4 text-xs text-neutral-600">
                <LegendDot color="bg-blue-500">Paid: {data.ticketAccess.paid}</LegendDot>
                <LegendDot color="bg-green-500">Free: {data.ticketAccess.free}</LegendDot>
                <LegendDot color="bg-purple-500">Guest: {data.ticketAccess.guest}</LegendDot>
              </div>
            </>
          ) : (
            <p className="text-sm text-neutral-400">No ticket data</p>
          )}
        </Card>

        <Card className="p-5">
          <h4 className="mb-3 text-sm font-semibold text-neutral-900">Check-in rate</h4>
          <p className="mb-2 text-2xl font-semibold text-neutral-900">{data.checkIn.percent.toFixed(1)}%</p>
          <div className="h-3 w-full overflow-hidden rounded-full bg-neutral-100">
            <div
              className="h-full rounded-full bg-[#079455]"
              style={{ width: `${data.checkIn.total > 0 ? Math.min((data.checkIn.scanned / data.checkIn.total) * 100, 100) : 0}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-neutral-500">
            {data.checkIn.scanned} scanned / {data.checkIn.total} total
          </p>
        </Card>
      </div>

      {(data.doorSales.preSales > 0 || data.doorSales.doorSales > 0) && (
        <Card className="p-5">
          <h4 className="mb-3 text-sm font-semibold text-neutral-900">Sales channel</h4>
          <ChannelBar
            segments={[
              { value: data.doorSales.preSales, color: "bg-blue-500" },
              { value: data.doorSales.doorSales, color: "bg-orange-500" },
            ]}
          />
          <div className="flex flex-wrap gap-4 text-xs text-neutral-600">
            <LegendDot color="bg-blue-500">Pre-sale: {usd(data.doorSales.preSales)}</LegendDot>
            <LegendDot color="bg-orange-500">Door: {usd(data.doorSales.doorSales)}</LegendDot>
          </div>
        </Card>
      )}

      {data.tierBreakdown.length > 0 && (
        <Card className="p-5">
          <h4 className="mb-3 text-sm font-semibold text-neutral-900">Revenue by tier</h4>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 text-xs text-neutral-500">
                <th className="py-2 text-left font-medium">Tier</th>
                <th className="py-2 text-right font-medium">Sold</th>
                <th className="py-2 text-right font-medium">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {data.tierBreakdown.map((tier) => (
                <tr key={tier.ticket_id} className="border-b border-neutral-50 last:border-0">
                  <td className="py-2 text-neutral-900">{tier.tier_name}</td>
                  <td className="py-2 text-right text-neutral-600">{tier.sold}</td>
                  <td className="py-2 text-right font-medium text-neutral-900">{usd(tier.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {promoterTakeHome > 0 && (
            <div className="mt-4 rounded-lg border border-purple-100 bg-purple-50 px-3 py-2 text-xs text-purple-700">
              Of the {usd(tierTotal)} above, <span className="font-semibold">{usd(promoterTakeHome)}</span> was promoter-generated.
            </div>
          )}
        </Card>
      )}

      {data.trackingLinks.length > 0 && (
        <Card className="p-5">
          <h4 className="mb-3 text-sm font-semibold text-neutral-900">Promoter performance</h4>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 text-xs text-neutral-500">
                <th className="py-2 text-left font-medium">Name</th>
                <th className="py-2 text-right font-medium">Clicks</th>
                <th className="py-2 text-right font-medium">Sales</th>
                <th className="py-2 text-right font-medium">Commission</th>
              </tr>
            </thead>
            <tbody>
              {data.trackingLinks.map((link) => (
                <tr key={link.tracking_link_id} className="border-b border-neutral-50 last:border-0">
                  <td className="py-2 text-neutral-900">{link.promoter_name}</td>
                  <td className="py-2 text-right text-neutral-600">{link.clicks}</td>
                  <td className="py-2 text-right text-neutral-600">{link.sales_count}</td>
                  <td className="py-2 text-right font-medium text-neutral-900">{usd((link.commission_cents ?? 0) / 100)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
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

  const dateLabel = new Date(event.start_date_time).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  const b = eventBadge(event)

  return (
    <Card className="overflow-hidden">
      <button type="button" onClick={handleToggle} className="w-full p-4 text-left transition-colors hover:bg-neutral-50">
        <div className="flex items-center gap-4">
          {event.flyer_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={event.flyer_image_url} alt="" className="size-12 flex-shrink-0 rounded-lg bg-neutral-100 object-cover" />
          ) : (
            <div className="size-12 flex-shrink-0 rounded-lg bg-neutral-100" />
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold text-neutral-900">{event.name}</p>
              <Badge variant={b.variant} size="sm">{b.label}</Badge>
            </div>
            <p className="mt-0.5 text-xs text-neutral-500">
              {dateLabel}
              {event.venue_name ? ` · ${event.venue_name}` : ""}
            </p>
          </div>

          <div className="hidden flex-shrink-0 items-center gap-6 sm:flex">
            <RowStat label="Tickets" value={`${event.tickets_sold}${event.tickets_total > 0 ? ` / ${event.tickets_total}` : ""}`} />
            <RowStat label="Revenue" value={usd(event.revenue)} />
            <RowStat label="Check-in" value={`${event.checkin_rate}%`} />
            {event.door_sales_count > 0 && <RowStat label="Door" value={event.door_sales_count} />}
          </div>
          <div className="flex flex-shrink-0 items-center gap-3 sm:hidden">
            <RowStat label="Tickets" value={event.tickets_sold} />
          </div>

          <ChevronDown className={cn("size-4 flex-shrink-0 text-neutral-400 transition-transform", isExpanded && "rotate-180")} />
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-neutral-100 bg-neutral-50/60 p-4">
          {detailLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-24 w-full rounded-lg" />
            </div>
          ) : detail ? (
            <EventDetail data={detail} />
          ) : (
            <p className="py-4 text-center text-sm text-neutral-400">Unable to load detail.</p>
          )}
        </div>
      )}
    </Card>
  )
}

function groupByVenue(events: EventOverviewItem[]): { venue: string; items: EventOverviewItem[] }[] {
  const map = new Map<string, EventOverviewItem[]>()
  for (const e of events) {
    const key = e.venue_name || "Unknown venue"
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(e)
  }
  return Array.from(map.entries()).map(([venue, items]) => ({ venue, items }))
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
    return (
      <>
        {groupByVenue(events).map((g) => (
          <div key={g.venue} className="mb-4">
            <VenueGroupLabel venue={g.venue} count={g.items.length} />
            <div className="ml-5 space-y-2">
              {g.items.map((event) => (
                <EventCard key={event.event_id} event={event} isExpanded={expandedId === event.event_id} onToggle={() => onToggle(event.event_id)} />
              ))}
            </div>
          </div>
        ))}
      </>
    )
  }

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <EventCard key={event.event_id} event={event} isExpanded={expandedId === event.event_id} onToggle={() => onToggle(event.event_id)} />
      ))}
    </div>
  )
}

export default function EventsOverviewView({
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

  return (
    <div>
      <StatGrid cols={5}>
        <StatTile label="Total events" value={data.total_events} />
        <StatTile label="Tickets sold" value={data.total_tickets_sold.toLocaleString()} />
        <StatTile label="Revenue" value={usd(data.total_revenue)} />
        <StatTile label="Checked in" value={data.total_checked_in.toLocaleString()} />
        <StatTile label="Avg check-in" value={`${data.average_checkin_rate}%`} />
      </StatGrid>

      {data.events.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon={CalendarDays} title="No events yet" description="Create an event to see analytics here." />
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <Section title="Upcoming events" count={upcoming.length} defaultOpen>
              <EventList events={upcoming} isAllVenues={isAllVenues} expandedId={expandedId} onToggle={toggleExpand} />
            </Section>
          )}
          {past.length > 0 && (
            <Section title="Past events" count={past.length} defaultOpen={false}>
              <EventList events={past} isAllVenues={isAllVenues} expandedId={expandedId} onToggle={toggleExpand} />
            </Section>
          )}
        </>
      )}
    </div>
  )
}
