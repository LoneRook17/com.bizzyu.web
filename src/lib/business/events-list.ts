// The Events page's one manage surface (D2-4 / D2-6).
//
// Two independent decisions live here, both as pure functions so `npm test`
// can pin them without rendering React:
//
//   1. TYPE TOGGLE — which kinds of row the segment is asking for.
//   2. SERIES GROUPING — a recurring series' generated nights collapse into a
//      single expandable row instead of filling the list with twelve near
//      identical Tuesdays.
//
// Grouping is the reason the "Recurring" nav item could die (D2-2): a series
// is not a parallel world any more, it is a row on this list that opens the
// existing /business/recurring/:id page.

import type { EventListItem, RecurringSeriesListItem } from "./types"

/** The segment's three positions. `all` is the default — one combined list. */
export const EVENT_TYPE_FILTERS = [
  { value: "all", label: "All" },
  { value: "events", label: "Events" },
  { value: "access", label: "Weekly Access" },
] as const

export type EventTypeFilter = (typeof EVENT_TYPE_FILTERS)[number]["value"]

/** Anything unrecognised (a stale deep link, a hand-typed ?type=) reads as All. */
export function parseEventTypeFilter(raw: string | null | undefined): EventTypeFilter {
  return raw === "events" || raw === "access" ? raw : "all"
}

export function showsEvents(filter: EventTypeFilter): boolean {
  return filter !== "access"
}

export function showsAccess(filter: EventTypeFilter): boolean {
  return filter !== "events"
}

/**
 * One rendered row. A `series` row owns >= 1 dated nights; a `single` row is a
 * one-off event (or a series TEMPLATE, which has no generated night to hide
 * behind and so stands on its own).
 */
export type EventRow =
  | { kind: "single"; key: string; event: EventListItem }
  | {
      kind: "series"
      key: string
      seriesId: number
      /** Present when /business/recurring-series resolved; null when it didn't. */
      series: RecurringSeriesListItem | null
      /** Fallback name when `series` is null — the first night's own name. */
      name: string
      events: EventListItem[]
    }

/**
 * Collapse a page of events into rows.
 *
 * ORDER IS PRESERVED. The server sorts by start_date_time and that sort is the
 * answer to "what's next"; a series group therefore takes the position of its
 * EARLIEST night on this page rather than being hoisted to the top. Sorting
 * groups separately would silently reorder a list whose whole job is chronology.
 *
 * Only rows carrying `recurring_series_id` group. A series TEMPLATE row
 * (is_recurring true, no FK — what the "Recurring" status tab lists) is left
 * alone: it is already the series, so wrapping it in a group of one would just
 * add a disclosure triangle to a row that has nothing underneath it.
 *
 * PAGINATION CAVEAT, stated rather than hidden: grouping happens on the page
 * the server returned, so a series whose nights straddle a page boundary shows
 * as one group per page. The group row links to the series page, which is the
 * complete list — so the answer is always one click away, never wrong.
 */
export function groupEventRows(
  events: EventListItem[],
  series: RecurringSeriesListItem[] = [],
): EventRow[] {
  const byId = new Map<number, RecurringSeriesListItem>()
  for (const s of series) byId.set(s.id, s)

  const rows: EventRow[] = []
  const groupIndex = new Map<number, number>()

  for (const event of events) {
    const seriesId = event.recurring_series_id
    if (seriesId == null) {
      rows.push({ kind: "single", key: `event-${event.event_id}`, event })
      continue
    }

    const existing = groupIndex.get(seriesId)
    if (existing != null) {
      const row = rows[existing]
      if (row.kind === "series") row.events.push(event)
      continue
    }

    groupIndex.set(seriesId, rows.length)
    rows.push({
      kind: "series",
      key: `series-${seriesId}`,
      seriesId,
      series: byId.get(seriesId) ?? null,
      name: byId.get(seriesId)?.name ?? event.name,
      events: [event],
    })
  }

  return rows
}

/** Where a series row goes: the existing recurring detail page (D2-2). */
export function seriesHref(seriesId: number): string {
  return `/business/recurring/${seriesId}`
}

/** The at-a-glance numbers on a series row — summed across the nights shown. */
export function seriesRowStats(row: Extract<EventRow, { kind: "series" }>): {
  nights: number
  sold: number
  revenue: number
} {
  return {
    nights: row.events.length,
    sold: row.events.reduce((n, e) => n + (e.ticket_sales_count ?? 0), 0),
    revenue: row.events.reduce((n, e) => n + Number(e.total_revenue ?? 0), 0),
  }
}
