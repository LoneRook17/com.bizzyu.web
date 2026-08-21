"use client"

import { Zap } from "lucide-react"
import {
  accessRowStats,
  programHref,
  programMetaLine,
  programScheduleLine,
  type DoorAccessProgramSummary,
} from "@/lib/business/door-access"
import { HostCardThumbnail, HostListCard } from "@/components/business/v2/host/HostListCard"

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
  const chips: Array<{ label: string; variant: "neutral" | "info" }> = []
  if (!program.is_active) chips.push({ label: "Ended", variant: "neutral" })
  if (program.promotion_enabled) chips.push({ label: "Promoted", variant: "info" })

  return (
    <HostListCard
      kind="access"
      href={programHref(program.id)}
      title={program.name || "Weekly access"}
      meta={programMetaLine(program)}
      secondary={programScheduleLine(program)}
      chips={chips}
      thumbnail={
        <HostCardThumbnail kind="access" src={program.flyer_image_url} alt={program.name} icon={Zap} />
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
