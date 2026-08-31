import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { marketingUpcomingRows } from "./marketing-events.ts"
import type { EventListItem } from "./types.ts"
import type { DoorAccessProgramSummary } from "./door-access.ts"

function ev(over: Partial<EventListItem> = {}): EventListItem {
  return {
    event_id: 1,
    name: "Green Mixer",
    description: "",
    venue_name: "Bizzy Just Wins",
    venue_address: "",
    start_date_time: "2026-09-04 21:00:00",
    end_date_time: "2026-09-05 02:00:00",
    type: "Ticketed",
    status: "published",
    is_21_plus: false,
    is_recurring: false,
    total_attendees: 0,
    total_revenue: 0,
    ticket_sales_count: 2,
    checkin_rate: 0,
    ...over,
  }
}

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

test("a venue with only WC nights is not an empty Marketing Events list", () => {
  const rows = marketingUpcomingRows({
    events: [],
    programs: [program()],
    nights: [
      {
        programId: 33,
        programName: "Bizzy Just Wins Cover",
        venueName: "Bizzy Just Wins",
        date: "2026-08-28",
        eventId: 1592,
        ticketsSold: 1,
      },
      {
        programId: 33,
        programName: "Bizzy Just Wins Cover",
        venueName: "Bizzy Just Wins",
        date: "2026-09-04",
        eventId: 1600,
        ticketsSold: 0,
      },
    ],
  })
  assert.equal(rows.length, 2)
  assert.ok(rows.every((row) => row.kind === "weekly_cover"))
  assert.equal(rows[0].announceHref, "/business/events/1592/manage/announcements")
})

test("green events and WC nights share one list", () => {
  const rows = marketingUpcomingRows({
    events: [ev()],
    programs: [program()],
    nights: [
      {
        programId: 33,
        programName: "Bizzy Just Wins Cover",
        venueName: "Bizzy Just Wins",
        date: "2026-08-28",
        eventId: 1592,
      },
    ],
  })
  assert.deepEqual(
    rows.map((row) => row.kind),
    ["weekly_cover", "event"],
  )
})

test("WC nights stripped from the events API still appear via the program next night", () => {
  const cover = ev({
    event_id: 1592,
    name: "Bizzy Just Wins Cover",
    access_kind: "door_access",
    product_kind: "weekly_cover",
    start_date_time: "2026-08-28 22:00:00",
  })
  const rows = marketingUpcomingRows({ events: [cover], programs: [program()] })
  assert.equal(rows.length, 1)
  assert.equal(rows[0].kind, "weekly_cover")
  assert.equal(rows[0].name, "Bizzy Just Wins Cover")
})

test("Marketing Events tab merges WC nights instead of empty-stating", () => {
  const src = readFileSync(
    join(process.cwd(), "src/components/business/v2/marketing/EventsTab.tsx"),
    "utf8",
  )
  assert.ok(src.includes("marketingUpcomingRows"), "Events tab must merge green events and WC nights")
  assert.ok(src.includes("loadProgramsUpcomingNights"), "Events tab must load WC series nights")
})
