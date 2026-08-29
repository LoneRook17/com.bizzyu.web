"use client"

import { useState } from "react"
import Link from "next/link"
import { Zap } from "lucide-react"
import { useAuth } from "@/lib/business/auth-context"
import {
  fmtNightDate,
  nightHref,
  weeklyCoverNightCancelEventId,
  WEEKLY_ACCESS_SECTION_LABEL,
  type DoorAccessNight,
  type DoorAccessProgramSummary,
} from "@/lib/business/door-access"
import { HOST_CUSTOM_CHIP_LABEL, isHostCustomNight } from "@/lib/business/host-custom-night"
import { WC_DRAFT_CHIP_LABEL, isWeeklyCoverHoldStatus } from "@/lib/business/wc-draft-hold"
import { weeklyCoverNightNeedsPendingCancel } from "@/lib/business/weekly-cover-visibility"
import { HostCardThumbnail, HostListCard, type HostCardChip } from "@/components/business/v2/host/HostListCard"
import { Button } from "@/components/business/v2/ui/button"
import { CancelEventModal } from "@/components/business/v2/events/CancelEventModal"

/**
 * Pink Weekly Cover night card on Host Tonight / Upcoming.
 * Cancel uses the existing event request-cancellation path (#100).
 */
export function WeeklyCoverNightCard({
  program,
  night,
  seriesActive = true,
  onCancelled,
}: {
  program: DoorAccessProgramSummary
  night: DoorAccessNight
  seriesActive?: boolean
  onCancelled?: () => void
}) {
  const { user, isPending } = useAuth()
  const canEdit = user?.business_role === "owner" || user?.business_role === "manager"
  const [cancelOpen, setCancelOpen] = useState(false)
  const cancelEventId = weeklyCoverNightCancelEventId(night)
  const pendingCancel = weeklyCoverNightNeedsPendingCancel(night, seriesActive)
  const showCancel =
    canEdit &&
    seriesActive &&
    night.status !== "cancelled" &&
    !pendingCancel &&
    cancelEventId != null

  const chips: HostCardChip[] = []
  if (isPending || isWeeklyCoverHoldStatus(night.status)) {
    chips.push({ label: WC_DRAFT_CHIP_LABEL, variant: "neutral" })
  }
  if (pendingCancel) chips.push({ label: "Cancellation pending", variant: "warning" })
  if (
    isHostCustomNight({
      product_kind: night.product_kind ?? "weekly_cover",
      access_kind: night.access_kind,
      series_customized_at: night.series_customized_at,
      flyer_image_url_override: night.flyer_image_url_override,
      override_scope: night.override_scope,
      occurrence_date: night.occurrence_date,
    })
  ) {
    chips.push({ label: HOST_CUSTOM_CHIP_LABEL, variant: "access" })
  }

  const href = nightHref(program.id, night.occurrence_date)
  const sold = night.passes_sold ?? 0

  return (
    <>
      <HostListCard
        kind="access"
        href={href}
        title={night.name || program.name || WEEKLY_ACCESS_SECTION_LABEL}
        meta={[fmtNightDate(night.occurrence_date), program.venue_name].filter(Boolean).join(" · ")}
        secondary={night.has_override || night.series_customized_at ? "One-off night" : undefined}
        chips={chips}
        thumbnail={
          <HostCardThumbnail
            kind="access"
            src={night.flyer_image_url_override || night.flyer_image_url || program.flyer_image_url}
            alt={program.name}
            icon={Zap}
          />
        }
        stats={[
          { label: "sold", value: sold.toLocaleString("en-US") },
          { label: "date", value: fmtNightDate(night.occurrence_date) },
        ]}
        actions={
          <>
            <Button variant="ghost" size="sm" asChild>
              <Link href={href}>View</Link>
            </Button>
            {showCancel && (
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                onClick={() => setCancelOpen(true)}
              >
                Cancel
              </Button>
            )}
          </>
        }
      />
      {cancelEventId != null && (
        <CancelEventModal
          open={cancelOpen}
          onOpenChange={setCancelOpen}
          eventId={cancelEventId}
          eventName={fmtNightDate(night.occurrence_date, { withYear: true })}
          onCancelled={() => {
            setCancelOpen(false)
            onCancelled?.()
          }}
        />
      )}
    </>
  )
}
