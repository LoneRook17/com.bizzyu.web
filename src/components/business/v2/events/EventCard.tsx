"use client"

import Link from "next/link"
import { CalendarDays, ChevronRight, ScanLine } from "lucide-react"
import { useAuth } from "@/lib/business/auth-context"
import type { EventListItem } from "@/lib/business/types"
import { usd } from "@/lib/v2/utils"
import { Card } from "@/components/business/v2/ui/card"
import { Badge } from "@/components/business/v2/ui/badge"
import { Button } from "@/components/business/v2/ui/button"
import { eventStatusBadge, fmtDate, fmtTime } from "./eventStatus"

export function EventCard({ event }: { event: EventListItem }) {
  const { user } = useAuth()
  const canScan = user?.business_role !== "promoter"
  const badge = eventStatusBadge(event.status)

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <div className="flex gap-4 p-4">
        {/* flyer */}
        <Link
          href={`/business/v2/events/${event.event_id}`}
          className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-neutral-100"
        >
          {event.flyer_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={event.flyer_image_url} alt={event.name} className="size-full object-cover" />
          ) : (
            <CalendarDays className="size-7 text-neutral-300" />
          )}
        </Link>

        {/* info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link
                href={`/business/v2/events/${event.event_id}`}
                className="block truncate text-sm font-semibold text-neutral-900 transition-colors hover:text-[#079455]"
              >
                {event.name}
              </Link>
              <p className="mt-0.5 text-[13px] text-neutral-600">
                {fmtDate(event.start_date_time)} at {fmtTime(event.start_date_time)}
              </p>
              <p className="truncate text-[13px] text-neutral-500">{event.venue_name}</p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
              <Badge variant={badge.variant}>{badge.label}</Badge>
              {event.cancellation_status === "pending" && <Badge variant="warning">Cancellation pending</Badge>}
              {event.cancellation_status === "denied" && (
                <Badge variant="danger" >Cancellation denied</Badge>
              )}
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-neutral-500">
            <span>{event.ticket_sales_count} tickets</span>
            <span>{event.total_attendees} attendees</span>
            <span>{usd(event.total_revenue)}</span>
            {event.type !== "Free" && <span className="text-neutral-400">{event.type}</span>}
          </div>
        </div>
      </div>

      {/* actions */}
      <div className="flex items-center gap-1 border-t border-neutral-100 px-4 py-2.5">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/business/v2/events/${event.event_id}`}>View</Link>
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/business/v2/events/${event.event_id}/manage`}>Manage</Link>
        </Button>
        {canScan && (
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/business/v2/events/${event.event_id}/manage/scanner`}><ScanLine /> Scan</Link>
          </Button>
        )}
        <Link
          href={`/business/v2/events/${event.event_id}/manage`}
          className="ml-auto inline-flex size-7 items-center justify-center rounded-lg text-neutral-300 transition-colors hover:bg-neutral-100 hover:text-neutral-500"
          aria-label="Manage event"
        >
          <ChevronRight className="size-4" />
        </Link>
      </div>
    </Card>
  )
}
