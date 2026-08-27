import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  SERIES_NIGHTS_WINDOW_DAYS,
  addIsoDays,
  eventsForHostUpcomingList,
  hostUpcomingShowsGreenNight,
  isCustomizedSeriesNight,
  isStandaloneOneOff,
} from "./series-nights-window.ts"

const TODAY = "2026-08-27"

function night(
  start: string,
  extra: {
    recurring_series_id?: number | null
    series_customized_at?: string | null
    is_customized?: boolean | number | string | null
  } = {},
) {
  return { start_date_time: start, ...extra }
}

test("the series window is today plus two weeks", () => {
  assert.equal(SERIES_NIGHTS_WINDOW_DAYS, 14)
  assert.equal(addIsoDays(TODAY, 14), "2026-09-10")
})

test("a standalone one-off always shows, even far out", () => {
  const far = night("2026-12-31 21:00:00")
  assert.equal(isStandaloneOneOff(far), true)
  assert.equal(hostUpcomingShowsGreenNight(far, TODAY), true)
})

test("an uncustomized series night inside the window shows", () => {
  assert.equal(
    hostUpcomingShowsGreenNight(night("2026-09-03 21:00:00", { recurring_series_id: 7 }), TODAY),
    true,
  )
})

test("an uncustomized series night past today+2 weeks is hidden", () => {
  assert.equal(
    hostUpcomingShowsGreenNight(night("2026-09-11 21:00:00", { recurring_series_id: 7 }), TODAY),
    false,
  )
})

test("a Custom series night always shows, even far out", () => {
  assert.equal(
    isCustomizedSeriesNight({ series_customized_at: "2026-08-20 10:00:00" }),
    true,
  )
  assert.equal(
    hostUpcomingShowsGreenNight(
      night("2026-12-31 21:00:00", { recurring_series_id: 7, series_customized_at: "2026-08-20 10:00:00" }),
      TODAY,
    ),
    true,
  )
  assert.equal(
    hostUpcomingShowsGreenNight(
      night("2026-12-31 21:00:00", { recurring_series_id: 7, is_customized: true }),
      TODAY,
    ),
    true,
  )
})

test("eventsForHostUpcomingList keeps one-offs and Custom, clips template nights", () => {
  const rows = eventsForHostUpcomingList(
    [
      night("2026-12-01 21:00:00", { recurring_series_id: null }),
      night("2026-09-03 21:00:00", { recurring_series_id: 7 }),
      night("2026-10-01 21:00:00", { recurring_series_id: 7 }),
      night("2026-10-08 21:00:00", { recurring_series_id: 7, is_customized: 1 }),
    ],
    TODAY,
  )
  assert.deepEqual(
    rows.map((r) => r.start_date_time),
    ["2026-12-01 21:00:00", "2026-09-03 21:00:00", "2026-10-08 21:00:00"],
  )
})

test("Events upcoming list applies the series nights window", () => {
  const src = readFileSync(
    join(process.cwd(), "src/app/business/(dashboard)/events/page.tsx"),
    "utf8",
  )
  assert.ok(src.includes("eventsForHostUpcomingList"), "Upcoming tab clips green series nights to today+2 weeks")
})

test("series manage still lists the full series — window is Host Upcoming / Events list only", () => {
  const page = readFileSync(
    join(process.cwd(), "src/app/business/(dashboard)/recurring/[id]/page.tsx"),
    "utf8",
  )
  assert.ok(
    !page.includes("hostUpcomingShowsGreenNight") && !page.includes("eventsForHostUpcomingList"),
    "the series page must not clip nights to today+2 weeks",
  )
})
