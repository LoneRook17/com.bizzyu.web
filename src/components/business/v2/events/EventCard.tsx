"use client"

import Link from "next/link"
import { CalendarDays, ScanLine } from "lucide-react"
import { useAuth } from "@/lib/business/auth-context"
import type { EventListItem } from "@/lib/business/types"
import { eventListHref, eventManageHref, eventRowStats, type ListedProgramRef } from "@/lib/business/events-list"
import { Button } from "@/components/business/v2/ui/button"
import {
  HostCardThumbnail,
  HostListCard,
  type HostCardChip,
} from "@/components/business/v2/host/HostListCard"
import { eventStatusBadge, fmtDate, fmtTime } from "./eventStatus"

/**
 * A green EVENT row on the combined list (F9).
 *
 * Built on HostListCard so an event row and a WEEKLY ACCESS row are literally
 * the same anatomy — one component, two accents. They sit in the same list, so
 * two lookalike implementations would drift into two subtly different rows,
 * which is exactly the seam F9 exists to close.
 *
 * What this card kept from its pre-F9 form: the View / Manage / Scan footer.
 * The app reaches those by opening the row first; a dashboard has the width to
 * offer them directly, and taking them away would have been a regression
 * dressed up as a redesign.
 */
export function EventCard({
  event,
  programs = [],
  wcSeriesIds = [],
}: {
  event: EventListItem
  programs?: readonly ListedProgramRef[]
  wcSeriesIds?: readonly number[]
}) {
  const { user } = useAuth()
  const canScan = user?.business_role !== "promoter"
  const badge = eventStatusBadge(event.status)

  const chips: HostCardChip[] = [{ label: badge.label, variant: badge.variant }]
  if (event.cancellation_status === "pending") {
    chips.push({ label: "Cancellation pending", variant: "warning" })
  }
  if (event.cancellation_status === "denied") {
    chips.push({ label: "Cancellation denied", variant: "danger" })
  }

  // The F9 metadata line: when first — this list's whole job is what's coming
  // up — then where.
  const meta = [
    `${fmtDate(event.start_date_time)} at ${fmtTime(event.start_date_time)}`,
    event.venue_name,
  ]
    .filter(Boolean)
    .join(" · ")

  const href = eventListHref(event, programs, wcSeriesIds)
  const manageHref = eventManageHref(event, programs, wcSeriesIds)
  const isWeeklyCoverRow = href.startsWith("/business/door-access/")

  return (
    <HostListCard
      kind="event"
      href={href}
      title={event.name}
      meta={meta}
      secondary={event.type === "Free" ? "Free entry" : "Presale + door tickets"}
      chips={chips}
      thumbnail={
        <HostCardThumbnail
          kind="event"
          src={event.flyer_image_url}
          alt={event.name}
          icon={CalendarDays}
        />
      }
      /* D2-C: sold · revenue · when, all from fields this list already fetched.
         The date is a STAT rather than only a line of prose because "when is
         this" is the question the row exists to answer, and prose doesn't scan
         down a column. It stays in the meta line too — with the time, which the
         stat has no room for. */
      stats={eventRowStats(event)}
      actions={
        <>
          <Button variant="ghost" size="sm" asChild>
            <Link href={href}>View</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href={manageHref}>Manage</Link>
          </Button>
          {canScan && !isWeeklyCoverRow && (
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/business/events/${event.event_id}/manage/scanner`}>
                <ScanLine /> Scan
              </Link>
            </Button>
          )}
        </>
      }
    />
  )
}
