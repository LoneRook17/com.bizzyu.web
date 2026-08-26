// Shared schedule helpers for the Recurring section. Weekdays are ISO
// (1 = Monday … 7 = Sunday) end-to-end — that's what the services API stores.

export const ISO_DAYS = [
  { value: 1, label: "Mon", letter: "M", full: "Monday" },
  { value: 2, label: "Tue", letter: "T", full: "Tuesday" },
  { value: 3, label: "Wed", letter: "W", full: "Wednesday" },
  { value: 4, label: "Thu", letter: "T", full: "Thursday" },
  { value: 5, label: "Fri", letter: "F", full: "Friday" },
  { value: 6, label: "Sat", letter: "S", full: "Saturday" },
  { value: 7, label: "Sun", letter: "S", full: "Sunday" },
]

export const isoDayFull = (d: number) => ISO_DAYS.find((x) => x.value === d)?.full ?? ""

/** JS Date.getDay() (0=Sun..6=Sat) → ISO weekday (1=Mon..7=Sun). */
export const jsDayToIso = (d: number) => ((d + 6) % 7) + 1

/** "Mondays & Thursdays" style plain-language schedule summary. */
export function scheduleSentence(days: number[]): string {
  const names = [...days].sort((a, b) => a - b).map((d) => `${isoDayFull(d)}s`)
  if (names.length === 0) return ""
  if (names.length === 1) return names[0]
  if (names.length === 7) return "Every night"
  return `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`
}

/**
 * Format a date-only "YYYY-MM-DD" string without timezone drift
 * (new Date("YYYY-MM-DD") parses as UTC midnight and shows the previous
 * day in US timezones).
 */
export function fmtDateOnly(
  s?: string | null,
  opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" }
) {
  if (!s) return "-"
  return new Date(s.slice(0, 10) + "T00:00:00").toLocaleDateString("en-US", opts)
}

/** Long form with weekday, e.g. "Friday, Jul 10". */
export function fmtDateOnlyLong(s?: string | null) {
  return fmtDateOnly(s, { weekday: "long", month: "short", day: "numeric" })
}

/** "HH:MM[:SS]" → "9:00 PM". */
export function fmtTimeOfDay(t?: string | null) {
  if (!t) return "-"
  const [h, m] = t.split(":").map(Number)
  const d = new Date(2000, 0, 1, h, m)
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
}

/**
 * The next dates matching the schedule, for the form's "next few nights"
 * preview. Mirrors what core's generator will stamp: dates >= max(today,
 * range start), inside the (possibly open-ended) range.
 */
export function upcomingScheduleDates(
  daysOfWeek: number[],
  rangeStart?: string,
  rangeEnd?: string,
  count = 4
): string[] {
  if (daysOfWeek.length === 0) return []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let current = new Date(today)
  if (rangeStart) {
    const start = new Date(rangeStart + "T00:00:00")
    if (start > current) current = start
  }
  const end = rangeEnd ? new Date(rangeEnd + "T00:00:00") : null

  const out: string[] = []
  // 120-day scan cap keeps a sparse schedule from looping forever.
  for (let i = 0; i < 120 && out.length < count; i++) {
    if (end && current > end) break
    if (daysOfWeek.includes(jsDayToIso(current.getDay()))) {
      out.push(
        current.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })
      )
    }
    current.setDate(current.getDate() + 1)
  }
  return out
}
