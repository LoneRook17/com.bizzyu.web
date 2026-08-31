"use client"

import Link from "next/link"
import { CalendarDays, ScanLine } from "lucide-react"
import { useAuth } from "@/lib/business/auth-context"
import type { EventListItem } from "@/lib/business/types"
import {
  eventCardBodyHref,
  eventListHref,
  eventRowStats,
  listedWeeklyCoverProgramId,
  type ListedProgramRef,
} from "@/lib/business/events-list"
import { eventCheckoutUrl, isPubliclyLinkable } from "@/lib/business/public-links"
import { HOST_CUSTOM_CHIP_LABEL, hostCustomChipTone } from "@/lib/business/host-custom-night"
import { weeklyCoverNightNeedsPendingCancel } from "@/lib/business/weekly-cover-visibility"
import { Button } from "@/components/business/v2/ui/button"
import {
  HostCardThumbnail,
  HostListCard,
  type HostCardChip,
} from "@/components/business/v2/host/HostListCard"
import { eventStatusBadge, fmtDate, fmtTime } from "./eventStatus"
import { isWeeklyCoverProduct } from "@/lib/business/door-access"
import { WC_DRAFT_CHIP_LABEL, isWeeklyCoverHoldStatus } from "@/lib/business/wc-draft-hold"

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
  inactiveWcSeriesIds = [],
}: {
  event: EventListItem
  programs?: readonly ListedProgramRef[]
  wcSeriesIds?: readonly number[]
  inactiveWcSeriesIds?: readonly number[]
}) {
  const { user } = useAuth()
  const canScan = user?.business_role !== "promoter"
  const badge =
    isWeeklyCoverProduct(event) && isWeeklyCoverHoldStatus(event.status)
      ? { variant: "neutral" as const, label: WC_DRAFT_CHIP_LABEL }
      : eventStatusBadge(event.status)
  const programId = listedWeeklyCoverProgramId(event, wcSeriesIds)
  const seriesActive = programId == null || !inactiveWcSeriesIds.includes(programId)

  const chips: HostCardChip[] = [{ label: badge.label, variant: badge.variant }]
  if (weeklyCoverNightNeedsPendingCancel(event, seriesActive)) {
    chips.push({ label: "Cancellation pending", variant: "warning" })
  }
  if (event.cancellation_status === "denied") {
    chips.push({ label: "Cancellation denied", variant: "danger" })
  }
  const customTone = hostCustomChipTone({
    product_kind: event.product_kind,
    access_kind: event.access_kind,
    recurring_series_id: event.recurring_series_id,
    series_customized_at: event.series_customized_at,
    is_customized: event.is_customized,
    override_scope: (event as { override_scope?: string | null }).override_scope,
  })
  if (customTone === "wc") {
    chips.push({ label: HOST_CUSTOM_CHIP_LABEL, variant: "access" })
  } else if (customTone === "event") {
    chips.push({ label: HOST_CUSTOM_CHIP_LABEL, variant: "custom" })
  }

  // The F9 metadata line: when first — this list's whole job is what's coming
  // up — then where.
  const meta = [
    `${fmtDate(event.start_date_time)} at ${fmtTime(event.start_date_time)}`,
    event.venue_name,
  ]
    .filter(Boolean)
    .join(" · ")

  const href = eventListHref(event, programs, wcSeriesIds, inactiveWcSeriesIds)
  // Click = manage (2026-08 instance-manage pass): the card body opens the full
  // manage page directly; View keeps the detail page reachable.
  const bodyHref = eventCardBodyHref(event, programs, wcSeriesIds, inactiveWcSeriesIds)
  const isWcRow = programId != null || isWeeklyCoverProduct(event)
  // A green recurring occurrence (RC night). Its card carries View + Manage
  // only — Scan lives inside manage — and View is the GUEST page for that
  // night, not a second dash half-page.
  const isSeriesNight = !isWcRow && Number(event.recurring_series_id ?? 0) > 0
  const guestViewUrl =
    isSeriesNight && isPubliclyLinkable(event.status) ? eventCheckoutUrl(event.event_id) : null

  return (
    <HostListCard
      kind="event"
      href={bodyHref}
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
            {guestViewUrl ? (
              <a href={guestViewUrl} target="_blank" rel="noopener noreferrer">View</a>
            ) : (
              <Link href={href}>View</Link>
            )}
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/business/events/${event.event_id}/manage`}>Manage</Link>
          </Button>
          {canScan && !isSeriesNight && !isWcRow && (
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
