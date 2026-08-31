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

test("the series window is one month (Luke 2026-08-30)", () => {
  assert.equal(SERIES_NIGHTS_WINDOW_DAYS, 30)
  assert.equal(addIsoDays(TODAY, 30), "2026-09-26")
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

test("an uncustomized series night past today+30 is hidden", () => {
  assert.equal(
    hostUpcomingShowsGreenNight(night("2026-09-27 21:00:00", { recurring_series_id: 7 }), TODAY),
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

test("a past night never shows — the lower bound clips EVERY arm (2026-08-30 bug)", () => {
  // One-off and Custom skip the UPPER window only. Pre-fix their arms
  // returned true before any date check, so a finished Aug 29 one-off /
  // detached Custom night stayed on Home's Upcoming forever.
  assert.equal(hostUpcomingShowsGreenNight(night("2026-08-20 21:00:00"), TODAY), false)
  assert.equal(
    hostUpcomingShowsGreenNight(
      night("2026-08-20 21:00:00", { recurring_series_id: 7, series_customized_at: "2026-08-01 10:00:00" }),
      TODAY,
    ),
    false,
  )
  assert.equal(
    hostUpcomingShowsGreenNight(night("2026-08-20 21:00:00", { recurring_series_id: 7 }), TODAY),
    false,
  )
  // Tonight is not past — the night is still running on its calendar date.
  assert.equal(hostUpcomingShowsGreenNight(night(`${TODAY} 21:00:00`), TODAY), true)
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
    join(process.cwd(), "src/lib/business/host-dash-sections.ts"),
    "utf8",
  )
  assert.ok(src.includes("hostUpcomingShowsGreenNight"), "Host Upcoming clips green series nights to the month window")
  assert.ok(src.includes("nightsForHostWeeklyCoverGrid"), "Host Upcoming clips WC series nights to the month window")
})

test("series manage still lists the full series — window is Host Upcoming / Events list only", () => {
  const page = readFileSync(
    join(process.cwd(), "src/app/business/(dashboard)/recurring/[id]/page.tsx"),
    "utf8",
  )
  assert.ok(
    !page.includes("hostUpcomingShowsGreenNight") && !page.includes("eventsForHostUpcomingList"),
    "the series page must not clip nights to the month window",
  )
})

// ── Weekly Cover program Nights grid (today+30, Luke 2026-08-30) ────────────

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

test("Fri create with Sat nights lists a month of Saturdays, not Oct 3/10", () => {
  assert.equal(addIsoDays(WC_TODAY, 30), "2026-09-27")
  const saturdays = [
    wcNight("2026-08-29"),
    wcNight("2026-09-05"),
    wcNight("2026-09-12"),
    wcNight("2026-09-19"),
    wcNight("2026-09-26"),
    wcNight("2026-10-03"),
    wcNight("2026-10-10"),
  ]
  assert.deepEqual(
    nightsForHostWeeklyCoverGrid(saturdays, WC_TODAY).map((n) => n.occurrence_date),
    ["2026-08-29", "2026-09-05", "2026-09-12", "2026-09-19", "2026-09-26"],
  )
  assert.equal(hostShowsWeeklyCoverNight(wcNight("2026-09-26"), WC_TODAY), true)
  assert.equal(hostShowsWeeklyCoverNight(wcNight("2026-10-03"), WC_TODAY), false)
  assert.equal(hostShowsWeeklyCoverNight(wcNight("2026-10-10"), WC_TODAY), false)
})

test("series 120 Oct 15 lists at +48d; Thursday templates stay in a passed 14-day window", () => {
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

test("a host-stamped Custom night on Oct 17 still lists past +30", () => {
  const custom = wcNight("2026-10-17", {
    is_stamped: true,
    event_id: 8819,
    series_customized_at: "2026-08-20 10:00:00",
  })
  assert.equal(isHostStampedCustomWeeklyCoverNight(custom), true)
  assert.equal(hostShowsWeeklyCoverNight(custom, WC_TODAY), true)
  const grid = nightsForHostWeeklyCoverGrid(
    [wcNight("2026-08-29"), wcNight("2026-09-05"), wcNight("2026-10-03"), custom],
    WC_TODAY,
  )
  assert.deepEqual(
    grid.map((n) => n.occurrence_date),
    ["2026-08-29", "2026-09-05", "2026-10-17"],
  )
})

test("Not generated / no event_id beyond +30 never lists, even with is_customized", () => {
  const lookahead = wcNight("2026-10-17", {
    is_stamped: false,
    event_id: null,
    is_customized: true,
  })
  assert.equal(isHostStampedCustomWeeklyCoverNight(lookahead), false)
  assert.equal(hostShowsWeeklyCoverNight(lookahead, WC_TODAY), false)
})

test("is_customized alone does not pin a stamped template Saturday past +30", () => {
  const template = wcNight("2026-10-17", {
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
    "program Nights grid must use the shared month window",
  )
  assert.ok(!page.includes("LookaheadPicker"), "do not dump 4/12/24 weeks of Not generated lookaheads")
  assert.ok(!page.includes("4 weeks"), "no 4-week lookahead pager")
  assert.ok(!page.includes("12 weeks"), "no 12-week lookahead pager")
  assert.ok(!page.includes("6 months"), "no 6-month lookahead pager")
})

test("one month, one constant: no second display window on a dash list (Luke 2026-08-30)", () => {
  const src = join(process.cwd(), "src")
  // The create-dates preview paints the shared window, not a 120-day dump.
  const datesStep = readFileSync(
    join(src, "components/business/v2/door-access/WcDatesStep.tsx"),
    "utf8",
  )
  assert.ok(datesStep.includes("SERIES_NIGHTS_WINDOW_DAYS"), "WcDatesStep paints the shared window")
  assert.ok(!datesStep.includes("WC_LOOKAHEAD_DAYS"), "the 120-day dump is gone")
  const wcNights = readFileSync(join(src, "lib/business/weekly-cover-nights.ts"), "utf8")
  assert.ok(!wcNights.includes("WC_LOOKAHEAD_DAYS = 120"), "no 120-day constant to drift back")
  // Marketing clips generated nights with the same rule as the Host grid.
  const wcUpcoming = readFileSync(join(src, "lib/business/wc-upcoming.ts"), "utf8")
  assert.ok(
    wcUpcoming.includes("hostShowsWeeklyCoverNight"),
    "Marketing nights ride the shared window filter",
  )
  // Fetch lookaheads may stay far; displays must not hardcode one.
  const analytics = readFileSync(
    join(src, "app/business/(dashboard)/analytics/page.tsx"),
    "utf8",
  )
  assert.ok(!/fetchDoorAccessSeries\(program\.id, 180\)/.test(analytics), "no bare 180 literal")
})
