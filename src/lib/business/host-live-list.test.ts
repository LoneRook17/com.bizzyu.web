import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import type { EventListItem, RecurringSeriesListItem } from "./types.ts"
import type { DoorAccessNight, DoorAccessProgramSummary } from "./door-access.ts"
import {
  HOST_UPCOMING_PREVIEW_GROUPS,
  buildHostLiveList,
  fmtDateSeparator,
  greenNightAlwaysShows,
  groupHostNightsByDate,
  hostLiveListIsEmpty,
  isTonightDate,
  partitionHostNights,
  wcNightAlwaysShows,
  type HostLiveNight,
} from "./host-live-list.ts"

const TODAY = "2026-08-29"

function ev(
  event_id: number,
  start: string,
  extra: Partial<EventListItem> = {},
): EventListItem {
  return {
    event_id,
    name: extra.name ?? `Event ${event_id}`,
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
    ...extra,
  }
}

function series(
  id: number,
  name: string,
  extra: Partial<RecurringSeriesListItem> = {},
): RecurringSeriesListItem {
  return {
    id,
    name,
    days_of_week: [4],
    date_range_start: "2026-08-01",
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
    next_occurrence_date: "2026-09-03",
    ...extra,
  }
}

function program(
  id: number,
  extra: Partial<DoorAccessProgramSummary> = {},
): DoorAccessProgramSummary {
  return {
    id,
    name: extra.name ?? `Cover ${id}`,
    days_of_week: [6],
    date_range_start: "2026-08-01",
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
    next_night_date: "2026-08-29",
    tier_count: 2,
    lowest_price_usd: 10,
    ...extra,
  }
}

function night(date: string, extra: Partial<DoorAccessNight> = {}): DoorAccessNight {
  return {
    occurrence_date: date,
    is_stamped: extra.event_id != null || extra.is_stamped === true,
    is_scheduled: true,
    event_id: extra.event_id ?? 1000,
    status: "published",
    start_date_time: `${date} 22:00:00`,
    end_date_time: `${date} 02:00:00`,
    passes_sold: 0,
    paid_orders: 0,
    is_customized: false,
    series_customized_at: extra.series_customized_at ?? null,
    is_closed: false,
    has_override: extra.has_override ?? false,
    start_time: "22:00:00",
    end_time: "02:00:00",
    tiers: [],
    product_kind: "weekly_cover",
    ...extra,
  }
}

test("date separators match Host: Sat Aug 29 / Thu Sep 3", () => {
  assert.equal(fmtDateSeparator("2026-08-29"), "Sat Aug 29")
  assert.equal(fmtDateSeparator("2026-09-03"), "Thu Sep 3")
  assert.equal(fmtDateSeparator("2026-10-15"), "Thu Oct 15")
  assert.equal(isTonightDate("2026-08-29", TODAY), true)
  assert.equal(isTonightDate("2026-09-03", TODAY), false)
})

test("fresh weekday templates are not Custom / not always-show", () => {
  const template = night("2026-09-05", { event_id: 1401, is_stamped: true })
  assert.equal(wcNightAlwaysShows(template), false)
  assert.equal(greenNightAlwaysShows(ev(7, "2026-09-03 21:00:00", { recurring_series_id: 12 })), false)
})

test("standalone and Custom always show; far series nights do not", () => {
  assert.equal(greenNightAlwaysShows(ev(1, "2026-10-15 21:00:00")), true)
  assert.equal(
    greenNightAlwaysShows(
      ev(8, "2026-10-15 21:00:00", {
        recurring_series_id: 12,
        series_customized_at: "2026-08-20 10:00:00",
      }),
    ),
    true,
  )
  assert.equal(
    wcNightAlwaysShows(
      night("2026-10-15", {
        event_id: 2001,
        is_stamped: true,
        series_customized_at: "2026-08-28 23:00:00",
        has_override: true,
      }),
    ),
    true,
  )
})

