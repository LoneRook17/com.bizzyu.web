"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronDown, Repeat } from "lucide-react"
import {
  fmtRowDate,
  relativeDayLabel,
  seriesRowHref,
  seriesRowNumbers,
  seriesRowStats,
  type EventRow,
  type ListedProgramRef,
} from "@/lib/business/events-list"
import { Button } from "@/components/business/v2/ui/button"
import {
  HostCardThumbnail,
  HostListCard,
  type HostCardChip,
} from "@/components/business/v2/host/HostListCard"
import { EventCard } from "./EventCard"

/**
 * A recurring SERIES as one green row on the combined list (D2-2).
 *
 * This is what replaced the Recurring nav item. It is a HostListCard like every
 * other row — same anatomy, same accent — so the list reads as one list rather
 * than "events, plus a different thing that is also events".
 *
 * Two affordances, deliberately both:
 *   • the row itself OPENS the series (/business/recurring/:id) — the existing
 *     detail page, reused, now reached from here instead of from a nav item;
 *   • the disclosure EXPANDS the nights in place, because the most common
 *     question about a series is "what about next Tuesday specifically", and
 *     each night still opens its own manage page exactly as before.
 *
 * Expanded nights render the real EventCard rather than a slimmed-down night
 * row: a night IS an event, and giving it a lesser card here would mean the
 * same event looks like two different things on two tabs of the same page.
 */
export function SeriesGroupRow({
  row,
  programs = [],
  wcSeriesIds = [],
  inactiveWcSeriesIds = [],
}: {
  row: Extract<EventRow, { kind: "series" }>
  programs?: readonly ListedProgramRef[]
  wcSeriesIds?: readonly number[]
  inactiveWcSeriesIds?: readonly number[]
}) {
  const [open, setOpen] = useState(false)
  const stats = seriesRowStats(row)
  const series = row.series

  const chips: HostCardChip[] = [{ label: "Series", variant: "info" }]
  // `is_active` arrives as 0/1 from MySQL through the API, hence the coercion.
  if (series && !series.is_active) chips.push({ label: "Suspended", variant: "neutral" })

  // D2-C: the numbers, and whether the sums are the WHOLE series or just the
  // nights on this page. That distinction decides the labels, so it is computed
  // once, next to the sums, rather than being re-derived per label below.
  const numbers = seriesRowNumbers(row)
  const nextDate = numbers.nextDate
  const relative = relativeDayLabel(nextDate)
  // fmtRowDate, not the shared fmtDate: next_occurrence_date is a plain
  // calendar string and `new Date("2026-09-04")` is UTC midnight, which renders
  // a Friday night as Thursday for every US viewer.
  const meta = nextDate
    ? `Next night ${fmtRowDate(nextDate)}${relative ? ` · ${relative}` : ""}`
    : "No upcoming nights"
  const secondary =
    series && series.upcoming_count > stats.nights
      ? `${series.upcoming_count} nights upcoming · ${stats.nights} shown on this page`
      : `${stats.nights} ${stats.nights === 1 ? "night" : "nights"}`

  return (
    <div className="flex flex-col gap-2">
      <HostListCard
        kind="event"
        href={seriesRowHref(row, programs, wcSeriesIds)}
        typeLabel="SERIES"
        title={row.name}
        meta={meta}
        secondary={secondary}
        chips={chips}
        thumbnail={
          <HostCardThumbnail
            kind="event"
            src={series?.flyer_image_url ?? row.events[0]?.flyer_image_url}
            alt={row.name}
            icon={Repeat}
          />
        }
        stats={numbers.stats}
        actions={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
            >
              <ChevronDown className={open ? "rotate-180 transition-transform" : "transition-transform"} />
              {open ? "Hide nights" : `Show ${stats.nights} ${stats.nights === 1 ? "night" : "nights"}`}
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href={seriesRowHref(row, programs, wcSeriesIds)}>Manage series</Link>
            </Button>
          </>
        }
      />

      {open && (
        // Indented so an expanded series still reads as ONE row's contents and
        // not as the list having suddenly grown a dozen new top-level entries.
        <div className="flex flex-col gap-2 border-l-2 border-neutral-200 pl-4 dark:border-neutral-800">
          {row.events.map((event) => (
            <EventCard
              key={event.event_id}
              event={event}
              programs={programs}
              wcSeriesIds={wcSeriesIds}
              inactiveWcSeriesIds={inactiveWcSeriesIds}
            />
          ))}
        </div>
      )}
    </div>
  )
}
