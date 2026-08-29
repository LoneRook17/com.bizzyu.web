"use client"

import Link from "next/link"
import { Repeat } from "lucide-react"
import type { RecurringSeriesListItem } from "@/lib/business/types"
import { fmtRowDate, relativeDayLabel, seriesHref } from "@/lib/business/events-list"
import { formatDays } from "@/lib/business/door-access"
import { HostCardThumbnail, HostListCard } from "@/components/business/v2/host/HostListCard"
import { Button } from "@/components/business/v2/ui/button"

/**
 * Green Recurring series on Host Schedules.
 *
 * This is the repeating setup, not every generated night. Nights of this
 * series that belong on Tonight / Upcoming render as dated cards there.
 */
export function ScheduleSeriesRow({ series }: { series: RecurringSeriesListItem }) {
  const href = seriesHref(series.id)
  const next = series.next_occurrence_date
  const relative = relativeDayLabel(next)
  const meta = next
    ? `Next night ${fmtRowDate(next)}${relative ? ` · ${relative}` : ""}`
    : "No upcoming nights"
  const secondary = [formatDays(series.days_of_week), series.venue_name].filter(Boolean).join(" · ")

  return (
    <HostListCard
      kind="event"
      typeLabel="SERIES"
      href={href}
      title={series.name}
      meta={meta}
      secondary={secondary || undefined}
      chips={[{ label: "Series", variant: "info" }]}
      thumbnail={
        <HostCardThumbnail
          kind="event"
          src={series.flyer_image_url}
          alt={series.name}
          icon={Repeat}
        />
      }
      actions={
        <Button variant="ghost" size="sm" asChild>
          <Link href={href}>Manage series</Link>
        </Button>
      }
    />
  )
}
