/**
 * Host Upcoming / Events-list window for green recurring nights, and the
 * Weekly Cover program Nights grid (Flutter Host today+14, US/Eastern).
 *
 * Green: standalone one-offs always show. A generated series night only
 * shows for today plus two weeks, unless it is Custom (a later one-date
 * edit). Green series manage (`/business/recurring/:id`) still lists the
 * full series.
 *
 * Weekly Cover program grid: default = today through today+14. A
 * host-stamped Custom date (event_id + isHostCustomNight) may still appear
 * past +14. Generator lookaheads with no event_id / Not generated past +14
 * must not. Do not invent a 30/60-day dump.
 */

import { isHostCustomNight } from "./host-custom-night.ts"

export const SERIES_NIGHTS_WINDOW_DAYS = 14

export function addIsoDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number)
  const dt = new Date(year, month - 1, day)
  dt.setDate(dt.getDate() + days)
  const yyyy = dt.getFullYear()
  const mm = String(dt.getMonth() + 1).padStart(2, "0")
  const dd = String(dt.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

export function eventOccurrenceDate(event: {
  occurrence_date?: string | null
  start_date_time?: string | null
}): string {
  if (event.occurrence_date) return event.occurrence_date.slice(0, 10)
  return (event.start_date_time ?? "").slice(0, 10)
}

export function isCustomizedSeriesNight(event: {
  series_customized_at?: string | null
  is_customized?: boolean | number | string | null
  recurring_series_id?: number | string | null
  product_kind?: string | null
  access_kind?: string | null
  override_scope?: string | null
}): boolean {
  return isHostCustomNight({
    product_kind: event.product_kind ?? "event",
    access_kind: event.access_kind,
    recurring_series_id: event.recurring_series_id,
    series_customized_at: event.series_customized_at,
    is_customized: event.is_customized,
    override_scope: event.override_scope,
  })
}

export function isStandaloneOneOff(event: { recurring_series_id?: number | null }): boolean {
  return event.recurring_series_id == null
}

/**
 * Whether a green Event row belongs on Host Upcoming / the Events upcoming list.
 * Custom series nights and standalone one-offs are never clipped by the window.
 */
export function hostUpcomingShowsGreenNight(
  event: {
    recurring_series_id?: number | null
    series_customized_at?: string | null
    is_customized?: boolean | number | string | null
    occurrence_date?: string | null
    start_date_time?: string | null
  },
  today: string,
  windowDays: number = SERIES_NIGHTS_WINDOW_DAYS,
): boolean {
  if (isStandaloneOneOff(event)) return true
  if (isCustomizedSeriesNight(event)) return true
  const date = eventOccurrenceDate(event)
  if (!date) return true
  const horizon = addIsoDays(today, windowDays)
  return date >= today && date <= horizon
}

export function eventsForHostUpcomingList<T extends {
  recurring_series_id?: number | null
  series_customized_at?: string | null
  is_customized?: boolean | number | string | null
  occurrence_date?: string | null
  start_date_time?: string | null
}>(events: T[], today: string, windowDays: number = SERIES_NIGHTS_WINDOW_DAYS): T[] {
  return events.filter((event) => hostUpcomingShowsGreenNight(event, today, windowDays))
}

export type WeeklyCoverHostNight = {
  occurrence_date?: string | null
  start_date_time?: string | null
  is_stamped?: boolean
  event_id?: number | string | null
  series_customized_at?: string | null
  flyer_image_url_override?: string | null
  override_scope?: string | null
  product_kind?: string | null
  access_kind?: string | null
  recurring_series_id?: number | string | null
}

export type HostCustomSlotHint = {
  differsFromWeekdaySlot?: boolean
  offPatternDate?: boolean
}

/** Stamped night with a real events row — not a generator lookahead. */
export function weeklyCoverNightIsHostStamped(night: {
  is_stamped?: boolean
  event_id?: number | string | null
}): boolean {
  const eventId = night.event_id == null || night.event_id === "" ? null : Number(night.event_id)
  return eventId != null && Number.isFinite(eventId) && eventId > 0
}

/**
 * Far-window exception: host already created/edited this date (Custom) AND
 * core stamped an event_id. is_customized / has_override alone must not
 * pin a Not generated lookahead.
 */
export function isHostStampedCustomWeeklyCoverNight(
  night: WeeklyCoverHostNight,
  slot?: HostCustomSlotHint,
): boolean {
  if (!weeklyCoverNightIsHostStamped(night)) return false
  return isHostCustomNight(
    {
      product_kind: night.product_kind ?? "weekly_cover",
      access_kind: night.access_kind,
      recurring_series_id: night.recurring_series_id,
      series_customized_at: night.series_customized_at,
      flyer_image_url_override: night.flyer_image_url_override,
      override_scope: night.override_scope,
      occurrence_date: night.occurrence_date ?? eventOccurrenceDate(night),
    },
    slot,
  )
}

/**
 * Flutter Host list for a Weekly Cover program: today through today+14.
 * A host-stamped Custom date beyond +14 may still appear. Unstamped /
 * Not generated generator lookaheads beyond +14 must not.
 */
export function hostShowsWeeklyCoverNight(
  night: WeeklyCoverHostNight,
  today: string,
  windowDays: number = SERIES_NIGHTS_WINDOW_DAYS,
  slot?: HostCustomSlotHint,
): boolean {
  const date = eventOccurrenceDate(night)
  if (!date) return false
  if (date < today) return false
  const horizon = addIsoDays(today, windowDays)
  if (date <= horizon) return true
  return isHostStampedCustomWeeklyCoverNight(night, slot)
}

export function nightsForHostWeeklyCoverGrid<T extends WeeklyCoverHostNight>(
  nights: T[],
  today: string,
  windowDays: number = SERIES_NIGHTS_WINDOW_DAYS,
  slotFor?: (night: T) => HostCustomSlotHint | undefined,
): T[] {
  return nights.filter((night) =>
    hostShowsWeeklyCoverNight(night, today, windowDays, slotFor?.(night)),
  )
}
