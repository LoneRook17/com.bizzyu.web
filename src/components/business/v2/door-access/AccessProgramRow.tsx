"use client"

import { Zap } from "lucide-react"
import { useAuth } from "@/lib/business/auth-context"
import { useVenue } from "@/lib/business/venue-context"
import {
  accessRowStats,
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
  const chips: Array<{ label: string; variant: "neutral" | "info" | "warning" }> = []
  if (isPending) chips.push({ label: WC_DRAFT_CHIP_LABEL, variant: "neutral" })
  if (!program.is_active) chips.push({ label: "Ended", variant: "neutral" })
  if (program.promotion_enabled) chips.push({ label: "Promoted", variant: "info" })
  const imageUrl = resolveProgramImageUrl(program, venues)

  return (
    <HostListCard
      kind="access"
      href={programHref(program.id)}
      title={program.name || WEEKLY_ACCESS_SECTION_LABEL}
      meta={programMetaLine(program)}
      secondary={programScheduleLine(program)}
      chips={chips}
      thumbnail={
        <HostCardThumbnail kind="access" src={imageUrl} alt={program.name} icon={Zap} />
      }
      /* D2-C. An access row's at-a-glance question is "how is this week going",
         so the week leads. Its sold figure is STUBBED — see accessRowStats and
         MISSING_ROW_AGGREGATES; the nights-left half beside it is real. The
         check-in mode moved off the row to make space: it is a setting, not a
         number, and it never changes between two glances at this list. */
      stats={accessRowStats(program)}
    />
  )
}
