/**
 * Host Upcoming / Events-list window for green recurring nights.
 *
 * Standalone one-offs always show. A generated series night only shows for
 * today plus two weeks, unless it is Custom (a later one-date edit). Weekly
 * Cover nights are not this helper's job.
 *
 * Series manage (`/business/recurring/:id`) still lists the full series.
 */

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
}): boolean {
  if (event.series_customized_at) return true
  const flag = event.is_customized
  return flag === true || flag === 1 || flag === "1"
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
