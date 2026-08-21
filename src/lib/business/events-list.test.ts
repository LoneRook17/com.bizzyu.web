import test from "node:test"
import assert from "node:assert/strict"
import {
  groupEventRows,
  parseEventTypeFilter,
  seriesHref,
  seriesRowStats,
  showsAccess,
  showsEvents,
} from "./events-list.ts"
import type { EventListItem, RecurringSeriesListItem } from "./types.ts"

function ev(
  event_id: number,
  start: string,
  seriesId: number | null = null,
  extra: Partial<EventListItem> = {},
): EventListItem {
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
    recurring_series_id: seriesId,
    total_attendees: 0,
    total_revenue: 0,
    ticket_sales_count: 0,
    checkin_rate: 0,
    ...extra,
  }
}

function series(id: number, name: string, extra: Partial<RecurringSeriesListItem> = {}): RecurringSeriesListItem {
  return {
    id,
    name,
    days_of_week: [2],
    date_range_start: "2026-09-01",
    date_range_end: null,
    is_active: 1,
    type: "Ticketed",
    venue_id: 1,
    venue_name: "The Bar",
    start_time: "21:00:00",
    end_time: "02:00:00",
    flyer_image_url: null,
    created_at: "",
    updated_at: "",
    occurrence_count: 12,
    upcoming_count: 12,
    next_occurrence_date: "2026-09-01",
    ...extra,
  }
}

test("the type segment defaults to All and refuses anything it doesn't know", () => {
  assert.equal(parseEventTypeFilter(null), "all")
  assert.equal(parseEventTypeFilter(undefined), "all")
  assert.equal(parseEventTypeFilter("lineskips"), "all")
  assert.equal(parseEventTypeFilter("events"), "events")
  assert.equal(parseEventTypeFilter("access"), "access")
})

test("All shows both kinds; each segment shows only its own", () => {
  assert.equal(showsEvents("all") && showsAccess("all"), true)
  assert.equal(showsEvents("events"), true)
  assert.equal(showsAccess("events"), false)
  assert.equal(showsAccess("access"), true)
  assert.equal(showsEvents("access"), false)
})

test("one-offs stay one rows apiece", () => {
  const rows = groupEventRows([ev(1, "2026-09-01 21:00:00"), ev(2, "2026-09-02 21:00:00")])
  assert.equal(rows.length, 2)
  assert.deepEqual(rows.map((r) => r.kind), ["single", "single"])
})

test("a series' nights collapse into ONE row, named from the series", () => {
  const rows = groupEventRows(
    [ev(1, "2026-09-01 21:00:00", 7), ev(2, "2026-09-08 21:00:00", 7), ev(3, "2026-09-15 21:00:00", 7)],
    [series(7, "Trivia Tuesdays")],
  )
  assert.equal(rows.length, 1)
  assert.equal(rows[0].kind, "series")
  if (rows[0].kind !== "series") return
  assert.equal(rows[0].name, "Trivia Tuesdays")
  assert.equal(rows[0].events.length, 3)
  assert.equal(seriesHref(rows[0].seriesId), "/business/recurring/7")
})

test("a group takes the position of its EARLIEST night — chronology is not reordered", () => {
  const rows = groupEventRows(
    [
      ev(1, "2026-09-01 21:00:00"),
      ev(2, "2026-09-02 21:00:00", 7),
      ev(3, "2026-09-03 21:00:00"),
      ev(4, "2026-09-09 21:00:00", 7),
    ],
    [series(7, "Trivia Tuesdays")],
  )
  assert.deepEqual(rows.map((r) => r.key), ["event-1", "series-7", "event-3"])
  assert.equal(rows[1].kind === "series" && rows[1].events.length, 2)
})

test("a group renders even when /business/recurring-series never resolved", () => {
  const rows = groupEventRows([ev(1, "2026-09-01 21:00:00", 7, { name: "Trivia" })], [])
  assert.equal(rows[0].kind, "series")
  if (rows[0].kind !== "series") return
  assert.equal(rows[0].series, null)
  // Falls back to the first night's own name rather than rendering a blank row.
  assert.equal(rows[0].name, "Trivia")
})

test("a series TEMPLATE row is left alone — it has no nights to hide", () => {
  // What the "Recurring" status tab lists: is_recurring true, no series FK.
  const rows = groupEventRows([ev(1, "2026-09-01 21:00:00", null, { is_recurring: true })])
  assert.equal(rows[0].kind, "single")
})

test("series stats sum the nights actually on the page", () => {
  const rows = groupEventRows(
    [
      ev(1, "2026-09-01 21:00:00", 7, { ticket_sales_count: 10, total_revenue: 100 }),
      ev(2, "2026-09-08 21:00:00", 7, { ticket_sales_count: 5, total_revenue: 42.5 }),
    ],
    [series(7, "Trivia Tuesdays")],
  )
  assert.equal(rows[0].kind, "series")
  if (rows[0].kind !== "series") return
  assert.deepEqual(seriesRowStats(rows[0]), { nights: 2, sold: 15, revenue: 142.5 })
})
