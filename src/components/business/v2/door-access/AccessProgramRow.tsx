"use client"

import { Zap } from "lucide-react"
import { useAuth } from "@/lib/business/auth-context"
import { useVenue } from "@/lib/business/venue-context"
import {
  accessRowStats,
  formatDays,
  programHref,
  programMetaLine,
  programScheduleLine,
  resolveProgramImageUrl,
  WEEKLY_ACCESS_SECTION_LABEL,
  type DoorAccessProgramSummary,
} from "@/lib/business/door-access"
import { HostCardThumbnail, HostListCard } from "@/components/business/v2/host/HostListCard"
import { WC_DRAFT_CHIP_LABEL } from "@/lib/business/wc-draft-hold"

/**
 * A magenta WEEKLY ACCESS row (F9).
 *
 * Lives here rather than inside either page because BOTH the Weekly Access
 * section and the combined events list render it — one definition, so the two
 * surfaces cannot drift into lookalike rows with different metadata.
 *
 * Always links to the SERIES (D-F11.1). A program has no single night to open,
 * and picking one for the host would be a guess.
 */
export function AccessProgramRow({ program }: { program: DoorAccessProgramSummary }) {
  const { venues } = useVenue()
  const { isPending } = useAuth()
  // Status column: Draft while the business is unapproved, Ended for a
  // stopped program, Active otherwise. Promoted rides beside the title.
  const status: { label: string; variant: "neutral" | "success" } = isPending
    ? { label: WC_DRAFT_CHIP_LABEL, variant: "neutral" }
    : !program.is_active
      ? { label: "Ended", variant: "neutral" }
      : { label: "Active", variant: "success" }
  const chips: Array<{ label: string; variant: "info" }> = []
  if (program.promotion_enabled) chips.push({ label: "Promoted", variant: "info" })
  const imageUrl = resolveProgramImageUrl(program, venues)
  /* D2-C. An access row's at-a-glance question is "how is this week going",
     so the week leads. Its sold figure is STUBBED — see accessRowStats and
     MISSING_ROW_AGGREGATES; the nights-left half rides on the meta line. */
  const [soldThisWeek, nightsLeft] = accessRowStats(program)

  return (
    <HostListCard
      kind="access"
      href={programHref(program.id)}
      title={program.name || WEEKLY_ACCESS_SECTION_LABEL}
      when={formatDays(program.days_of_week)}
      meta={programMetaLine(program)}
      secondary={nightsLeft ? `${nightsLeft.value} ${nightsLeft.label}` : programScheduleLine(program)}
      status={status}
      chips={chips}
      sold={soldThisWeek}
      thumbnail={
        <HostCardThumbnail kind="access" src={imageUrl} alt={program.name} icon={Zap} />
      }
    />
  )
}
