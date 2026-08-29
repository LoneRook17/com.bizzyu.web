/**
 * Host live list — same IA as the Flutter Host tab.
 *
 * Approved-shop Upcoming is NOT a flat pile of generated nights:
 *   1. Tonight — cards whose calendar date is today (US/Eastern).
 *   2. Upcoming events & WC — dated night cards. Series WC/RC stay inside
 *      today+14. Standalone / one-off / far Custom always show (D6).
 *      A short preview is visible; expand reveals the rest of the window.
 *      Cards group under day headers ("Sat Aug 29"), never an undifferentiated
 *      stack.
 *   3. Schedules — repeating setups only: Weekly Cover weekday templates and
 *      green Recurring (RC) series. Not every occurrence card.
 *
 * Past / Drafts / Recurring tabs keep the older Events-page list.
 */

import type { EventListItem, RecurringSeriesListItem } from "./types.ts"
import {
  isWeeklyCoverProduct,
  type DoorAccessNight,
  type DoorAccessProgramSummary,
} from "./door-access.ts"
import {
  isWeeklyCoverSeriesRef,
  listedWeeklyCoverProgramId,
  type DoorAccessEventGroup,
} from "./events-list.ts"
import {
  HOST_CUSTOM_CHIP_LABEL,
  isHostCustomNight,
  type HostCustomSlotHint,
} from "./host-custom-night.ts"
import {
  SERIES_NIGHTS_WINDOW_DAYS,
  addIsoDays,
  eventOccurrenceDate,
  hostShowsWeeklyCoverNight,
  hostUpcomingShowsGreenNight,
  isCustomizedSeriesNight,
  isHostStampedCustomWeeklyCoverNight,
  isStandaloneOneOff,
} from "./series-nights-window.ts"
import {
  isApprovedCanceledStatus,
  isSeriesActive,
  weeklyCoverNightNeedsPendingCancel,
  weeklyCoverNightVisibleOnDash,
} from "./weekly-cover-visibility.ts"

export const HOST_LIVE_TONIGHT_LABEL = "Tonight"
export const HOST_LIVE_UPCOMING_LABEL = "Upcoming events & WC"
export const HOST_LIVE_SCHEDULES_LABEL = "Schedules"
export const HOST_UPCOMING_PREVIEW_GROUPS = 2

const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const

export type HostLiveNight =
  | {
      kind: "event"
      key: string
      date: string
      sortKey: string
      alwaysShow: boolean
      event: EventListItem
    }
  | {
      kind: "access"
      key: string
      date: string
      sortKey: string
      alwaysShow: boolean
      program: DoorAccessProgramSummary
      night: DoorAccessNight
    }

export type HostDateGroup = {
  date: string
  label: string
  nights: HostLiveNight[]
}

export type HostScheduleRow =
  | { kind: "wc-program"; key: string; program: DoorAccessProgramSummary }
  | { kind: "wc-fallback"; key: string; group: DoorAccessEventGroup }
  | { kind: "rc-series"; key: string; series: RecurringSeriesListItem }

export type HostLiveList = {
  tonight: HostDateGroup | null
  upcomingPreview: HostDateGroup[]
  upcomingRest: HostDateGroup[]
  schedules: HostScheduleRow[]
}

export type LoadedProgramNights = {
  program: DoorAccessProgramSummary
  nights: DoorAccessNight[]
}

export type HostLiveListInput = {
  today: string
  events: readonly EventListItem[]
  series: readonly RecurringSeriesListItem[]
  programs: readonly DoorAccessProgramSummary[]
  loadedNights: readonly LoadedProgramNights[]
  eventAccessGroups?: readonly DoorAccessEventGroup[]
  wcSeriesIds?: readonly number[]
  inactiveWcIds?: readonly number[]
  includeEvents?: boolean
  includeAccess?: boolean
  previewGroups?: number
  slotFor?: (night: DoorAccessNight, program: DoorAccessProgramSummary, nights: DoorAccessNight[]) => HostCustomSlotHint | undefined
}

function isoDateOnly(value: string | null | undefined): string | null {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(String(value ?? "").trim())
  return match ? match[1] : null
}

/**
 * "Sat Aug 29" / "Thu Sep 3" — Host date separators.
 * Parsed as a calendar string. Never `new Date("YYYY-MM-DD")` (UTC skew).
 */
