/**
 * Date / time values for dash create/edit fields.
 *
 * Event forms store `YYYY-MM-DDTHH:MM` (datetime-local). Series and WC store
 * a date (`YYYY-MM-DD`) or a time (`HH:MM`) separately. Parsing is string
 * math — never `new Date("2026-08-29")`, which is UTC midnight.
 */

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const TIME_RE = /^(\d{2}):(\d{2})/
const DATETIME_RE = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/

export function isIsoDateString(value: string): boolean {
  if (!DATE_RE.test(value)) return false
  const [, y, m, d] = DATE_RE.exec(value)!
  const dt = new Date(Number(y), Number(m) - 1, Number(d))
  return dt.getFullYear() === Number(y) && dt.getMonth() === Number(m) - 1 && dt.getDate() === Number(d)
}

export function isIsoTimeString(value: string): boolean {
  const m = TIME_RE.exec(value)
  if (!m) return false
  const hh = Number(m[1])
  const mm = Number(m[2])
  return hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59
}

export function parseDateTimeLocal(value: string): { date: string; time: string } | null {
  const m = DATETIME_RE.exec(String(value ?? "").trim())
  if (!m) return null
  const date = `${m[1]}-${m[2]}-${m[3]}`
  const time = `${m[4]}:${m[5]}`
  if (!isIsoDateString(date) || !isIsoTimeString(time)) return null
  return { date, time }
}

export function joinDateTimeLocal(date: string, time: string): string {
  const d = DATE_RE.test(date) ? date : ""
  const t = TIME_RE.test(time) ? time.slice(0, 5) : ""
  if (d && t) return `${d}T${t}`
  if (d) return `${d}T00:00`
  return t ? `T${t}` : ""
}

export function isoDateOfParts(year: number, monthIndex: number, day: number): string {
  const y = String(year).padStart(4, "0")
  const m = String(monthIndex + 1).padStart(2, "0")
  const d = String(day).padStart(2, "0")
  return `${y}-${m}-${d}`
}

/** Monday-first month grid. Leading blanks are null. */
export function monthCells(year: number, monthIndex: number): (string | null)[] {
  const first = new Date(year, monthIndex, 1)
  const firstWeekday = ((first.getDay() + 6) % 7) + 1
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  return [
    ...Array.from({ length: firstWeekday - 1 }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => isoDateOfParts(year, monthIndex, i + 1)),
  ]
}

export function shiftMonth(year: number, monthIndex: number, delta: number): { year: number; monthIndex: number } {
  const d = new Date(year, monthIndex + delta, 1)
  return { year: d.getFullYear(), monthIndex: d.getMonth() }
}
