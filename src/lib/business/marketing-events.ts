/**
 * Marketing → Events: every upcoming green event AND every upcoming Weekly
 * Cover night, one row each. A venue that only has WC nights must not empty-state.
 */

import type { EventListItem } from "./types.ts"
import { isWeeklyCoverProduct, type DoorAccessProgramSummary } from "./door-access.ts"
import { isApprovedCanceledStatus } from "./weekly-cover-visibility.ts"

export type MarketingEventKind = "event" | "weekly_cover"

export interface MarketingEventRow {
  key: string
  kind: MarketingEventKind
  name: string
  start: string
  venueName: string
  ticketsSold: number
  announceHref: string
  eventId: number | null
}

export interface MarketingNightInput {
  programId: number
  programName: string
  venueName: string
  date: string
  eventId: number | null
  ticketsSold?: number
  status?: string | null
}

function formatNightStart(date: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date} 00:00:00` : date
}

export function marketingRowsFromEvents(events: EventListItem[]): MarketingEventRow[] {
  const rows: MarketingEventRow[] = []
  for (const event of events) {
    if (isApprovedCanceledStatus(event.status)) continue
    if (isWeeklyCoverProduct(event)) continue
    rows.push({
      key: `event-${event.event_id}`,
      kind: "event",
      name: event.name,
      start: event.start_date_time ?? "",
      venueName: event.venue_name || "",
      ticketsSold: event.ticket_sales_count ?? 0,
      announceHref: `/business/events/${event.event_id}/manage/announcements`,
      eventId: event.event_id,
    })
  }
  return rows
}

export function marketingRowsFromWcNights(nights: MarketingNightInput[]): MarketingEventRow[] {
  const rows: MarketingEventRow[] = []
  for (const night of nights) {
    if (isApprovedCanceledStatus(night.status)) continue
    const eventId = night.eventId
    rows.push({
      key: eventId != null ? `wc-${night.programId}-${eventId}` : `wc-${night.programId}-${night.date}`,
      kind: "weekly_cover",
      name: night.programName,
      start: formatNightStart(night.date),
      venueName: night.venueName,
      ticketsSold: night.ticketsSold ?? 0,
      announceHref:
        eventId != null
          ? `/business/events/${eventId}/manage/announcements`
          : `/business/door-access/${night.programId}`,
      eventId,
    })
  }
  return rows
}

/** When night stamps are not loaded yet, still list the program's next night. */
export function marketingRowsFromPrograms(
  programs: DoorAccessProgramSummary[],
  alreadyListedDates: Set<string> = new Set(),
): MarketingEventRow[] {
  const rows: MarketingEventRow[] = []
  for (const program of programs) {
    if (!program.is_active || !program.next_night_date) continue
    const key = `${program.id}:${program.next_night_date}`
    if (alreadyListedDates.has(key)) continue
    rows.push({
      key: `wc-program-${program.id}-${program.next_night_date}`,
      kind: "weekly_cover",
      name: program.name,
      start: formatNightStart(program.next_night_date),
      venueName: program.venue_name || "",
      ticketsSold: 0,
      announceHref: `/business/door-access/${program.id}`,
      eventId: null,
    })
  }
  return rows
}

export function marketingUpcomingRows(opts: {
  events: EventListItem[]
  programs: DoorAccessProgramSummary[]
  nights?: MarketingNightInput[]
}): MarketingEventRow[] {
  const events = marketingRowsFromEvents(opts.events)
  const nights = marketingRowsFromWcNights(opts.nights ?? [])
  const listed = new Set(
    nights.map((row) => {
      const date = row.start.slice(0, 10)
      const programId = row.key.split("-")[1]
      return `${programId}:${date}`
    }),
  )
  // Prefer stamped nights; fill any program whose next night is not yet listed.
  const fromPrograms = marketingRowsFromPrograms(opts.programs, listed)
  const all = [...events, ...nights, ...fromPrograms]
  all.sort((a, b) => a.start.localeCompare(b.start))
  return all
}
