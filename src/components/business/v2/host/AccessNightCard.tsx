"use client"

import Link from "next/link"
import { Zap } from "lucide-react"
import { useAuth } from "@/lib/business/auth-context"
import type { EventListItem } from "@/lib/business/types"
import {
  eventListHref,
  type ListedProgramRef,
} from "@/lib/business/events-list"
import {
  fmtNightDate,
  nightHref,
  WEEKLY_ACCESS_SECTION_LABEL,
  type DoorAccessNight,
  type DoorAccessProgramSummary,
} from "@/lib/business/door-access"
import { eventCheckoutUrl, isPubliclyLinkable } from "@/lib/business/public-links"
import { HOST_CUSTOM_CHIP_LABEL, hostCustomChipTone } from "@/lib/business/host-custom-night"
import { weeklyCoverNightNeedsPendingCancel } from "@/lib/business/weekly-cover-visibility"
import { WC_DRAFT_CHIP_LABEL, isWeeklyCoverHoldStatus } from "@/lib/business/wc-draft-hold"
import { Button } from "@/components/business/v2/ui/button"
import {
  HostCardThumbnail,
  HostListCard,
  type HostCardChip,
} from "@/components/business/v2/host/HostListCard"

/**
 * One Weekly Cover night on Host Tonight / Upcoming.
 *
 * Pink WEEKLY COVER chip (D12). Custom only when the Host voter says so —
 * weekday templates do not chip.
 *
 * 2026-08 instance-manage pass: the card matches the green EventCard's anatomy
 * — body click opens the night's full /manage page, and the footer is View
 * (the guest checkout page for THAT night) + Manage. No Scan (scan lives
 * inside manage and behind the door code) and no Cancel (cancel lives inside
 * manage's danger zone — the flow itself is unchanged, only the list-card
 * shortcut is gone). A night core has not stamped yet has no event id, so its
 * body falls back to the night editor page, which materialises it.
 */
export function AccessNightCard({
  program,
  night,
  event,
  programId,
  programs = [],
  wcSeriesIds = [],
  inactiveWcIds = [],
  seriesActive = true,
}: {
  program?: DoorAccessProgramSummary | null
  night?: DoorAccessNight | null
  event?: EventListItem | null
  programId?: number
  programs?: readonly ListedProgramRef[]
  wcSeriesIds?: readonly number[]
  inactiveWcIds?: readonly number[]
  seriesActive?: boolean
}) {
  const { isPending } = useAuth()
  const resolvedProgramId = program?.id ?? programId ?? 0
  const date = night?.occurrence_date ?? (event?.start_date_time ?? "").slice(0, 10)
  const status = night?.status ?? event?.status ?? null
  const title = program?.name || event?.name || WEEKLY_ACCESS_SECTION_LABEL
  const venue = program?.venue_name || event?.venue_name
  const flyer = night?.flyer_image_url || event?.flyer_image_url || program?.flyer_image_url

  const manageEventId =
    night?.event_id != null && night.event_id > 0
      ? night.event_id
      : event && event.event_id > 0
        ? event.event_id
        : null
  const href =
    manageEventId != null
      ? `/business/events/${manageEventId}/manage`
      : resolvedProgramId > 0 && date
        ? nightHref(resolvedProgramId, date)
        : event
          ? eventListHref(event, programs, wcSeriesIds, inactiveWcIds)
          : "/business/events"
  // View = the guest-facing page for this night. Withheld while the night
  // isn't publicly linkable — a dead checkout link helps no one.
  const viewUrl =
    manageEventId != null && isPubliclyLinkable(status) ? eventCheckoutUrl(manageEventId) : null

  const chips: HostCardChip[] = []
  if (isPending || isWeeklyCoverHoldStatus(status)) {
    chips.push({ label: WC_DRAFT_CHIP_LABEL, variant: "neutral" })
  }
  const pendingCancel = weeklyCoverNightNeedsPendingCancel(
    {
      status,
      ticket_sales_count: event?.ticket_sales_count,
      passes_sold: night?.passes_sold,
      paid_orders: night?.paid_orders,
      cancellation_status: event?.cancellation_status,
    },
    seriesActive,
  )
  if (pendingCancel) chips.push({ label: "Cancellation pending", variant: "warning" })
  if (event?.cancellation_status === "denied") {
    chips.push({ label: "Cancellation denied", variant: "danger" })
  }

  const customTone = hostCustomChipTone({
    product_kind: night?.product_kind ?? event?.product_kind ?? "weekly_cover",
    access_kind: night?.access_kind ?? event?.access_kind,
    recurring_series_id: event?.recurring_series_id,
    series_customized_at: night?.series_customized_at ?? event?.series_customized_at,
    is_customized: night?.is_customized ?? event?.is_customized,
    override_scope: night?.override_scope,
    flyer_image_url_override: night?.flyer_image_url_override,
    occurrence_date: date,
  })
  if (customTone === "wc") {
    chips.push({ label: HOST_CUSTOM_CHIP_LABEL, variant: "access" })
  } else if (customTone === "event") {
    chips.push({ label: HOST_CUSTOM_CHIP_LABEL, variant: "custom" })
  }

  return (
    <HostListCard
      kind="access"
      href={href}
      title={title}
      meta={[date ? fmtNightDate(date) : null, venue].filter(Boolean).join(" · ")}
      secondary={customTone ? "Custom night" : "Weekly Cover night"}
      chips={chips}
      thumbnail={
        <HostCardThumbnail kind="access" src={flyer} alt={title} icon={Zap} />
      }
      actions={
        manageEventId != null ? (
          <>
            {viewUrl && (
              <Button variant="ghost" size="sm" asChild>
                <a href={viewUrl} target="_blank" rel="noopener noreferrer">
                  View
                </a>
              </Button>
            )}
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/business/events/${manageEventId}/manage`}>Manage</Link>
            </Button>
          </>
        ) : undefined
      }
    />
  )
}
