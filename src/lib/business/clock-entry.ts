/**
 * BETA biz-dash visual polish, Create event (mock 04): time is TYPED, never
 * spun. The host types HH:MM and picks AM or PM beside it; the field keeps the
 * same `HH:MM` 24-hour value DraftFields has always carried, so nothing past
 * the modal changes. A 24-hour entry ("19:30") is accepted and flips the
 * period to match.
 */

export type Period = "AM" | "PM"

/** `HH:MM` (24h) → the field's face: "07:00" + "PM". Empty/junk → null. */
export function clockFace(value: string): { text: string; period: Period } | null {
  const m = /^(\d{2}):(\d{2})/.exec(String(value ?? "").trim())
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) return null
  const h12 = h % 12 === 0 ? 12 : h % 12
  return { text: `${String(h12).padStart(2, "0")}:${m[2]}`, period: h < 12 ? "AM" : "PM" }
}

function to24(h12: number, min: number, period: Period): string {
  let h = h12 % 12
  if (period === "PM") h += 12
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`
}

/**
 * What the host typed + the selected period → `HH:MM` (24h) and the period
 * the field should now show. Accepts "7", "7:30", "730", "0730", "07:30" as
 * 12-hour clock text, and "0:15" / "13:00"–"23:59" as 24-hour text. Anything
 * else → null (the field keeps the typed text and emits nothing).
 */
export function parseClockEntry(raw: string, period: Period): { value: string; period: Period } | null {
  const s = String(raw ?? "").trim()
  if (!s) return null
  let h: number
  let min: number
  const colon = /^(\d{1,2}):(\d{2})$/.exec(s)
  const digits = /^\d{1,4}$/.test(s) ? s : null
  if (colon) {
    h = Number(colon[1])
    min = Number(colon[2])
  } else if (digits) {
    if (digits.length <= 2) {
      h = Number(digits)
      min = 0
    } else {
      h = Number(digits.slice(0, digits.length - 2))
      min = Number(digits.slice(-2))
    }
  } else {
    return null
  }
  if (min > 59 || h > 23) return null
  if (h === 0 || h > 12) {
    // 24-hour text: the clock decides the period.
    return { value: `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`, period: h < 12 ? "AM" : "PM" }
  }
  return { value: to24(h, min, period), period }
}

/** Same clock, the other half of the day. "" stays "". */
export function withPeriod(value: string, period: Period): string {
  const face = clockFace(value)
  if (!face) return ""
  const [h12, min] = face.text.split(":").map(Number)
  return to24(h12, min, period)
}

/** "6 hours" · "4 hours 30 min" · "45 min" between two `YYYY-MM-DDTHH:MM`. "" when unknown or not after. */
export function durationLabel(start: string, end: string): string {
  const parse = (v: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(v)
    return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5])).getTime() : NaN
  }
  const mins = Math.round((parse(end) - parse(start)) / 60000)
  if (!Number.isFinite(mins) || mins <= 0) return ""
  const h = Math.floor(mins / 60)
  const m = mins % 60
  const hours = h === 0 ? "" : `${h} ${h === 1 ? "hour" : "hours"}`
  const rest = m === 0 ? "" : `${m} min`
  return [hours, rest].filter(Boolean).join(" ")
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

/** `YYYY-MM-DD` → "Fri, Oct 30, 2026" (a calendar date, no UTC round trip). */
export function fmtFieldDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso ?? ""))
  if (!m) return ""
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

/** Sunday-first month grid (the mock's S M T W T F S). Leading blanks are null. */
export function sundayMonthCells(year: number, monthIndex: number): (string | null)[] {
  const lead = new Date(year, monthIndex, 1).getDay()
  const days = new Date(year, monthIndex + 1, 0).getDate()
  const pad = (n: number) => String(n).padStart(2, "0")
  return [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: days }, (_, i) => `${year}-${pad(monthIndex + 1)}-${pad(i + 1)}`),
  ]
}
