import { wallClockStamp, nowWallClockStamp, stampClock } from "./wall-clock.ts"

/**
 * Redemption window for a legacy line skip, on /ls/[uuid].
 *
 * Mirrors the guest check-in surface (checkin-guest.ts) in mechanism: wall-clock
 * stamps compared digit for digit, never handed to `new Date()`. The two pages
 * now share wall-clock.ts rather than each inventing its own clock rules.
 *
 * It does NOT share that page's DATA shape, because the two products differ.
 * The guest page reads a server-computed window (`scan_opens_at`,
 * `window_closes_at`, `event_timezone`) added by TF-CHECKIN. The /ls GET returns
 * only `instance_date` / `instance_start_time` / `instance_end_time` and no
 * timezone, so the window is derived here and the zone is assumed Eastern -
 * which is what the page already assumed, just implicitly and inconsistently.
 *
 * ⚠️ The right long-term fix is the same one TF-CHECKIN applied: have the server
 * return the window and the zone. Logged rather than done, because that is a
 * services change and this lane is web-only.
 */

/**
 * Redemption opens this many hours BEFORE doors.
 *
 * Mirrors SCAN_OPENS_HOURS_BEFORE_DOORS in services' eventScanWindow.ts, whose
 * own comment says "The lead is 3 hours (Luke). Do not retune it here." Same
 * rule, so the two surfaces open at the same moment.
 */
export const LINE_SKIP_OPENS_HOURS_BEFORE_DOORS = 3

/**
 * Every line-skip night is Eastern. The page already hardcoded
 * "America/New_York"; this makes that assumption explicit and applies it to
 * BOTH sides of the comparison, which the old code did not - it converted `now`
 * to Eastern and then compared it against a start time parsed in the VIEWER's
 * zone, so the check was wrong for anyone outside ET.
 */
export const LINE_SKIP_ASSUMED_ZONE = "America/New_York"

export type LineSkipWindowState = "open" | "not_open" | "closed" | "unknown"

export interface LineSkipWindowInput {
  instance_date?: string | null
  instance_start_time?: string | null
  instance_end_time?: string | null
}

/** Pure digit arithmetic on a wall clock. Treats the stamp as UTC so no zone
 *  conversion can creep in; we only ever add or subtract whole hours/days. */
function shiftStampHours(stamp: string | null, hours: number): string | null {
  if (!stamp) return null
  const y = Number(stamp.slice(0, 4))
  const mo = Number(stamp.slice(5, 7))
  const d = Number(stamp.slice(8, 10))
  const h = Number(stamp.slice(11, 13))
  const mi = Number(stamp.slice(14, 16))
  const s = Number(stamp.slice(17, 19))
  if ([y, mo, d, h, mi, s].some((n) => !Number.isFinite(n))) return null
  const shifted = new Date(Date.UTC(y, mo - 1, d, h + hours, mi, s))
  const pad = (n: number) => String(n).padStart(2, "0")
  return (
    `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())} ` +
    `${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}:${pad(shifted.getUTCSeconds())}`
  )
}

/** The night's doors / close / redemption-open stamps, or nulls. */
export function lineSkipWindowStamps(ticket: LineSkipWindowInput): {
  doors: string | null
  opens: string | null
  closes: string | null
} {
  const date = String(ticket.instance_date ?? "").slice(0, 10)
  const start = String(ticket.instance_start_time ?? "").trim()
  const end = String(ticket.instance_end_time ?? "").trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !start || !end) {
    return { doors: null, opens: null, closes: null }
  }

  const doors = wallClockStamp(`${date} ${start}`)
  let closes = wallClockStamp(`${date} ${end}`)
  // An overnight night ends the next calendar day - 10 PM to 2 AM.
  if (doors && closes && closes <= doors) closes = shiftStampHours(closes, 24)

  return {
    doors,
    opens: shiftStampHours(doors, -LINE_SKIP_OPENS_HOURS_BEFORE_DOORS),
    closes,
  }
}

/**
 * Where the clock sits against the redemption window.
 *
 * Unparseable input degrades to `unknown`, which callers treat as open - a
 * briefly-enabled button the server then refuses is a far better failure than a
 * wrongly-disabled one at the door.
 */
export function lineSkipWindowState(
  ticket: LineSkipWindowInput,
  now: Date = new Date(),
): LineSkipWindowState {
  const { opens, closes } = lineSkipWindowStamps(ticket)
  if (!opens && !closes) return "unknown"

  const current = nowWallClockStamp(LINE_SKIP_ASSUMED_ZONE, now)
  if (!current) return "unknown"

  if (opens && current < opens) return "not_open"
  if (closes && current > closes) return "closed"
  return "open"
}

/**
 * Why the button is disabled, with the real clock time.
 *
 * 🚨 The times are distinct and must stay distinct. Redemption opens
 * LINE_SKIP_OPENS_HOURS_BEFORE_DOORS before doors, so printing the doors time
 * under a "redemption opens at" label is wrong by exactly that lead - which is
 * what this surface did: it printed instance_start_time and called it the
 * redemption time. Same mislabel class the guest page was fixed for.
 */
export function lineSkipWindowNotice(
  ticket: LineSkipWindowInput,
  now: Date = new Date(),
): { headline: string; detail: string } | null {
  const state = lineSkipWindowState(ticket, now)
  if (state === "open" || state === "unknown") return null

  const { doors, opens, closes } = lineSkipWindowStamps(ticket)

  if (state === "not_open") {
    const opensClock = stampClock(opens)
    const doorsClock = stampClock(doors)
    return {
      headline: "This line skip is not active yet",
      detail: opensClock
        ? doorsClock
          ? `Check-in opens at ${opensClock}. Doors are at ${doorsClock}.`
          : `Check-in opens at ${opensClock}.`
        : "Check-in has not opened yet.",
    }
  }

  const closesClock = stampClock(closes)
  return {
    headline: "This line skip has ended",
    detail: closesClock
      ? `Check-in closed at ${closesClock}.`
      : "Check-in has closed.",
  }
}
