// Analytics Events vs Weekly Access split (Luke QA).
// Weekly Cover nights must not sit on the Events tab or inflate Total events,
// and they must populate Weekly Access. Runs with `npm test`.

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import type { EventOverviewItem, EventsOverview } from "./types.ts"
import {
  EMPTY_EVENTS_OVERVIEW,
  bucketEventsOverview,
  impliedCheckedIn,
  isWeeklyAccessEvent,
  recomputeEventsOverview,
  splitOverviewEvents,
  weeklyEventIdsFromNights,
} from "./analytics-buckets.ts"

function row(over: Partial<EventOverviewItem> & Pick<EventOverviewItem, "event_id" | "name">): EventOverviewItem {
  return {
    start_date_time: "2026-08-24 21:00:00",
    end_date_time: "2026-08-25 02:00:00",
    venue_name: "The Bar",
    status: "draft",
    flyer_image_url: null,
    tickets_sold: 0,
    tickets_total: 0,
    revenue: 0,
    checkin_rate: 0,
    door_sales_count: 0,
    ...over,
  }
}

const rumble = row({ event_id: 1, name: "Rumble", access_kind: "event", status: "published", tickets_sold: 10, revenue: 100, checkin_rate: 50 })
const paid = row({ event_id: 2, name: "Paid Event", access_kind: "event", status: "published", tickets_sold: 4, revenue: 40, checkin_rate: 25 })
const escrow = row({ event_id: 3, name: "EscrowV2", access_kind: "event", status: "published", tickets_sold: 2, revenue: 20, checkin_rate: 0 })
const cover24 = row({ event_id: 24, name: "Weekly Cover", access_kind: "door_access", status: "draft" })
const cover26 = row({ event_id: 26, name: "Weekly Cover", access_kind: "door_access", status: "draft" })
const cover28 = row({ event_id: 28, name: "Weekly Cover", access_kind: "door_access", status: "draft" })

const mixed: EventsOverview = {
  total_events: 6,
  total_tickets_sold: 16,
  total_revenue: 160,
  total_checked_in: 6,
  average_checkin_rate: 37.5,
  events: [rumble, paid, escrow, cover24, cover26, cover28],
}

test("door_access is weekly, event is one-off", () => {
  assert.equal(isWeeklyAccessEvent(cover24), true)
  assert.equal(isWeeklyAccessEvent(rumble), false)
})

test("product_kind is the explicit stamp and outranks access_kind", () => {
  assert.equal(
    isWeeklyAccessEvent(row({ event_id: 24, name: "Weekly Cover", product_kind: "weekly_cover", access_kind: "event" })),
    true,
    "a WC night whose row still says access_kind=event buckets on product_kind",
  )
  assert.equal(
    isWeeklyAccessEvent(row({ event_id: 1, name: "Launch Party", product_kind: "event", access_kind: "door_access" })),
    false,
    "an explicit product_kind=event outranks a stale access_kind",
  )
  assert.equal(
    isWeeklyAccessEvent(row({ event_id: 5, name: "Weekly Cover Launch Party", product_kind: "event" })),
    false,
    "the name is never a signal",
  )
})

test("a missing access_kind falls back to stamped night ids", () => {
  const unmarked = row({ event_id: 24, name: "Weekly Cover" })
  assert.equal(isWeeklyAccessEvent(unmarked), false)
  assert.equal(isWeeklyAccessEvent(unmarked, [24, 26, 28]), true)
  assert.equal(isWeeklyAccessEvent(row({ event_id: 1, name: "Rumble" }), [24]), false)
})

test("a stamped night id wins when access_kind is missing or still event", () => {
  assert.equal(isWeeklyAccessEvent(row({ event_id: 24, name: "Weekly Cover", access_kind: "event" }), [24]), true)
  assert.equal(isWeeklyAccessEvent(rumble, [24]), false)
})

test("weeklyEventIdsFromNights keeps stamped ids only", () => {
  assert.deepEqual(
    weeklyEventIdsFromNights([
      { event_id: 24 },
      { event_id: null },
      { event_id: 26 },
      { event_id: undefined },
    ]),
    [24, 26],
  )
})

test("split puts Weekly Cover on weekly and Rumble / Paid / Escrow on one-off", () => {
  const { oneOff, weekly } = splitOverviewEvents(mixed.events)
  assert.deepEqual(oneOff.map((e) => e.name), ["Rumble", "Paid Event", "EscrowV2"])
  assert.deepEqual(weekly.map((e) => e.event_id), [24, 26, 28])
})

test("bucketed Events totals match the one-off filter, not the raw 6", () => {
  const { events, weekly } = bucketEventsOverview(mixed)
  assert.equal(events.total_events, 3)
  assert.equal(events.events.length, 3)
  assert.ok(events.events.every((e) => e.access_kind !== "door_access"))
  assert.equal(weekly.total_events, 3)
  assert.deepEqual(weekly.events.map((e) => e.name), ["Weekly Cover", "Weekly Cover", "Weekly Cover"])
})

test("tickets and revenue on Events exclude Weekly Cover", () => {
  const { events, weekly } = bucketEventsOverview(mixed)
  assert.equal(events.total_tickets_sold, 16)
  assert.equal(events.total_revenue, 160)
  assert.equal(weekly.total_tickets_sold, 0)
  assert.equal(weekly.total_revenue, 0)
})

test("implied checked-in is sold times rate", () => {
  assert.equal(impliedCheckedIn({ tickets_sold: 10, checkin_rate: 50 }), 5)
  assert.equal(impliedCheckedIn({ tickets_sold: 0, checkin_rate: 100 }), 0)
})

test("recompute average check-in is weighted by tickets sold", () => {
  const out = recomputeEventsOverview([rumble, paid])
  assert.equal(out.total_events, 2)
  assert.equal(out.total_checked_in, 5 + 1)
  assert.equal(out.average_checkin_rate, 42.9)
})

test("no weekly nights keeps the server Events totals", () => {
  const onlyOneOff: EventsOverview = {
    ...mixed,
    total_events: 3,
    events: [rumble, paid, escrow],
  }
  const { events, weekly } = bucketEventsOverview(onlyOneOff)
  assert.equal(events.total_events, 3)
  assert.equal(events.total_checked_in, 6)
  assert.equal(weekly, EMPTY_EVENTS_OVERVIEW)
  assert.equal(weekly.events.length, 0)
})

test("untyped covers still leave Events when night ids are supplied", () => {
  const unmarked = {
    ...mixed,
    events: [
      row({ event_id: 1, name: "Rumble" }),
      row({ event_id: 24, name: "Weekly Cover" }),
      row({ event_id: 26, name: "Weekly Cover" }),
      row({ event_id: 28, name: "Weekly Cover" }),
    ],
  }
  const { events, weekly } = bucketEventsOverview(unmarked, [24, 26, 28])
  assert.equal(events.total_events, 1)
  assert.equal(events.events[0].name, "Rumble")
  assert.equal(weekly.total_events, 3)
})

test("Analytics page uses the bucket helper and still fetches insights/events", () => {
  const page = readFileSync(join(process.cwd(), "src/app/business/(dashboard)/analytics/page.tsx"), "utf8")
  assert.ok(page.includes("bucketEventsOverview"), "page must split Events vs Weekly Access on the client")
  assert.ok(page.includes("/business/insights/events/overview"), "Events overview path must stay")
  assert.ok(page.includes("fetchDoorAccessProgramsSafe"), "Weekly Access must consult door-access programs")
})
