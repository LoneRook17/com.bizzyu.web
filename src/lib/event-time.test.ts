import { test } from "node:test"
import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import {
  EVENT_TIMEZONE_FALLBACK,
  formatEventClock,
  formatEventDateTime,
  formatEventWhen,
  resolveEventTimezone,
} from "./event-time.ts"

const here = fileURLToPath(new URL(".", import.meta.url))
const root = join(here, "../..")

test("Capones wall clock stays 9 PM in the event zone", () => {
  assert.equal(formatEventWhen("2026-10-08 21:00:00", "America/New_York"), "Thu, Oct 8, 9 PM")
  assert.equal(formatEventWhen("2026-10-08T21:00:00", "America/New_York"), "Thu, Oct 8, 9 PM")
  assert.equal(formatEventDateTime("2026-10-08 21:00:00", "America/New_York"), "Thu, Oct 8, 9:00 PM")
  assert.equal(formatEventClock("2026-10-08 21:00:00", "America/New_York"), "9:00 PM")
  assert.equal(formatEventClock("2026-10-09 02:00:00", "America/New_York"), "2:00 AM")
})

test("a stored wall clock is not shifted by a fixed Eastern offset across DST", () => {
  // January is EST (UTC-5). The old parse-as-UTC then format-in-New-York
  // path would print 4 PM. The digits are already the local clock.
  assert.equal(formatEventWhen("2026-01-15 21:00:00", "America/New_York"), "Thu, Jan 15, 9 PM")
  // March 8 2026 is the US spring-forward. 9 PM is a real local time after
  // the change and must still read 9 PM.
  assert.equal(formatEventWhen("2026-03-08 21:00:00", "America/New_York"), "Sun, Mar 8, 9 PM")
  // November 1 2026 is the fall-back. Same rule.
  assert.equal(formatEventWhen("2026-11-01 21:00:00", "America/New_York"), "Sun, Nov 1, 9 PM")
})

test("minutes survive, and midnight and noon use 12", () => {
  assert.equal(formatEventWhen("2026-10-08 21:30:00", "America/New_York"), "Thu, Oct 8, 9:30 PM")
  assert.equal(formatEventWhen("2026-10-09 00:30:00", "America/New_York"), "Fri, Oct 9, 12:30 AM")
  assert.equal(formatEventClock("2026-10-08 00:00:00"), "12:00 AM")
  assert.equal(formatEventClock("2026-10-08 12:00:00"), "12:00 PM")
})

test("a Chicago night keeps its own wall clock", () => {
  assert.equal(formatEventWhen("2026-10-07 21:00:00", "America/Chicago"), "Wed, Oct 7, 9 PM")
})

test("absolute instants convert in the event zone, including the DST offset change", () => {
  // 01:00 UTC is 9 PM EDT the evening before (UTC-4).
  assert.equal(formatEventWhen("2026-10-08T01:00:00Z", "America/New_York"), "Wed, Oct 7, 9 PM")
  // 02:00 UTC is 9 PM EST the evening before (UTC-5), not 10 PM.
  assert.equal(formatEventWhen("2026-01-15T02:00:00Z", "America/New_York"), "Wed, Jan 14, 9 PM")
  // Chicago is an hour behind New York in both seasons.
  assert.equal(formatEventWhen("2026-10-08T02:00:00Z", "America/Chicago"), "Wed, Oct 7, 9 PM")
  assert.equal(formatEventWhen("2026-01-15T03:00:00Z", "America/Chicago"), "Wed, Jan 14, 9 PM")
  // An offset on the string is an instant, then re-expressed in the event zone.
  assert.equal(formatEventWhen("2026-10-08T21:00:00-04:00", "America/New_York"), "Thu, Oct 8, 9 PM")
  assert.equal(formatEventWhen("2026-10-08T21:00:00-04:00", "America/Chicago"), "Thu, Oct 8, 8 PM")
})

test("a missing or unknown zone falls back to America/New_York", () => {
  assert.equal(resolveEventTimezone(null), EVENT_TIMEZONE_FALLBACK)
  assert.equal(resolveEventTimezone(""), EVENT_TIMEZONE_FALLBACK)
  assert.equal(resolveEventTimezone("Not/AZone"), EVENT_TIMEZONE_FALLBACK)
  assert.equal(resolveEventTimezone("America/Chicago"), "America/Chicago")
  assert.equal(formatEventWhen("2026-10-08T01:00:00Z", null), "Wed, Oct 7, 9 PM")
  assert.equal(formatEventWhen("2026-10-08T01:00:00Z", "Not/AZone"), "Wed, Oct 7, 9 PM")
  // Naive digits do not need a zone. The fallback must not rewrite them.
  assert.equal(formatEventWhen("2026-10-08 21:00:00", null), "Thu, Oct 8, 9 PM")
  assert.equal(formatEventWhen("2026-10-08 21:00:00", "Not/AZone"), "Thu, Oct 8, 9 PM")
})

test("blank and unparseable values render nothing", () => {
  assert.equal(formatEventWhen(null), "")
  assert.equal(formatEventWhen(""), "")
  assert.equal(formatEventWhen("soon"), "")
  assert.equal(formatEventClock("2026-13-08 21:00:00"), "")
})

test("the same labels come out in UTC, Pacific, and Auckland", () => {
  const script = `
    import { formatEventWhen, formatEventClock } from "./src/lib/event-time.ts"
    const lines = [
      formatEventWhen("2026-10-08 21:00:00", "America/New_York"),
      formatEventWhen("2026-01-15 21:00:00", "America/New_York"),
      formatEventWhen("2026-10-08T01:00:00Z", "America/New_York"),
      formatEventWhen("2026-01-15T03:00:00Z", "America/Chicago"),
      formatEventClock("2026-10-09 02:00:00", "America/Los_Angeles"),
    ]
    process.stdout.write(lines.join("\\n"))
  `
  const expected = [
    "Thu, Oct 8, 9 PM",
    "Thu, Jan 15, 9 PM",
    "Wed, Oct 7, 9 PM",
    "Wed, Jan 14, 9 PM",
    "2:00 AM",
  ].join("\n")

  for (const tz of ["UTC", "America/Los_Angeles", "Pacific/Auckland"]) {
    const res = spawnSync(process.execPath, ["--experimental-strip-types", "--input-type=module", "-e", script], {
      cwd: root,
      env: { ...process.env, TZ: tz },
      encoding: "utf8",
    })
    assert.equal(res.status, 0, res.stderr)
    assert.equal(res.stdout, expected, tz)
  }
})

test("public event cards format through the wall clock, not Date plus Eastern", () => {
  for (const rel of [
    "src/components/events/LiveEvents.tsx",
    "src/components/campus/CampusEvents.tsx",
  ]) {
    const src = readFileSync(join(root, rel), "utf8")
    assert.match(src, /formatEventWhen/)
    assert.doesNotMatch(src, /new Date\(/)
    assert.doesNotMatch(src, /timeZone:\s*"America\/New_York"/)
  }
  const venue = readFileSync(join(root, "src/app/venue/[venueId]/VenuePageClient.tsx"), "utf8")
  assert.match(venue, /formatEventClock/)
  assert.doesNotMatch(venue, /new Date\(dateStr\)/)
  const checkin = readFileSync(join(root, "src/app/checkin/[uuid]/CheckinClient.tsx"), "utf8")
  assert.match(checkin, /formatEventDateTime/)
})
