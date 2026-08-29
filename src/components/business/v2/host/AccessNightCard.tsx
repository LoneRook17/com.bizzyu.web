"use client"

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
  weeklyCoverNightCancelEventId,
  WEEKLY_ACCESS_SECTION_LABEL,
  type DoorAccessNight,
  type DoorAccessProgramSummary,
} from "@/lib/business/door-access"
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
 * Pink WEEKLY COVER chip (D12). Cancel stays when the night has an event id
 * (#100). Custom only when the Host voter says so — weekday templates do not
 * chip.
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
  onCancel,
}: {
  program?: DoorAccessProgramSummary | null
  night?: DoorAccessNight | null
  event?: EventListItem | null
  programId?: number
  programs?: readonly ListedProgramRef[]
  wcSeriesIds?: readonly number[]
  inactiveWcIds?: readonly number[]
  seriesActive?: boolean
  onCancel?: (eventId: number, name: string) => void
}) {
  const { user, isPending } = useAuth()
  const canEdit = user?.business_role === "owner" || user?.business_role === "manager"
  const resolvedProgramId = program?.id ?? programId ?? 0
  const date = night?.occurrence_date ?? (event?.start_date_time ?? "").slice(0, 10)
  const status = night?.status ?? event?.status ?? null
  const title = program?.name || event?.name || WEEKLY_ACCESS_SECTION_LABEL
  const venue = program?.venue_name || event?.venue_name
  const flyer = night?.flyer_image_url || event?.flyer_image_url || program?.flyer_image_url
  const href =
    resolvedProgramId > 0 && date
      ? nightHref(resolvedProgramId, date)
      : event
        ? eventListHref(event, programs, wcSeriesIds, inactiveWcIds)
        : "/business/events"

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

  const cancelEventId = night
    ? weeklyCoverNightCancelEventId(night)
    : event && event.event_id > 0 && status !== "cancelled"
      ? event.event_id
      : null
  const showCancel =
    canEdit &&
    seriesActive &&
    status !== "cancelled" &&
    !pendingCancel &&
    onCancel != null
  const cancelEnabled = showCancel && cancelEventId != null
  const cancelName = date ? fmtNightDate(date, { withYear: true }) : title

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
        showCancel ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
            disabled={!cancelEnabled}
            onClick={() => {
              if (cancelEventId != null) onCancel(cancelEventId, cancelName)
            }}
          >
            Cancel
          </Button>
        ) : undefined
      }
    />
  )
}
