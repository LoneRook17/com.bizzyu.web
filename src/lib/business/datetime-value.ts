/**
 * Date / time values for dash create/edit fields.
 *
 * Event forms still submit `YYYY-MM-DDTHH:MM` to the API. The host-facing
 * date widget is American month-day-year (`8/27/2026`). Time is 12-hour
 * (`7:00 PM`). Parsing is string math — never `new Date("2026-08-29")`,
 * which is UTC midnight.
 */

const MONTH_NAME_TO_INDEX: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
}

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

/** "2026-08-27" → "8/27/2026". Empty/junk → "". Never day-first. */
export function formatDateUs(value: string): string {
  if (!isIsoDateString(value)) return ""
  const [, y, m, d] = DATE_RE.exec(value)!
  return `${Number(m)}/${Number(d)}/${y}`
}

function isoFromUsParts(year: number, monthIndex: number, day: number): string | null {
  const iso = isoDateOfParts(year, monthIndex, day)
  return isIsoDateString(iso) ? iso : null
}

/**
 * Host-facing US date → `YYYY-MM-DD`.
 * "8/27/2026", "08/27/26", "8-27-2026", "Aug 27, 2026", "August 27 2026".
 * ISO paste `YYYY-MM-DD` still parses so calendar/API values round-trip.
 * Day-first ("27/8/2026", "27 Aug 2026") is rejected.
 */
export function parseDateUs(value: string): string | null {
  const raw = String(value ?? "").trim()
  if (!raw) return null
  if (isIsoDateString(raw)) return raw

  const numeric = /^(1[0-2]|0?[1-9])[/\-.](3[01]|[12]\d|0?[1-9])[/\-.](\d{2}|\d{4})$/.exec(raw)
  if (numeric) {
    const month = Number(numeric[1])
    const day = Number(numeric[2])
    let year = Number(numeric[3])
    if (numeric[3].length === 2) year += 2000
    return isoFromUsParts(year, month - 1, day)
  }

  const named =
    /^(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+([0-9]{1,2}),?\s+(\d{4})$/i.exec(
      raw,
    )
  if (named) {
    const monthIndex = MONTH_NAME_TO_INDEX[named[1].toLowerCase()]
    if (monthIndex == null) return null
    return isoFromUsParts(Number(named[3]), monthIndex, Number(named[2]))
  }

  return null
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