export function fmtDateSeparator(isoDate: string): string {
  const date = isoDateOnly(isoDate)
  if (!date) return isoDate
  const [y, m, d] = date.split("-").map(Number)
  if (!y || !m || !d) return isoDate
  const weekday = DAY_SHORT[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
  return `${weekday} ${MONTH_SHORT[m - 1]} ${d}`
}

export function isTonightDate(date: string, today: string): boolean {
  return date === today
}

/** Green night that must list even far out (standalone or Custom). */
export function greenNightAlwaysShows(event: {
  recurring_series_id?: number | string | null
  series_customized_at?: string | null
  is_customized?: boolean | number | string | null
  product_kind?: string | null
  access_kind?: string | null
  override_scope?: string | null
}): boolean {
  if (isStandaloneOneOff(event)) return true
  return isCustomizedSeriesNight(event)
}

/** WC night that must list even far out (Custom / one-off / override). */
export function wcNightAlwaysShows(
  night: DoorAccessNight,
  slot?: HostCustomSlotHint,
): boolean {
  if (night.has_override) return true
  if (slot?.offPatternDate) return true
  return isHostStampedCustomWeeklyCoverNight(night, slot)
}

export function groupHostNightsByDate(nights: readonly HostLiveNight[]): HostDateGroup[] {
  const byDate = new Map<string, HostLiveNight[]>()
  for (const night of nights) {
    const list = byDate.get(night.date) ?? []
    list.push(night)
    byDate.set(night.date, list)
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, rows]) => {
      rows.sort((a, b) => a.sortKey.localeCompare(b.sortKey) || a.key.localeCompare(b.key))
      return { date, label: fmtDateSeparator(date), nights: rows }
    })
}

function coveredAccessKeys(nights: readonly HostLiveNight[]): Set<string> {
  const keys = new Set<string>()
  for (const night of nights) {
    if (night.kind !== "access") continue
    keys.add(`${night.program.id}:${night.date}`)
  }
  return keys
}

function collectAccessNights(input: HostLiveListInput): HostLiveNight[] {
  const today = input.today
  const inactive = new Set(input.inactiveWcIds ?? [])
  const out: HostLiveNight[] = []

  for (const { program, nights } of input.loadedNights) {
    if (!program.is_active) continue
    const seriesActive = isSeriesActive(program.is_active) && !inactive.has(program.id)
    for (const night of nights) {
      if (night.is_closed) continue
      if (isApprovedCanceledStatus(night.status)) continue
      if (!weeklyCoverNightVisibleOnDash(night, seriesActive)) continue
      const slot = input.slotFor?.(night, program, nights)
      if (!hostShowsWeeklyCoverNight(night, today, SERIES_NIGHTS_WINDOW_DAYS, slot)) continue
      const date = eventOccurrenceDate(night)
      if (!date || date < today) continue
      out.push({
        kind: "access",
        key: `access-${program.id}-${date}`,
        date,
        sortKey: date,
        alwaysShow: wcNightAlwaysShows(night, slot),
        program,
        night,
      })
    }
  }
  return out
}

function accessNightFromEvent(event: EventListItem, date: string): DoorAccessNight {
  return {
    occurrence_date: date,
    is_stamped: true,
    is_scheduled: true,
    event_id: event.event_id,
    status: event.status,
    start_date_time: event.start_date_time,
    end_date_time: event.end_date_time,
    passes_sold: event.ticket_sales_count ?? 0,
    paid_orders: 0,
    is_customized: Boolean(event.is_customized),
    series_customized_at: event.series_customized_at ?? null,
    is_closed: false,
    has_override: Boolean(event.series_customized_at),
    start_time: "",
    end_time: "",
    tiers: [],
    product_kind: event.product_kind ?? "weekly_cover",
    access_kind: event.access_kind,
    recurring_series_id: event.recurring_series_id,
    flyer_image_url: event.flyer_image_url,
    name: event.name,
  }
}

function collectEventNights(input: HostLiveListInput, alreadyAccess: Set<string>): HostLiveNight[] {
  const today = input.today
  const wcSeriesIds = input.wcSeriesIds ?? []
  const inactive = new Set(input.inactiveWcIds ?? [])
  const out: HostLiveNight[] = []

  for (const event of input.events) {
    if (isApprovedCanceledStatus(event.status)) continue
    const date = eventOccurrenceDate(event)
    if (!date || date < today) continue

    const programId = listedWeeklyCoverProgramId(event, wcSeriesIds)
    const isWc = isWeeklyCoverProduct(event) || programId != null
    if (isWc) {
      const seriesId = programId ?? Number(event.recurring_series_id)
      const ended = Number.isFinite(seriesId) && inactive.has(seriesId)
      if (ended && weeklyCoverNightNeedsPendingCancel(event, false)) {
        out.push({
          kind: "event",
          key: `event-${event.event_id}`,
          date,
          sortKey: event.start_date_time ?? date,
          alwaysShow: true,
          event,
        })
        continue
      }
      if (ended || !Number.isFinite(seriesId) || alreadyAccess.has(`${seriesId}:${date}`)) continue
      const listed = input.programs.find((program) => program.id === seriesId)
      if (!listed) continue
      const stamped = accessNightFromEvent(event, date)
      if (!hostShowsWeeklyCoverNight(stamped, today)) continue
      out.push({
        kind: "access",
        key: `access-${seriesId}-${date}`,
        date,
        sortKey: date,
        alwaysShow: greenNightAlwaysShows(event) || Boolean(event.series_customized_at),
        program: listed,
        night: stamped,
      })
      continue
    }

    const seriesId = event.recurring_series_id
    if (seriesId != null) {
      const ended = inactive.has(seriesId)
      if (ended && !weeklyCoverNightVisibleOnDash(event, false)) continue
      if (ended && weeklyCoverNightNeedsPendingCancel(event, false)) {
        out.push({
          kind: "event",
          key: `event-${event.event_id}`,
          date,
          sortKey: event.start_date_time ?? date,
          alwaysShow: true,
          event,
        })
        continue
      }
      if (ended) continue
    }

    if (!hostUpcomingShowsGreenNight(event, today)) continue
    out.push({
      kind: "event",
      key: `event-${event.event_id}`,
      date,
      sortKey: event.start_date_time ?? date,
      alwaysShow: greenNightAlwaysShows(event),
      event,
    })
  }

  return out.filter((night) => {
    if (night.kind !== "event") return true
    const programId = listedWeeklyCoverProgramId(night.event, wcSeriesIds)
    if (programId == null) return true
    return !alreadyAccess.has(`${programId}:${night.date}`)
  })
}

