import { easternToday } from "./door-access.ts"

/**
 * WC-SMEAR follow-up (Luke, 2026-08-29 8:03 PM ET): the dash "next event"
 * tile said "our next event is Aug 28" on Saturday Aug 29 — a night already
 * a day in the past. The old pick reused hostUpcomingShowsGreenNight, whose
 * standalone-one-off and Custom arms deliberately skip the date window (the
 * UPCOMING LIST wants them always listed), so a finished one-off stayed
 * "coming up" forever.
 *
 * "Next" means the next start >= now ET — never a past occurrence. Events
 * store ET wall-clock datetimes, so the comparison is a string compare
 * against the ET now-stamp.
 */
export function easternNowStamp(now: Date = new Date()): string {
  const date = easternToday(now)
  const time = now.toLocaleTimeString("en-GB", {
    timeZone: "America/New_York",
    hour12: false,
  })
  return `${date} ${time}`
}

export function eventStartsAtOrAfter(
  event: { start_date_time?: string | null },
  nowStamp: string,
): boolean {
  const start = String(event.start_date_time ?? "").trim()
  if (!start) return false
  return start >= nowStamp
}

/**
 * The first event (in the caller's given order) that passes the caller's own
 * gates AND has not started yet. Sorting stays the caller's job — this only
 * refuses the past.
 */
export function nextUpcomingGreenEvent<T extends { start_date_time?: string | null }>(
  events: T[],
  passes: (event: T) => boolean,
  now: Date = new Date(),
): T | undefined {
  const stamp = easternNowStamp(now)
  return events
    .filter((event) => eventStartsAtOrAfter(event, stamp))
    .sort((a, b) => String(a.start_date_time).localeCompare(String(b.start_date_time)))
    .find(passes)
}
