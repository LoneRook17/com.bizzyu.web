/**
 * Wall-clock comparison for event times.
 *
 * Server stamps are wall-clock strings in the EVENT's zone, not instants. They
 * are compared as wall clocks: `now` is rendered into the same zone and the two
 * are matched digit for digit. Handing them to `new Date()` drags an Eastern
 * night into the viewer's timezone, which is the class of bug the redemption
 * surfaces keep getting bitten by.
 *
 * Extracted from checkin-guest.ts so the guest check-in page and the line-skip
 * scan page share one implementation instead of each inventing its own rules.
 */

/** "YYYY-MM-DD HH:MM:SS", digits exactly as the server wrote them. */
export function wallClockStamp(value: string | null | undefined): string | null {
  const raw = String(value ?? "").trim()
  if (!raw) return null
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?/)
  if (!match) return null
  const [, y, mo, d, h, mi, s] = match
  return `${y}-${mo}-${d} ${h}:${mi}:${s ?? "00"}`
}

/** Now, as a wall clock in the event's zone, in the same shape. */
export function nowWallClockStamp(
  zone: string | null | undefined,
  now: Date,
): string | null {
  const build = (timeZone?: string) => {
    const parts = new Intl.DateTimeFormat("en-US", {
      ...(timeZone ? { timeZone } : {}),
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(now)
    const at = (type: string) => parts.find((p) => p.type === type)?.value ?? ""
    // Some engines render midnight as hour 24 under hour12:false.
    const hour = at("hour") === "24" ? "00" : at("hour")
    const stamp = `${at("year")}-${at("month")}-${at("day")} ${hour}:${at("minute")}:${at("second")}`
    return wallClockStamp(stamp)
  }
  try {
    return build(zone || undefined)
  } catch {
    // An unknown IANA zone throws. The viewer's own clock is a better answer
    // than refusing to render a working button.
    try {
      return build()
    } catch {
      return null
    }
  }
}

/** "9:00 PM" from a wall-clock stamp. Never touches Date parsing. */
export function stampClock(stamp: string | null): string | null {
  if (!stamp) return null
  const hour = Number(stamp.slice(11, 13))
  const minute = stamp.slice(14, 16)
  if (!Number.isFinite(hour) || hour < 0 || hour > 23) return null
  return `${hour % 12 || 12}:${minute} ${hour >= 12 ? "PM" : "AM"}`
}
