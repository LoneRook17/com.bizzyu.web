import { test } from "node:test"
import assert from "node:assert/strict"
import {
  customUpcomingNightsFromSeries,
  isCustomUpcomingNight,
  marketingNightsFromSeries,
  oneOffNightsFromSeries,
} from "./wc-upcoming.ts"
import type { DoorAccessNight, DoorAccessProgramSummary } from "./door-access.ts"

function program(over: Partial<DoorAccessProgramSummary> = {}): DoorAccessProgramSummary {
  return {
    id: 33,
    name: "Bizzy Just Wins Cover",
    days_of_week: [5],
    date_range_start: "2026-08-01",
    date_range_end: null,
    is_active: true,
    venue_id: 1,
    venue_name: "Bizzy Just Wins",
    start_time: "22:00:00",
    end_time: "02:00:00",
    flyer_image_url: null,
    redemption_mode: "native_scan",
    template_tickets: [],
    migrated_from_line_skip_id: null,
    promotion_enabled: false,
    upcoming_night_count: 15,
    next_night_date: "2026-08-28",
    tier_count: 2,
    lowest_price_usd: 10,
    ...over,
  }
}

function night(over: Partial<DoorAccessNight> = {}): DoorAccessNight {
  return {
    occurrence_date: "2026-12-31",
    is_stamped: true,
    is_scheduled: true,
    event_id: 1592,
    status: "published",
    start_date_time: "2026-12-31 22:00:00",
    end_date_time: "2027-01-01 02:00:00",
    passes_sold: 1,
    paid_orders: 1,
    is_customized: true,
    is_closed: false,
    has_override: true,
    start_time: "22:00:00",
    end_time: "02:00:00",
    tiers: [],
    ...over,
  }
}

test("a far-future customized night is an upcoming one-off", () => {
  assert.equal(isCustomUpcomingNight(night(), "2026-08-27"), true)
  assert.equal(isCustomUpcomingNight(night({ is_customized: false }), "2026-08-27"), false)
  assert.equal(isCustomUpcomingNight(night({ occurrence_date: "2026-08-20" }), "2026-08-27"), false)
})

test("home one-offs come from customized upcoming nights only", () => {
  const loaded = [
    {
      program: program(),
      nights: [
        night({ occurrence_date: "2026-08-28", is_customized: false }),
        night({ occurrence_date: "2026-12-31", is_customized: true }),
      ],
    },
  ]
  const oneOffs = oneOffNightsFromSeries(loaded, "2026-08-27")
  assert.deepEqual(
    oneOffs.map((row) => row.date),
    ["2026-12-31"],
  )
  assert.equal(customUpcomingNightsFromSeries(loaded, "2026-08-27").length, 1)
})

test("marketing lists every upcoming WC night, not only one-offs", () => {
  const loaded = [
    {
      program: program(),
      nights: [
        night({ occurrence_date: "2026-08-28", is_customized: false, event_id: 100 }),
        night({ occurrence_date: "2026-12-31", is_customized: true, event_id: 1592 }),
        night({ occurrence_date: "2026-08-20", is_customized: false, event_id: 90 }),
      ],
    },
  ]
  const rows = marketingNightsFromSeries(loaded, "2026-08-27")
  assert.deepEqual(
    rows.map((row) => row.date),
    ["2026-08-28", "2026-12-31"],
  )
  assert.equal(rows[1].eventId, 1592)
})
