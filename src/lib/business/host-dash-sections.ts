/**
 * Business Events list — Flutter Host tab IA (Tonight / Upcoming / Schedules).
 *
 * After D3 leftovers go live, every generated WC/RC night would otherwise
 * dump as a flat pile. This is the same product as Host, desktop-sized:
 *
 *   1. Tonight — occurrence cards whose calendar date is today (US/Eastern).
 *   2. Upcoming events & WC — today+14 for series WC/RC; standalone /
 *      one-off / far Custom always. Collapsed preview; expand shows the
 *      rest of that window. Not every generated night.
 *      Tonight/Upcoming cards group under day headers (Sat Aug 29).
 *   3. Schedules — Weekly Cover weekday templates and green Recurring
 *      (RC) series. The setup, not every occurrence card.
 *
 * Draft vs live is unchanged: unapproved = draft; approved = live.
 * Pink WC / green Event chips stay on the cards (D12).
 */

import type { EventListItem, RecurringSeriesListItem } from "./types.ts"
import {
  DEFAULT_NIGHT_PREVIEW_COUNT,
  isHostCustomWeeklyCoverNight,
  isWeeklyCoverProduct,
  parseIsoDate,
  visibleUpcomingNights,
  type DoorAccessNight,
  type DoorAccessProgramSummary,
} from "./door-access.ts"
import {
  eventAccessGroupsForPrograms,
  isWeeklyCoverSeriesRef,
  listedWeeklyCoverProgramId,
  type DoorAccessEventGroup,
  type EventTypeFilter,
} from "./events-list.ts"
import { hostCustomSlot } from "./weekly-cover-nights.ts"
import {
  eventOccurrenceDate,
  hostShowsWeeklyCoverNight,
  hostUpcomingShowsGreenNight,
  isCustomizedSeriesNight,
  isStandaloneOneOff,
  nightsForHostWeeklyCoverGrid,
  SERIES_NIGHTS_WINDOW_DAYS,
} from "./series-nights-window.ts"
import {
  isApprovedCanceledStatus,
  isSeriesActive,
  weeklyCoverNightNeedsPendingCancel,
  weeklyCoverNightVisibleOnDash,
  weeklyCoverProgramVisibleOnDash,
} from "./weekly-cover-visibility.ts"

export const HOST_DASH_TONIGHT = "Tonight"
export const HOST_DASH_UPCOMING = "Upcoming events & WC"
export const HOST_DASH_SCHEDULES = "Schedules"
export const HOST_DASH_UPCOMING_HELPER =
  "Nights in the next two weeks. One-off and Custom dates stay listed even farther out."
export const HOST_DASH_SCHEDULES_HELPER =
  "Weekly Cover days and recurring events. The schedule, not every generated night."

export const HOST_UPCOMING_PREVIEW_COUNT = DEFAULT_NIGHT_PREVIEW_COUNT
export const HOST_UPCOMING_FETCH_LIMIT = 100

export type ProgramNightsLoad = {
  program: DoorAccessProgramSummary
  nights: DoorAccessNight[]
}

export type HostDashOccurrence =
  | {
      kind: "event"
      key: string
      sortKey: string
      date: string
      event: EventListItem
    }
  | {
      kind: "access"
      key: string
      sortKey: string
      date: string
      program: DoorAccessProgramSummary
      night: DoorAccessNight
    }
  | {
      kind: "access-event"
      key: string
      sortKey: string
      date: string
      event: EventListItem
      programId: number
    }

export type HostDashSchedule =
  | { kind: "access"; key: string; sortKey: string; program: DoorAccessProgramSummary }
  | { kind: "access-fallback"; key: string; sortKey: string; group: DoorAccessEventGroup }
  | {
      kind: "series"
      key: string
      sortKey: string
      seriesId: number
      series: RecurringSeriesListItem | null
      name: string
    }

export type HostDashSections = {
  tonight: HostDashOccurrence[]
  upcoming: HostDashOccurrence[]
  upcomingPreview: HostDashOccurrence[]
  upcomingRestCount: number
  schedules: HostDashSchedule[]
}

export type HostDashSectionsInput = {
  events: readonly EventListItem[]
  programs: readonly DoorAccessProgramSummary[]
  programNights?: readonly ProgramNightsLoad[]
  series?: readonly RecurringSeriesListItem[]
  wcSeriesIds?: readonly number[]
  inactiveWcIds?: readonly number[]
  today: string
  showEvents: boolean
  showAccessNights: boolean
  showAccessSchedules: boolean
  windowDays?: number
}

