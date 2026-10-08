/**
 * Display times for public event payloads.
 *
 * `start_date_time` is a wall clock in the event's own zone, written as
 * "2026-10-08 21:00:00" with no offset. It is already 9 PM in that zone.
 * `new Date("2026-10-08T21:00:00")` parses it in the runtime zone, which is
 * UTC on Vercel, and formatting that instant in America/New_York then
 * subtracts the current Eastern offset. In October that is four hours, so
 * 9 PM prints as 5 PM. In January the same mistake would subtract five.
 *
 * Naive strings are printed from their own digits. An absolute instant (Z or
 * a numeric offset) is converted with the event's IANA zone, falling back to
 * America/New_York, so daylight-saving rules come from the zone rather than
 * a fixed offset. Neither path reads the server's or the visitor's zone.
 */

export const EVENT_TIMEZONE_FALLBACK = "America/New_York"

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

const NAIVE_DATETIME =
  /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?$/
const HAS_OFFSET = /(?:Z|[+-]\d{2}:?\d{2})$/i

interface ClockParts {
  y: number
  m: number
  d: number
  hh: number
  mm: number
}

export function resolveEventTimezone(zone: string | null | undefined): string {
  const candidate = String(zone ?? "").trim()
  if (candidate && isIanaZone(candidate)) return candidate
  return EVENT_TIMEZONE_FALLBACK
}

function isIanaZone(zone: string): boolean {
  try {
    Intl.DateTimeFormat("en-US", { timeZone: zone })
    return true
  } catch {
    return false
  }
}

function validParts(y: number, m: number, d: number, hh: number, mm: number): ClockParts | null {
  if (m < 1 || m > 12 || d < 1 || d > 31 || hh < 0 || hh > 23 || mm < 0 || mm > 59) return null
  const utc = new Date(Date.UTC(y, m - 1, d))
  if (utc.getUTCFullYear() !== y || utc.getUTCMonth() !== m - 1 || utc.getUTCDate() !== d) return null
  return { y, m, d, hh, mm }
}

function partsFromNaive(raw: string): ClockParts | null {
  const match = NAIVE_DATETIME.exec(raw)
  if (!match) return null
  return validParts(
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
  )
}

function partsInZone(instant: Date, zone: string): ClockParts | null {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant)
  const at = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? ""
  const hour = at("hour") === "24" ? "00" : at("hour")
  return validParts(Number(at("year")), Number(at("month")), Number(at("day")), Number(hour), Number(at("minute")))
}

/** Calendar fields of an event timestamp, in the event's zone. */
export function eventClockParts(
  raw: string | null | undefined,
  zone?: string | null,
): ClockParts | null {
  const trimmed = String(raw ?? "").trim()
  if (!trimmed) return null
  if (!HAS_OFFSET.test(trimmed)) return partsFromNaive(trimmed)

  const iso = trimmed.includes(" ") ? trimmed.replace(" ", "T") : trimmed
  const instant = new Date(iso)
  if (Number.isNaN(instant.getTime())) return null
  const resolved = resolveEventTimezone(zone)
  try {
    return partsInZone(instant, resolved)
  } catch {
    return partsInZone(instant, EVENT_TIMEZONE_FALLBACK)
  }
}

function clockLabel(parts: ClockParts, minutes: "trim" | "always"): string {
  const ampm = parts.hh >= 12 ? "PM" : "AM"
  const h12 = parts.hh % 12 || 12
  if (minutes === "trim" && parts.mm === 0) return `${h12} ${ampm}`
  return `${h12}:${String(parts.mm).padStart(2, "0")} ${ampm}`
}

function dayLabel(parts: ClockParts): string {
  const weekday = WEEKDAYS[new Date(Date.UTC(parts.y, parts.m - 1, parts.d)).getUTCDay()]
  return `${weekday}, ${MONTHS[parts.m - 1]} ${parts.d}`
}

/**
 * "Thu, Oct 8, 9 PM". Minutes appear only when they are not :00, matching
 * the event cards. On-the-hour nights stay "9 PM"; a 9:30 night stays 9:30.
 */
export function formatEventWhen(raw: string | null | undefined, zone?: string | null): string {
  const parts = eventClockParts(raw, zone)
  if (!parts) return ""
  return `${dayLabel(parts)}, ${clockLabel(parts, "trim")}`
}

/** "Thu, Oct 8, 9:00 PM". Ticket and check-in rows always show minutes. */
export function formatEventDateTime(raw: string | null | undefined, zone?: string | null): string {
  const parts = eventClockParts(raw, zone)
  if (!parts) return ""
  return `${dayLabel(parts)}, ${clockLabel(parts, "always")}`
}

/** "9:00 PM". */
export function formatEventClock(raw: string | null | undefined, zone?: string | null): string {
  const parts = eventClockParts(raw, zone)
  if (!parts) return ""
  return clockLabel(parts, "always")
}