function collectSchedules(input: HostLiveListInput): HostScheduleRow[] {
  const includeEvents = input.includeEvents !== false
  const includeAccess = input.includeAccess !== false
  const inactive = new Set(input.inactiveWcIds ?? [])
  const listedProgramIds = new Set(input.programs.map((program) => program.id))
  const rows: HostScheduleRow[] = []

  if (includeAccess) {
    for (const program of input.programs) {
      if (!isSeriesActive(program.is_active) || inactive.has(program.id)) continue
      if (!program.days_of_week.length) continue
      rows.push({ kind: "wc-program", key: `schedule-wc-${program.id}`, program })
    }
    for (const group of input.eventAccessGroups ?? []) {
      if (listedProgramIds.has(group.programId) || inactive.has(group.programId)) continue
      rows.push({ kind: "wc-fallback", key: `schedule-wc-fallback-${group.programId}`, group })
    }
  }

  if (includeEvents) {
    for (const series of input.series) {
      if (isWeeklyCoverSeriesRef(series)) continue
      if (!isSeriesActive(series.is_active) || inactive.has(series.id)) continue
      if (!series.days_of_week.length) continue
      rows.push({ kind: "rc-series", key: `schedule-rc-${series.id}`, series })
    }
  }

  return rows
}

export function partitionHostNights(
  nights: readonly HostLiveNight[],
  today: string,
  previewGroups: number = HOST_UPCOMING_PREVIEW_GROUPS,
): Pick<HostLiveList, "tonight" | "upcomingPreview" | "upcomingRest"> {
  const tonightNights = nights.filter((night) => isTonightDate(night.date, today))
  const upcoming = nights.filter((night) => night.date > today)

  const windowOnly = upcoming.filter((night) => !night.alwaysShow)
  const always = upcoming.filter((night) => night.alwaysShow)
  const windowDates = [...new Set(windowOnly.map((night) => night.date))].sort()
  const previewDates = new Set(windowDates.slice(0, Math.max(0, previewGroups)))

  const previewNights = [
    ...always,
    ...windowOnly.filter((night) => previewDates.has(night.date)),
  ]
  const restNights = windowOnly.filter((night) => !previewDates.has(night.date))

  const tonightGroups = groupHostNightsByDate(tonightNights)
  return {
    tonight: tonightGroups[0] ?? null,
    upcomingPreview: groupHostNightsByDate(previewNights),
    upcomingRest: groupHostNightsByDate(restNights),
  }
}

export function buildHostLiveList(input: HostLiveListInput): HostLiveList {
  const includeEvents = input.includeEvents !== false
  const includeAccess = input.includeAccess !== false
  const nights: HostLiveNight[] = []

  if (includeAccess) {
    nights.push(...collectAccessNights(input))
  }
  if (includeEvents) {
    nights.push(...collectEventNights(input, coveredAccessKeys(nights)))
  }

  const seen = new Set<string>()
  const unique = nights.filter((night) => {
    if (seen.has(night.key)) return false
    seen.add(night.key)
    return true
  })

  return {
    ...partitionHostNights(unique, input.today, input.previewGroups ?? HOST_UPCOMING_PREVIEW_GROUPS),
    schedules: collectSchedules(input),
  }
}

export function hostLiveListIsEmpty(list: HostLiveList): boolean {
  return (
    list.tonight == null &&
    list.upcomingPreview.length === 0 &&
    list.upcomingRest.length === 0 &&
    list.schedules.length === 0
  )
}

export function hostLiveNightCustomLabel(night: HostLiveNight): string | null {
  if (night.kind === "access") {
    return isHostCustomNight({
      product_kind: night.night.product_kind ?? "weekly_cover",
      access_kind: night.night.access_kind,
      series_customized_at: night.night.series_customized_at,
      flyer_image_url_override: night.night.flyer_image_url_override,
      override_scope: night.night.override_scope,
      occurrence_date: night.night.occurrence_date,
    })
      ? HOST_CUSTOM_CHIP_LABEL
      : null
  }
  return isCustomizedSeriesNight(night.event) ? HOST_CUSTOM_CHIP_LABEL : null
}

export { HOST_CUSTOM_CHIP_LABEL }
