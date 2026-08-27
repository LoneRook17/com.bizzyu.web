/**
 * Date / time values for dash create/edit fields.
 *
 * Event forms still submit `YYYY-MM-DDTHH:MM` to the API. The host-facing
 * widgets are a date (`YYYY-MM-DD`) plus a time (`HH:MM`), same as series and
 * WC. Parsing is string math — never `new Date("2026-08-29")`, which is UTC
 * midnight.
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

/** UI split: complete datetimes, date-only, time-only, or leftover `T21:00`. */
export function splitDateTimeLocal(value: string): { date: string; time: string } {
  const parsed = parseDateTimeLocal(value)
  if (parsed) return parsed
  const raw = String(value ?? "").trim()
  if (isIsoDateString(raw)) return { date: raw, time: "" }
  if (isIsoTimeString(raw)) return { date: "", time: raw.slice(0, 5) }
  if (raw.startsWith("T") && isIsoTimeString(raw.slice(1))) {
    return { date: "", time: raw.slice(1, 6) }
  }
  const datePart = raw.slice(0, 10)
  const timePart = raw.includes("T") ? raw.slice(raw.indexOf("T") + 1).slice(0, 5) : ""
  return {
    date: DATE_RE.test(datePart) ? datePart : "",
    time: TIME_RE.test(timePart) ? timePart : "",
  }
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

/** "19:52" or "19:52:00" → "7:52 PM". Empty/junk → "". */
export function formatClock12h(value: string): string {
  const raw = String(value ?? "").trim()
  const t = raw.length >= 5 && isIsoTimeString(raw.slice(0, 5)) ? raw.slice(0, 5) : ""
  if (!t) return ""
  const hh = Number(t.slice(0, 2))
  const mm = t.slice(3, 5)
  const suffix = hh < 12 ? "AM" : "PM"
  const h12 = hh % 12 === 0 ? 12 : hh % 12
  return `${h12}:${mm} ${suffix}`
}

/**
 * Host-facing 12-hour text → `HH:MM`. Also accepts a 24-hour paste.
 * "7:52 PM", "7:52PM", "7 pm", "19:52".
 */
export function parseClock12h(value: string): string | null {
  const raw = String(value ?? "").trim()
  if (!raw) return null
  if (/^\d{2}:\d{2}$/.test(raw) && isIsoTimeString(raw)) return raw
  const m = /^(1[0-2]|0?[1-9])(?::([0-5]\d))?\s*([AaPp][Mm])$/.exec(raw)
  if (!m) return null
  let h = Number(m[1])
  const min = m[2] ?? "00"
  const ap = m[3].toUpperCase()
  if (ap === "AM") {
    if (h === 12) h = 0
  } else if (h !== 12) {
    h += 12
  }
  return `${String(h).padStart(2, "0")}:${min}`
}

/** 15-minute slots for the time popover. Values are `HH:MM`. */
export function clock12hSlots(): string[] {
  return Array.from({ length: 24 * 4 }, (_, i) => {
    const hh = String(Math.floor(i / 4)).padStart(2, "0")
    const mm = String((i % 4) * 15).padStart(2, "0")
    return `${hh}:${mm}`
  })
}