/** Live Host layout: Upcoming tab, or the Weekly Cover-only segment. */
export function shouldUseHostDashLayout(tab: string, typeFilter: EventTypeFilter): boolean {
  if (typeFilter === "access") return true
  return tab === "upcoming"
}

export function occurrenceIsPinned(row: HostDashOccurrence): boolean {
  if (row.kind === "event" || row.kind === "access-event") {
    if (weeklyCoverNightNeedsPendingCancel(row.event, false)) return true
    return isStandaloneOneOff(row.event) || isCustomizedSeriesNight(row.event)
  }
  return isHostCustomWeeklyCoverNight(row.night)
}

function sortOccurrences(rows: HostDashOccurrence[]): HostDashOccurrence[] {
  return [...rows].sort((a, b) => {
    const byKey = a.sortKey.localeCompare(b.sortKey)
    if (byKey !== 0) return byKey
    return a.key.localeCompare(b.key)
  })
}

function sortSchedules(rows: HostDashSchedule[]): HostDashSchedule[] {
  return [...rows].sort((a, b) => {
    const byKey = a.sortKey.localeCompare(b.sortKey)
    if (byKey !== 0) return byKey
    return a.key.localeCompare(b.key)
  })
}

function isSeriesTemplateRow(event: EventListItem): boolean {
  return event.is_recurring === true && event.recurring_series_id == null
}

/**
 * Green Event / leftover sold card — not a live WC occurrence.
 * Ended-series sold leftovers always list (they are one-offs now).
 */
export function includeGreenOccurrence(
  event: EventListItem,
  wcSeriesIds: readonly number[],
  inactiveWcIds: ReadonlySet<number>,
): boolean {
  if (isApprovedCanceledStatus(event.status)) return false
  if (isSeriesTemplateRow(event)) return false

  const programId = listedWeeklyCoverProgramId(event, wcSeriesIds)
  if (programId != null) {
    const ended = inactiveWcIds.has(programId)
    return ended && weeklyCoverNightNeedsPendingCancel(event, false)
  }

  const seriesId = Number(event.recurring_series_id)
  if (Number.isFinite(seriesId) && seriesId > 0 && inactiveWcIds.has(seriesId)) {
    return weeklyCoverNightNeedsPendingCancel(event, false)
  }
  return !isWeeklyCoverProduct(event)
}

function greenShowsOnHostList(event: EventListItem, today: string, windowDays: number): boolean {
  if (weeklyCoverNightNeedsPendingCancel(event, false)) return true
  return hostUpcomingShowsGreenNight(event, today, windowDays)
}

function accessKey(programId: number, date: string): string {
  return `access-${programId}-${date}`
}

function nightsByProgram(
  programNights: readonly ProgramNightsLoad[],
): Map<number, DoorAccessNight[]> {
  const map = new Map<number, DoorAccessNight[]>()
  for (const row of programNights) map.set(row.program.id, row.nights)
  return map
}

