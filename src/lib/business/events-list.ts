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
  isWeeklyCoverProduct,
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
export type DoorAccessEventNight = {
  name: string
  venue_id?: number | string | null
  venue_name?: string
  start_date_time?: string | null
  flyer_image_url?: string
  access_kind?: string | null
  /** Services' explicit product stamp. Missing on older payloads. */
  product_kind?: string | null
  recurring_series_id?: number | string | null
  event_id?: number
}

export type DoorAccessEventGroup = {
  programId: number
  name: string
  events: DoorAccessEventNight[]
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
 *
 * WC FLAW 3 (binding): a WC night is NEVER a green named Event. So a night
 * whose own row says product_kind='weekly_cover' leaves this list even when
 * its access_kind is a stale 'event' and its series made neither lookup list
 * (programIdFromOwnedEvent reads product_kind directly). Such a night still
 * renders — doorAccessGroupsFromEvents groups it by the same helper, so it
 * shows as a pink Weekly Cover row instead. A WC night with NO series id has
 * no program to route to and stays green, which is the honest degrade.
 */
export function groupEventRows(
  events: EventListItem[],
  series: RecurringSeriesListItem[] = [],
  wcSeriesIds: readonly number[] = [],
): EventRow[] {
  const byId = new Map<number, RecurringSeriesListItem>()
  for (const s of series) byId.set(s.id, s)
  const weeklyIds = new Set(wcSeriesIds)

  const rows: EventRow[] = []
  const groupIndex = new Map<number, number>()

  for (const event of events) {
    if (isDoorAccessKind(event.access_kind)) continue
    if (programIdFromOwnedEvent(event) != null) continue
    if (event.recurring_series_id != null && weeklyIds.has(event.recurring_series_id)) continue
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

/** Fields `workingProgramIdForEventGroup` reads from GET /business/door-access. */
export type ListedProgramRef = Pick<
  DoorAccessProgramSummary,
  "id" | "name" | "venue_name" | "next_night_date" | "date_range_start" | "date_range_end"
>

/** Dated Weekly Cover row → series program page. Named event → its event page. */
export function eventListHref(
  event: EventListItem,
  programs: readonly ListedProgramRef[] = [],
  wcSeriesIds: readonly number[] = [],
): string {
  const programId =
    programIdFromOwnedEvent(event) ?? programIdFromWeeklyCoverSeries(event, wcSeriesIds)
  if (programId == null) return `/business/events/${event.event_id}`
  const working = workingProgramIdForEventGroup(
    { programId, name: event.name, events: [event] },
    programs,
  )
  // WC nights always open the series. Never /door-access/{event_id}.
  if (working == null) return programHref(programId)
  return programHref(working)
}

/**
 * A leaked door-access series still opens the program page, never
 * /business/recurring/:id (that page is for named recurring events).
 * The series id is recurring_series_id on the WC nights. Named series
 * without a WC program id stay on /business/recurring/:id.
 */
export function seriesRowHref(
  row: Extract<EventRow, { kind: "series" }>,
  programs: readonly ListedProgramRef[] = [],
  wcSeriesIds: readonly number[] = [],
): string {
  const programId =
    row.events.map((event) => programIdFromOwnedEvent(event)).find((id) => id != null) ??
    (wcSeriesIds.includes(row.seriesId) ? row.seriesId : null)
  if (programId == null) return seriesHref(row.seriesId)
  const working = workingProgramIdForEventGroup(
    { programId, name: row.name, events: row.events },
    programs,
  )
  return programHref(working ?? programId)
}

/** A night whose series is a known Weekly Cover program, even if access_kind is event. */
function programIdFromWeeklyCoverSeries(
  event: { recurring_series_id?: number | string | null },
  wcSeriesIds: readonly number[],
): number | null {
  if (event.recurring_series_id == null || event.recurring_series_id === "") return null
  const id = Number(event.recurring_series_id)
  if (!Number.isFinite(id) || id <= 0) return null
  return wcSeriesIds.includes(id) ? id : null
}

export type WeeklyCoverSeriesRef = {
  id: number
  name?: string
  program_kind?: string | null
  access_kind?: string | null
  /** Services' explicit product stamp. Missing on older payloads. */
  product_kind?: string | null
}

/**
 * program_kind='door_access' is the series' own flag. product_kind is the
 * stamp for a WC series that still says program_kind='event' (series 23);
 * without it an old payload falls back to access_kind. The name-regex
 * signal is gone — a series named "Weekly Cover" is whatever the wire says.
 */
export function isWeeklyCoverSeriesRef(series: WeeklyCoverSeriesRef): boolean {
  if (isDoorAccessKind(series.program_kind)) return true
  return isWeeklyCoverProduct(series)
}

/** Listed door-access ids plus recurring series that are Weekly Cover. */
export function weeklyCoverSeriesIds(
  programs: readonly ListedProgramRef[],
  series: readonly WeeklyCoverSeriesRef[] = [],
): number[] {
  const ids = new Set<number>()
  for (const program of programs) {
    if (program.id > 0) ids.add(program.id)
  }
  for (const row of series) {
    if (row.id > 0 && isWeeklyCoverSeriesRef(row)) ids.add(row.id)
  }
  return [...ids]
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

function numericVenueId(value: number | string | null | undefined): number | null {
  if (value == null || value === "") return null
  const id = Number(value)
  if (!Number.isFinite(id) || id <= 0) return null
  return id
}

/**
 * Weekly Cover row visibility for the venue switcher.
 *
 * All venues (`selectedVenueId` null) keeps every owned series. A single
 * venue hides another venue's series — Luke on The Devil Dungeon must not
 * see The Dungeon's Weekly Cover. Prefer `venue_id`; fall back to name
 * when a stamped night omitted the id.
 */
export function weeklyCoverVisibleForVenue(
  row: { venue_id?: number | string | null; venue_name?: string },
  selectedVenueId?: number | null,
  selectedVenueName?: string | null,
): boolean {
  const selectedId = numericVenueId(selectedVenueId)
  if (selectedId == null) return true
  const rowId = numericVenueId(row.venue_id)
  if (rowId != null) return rowId === selectedId
  if (selectedVenueName && row.venue_name) return sameVenueName(row.venue_name, selectedVenueName)
  return true
}

/** Hide other venues' Weekly Cover when a single venue is selected. */
export function weeklyCoverRowsForVenue<T extends { venue_id?: number | string | null; venue_name?: string }>(
  rows: readonly T[],
  selectedVenueId?: number | null,
  selectedVenueName?: string | null,
): T[] {
  return rows.filter((row) => weeklyCoverVisibleForVenue(row, selectedVenueId, selectedVenueName))
}

/** Access-group fallback rows, scoped the same way as listed programs. */
export function eventAccessGroupsForVenue(
  groups: readonly DoorAccessEventGroup[],
  selectedVenueId?: number | null,
  selectedVenueName?: string | null,
): DoorAccessEventGroup[] {
  return groups.filter((group) =>
    weeklyCoverVisibleForVenue(group.events[0] ?? { name: group.name }, selectedVenueId, selectedVenueName),
  )
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
 * The program id for stamped Weekly Cover nights is recurring_series_id
 * (e.g. 23). GET /business/door-access may omit a program_kind=event series;
 * that list is not a rewrite of the series id. Rematch to a different listed
 * id only when the nights have no series id of their own.
 */
export function workingProgramIdForEventGroup(
  group: DoorAccessEventGroup,
  programs: readonly ListedProgramRef[],
): number | null {
  if (group.programId > 0) return group.programId
  if (programs.some((program) => program.id === group.programId)) return group.programId
  const sameName = programs.find(
    (program) =>
      program.name.trim().toLowerCase() === group.name.trim().toLowerCase() &&
      sameVenueName(program.venue_name, group.events[0]?.venue_name),
  )
  if (sameName) return sameName.id
  const sameNights = programs.find((program) => programSharesNights(program, group))
  if (sameNights) return sameNights.id
  return null
}

/**
 * After GET /business/door-access/:id 404s, pick the series id to retry or
 * redirect to, or null to keep "Program not found".
 *
 * A listed id, or a series id from Events-list grouping, is the program:
 * return it so the page retries GET /business/door-access/:seriesId. A WC
 * night event_id redirects to that night's recurring_series_id. Does not
 * invent a different program and does not guess "the only program".
 */
export function recoverProgramIdFromLookups(args: {
  pathId: number
  programs: readonly ListedProgramRef[]
  eventSeriesId: number | null
  eventGroup: DoorAccessEventGroup | null
  ownedSeriesId?: number | null
}): number | null {
  const { pathId, programs, eventSeriesId, eventGroup, ownedSeriesId = null } = args

  if (eventSeriesId != null && eventSeriesId !== pathId) {
    const nightGroup =
      eventGroup?.programId === eventSeriesId
        ? eventGroup
        : { programId: eventSeriesId, name: eventGroup?.name ?? "", events: eventGroup?.events ?? [] }
    return workingProgramIdForEventGroup(nightGroup, programs) ?? eventSeriesId
  }

  if (programs.some((program) => program.id === pathId)) return pathId
  if (eventGroup?.programId === pathId) return pathId
  if (ownedSeriesId != null && ownedSeriesId === pathId) return pathId
  if (ownedSeriesId != null && ownedSeriesId > 0) return ownedSeriesId

  if (eventGroup) {
    const working = workingProgramIdForEventGroup(eventGroup, programs)
    if (working != null && working !== pathId) return working
  }
  return null
}

/**
 * Fallback Weekly Cover rows from stamped nights. AccessProgramRow already
 * owns a listed program id; an omitted series (program_kind=event) still
 * appears here so the host can open recurring_series_id.
 */
export function eventAccessGroupsForPrograms(
  events: EventListItem[],
  programs: readonly ListedProgramRef[],
  wcSeriesIds: readonly number[] = [],
): DoorAccessEventGroup[] {
  const listedIds = new Set(programs.map((program) => program.id))
  const seen = new Set<number>()
  const rows: DoorAccessEventGroup[] = []
  for (const group of doorAccessGroupsFromEvents(events, wcSeriesIds)) {
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
export function doorAccessGroupsFromEvents(
  events: DoorAccessEventNight[],
  wcSeriesIds: readonly number[] = [],
): DoorAccessEventGroup[] {
  const groups = new Map<number, DoorAccessEventGroup>()
  const order: number[] = []
  for (const event of events) {
    const programId =
      programIdFromOwnedEvent(event) ?? programIdFromWeeklyCoverSeries(event, wcSeriesIds)
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