test("approved shop Host list is Tonight + expandable Upcoming + Schedules", () => {
  const wc = program(9, { name: "Saturday Cover" })
  const rc = series(12, "Trivia Thursdays")
  const list = buildHostLiveList({
    today: TODAY,
    events: [
      ev(10, "2026-08-29 21:00:00", { name: "Tonight show" }),
      ev(11, "2026-09-03 21:00:00", { name: "Trivia", recurring_series_id: 12 }),
      ev(12, "2026-09-10 21:00:00", { name: "Trivia", recurring_series_id: 12 }),
      ev(13, "2026-09-17 21:00:00", { name: "Trivia", recurring_series_id: 12 }),
      ev(14, "2026-10-15 21:00:00", { name: "Halloween one-off" }),
    ],
    series: [rc, series(9, "Saturday Cover", { days_of_week: [6], program_kind: "door_access", product_kind: "weekly_cover" })],
    programs: [wc],
    loadedNights: [
      {
        program: wc,
        nights: [
          night("2026-08-29", { event_id: 200 }),
          night("2026-09-05", { event_id: 201 }),
          night("2026-09-12", { event_id: 202 }),
          night("2026-09-19", { event_id: 203 }),
          night("2026-10-15", {
            event_id: 204,
            series_customized_at: "2026-08-20 10:00:00",
            has_override: true,
          }),
        ],
      },
    ],
    wcSeriesIds: [9],
    inactiveWcIds: [],
  })

  assert.equal(list.tonight?.label, "Sat Aug 29")
  assert.deepEqual(
    list.tonight?.nights.map((n) => n.key),
    ["access-9-2026-08-29", "event-10"],
  )

  assert.deepEqual(
    list.upcomingPreview.map((g) => g.label),
    ["Thu Sep 3", "Sat Sep 5", "Thu Oct 15"],
  )
  assert.ok(
    list.upcomingPreview.some((g) => g.nights.some((n) => n.key === "event-14")),
    "far October one-off stays visible in the collapsed Upcoming preview",
  )
  assert.ok(
    list.upcomingPreview.some((g) => g.nights.some((n) => n.key === "access-9-2026-10-15")),
    "far October Custom WC stays visible in the collapsed Upcoming preview",
  )

  assert.deepEqual(
    list.upcomingRest.map((g) => g.label),
    ["Thu Sep 10", "Sat Sep 12"],
  )
  assert.ok(!list.upcomingRest.some((g) => g.date === "2026-09-17"), "green RC past +14 stays off")
  assert.ok(!list.upcomingRest.some((g) => g.date === "2026-09-19"), "WC template past +14 stays off")

  assert.deepEqual(
    list.schedules.map((row) => row.key),
    ["schedule-wc-9", "schedule-rc-12"],
  )
  assert.ok(
    !list.schedules.some((row) => row.kind === "rc-series" && row.series.id === 9),
    "WC weekday template is not also a green RC schedule",
  )
})

test("collapsed Upcoming is not a flat pile of every generated night", () => {
  const wc = program(9)
  const list = buildHostLiveList({
    today: TODAY,
    events: [],
    series: [],
    programs: [wc],
    loadedNights: [
      {
        program: wc,
        nights: [
          night("2026-08-29", { event_id: 200 }),
          night("2026-09-05", { event_id: 201 }),
          night("2026-09-12", { event_id: 202 }),
          night("2026-09-19", { event_id: 203 }),
        ],
      },
    ],
    wcSeriesIds: [9],
  })
  const previewDates = list.upcomingPreview.flatMap((g) => g.nights.map((n) => n.date))
  assert.deepEqual(previewDates, ["2026-09-05", "2026-09-12"])
  assert.equal(HOST_UPCOMING_PREVIEW_GROUPS, 2)
  assert.equal(list.upcomingRest.length, 0, "only two in-window Saturdays — nothing left to dump")
  assert.ok(!previewDates.includes("2026-09-19"))
  assert.ok(!list.tonight?.nights.some((n) => n.date === "2026-09-19"))
})

test("Schedules are repeating setups only — not occurrence cards", () => {
  const list = buildHostLiveList({
    today: TODAY,
    events: [ev(11, "2026-09-03 21:00:00", { recurring_series_id: 12 })],
    series: [series(12, "Trivia Thursdays")],
    programs: [program(9, { days_of_week: [] })],
    loadedNights: [],
  })
  assert.deepEqual(
    list.schedules.map((row) => row.kind),
    ["rc-series"],
    "a WC program with no weekdays is not a schedule",
  )
  assert.equal(list.upcomingPreview[0]?.nights[0]?.kind, "event")
})

test("a WC night on the events list still lists pink when door-access nights have not loaded", () => {
  const wc = program(9)
  const list = buildHostLiveList({
    today: TODAY,
    events: [
      ev(775, "2026-09-05 22:00:00", {
        product_kind: "weekly_cover",
        recurring_series_id: 9,
        name: "Saturday Cover",
      }),
    ],
    series: [],
    programs: [wc],
    loadedNights: [],
    wcSeriesIds: [9],
  })
  const row = list.upcomingPreview[0]?.nights[0]
  assert.equal(row?.kind, "access")
  if (row?.kind === "access") assert.equal(row.program.id, 9)
})

test("WC events from GET /business/events do not also become green Host cards", () => {
  const wc = program(9)
  const coverNight = ev(775, "2026-09-05 22:00:00", {
    product_kind: "weekly_cover",
    recurring_series_id: 9,
    name: "Saturday Cover",
  })
  const list = buildHostLiveList({
    today: TODAY,
    events: [coverNight, ev(1, "2026-09-05 21:00:00", { name: "Band" })],
    series: [],
    programs: [wc],
    loadedNights: [{ program: wc, nights: [night("2026-09-05", { event_id: 775 })] }],
    wcSeriesIds: [9],
  })
  const sep5 = list.upcomingPreview.find((g) => g.date === "2026-09-05")
  assert.ok(sep5)
  assert.deepEqual(
    sep5?.nights.map((n) => n.kind),
    ["access", "event"],
  )
  assert.ok(!sep5?.nights.some((n) => n.kind === "event" && n.event.event_id === 775))
})

