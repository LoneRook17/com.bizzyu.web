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
import {
  isDoorAccessKind,
  programHref,
  programIdFromOwnedEvent,
  type DoorAccessProgramSummary,
} from "./door-access.ts"
import { WEEKLY_ACCESS_SECTION_LABEL } from "./weekly-cover-label.ts"

/** The segment's three positions. `all` is the default — one combined list. */
export const EVENT_TYPE_FILTERS = [
  { value: "all", label: "All" },
  { value: "events", label: "Events" },
  { value: "access", label: WEEKLY_ACCESS_SECTION_LABEL },
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
 * Dated Weekly Cover nights on GET /business/events, grouped by program id
 * (`recurring_series_id`). Used when the dedicated Weekly Cover segment still
 * needs a row even if GET /business/door-access returned []. Never invents a
 * program: a night without a series id is skipped.
 */
export type DoorAccessEventGroup = {
  programId: number
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
 *
 * Door-access nights are NOT green Event/Series rows. They belong on the
 * Weekly Cover segment (AccessProgramRow, or doorAccessGroupsFromEvents as a
 * fallback). Treating them as EventCard / SeriesGroupRow sends hosts to
 * /business/events/:event_id or /business/recurring/:id, and using event_id as
 * a /business/door-access/:id segment 404s.
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
    if (isDoorAccessKind(event.access_kind)) continue
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

/** Dated Weekly Cover row → program page. Named event → its event page. */
export function eventListHref(event: EventListItem): string {
  const programId = programIdFromOwnedEvent(event)
  if (programId != null) return programHref(programId)
  return `/business/events/${event.event_id}`
}

/**
 * A leaked door-access series still opens the program page, never
 * /business/recurring/:id (that page is for named recurring events).
 */
export function seriesRowHref(row: Extract<EventRow, { kind: "series" }>): string {
  const programId = row.events.map(programIdFromOwnedEvent).find((id) => id != null)
  if (programId != null) return programHref(programId)
  return seriesHref(row.seriesId)
}

function eventDateOnly(value: string | null | undefined): string | null {
  if (!value) return null
  const dateOnly = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim())
  return dateOnly ? dateOnly[1] : null
}

function sameVenueName(a: string | undefined, b: string | undefined): boolean {
  const left = (a ?? "").trim().toLowerCase()
  const right = (b ?? "").trim().toLowerCase()
  return left.length > 0 && left === right
}

function programSharesNights(
  program: Pick<DoorAccessProgramSummary, "next_night_date" | "date_range_start" | "date_range_end" | "venue_name">,
  group: DoorAccessEventGroup,
): boolean {
  const venue = group.events[0]?.venue_name
  if (!sameVenueName(program.venue_name, venue)) return false
  const dates = group.events
    .map((event) => eventDateOnly(event.start_date_time))
    .filter((d): d is string => d != null)
  if (program.next_night_date && dates.includes(program.next_night_date)) return true
  return dates.some((d) => {
    if (program.date_range_start && d < program.date_range_start) return false
    if (program.date_range_end && d > program.date_range_end) return false
    return true
  })
}

/**
 * Prefer a GET /business/door-access program id when one covers these nights.
 * recurring_series_id (e.g. 23) is only used when the list is empty. An
 * unlisted series id is dropped rather than linked, because GET
 * /business/door-access/:id 404s when program_kind is not door_access.
 */
export function workingProgramIdForEventGroup(
  group: DoorAccessEventGroup,
  programs: readonly Pick<
    DoorAccessProgramSummary,
    "id" | "name" | "venue_name" | "next_night_date" | "date_range_start" | "date_range_end"
  >[],
): number | null {
  if (programs.some((program) => program.id === group.programId)) return group.programId
  const sameName = programs.find(
    (program) =>
      program.name.trim().toLowerCase() === group.name.trim().toLowerCase() &&
      sameVenueName(program.venue_name, group.events[0]?.venue_name),
  )
  if (sameName) return sameName.id
  const sameNights = programs.find((program) => programSharesNights(program, group))
  if (sameNights) return sameNights.id
  if (programs.length === 0) return group.programId
  return null
}

/** Fallback Weekly Cover rows, remapped to listed program ids when possible. */
export function eventAccessGroupsForPrograms(
  events: EventListItem[],
  programs: readonly Pick<
    DoorAccessProgramSummary,
    "id" | "name" | "venue_name" | "next_night_date" | "date_range_start" | "date_range_end"
  >[],
): DoorAccessEventGroup[] {
  const listedIds = new Set(programs.map((program) => program.id))
  const seen = new Set<number>()
  const rows: DoorAccessEventGroup[] = []
  for (const group of doorAccessGroupsFromEvents(events)) {
    const workingId = workingProgramIdForEventGroup(group, programs)
    if (workingId == null) continue
    if (listedIds.has(workingId)) continue
    if (seen.has(workingId)) continue
    seen.add(workingId)
    rows.push({ ...group, programId: workingId })
  }
  return rows
}

/** Group stamped Weekly Cover nights by program id. Order is first-seen. */
export function doorAccessGroupsFromEvents(events: EventListItem[]): DoorAccessEventGroup[] {
  const groups = new Map<number, DoorAccessEventGroup>()
  const order: number[] = []
  for (const event of events) {
    const programId = programIdFromOwnedEvent(event)
    if (programId == null) continue
    const existing = groups.get(programId)
    if (existing) {
      existing.events.push(event)
      continue
    }
    order.push(programId)
    groups.set(programId, { programId, name: event.name, events: [event] })
  }
  return order.map((id) => groups.get(id)!)
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

// ── D2-C: the at-a-glance numbers ───────────────────────────────────────────
//
// Every figure below comes from a field the list ALREADY fetches. Nothing here
// adds a request, and nothing here is computed from a second round trip — a
// list row that fires its own fetch is a list that gets slower with every row.
//
// WHAT IS NOT DERIVABLE FROM THE LIST PAYLOADS — see MISSING_ROW_AGGREGATES.
// Those render as an explicit pending stat, not as a zero. A zero is a claim;
// "-" is the truth, and on a money column the difference is the whole point.

/**
 * A row's stat cell. Structurally the HostListCard `HostCardStat` — declared
 * here rather than imported so this module stays free of the `@/` alias, which
 * the Node test runner cannot resolve.
 */
export interface RowStat {
  label: string
  value: string
  /** Renders muted with a dashed rule: the number exists, we can't see it yet. */
  pending?: boolean
  /** `title=` on a pending cell — says WHY, so it doesn't read as a bug. */
  hint?: string
}

/**
 * The two numbers this list cannot answer today, and what each one needs.
 * Exported so the gap is greppable and testable rather than living only in a
 * commit message. Both are STUBBED VISUALLY on the rows below.
 */
export const MISSING_ROW_AGGREGATES = [
  {
    key: "series_totals",
    row: "series",
    label: "Series to date",
    // seriesRowStats can only sum the nights on the CURRENT PAGE. Whole-series
    // sold/revenue needs the aggregate added to listSeries (services
    // RecurringSeriesService.listSeries already computes occurrence_count /
    // upcoming_count the same way — this is two more subqueries there, not a
    // new endpoint, but it is still a server change and so is not built here).
    needs: "sold/revenue aggregate on GET /business/recurring-series",
  },
  {
    key: "access_week_sold",
    row: "access",
    label: "This week",
    // DoorAccessProgramSummary carries schedule + pricing only. passes_sold
    // exists per NIGHT inside GET /business/door-access/:id, so answering this
    // from the client would be one request per program row.
    needs: "week-scoped passes_sold on GET /business/door-access",
  },
] as const

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/**
 * Calendar parts of a date, WITHOUT a timezone round trip where one would be a
 * bug. A series' next_occurrence_date is a plain "YYYY-MM-DD" — feeding that to
 * `new Date()` yields UTC midnight and renders Friday's night as Thursday for
 * every US viewer (the same trap door-access.ts guards). A full datetime keeps
 * the existing behaviour and parses as local, which is what the rest of this
 * surface already does with start_date_time.
 */
function dayParts(value: string | null | undefined): { y: number; m: number; d: number } | null {
  if (!value) return null
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (dateOnly) {
    return { y: Number(dateOnly[1]), m: Number(dateOnly[2]), d: Number(dateOnly[3]) }
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return { y: parsed.getFullYear(), m: parsed.getMonth() + 1, d: parsed.getDate() }
}

/** "Aug 23" — the row's date cell. Year only when it isn't this one. */
export function fmtRowDate(value: string | null | undefined, now: Date = new Date()): string {
  const parts = dayParts(value)
  if (!parts) return "-"
  const base = `${MONTHS[parts.m - 1]} ${parts.d}`
  return parts.y === now.getFullYear() ? base : `${base}, ${parts.y}`
}

/**
 * "tonight" / "tomorrow" / "in 5 days" / "12 days ago" — the small line under
 * the date. Whole calendar days apart, computed from local midnights so an
 * event at 11 PM tonight never reads as "tomorrow" because of a rounding hour.
 */
export function relativeDayLabel(value: string | null | undefined, now: Date = new Date()): string {
  const parts = dayParts(value)
  if (!parts) return ""
  const then = new Date(parts.y, parts.m - 1, parts.d).getTime()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const days = Math.round((then - today) / 86_400_000)

  if (days === 0) return "tonight"
  if (days === 1) return "tomorrow"
  if (days === -1) return "yesterday"
  if (days > 1) return days <= 60 ? `in ${days} days` : "upcoming"
  return days >= -60 ? `${-days} days ago` : "past"
}

/**
 * An EVENT row's numbers: sold · revenue · when.
 *
 * Attendees only earn a cell once there is a check-in to report. On an event
 * that hasn't happened it is a zero next to two live numbers, which reads as
 * "nobody is coming" rather than "the doors haven't opened".
 */
export function eventRowStats(event: EventListItem, now: Date = new Date()): RowStat[] {
  const stats: RowStat[] = [
    { label: "sold", value: (event.ticket_sales_count ?? 0).toLocaleString("en-US") },
  ]
  if ((event.total_attendees ?? 0) > 0) {
    stats.push({ label: "checked in", value: (event.total_attendees ?? 0).toLocaleString("en-US") })
  }
  stats.push({ label: "revenue", value: money(event.total_revenue) })
  stats.push({
    label: relativeDayLabel(event.start_date_time, now) || "date",
    value: fmtRowDate(event.start_date_time, now),
  })
  return stats
}

/**
 * A SERIES row's numbers: next occurrence + series totals.
 *
 * The sums are page-scoped by construction (groupEventRows only ever sees one
 * page). So the labels say which is which:
 *   • the whole series is on this page  → these ARE the series totals;
 *   • it isn't → the sums are labelled with the night count they cover, and a
 *     pending "Series to date" cell stands in for the number we can't compute.
 * Silently labelling a partial sum "Revenue" would be a wrong number on a money
 * column, which is worse than an honest blank.
 */
export function seriesRowNumbers(
  row: Extract<EventRow, { kind: "series" }>,
  now: Date = new Date(),
): { stats: RowStat[]; isWholeSeries: boolean; nextDate: string | null } {
  const { nights, sold, revenue } = seriesRowStats(row)
  const total = row.series?.occurrence_count ?? nights
  const isWholeSeries = total <= nights
  const scope = isWholeSeries ? "" : ` · ${nights} shown`

  const nextDate = row.series?.next_occurrence_date ?? row.events[0]?.start_date_time ?? null

  const stats: RowStat[] = [
    { label: `sold${scope}`, value: sold.toLocaleString("en-US") },
    { label: `revenue${scope}`, value: money(revenue) },
  ]

  if (!isWholeSeries) {
    const gap = MISSING_ROW_AGGREGATES[0]
    stats.push({
      label: gap.label,
      value: "-",
      pending: true,
      hint: `${total} nights in this series. Whole-series totals need a ${gap.needs}.`,
    })
  }

  stats.push({
    label: relativeDayLabel(nextDate, now) || "next night",
    value: fmtRowDate(nextDate, now),
  })

  return { stats, isWholeSeries, nextDate }
}

/** Local money format — `usd()` lives behind the `@/` alias the runner can't load. */
function money(n: number | string | null | undefined): string {
  const v = typeof n === "string" ? Number(n) : n
  if (v == null || !Number.isFinite(v)) return "$0"
  // Whole dollars on a list row: cents are noise at a glance and the detail
  // page is one click away.
  return `$${Math.round(v).toLocaleString("en-US")}`
}
