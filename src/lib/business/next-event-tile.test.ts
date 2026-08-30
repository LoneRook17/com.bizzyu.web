// WC-SMEAR follow-up (Luke, 2026-08-29 8:03 PM ET): the dash said "our next
// event is Aug 28" on Saturday Aug 29 — hostUpcomingShowsGreenNight's
// one-off/Custom arms skip the date window on purpose for the UPCOMING LIST,
// so the tile kept a finished one-off "coming up" forever. The tile now goes
// through nextUpcomingGreenEvent: next start >= now ET, never a past
// occurrence.
import { strict as assert } from "node:assert"
import { test } from "node:test"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import {
  easternNowStamp,
  eventStartsAtOrAfter,
  nextUpcomingGreenEvent,
} from "./next-event-tile.ts"

// 2026-08-29 8:03 PM ET == 2026-08-30 00:03 UTC (EDT, UTC-4).
const SATURDAY_803PM_ET = new Date("2026-08-30T00:03:00Z")

test("easternNowStamp renders the ET wall clock", () => {
  assert.equal(easternNowStamp(SATURDAY_803PM_ET), "2026-08-29 20:03:00")
})

test("a finished Friday-9pm one-off is not 'coming up' on Saturday evening", () => {
  const stamp = easternNowStamp(SATURDAY_803PM_ET)
  assert.equal(eventStartsAtOrAfter({ start_date_time: "2026-08-28 21:00:00" }, stamp), false)
})

test("after 9pm ET Friday, 'next' is Saturday (or later), never that Friday", () => {
  // 2026-09-04 (Friday) 9:30 PM ET == 2026-09-05 01:30 UTC.
  const friday930pm = new Date("2026-09-05T01:30:00Z")
  const events = [
    { event_id: 1, start_date_time: "2026-09-04 21:00:00" }, // that Friday, already started
    { event_id: 2, start_date_time: "2026-09-05 21:00:00" }, // Saturday
    { event_id: 3, start_date_time: "2026-09-06 21:00:00" },
  ]
  const next = nextUpcomingGreenEvent(events, () => true, friday930pm)
  assert.equal(next?.event_id, 2)
})

test("the pick is the SOONEST future start regardless of input order", () => {
  const events = [
    { event_id: 3, start_date_time: "2026-09-12 21:00:00" },
    { event_id: 9, start_date_time: "2026-08-28 21:00:00" }, // past
    { event_id: 2, start_date_time: "2026-09-05 21:00:00" },
  ]
  const next = nextUpcomingGreenEvent(events, () => true, SATURDAY_803PM_ET)
  assert.equal(next?.event_id, 2)
})

test("the caller's own gates still apply after the future filter", () => {
  const events = [
    { event_id: 2, start_date_time: "2026-09-05 21:00:00", status: "cancelled" },
    { event_id: 3, start_date_time: "2026-09-06 21:00:00", status: "published" },
  ]
  const next = nextUpcomingGreenEvent(
    events,
    (e: any) => e.status === "published",
    SATURDAY_803PM_ET,
  )
  assert.equal(next?.event_id, 3)
})

test("an event with no start never passes", () => {
  const stamp = easternNowStamp(SATURDAY_803PM_ET)
  assert.equal(eventStartsAtOrAfter({ start_date_time: null }, stamp), false)
  assert.equal(eventStartsAtOrAfter({}, stamp), false)
})

test("the dashboard tile routes through nextUpcomingGreenEvent", () => {
  const src = readFileSync(
    fileURLToPath(new URL("../../app/business/(dashboard)/page.tsx", import.meta.url)),
    "utf8",
  )
  assert.ok(src.includes("nextUpcomingGreenEvent(events"), "the tile must refuse past occurrences")
})