test("sold leftover of a host-deleted series still lists as a night card", () => {
  const sold = ev(775, "2026-09-04 21:00:00", {
    product_kind: "weekly_cover",
    recurring_series_id: 66,
    ticket_sales_count: 4,
  })
  const list = buildHostLiveList({
    today: TODAY,
    events: [sold],
    series: [],
    programs: [],
    loadedNights: [],
    wcSeriesIds: [66],
    inactiveWcIds: [66],
  })
  assert.equal(list.upcomingPreview[0]?.nights[0]?.key, "event-775")
  assert.equal(list.upcomingPreview[0]?.nights[0]?.alwaysShow, true)
})

test("cancelled nights stay off Tonight and Upcoming", () => {
  const list = buildHostLiveList({
    today: TODAY,
    events: [ev(2, "2026-08-29 21:00:00", { status: "cancelled" })],
    series: [],
    programs: [program(9)],
    loadedNights: [
      { program: program(9), nights: [night("2026-08-29", { event_id: 9, status: "cancelled" })] },
    ],
    wcSeriesIds: [9],
  })
  assert.equal(list.tonight, null)
})

test("type filters drop the other product from nights and schedules", () => {
  const eventsOnly = buildHostLiveList({
    today: TODAY,
    events: [ev(1, "2026-08-29 21:00:00")],
    series: [series(12, "Trivia")],
    programs: [program(9)],
    loadedNights: [{ program: program(9), nights: [night("2026-08-29", { event_id: 200 })] }],
    includeAccess: false,
  })
  assert.ok(eventsOnly.tonight?.nights.every((n) => n.kind === "event"))
  assert.ok(eventsOnly.schedules.every((row) => row.kind === "rc-series"))

  const accessOnly = buildHostLiveList({
    today: TODAY,
    events: [ev(1, "2026-08-29 21:00:00")],
    series: [series(12, "Trivia")],
    programs: [program(9)],
    loadedNights: [{ program: program(9), nights: [night("2026-08-29", { event_id: 200 })] }],
    includeEvents: false,
  })
  assert.ok(accessOnly.tonight?.nights.every((n) => n.kind === "access"))
  assert.ok(accessOnly.schedules.every((row) => row.kind === "wc-program"))
})

test("date groups never render an undifferentiated stack", () => {
  const nights: HostLiveNight[] = [
    {
      kind: "event",
      key: "event-1",
      date: "2026-09-03",
      sortKey: "2026-09-03 21:00:00",
      alwaysShow: true,
      event: ev(1, "2026-09-03 21:00:00"),
    },
    {
      kind: "event",
      key: "event-2",
      date: "2026-09-05",
      sortKey: "2026-09-05 21:00:00",
      alwaysShow: true,
      event: ev(2, "2026-09-05 21:00:00"),
    },
  ]
  const groups = groupHostNightsByDate(nights)
  assert.deepEqual(
    groups.map((g) => g.label),
    ["Thu Sep 3", "Sat Sep 5"],
  )
  const split = partitionHostNights(nights, TODAY, 1)
  assert.equal(split.tonight, null)
  assert.equal(split.upcomingPreview.length, 2)
})

test("an empty Host list is empty", () => {
  const list = buildHostLiveList({
    today: TODAY,
    events: [],
    series: [],
    programs: [],
    loadedNights: [],
  })
  assert.equal(hostLiveListIsEmpty(list), true)
})

test("Events upcoming live list uses the Host IA, not a night pile", () => {
  const page = readFileSync(join(process.cwd(), "src/app/business/(dashboard)/events/page.tsx"), "utf8")
  assert.ok(page.includes("buildHostLiveList"), "upcoming live list must use the Host partition")
  assert.ok(page.includes("HostLiveList"), "Tonight / Upcoming / Schedules render through HostLiveList")
  const hostList = readFileSync(
    join(process.cwd(), "src/components/business/v2/host/HostLiveList.tsx"),
    "utf8",
  )
  assert.ok(hostList.includes("HOST_LIVE_TONIGHT_LABEL"), "Tonight heading")
  assert.ok(hostList.includes("HOST_LIVE_UPCOMING_LABEL"), "Upcoming events & WC heading")
  assert.ok(hostList.includes("HOST_LIVE_SCHEDULES_LABEL"), "Schedules heading")
  assert.ok(hostList.includes("HostDateSeparator"), "date separators")
})