function collectAccessOccurrences(
  programs: readonly DoorAccessProgramSummary[],
  programNights: readonly ProgramNightsLoad[],
  events: readonly EventListItem[],
  wcSeriesIds: readonly number[],
  inactiveWcIds: ReadonlySet<number>,
  today: string,
  windowDays: number,
): HostDashOccurrence[] {
  const seen = new Set<string>()
  const out: HostDashOccurrence[] = []
  const nightsMap = nightsByProgram(programNights)

  for (const program of programs) {
    if (!weeklyCoverProgramVisibleOnDash(program)) continue
    if (inactiveWcIds.has(program.id)) continue
    const nights = nightsMap.get(program.id) ?? []
    const visible = nightsForHostWeeklyCoverGrid(nights, today, windowDays, (night) =>
      hostCustomSlot(night, nights, program),
    )
    for (const night of visible) {
      if (!weeklyCoverNightVisibleOnDash(night, true)) continue
      if (isApprovedCanceledStatus(night.status)) continue
      const date = eventOccurrenceDate(night)
      if (!date) continue
      const key = accessKey(program.id, date)
      if (seen.has(key)) continue
      seen.add(key)
      out.push({
        kind: "access",
        key,
        sortKey: night.start_date_time || date,
        date,
        program,
        night,
      })
    }
  }

  for (const event of events) {
    const programId = listedWeeklyCoverProgramId(event, wcSeriesIds)
    // R4: a DETACHED WC leftover (series delete kept this Custom-edited
    // night; services nulled its series id and cleared the marker) is a
    // standalone one-off now. Exactly ONE pink card, always listed — a
    // standalone night has no series window to clip against — chip off.
    if (
      programId == null &&
      isWeeklyCoverProduct(event) &&
      event.recurring_series_id !== undefined &&
      (event.recurring_series_id == null || Number(event.recurring_series_id) === 0)
    ) {
      if (!weeklyCoverNightVisibleOnDash(event, true)) continue
      const date = eventOccurrenceDate(event)
      if (!date) continue
      const key = `access-leftover-${event.event_id}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push({
        kind: "access-event",
        key,
        sortKey: event.start_date_time || date,
        date,
        event,
        programId: 0,
      })
      continue
    }
    if (programId == null) continue
    if (inactiveWcIds.has(programId)) continue
    if (!weeklyCoverNightVisibleOnDash(event, true)) continue
    const date = eventOccurrenceDate(event)
    if (!date) continue
    const key = accessKey(programId, date)
    if (seen.has(key)) continue
    if (
      !hostShowsWeeklyCoverNight(
        {
          occurrence_date: date,
          start_date_time: event.start_date_time,
          is_stamped: true,
          event_id: event.event_id,
          series_customized_at: event.series_customized_at,
          product_kind: event.product_kind ?? "weekly_cover",
          access_kind: event.access_kind,
          recurring_series_id: event.recurring_series_id,
        },
        today,
        windowDays,
      )
    ) {
      continue
    }
    seen.add(key)
    out.push({
      kind: "access-event",
      key,
      sortKey: event.start_date_time || date,
      date,
      event,
      programId,
    })
  }

  return out
}

function collectSchedules(
  programs: readonly DoorAccessProgramSummary[],
  events: readonly EventListItem[],
  series: readonly RecurringSeriesListItem[],
  wcSeriesIds: readonly number[],
  inactiveWcIds: ReadonlySet<number>,
  showEvents: boolean,
  showAccessSchedules: boolean,
): HostDashSchedule[] {
  const out: HostDashSchedule[] = []
  const listedProgramIds = new Set<number>()

  if (showAccessSchedules) {
    for (const program of programs) {
      if (!weeklyCoverProgramVisibleOnDash(program)) continue
      if (inactiveWcIds.has(program.id)) continue
      listedProgramIds.add(program.id)
      out.push({
        kind: "access",
        key: `schedule-access-${program.id}`,
        sortKey: program.next_night_date ?? "",
        program,
      })
    }
    for (const group of eventAccessGroupsForPrograms(
      [...events],
      programs,
      wcSeriesIds,
      [...inactiveWcIds],
    )) {
      if (listedProgramIds.has(group.programId) || inactiveWcIds.has(group.programId)) continue
      out.push({
        kind: "access-fallback",
        key: `schedule-fallback-${group.programId}`,
        sortKey: group.events[0]?.start_date_time ?? "",
        group,
      })
    }
  }

  if (showEvents) {
    const seenSeries = new Set<number>()
    for (const row of series) {
      if (!isSeriesActive(row.is_active)) continue
      if (isWeeklyCoverSeriesRef(row) || wcSeriesIds.includes(row.id)) continue
      if (inactiveWcIds.has(row.id)) continue
      seenSeries.add(row.id)
      out.push({
        kind: "series",
        key: `schedule-series-${row.id}`,
        sortKey: row.next_occurrence_date ?? "",
        seriesId: row.id,
        series: row,
        name: row.name,
      })
    }
    for (const event of events) {
      if (listedWeeklyCoverProgramId(event, wcSeriesIds) != null) continue
      if (isWeeklyCoverProduct(event)) continue
      const seriesId = Number(event.recurring_series_id)
      if (!Number.isFinite(seriesId) || seriesId <= 0) continue
      if (seenSeries.has(seriesId) || inactiveWcIds.has(seriesId)) continue
      seenSeries.add(seriesId)
      out.push({
        kind: "series",
        key: `schedule-series-${seriesId}`,
        sortKey: eventOccurrenceDate(event),
        seriesId,
        series: null,
        name: event.name,
      })
    }
  }

  return sortSchedules(out)
}

export function hostDashSections(input: HostDashSectionsInput): HostDashSections {
  const {
    events,
    programs,
    programNights = [],
    series = [],
    wcSeriesIds = [],
    inactiveWcIds = [],
    today,
    showEvents,
    showAccessNights,
    showAccessSchedules,
    windowDays = SERIES_NIGHTS_WINDOW_DAYS,
  } = input
  const inactive = new Set(inactiveWcIds)

  const occurrences: HostDashOccurrence[] = []

  if (showEvents) {
    for (const event of events) {
      if (!includeGreenOccurrence(event, wcSeriesIds, inactive)) continue
      if (!greenShowsOnHostList(event, today, windowDays)) continue
      const date = eventOccurrenceDate(event)
      if (!date) continue
      occurrences.push({
        kind: "event",
        key: `event-${event.event_id}`,
        sortKey: event.start_date_time || date,
        date,
        event,
      })
    }
  } else if (showAccessNights) {
    // Access-only segment: sold leftovers of a host-ended series still list.
    for (const event of events) {
      if (!includeGreenOccurrence(event, wcSeriesIds, inactive)) continue
      if (!weeklyCoverNightNeedsPendingCancel(event, false)) continue
      if (!greenShowsOnHostList(event, today, windowDays)) continue
      const date = eventOccurrenceDate(event)
      if (!date) continue
      occurrences.push({
        kind: "event",
        key: `event-${event.event_id}`,
        sortKey: event.start_date_time || date,
        date,
        event,
      })
    }
  }

  if (showAccessNights) {
    occurrences.push(
      ...collectAccessOccurrences(
        programs,
        programNights,
        events,
        wcSeriesIds,
        inactive,
        today,
        windowDays,
      ),
    )
  }

  const tonight: HostDashOccurrence[] = []
  const upcoming: HostDashOccurrence[] = []
  for (const row of sortOccurrences(occurrences)) {
    if (row.date === today) tonight.push(row)
    else if (row.date > today) upcoming.push(row)
  }

  const upcomingPreview = visibleUpcomingNights(
    upcoming,
    false,
    HOST_UPCOMING_PREVIEW_COUNT,
    occurrenceIsPinned,
  )

  return {
    tonight,
    upcoming,
    upcomingPreview,
    upcomingRestCount: Math.max(0, upcoming.length - upcomingPreview.length),
    schedules: collectSchedules(
      programs,
      events,
      series,
      wcSeriesIds,
      inactive,
      showEvents,
      showAccessSchedules,
    ),
  }
}

export function visibleHostUpcoming(
  sections: HostDashSections,
  expanded: boolean,
): HostDashOccurrence[] {
  return expanded ? sections.upcoming : sections.upcomingPreview
}

const SEPARATOR_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const
const SEPARATOR_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const

/**
 * "Sat Aug 29" / "Thu Sep 3" — Tonight/Upcoming day headers.
 * Calendar string, never `new Date("YYYY-MM-DD")` (UTC day-shift).
 */
export function fmtHostDateSeparator(isoDate: string): string {
  const parts = parseIsoDate(isoDate)
  if (!parts) return isoDate
  const weekday = SEPARATOR_DAYS[(new Date(Date.UTC(parts.y, parts.m - 1, parts.d)).getUTCDay() + 6) % 7]
  return `${weekday} ${SEPARATOR_MONTHS[parts.m - 1]} ${parts.d}`
}

export type HostDateGroup<T extends { date: string } = HostDashOccurrence> = {
  date: string
  label: string
  rows: T[]
}

/** Group already-sorted Tonight/Upcoming cards under day headers. */
export function groupOccurrencesByDate<T extends { date: string }>(
  rows: readonly T[],
): HostDateGroup<T>[] {
  const groups: HostDateGroup<T>[] = []
  for (const row of rows) {
    const last = groups[groups.length - 1]
    if (last && last.date === row.date) {
      last.rows.push(row)
      continue
    }
    groups.push({
      date: row.date,
      label: fmtHostDateSeparator(row.date),
      rows: [row],
    })
  }
  return groups
}

export function hostDashIsEmpty(sections: HostDashSections): boolean {
  return (
    sections.tonight.length === 0 &&
    sections.upcoming.length === 0 &&
    sections.schedules.length === 0
  )
}
