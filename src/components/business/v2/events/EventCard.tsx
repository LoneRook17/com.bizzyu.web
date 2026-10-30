"use client"

import Link from "next/link"
import { Copy, ExternalLink, Pencil, ScanLine, Settings2 } from "lucide-react"
import { useAuth } from "@/lib/business/auth-context"
import type { EventListItem } from "@/lib/business/types"
import {
  eventCardBodyHref,
  eventRowStats,
  listedWeeklyCoverProgramId,
  type ListedProgramRef,
} from "@/lib/business/events-list"
import { eventCheckoutUrl, isPubliclyLinkable } from "@/lib/business/public-links"
import { createFromTemplateHref } from "@/lib/business/create-from-template"
import { HOST_CUSTOM_CHIP_LABEL, hostCustomChipTone } from "@/lib/business/host-custom-night"
import { weeklyCoverNightNeedsPendingCancel } from "@/lib/business/weekly-cover-visibility"
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/business/v2/ui/dropdown-menu"
import { HostListCard, type HostCardChip } from "@/components/business/v2/host/HostListCard"
import { eventStatusBadge } from "./eventStatus"
import { isWeeklyCoverProduct } from "@/lib/business/door-access"
import { WC_DRAFT_CHIP_LABEL, isWeeklyCoverHoldStatus } from "@/lib/business/wc-draft-hold"

/**
 * A green EVENT row on the combined list (F9), re-cut as a table row in the
 * BETA shell: date block · title · venue · sold / revenue · status · ⋯ menu.
 *
 * Built on HostListCard so an event row and a WEEKLY ACCESS row are literally
 * the same anatomy — one component, two accents. They sit in the same list, so
 * two lookalike implementations would drift into two subtly different rows,
 * which is exactly the seam F9 exists to close.
 *
 * What the ⋯ menu kept from the pre-shell footer: View / Manage / Scan.
 * View = guest checkout when the event is live; otherwise View is hidden.
 * Manage (and the row title) stay on the host side — never overload View.
 * Edit and Use as template are the same links the detail/manage pages carry
 * (the template flow is create-from-template, an existing client route).
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
  const canEdit = user?.business_role === "owner" || user?.business_role === "manager"
  const badge =
    isWeeklyCoverProduct(event) && isWeeklyCoverHoldStatus(event.status)
      ? { variant: "neutral" as const, label: WC_DRAFT_CHIP_LABEL }
      : eventStatusBadge(event.status)
  const programId = listedWeeklyCoverProgramId(event, wcSeriesIds)
  const seriesActive = programId == null || !inactiveWcSeriesIds.includes(programId)

  // The status chip owns the Status column; anything else rides beside the title.
  const chips: HostCardChip[] = []
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

  // The Date & time column carries the when; the line under the title is the
  // venue, so an All-venues list still reads where each row is.
  const meta = event.venue_name || ""
  // D2-C: sold and revenue, from fields this list already fetched.
  const rowStats = eventRowStats(event)

  // Click = manage (2026-08 instance-manage pass): the row title opens the full
  // manage page directly. View is always the guest checkout when live — never
  // a second host detail/pre-manage page under the same label.
  const bodyHref = eventCardBodyHref(event, programs, wcSeriesIds, inactiveWcSeriesIds)
  const isWcRow = programId != null || isWeeklyCoverProduct(event)
  // RC nights: View + Manage only (Scan lives inside manage).
  const isSeriesNight = !isWcRow && Number(event.recurring_series_id ?? 0) > 0
  const guestViewUrl = isPubliclyLinkable(event.status)
    ? eventCheckoutUrl(event.event_id)
    : null

  return (
    <HostListCard
      // A Weekly Cover night gets the pink tile + chip; nothing else changes.
      kind={isWcRow ? "access" : "event"}
      href={bodyHref}
      date={event.start_date_time}
      title={event.name}
      meta={meta}
      secondary={event.type === "Free" ? "Free entry" : undefined}
      status={badge}
      chips={chips}
      sold={rowStats.find((stat) => stat.label === "sold")}
      revenue={rowStats.find((stat) => stat.label === "revenue")}
      menu={
        <>
          <DropdownMenuItem asChild>
            <Link href={`/business/events/${event.event_id}/manage`}><Settings2 />Manage</Link>
          </DropdownMenuItem>
          {canEdit && !isWcRow && (
            <DropdownMenuItem asChild>
              <Link href={`/business/events/${event.event_id}/edit`}><Pencil />Edit</Link>
            </DropdownMenuItem>
          )}
          {canScan && !isSeriesNight && !isWcRow && (
            <DropdownMenuItem asChild>
              <Link href={`/business/events/${event.event_id}/manage/scanner`}>
                <ScanLine />Scan
              </Link>
            </DropdownMenuItem>
          )}
          {guestViewUrl && (
            <DropdownMenuItem asChild>
              <a href={guestViewUrl} target="_blank" rel="noopener noreferrer"><ExternalLink />View</a>
            </DropdownMenuItem>
          )}
          {canEdit && !isWcRow && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={createFromTemplateHref(event)}><Copy />Use as template</Link>
              </DropdownMenuItem>
            </>
          )}
        </>
      }
    />
  )
}
