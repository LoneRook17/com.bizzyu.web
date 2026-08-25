// Home's interleaved upcoming list — events AND door-access nights (D2-6).
//
// Runnable with the Node built-in test runner (no extra deps): `npm test`.

import { test } from "node:test"
import assert from "node:assert/strict"
import { homeUpcoming, nextAccessNight } from "./home-upcoming.ts"
import type { EventListItem } from "./types.ts"
import type { DoorAccessProgramSummary } from "./door-access.ts"

function ev(event_id: number, start: string): EventListItem {
  return {
    event_id,
    name: `Event ${event_id}`,
    description: "",
    venue_name: "The Bar",
    venue_address: "",
    start_date_time: start,
    end_date_time: start,
    type: "Ticketed",
    status: "published",
    is_21_plus: false,
    is_recurring: false,
    total_attendees: 0,
    total_revenue: 0,
    ticket_sales_count: 0,
    checkin_rate: 0,
  }
}

function program(
  id: number,
  next_night_date: string | null,
  over: Partial<DoorAccessProgramSummary> = {},
): DoorAccessProgramSummary {
  return {
    id,
    name: `Program ${id}`,
    days_of_week: [4],
    date_range_start: "2026-09-01",
    date_range_end: null,
    is_active: true,
    venue_id: 1,
    venue_name: "The Bar",
    start_time: "22:00:00",
    end_time: "02:00:00",
    flyer_image_url: null,
    redemption_mode: "native_scan",
    template_tickets: [],
    migrated_from_line_skip_id: null,
    promotion_enabled: false,
    upcoming_night_count: 8,
    next_night_date,
    tier_count: 2,
    lowest_price_usd: 10,
    ...over,
  }
}

test("an ended program contributes nothing, even with a stamped night", () => {
  assert.equal(nextAccessNight(program(1, "2026-09-03", { is_active: false })), null)
})

test("a program with nothing stamped ahead contributes nothing", () => {
  assert.equal(nextAccessNight(program(1, null)), null)
})

test("events and nights interleave in real chronological order", () => {
  const out = homeUpcoming(
    [ev(1, "2026-09-02 21:00:00"), ev(2, "2026-09-05 21:00:00")],
    [program(9, "2026-09-03")],
  )
  assert.deepEqual(out.map((e) => e.key), ["event-1", "access-9", "event-2"])
})

test("a date-only night sorts to the START of its day, ahead of that night's show", () => {
  // The door opens before the ticketed set — and this is also the honest
  // rendering of "we only know the date", never a guessed clock time.
  const out = homeUpcoming([ev(1, "2026-09-03 21:00:00")], [program(9, "2026-09-03")])
  assert.deepEqual(out.map((e) => e.key), ["access-9", "event-1"])
})

test("a program contributes exactly ONE entry, not every night it runs", () => {
  const out = homeUpcoming([], [program(9, "2026-09-03", { upcoming_night_count: 40 })])
  assert.equal(out.length, 1)
})

test("the card's row budget is respected across both types", () => {
  const out = homeUpcoming(
    [ev(1, "2026-09-01 21:00:00"), ev(2, "2026-09-04 21:00:00"), ev(3, "2026-09-06 21:00:00")],
    [program(9, "2026-09-02"), program(10, "2026-09-03")],
    4,
  )
  assert.equal(out.length, 4)
  assert.deepEqual(out.map((e) => e.key), ["event-1", "access-9", "access-10", "event-2"])
})

test("door_access nights are not green event rows on Home", () => {
  const cover = ev(24, "2026-09-02 21:00:00")
  cover.access_kind = "door_access"
  cover.recurring_series_id = 9
  const out = homeUpcoming([cover, ev(1, "2026-09-05 21:00:00")], [program(9, "2026-09-02")])
  assert.deepEqual(out.map((e) => e.key), ["access-9", "event-1"])
  assert.ok(out.every((e) => e.kind !== "event" || e.event.event_id !== 24))
})

test("product_kind weekly_cover nights with stale access_kind stay off Home events", () => {
  const cover = ev(775, "2026-09-04 21:00:00")
  cover.access_kind = "event"
  cover.product_kind = "weekly_cover"
  cover.recurring_series_id = 66
  const out = homeUpcoming([cover, ev(1, "2026-09-05 21:00:00")], [])
  assert.deepEqual(out.map((e) => e.key), ["event-1"])
})

test("sold night of a host-deleted WC series stays on Home as a pending-cancel one-off", () => {
  const sold = ev(775, "2026-09-04 21:00:00")
  sold.access_kind = "door_access"
  sold.product_kind = "weekly_cover"
  sold.recurring_series_id = 66
  sold.ticket_sales_count = 4
  const unsold = ev(774, "2026-09-02 21:00:00")
  unsold.access_kind = "door_access"
  unsold.product_kind = "weekly_cover"
  unsold.recurring_series_id = 66
  const out = homeUpcoming([sold, unsold, ev(1, "2026-09-05 21:00:00")], [], 4, [66])
  assert.deepEqual(out.map((e) => e.key), ["event-775", "event-1"])
})

test("cancelled nights do not appear on Home", () => {
  const dead = ev(2, "2026-09-03 21:00:00")
  dead.status = "cancelled"
  const out = homeUpcoming([dead, ev(1, "2026-09-05 21:00:00")], [])
  assert.deepEqual(out.map((e) => e.key), ["event-1"])
})

test("no programs at all ⇒ byte-identical to the events-only list it replaced", () => {
  const events = [ev(1, "2026-09-01 21:00:00"), ev(2, "2026-09-02 21:00:00")]
  const out = homeUpcoming(events, [])
  assert.deepEqual(out.map((e) => e.kind), ["event", "event"])
  assert.deepEqual(
    out.map((e) => (e.kind === "event" ? e.event.event_id : null)),
    [1, 2],
  )
})
