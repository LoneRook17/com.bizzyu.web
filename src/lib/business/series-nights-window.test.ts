import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  SERIES_NIGHTS_WINDOW_DAYS,
  addIsoDays,
  eventsForHostUpcomingList,
  hostShowsWeeklyCoverNight,
  hostUpcomingShowsGreenNight,
  isCustomizedSeriesNight,
  isHostStampedCustomWeeklyCoverNight,
  isStandaloneOneOff,
  nightsForHostWeeklyCoverGrid,
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

test("after green RC series-end a leftover night is not Custom", () => {
  assert.equal(
    isCustomizedSeriesNight({
      recurring_series_id: null,
      series_customized_at: "2026-08-20 10:00:00",
      is_customized: true,
    }),
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
  assert.ok(
    src.includes("eventsForHostUpcomingList") || src.includes("buildHostLiveList"),
    "Upcoming tab clips green series nights to today+2 weeks",
  )
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

// ── Weekly Cover program Nights grid (Flutter Host today+14) ────────────────

const WC_TODAY = "2026-08-28"

function wcNight(
  date: string,
  extra: {
    is_stamped?: boolean
    event_id?: number | null
    series_customized_at?: string | null
    is_customized?: boolean
    flyer_image_url_override?: string | null
    has_override?: boolean
  } = {},
) {
  return {
    occurrence_date: date,
    is_stamped: extra.is_stamped ?? (extra.event_id != null),
    event_id: extra.event_id ?? null,
    series_customized_at: extra.series_customized_at ?? null,
    is_customized: extra.is_customized ?? false,
    flyer_image_url_override: extra.flyer_image_url_override ?? null,
    has_override: extra.has_override ?? false,
    product_kind: "weekly_cover",
  }
}

test("Fri create with Sat nights lists Sat Aug 29 and Sat Sep 5, not Sep 12/19", () => {
  assert.equal(addIsoDays(WC_TODAY, 14), "2026-09-11")
  const saturdays = [
    wcNight("2026-08-29"),
    wcNight("2026-09-05"),
    wcNight("2026-09-12"),
    wcNight("2026-09-19"),
  ]
  assert.deepEqual(
    nightsForHostWeeklyCoverGrid(saturdays, WC_TODAY).map((n) => n.occurrence_date),
    ["2026-08-29", "2026-09-05"],
  )
  assert.equal(hostShowsWeeklyCoverNight(wcNight("2026-08-29"), WC_TODAY), true)
  assert.equal(hostShowsWeeklyCoverNight(wcNight("2026-09-05"), WC_TODAY), true)
  assert.equal(hostShowsWeeklyCoverNight(wcNight("2026-09-12"), WC_TODAY), false)
  assert.equal(hostShowsWeeklyCoverNight(wcNight("2026-09-19"), WC_TODAY), false)
})

test("series 120 Oct 15 lists at +48d; Thursday templates stay in the 14-day window", () => {
  assert.equal(addIsoDays(WC_TODAY, 48), "2026-10-15")
  const thuSlot = { slotEstablished: true, offPatternDate: false, differsFromWeekdaySlot: false }
  const octSlot = { slotEstablished: true, offPatternDate: false, differsFromWeekdaySlot: true }
  const thursdays = [
    wcNight("2026-09-03", { is_stamped: true, event_id: 1400 }),
    wcNight("2026-09-10", { is_stamped: true, event_id: 1401 }),
    wcNight("2026-09-17", { is_stamped: true, event_id: 1402 }),
    wcNight("2026-10-08", { is_stamped: true, event_id: 1403 }),
  ]
  const overrideOnly = wcNight("2026-10-15", { is_stamped: false, event_id: null, has_override: true })
  const stampedCustom = wcNight("2026-10-15", {
    is_stamped: true,
    event_id: 2001,
    series_customized_at: "2026-08-28 23:00:00",
    has_override: true,
  })
  for (const thu of thursdays) {
    assert.equal(hostShowsWeeklyCoverNight(thu, WC_TODAY, 14, thuSlot), thu.occurrence_date <= "2026-09-11")
  }
  assert.equal(hostShowsWeeklyCoverNight(overrideOnly, WC_TODAY, 14, octSlot), true, "override-only Oct 15 still lists")
  assert.equal(hostShowsWeeklyCoverNight(stampedCustom, WC_TODAY, 14, octSlot), true, "stamped Oct Custom must not hide")
  const grid = nightsForHostWeeklyCoverGrid([...thursdays, stampedCustom], WC_TODAY, 14, (night) =>
    night.occurrence_date === "2026-10-15" ? octSlot : thuSlot,
  )
  assert.deepEqual(
    grid.map((n) => n.occurrence_date),
    ["2026-09-03", "2026-09-10", "2026-10-15"],
  )
})

test("a host-stamped Custom night on Sep 19 still lists past +14", () => {
  const custom = wcNight("2026-09-19", {
    is_stamped: true,
    event_id: 8819,
    series_customized_at: "2026-08-20 10:00:00",
  })
  assert.equal(isHostStampedCustomWeeklyCoverNight(custom), true)
  assert.equal(hostShowsWeeklyCoverNight(custom, WC_TODAY), true)
  const grid = nightsForHostWeeklyCoverGrid(
    [wcNight("2026-08-29"), wcNight("2026-09-05"), wcNight("2026-09-12"), custom],
    WC_TODAY,
  )
  assert.deepEqual(
    grid.map((n) => n.occurrence_date),
    ["2026-08-29", "2026-09-05", "2026-09-19"],
  )
})

test("Not generated / no event_id beyond +14 never lists, even with is_customized", () => {
  const lookahead = wcNight("2026-09-19", {
    is_stamped: false,
    event_id: null,
    is_customized: true,
  })
  assert.equal(isHostStampedCustomWeeklyCoverNight(lookahead), false)
  assert.equal(hostShowsWeeklyCoverNight(lookahead, WC_TODAY), false)
})

test("is_customized alone does not pin a stamped template Saturday past +14", () => {
  const template = wcNight("2026-09-19", {
    is_stamped: true,
    event_id: 8820,
    is_customized: true,
  })
  assert.equal(isHostStampedCustomWeeklyCoverNight(template), false)
  assert.equal(hostShowsWeeklyCoverNight(template, WC_TODAY), false)
})

test("Weekly Cover program page clips the Nights grid to the Host window", () => {
  const page = readFileSync(
    join(process.cwd(), "src/app/business/(dashboard)/door-access/[id]/page.tsx"),
    "utf8",
  )
  assert.ok(
    page.includes("nightsForHostWeeklyCoverGrid"),
    "program Nights grid must use the Flutter Host today+14 window",
  )
  assert.ok(!page.includes("LookaheadPicker"), "do not dump 4/12/24 weeks of Not generated lookaheads")
  assert.ok(!page.includes("4 weeks"), "no 4-week lookahead pager")
  assert.ok(!page.includes("12 weeks"), "no 12-week lookahead pager")
  assert.ok(!page.includes("6 months"), "no 6-month lookahead pager")
})
