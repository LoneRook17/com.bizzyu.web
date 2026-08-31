import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import type { EventListItem, RecurringSeriesListItem } from "./types.ts"
import type { DoorAccessNight, DoorAccessProgramSummary } from "./door-access.ts"
import {
  HOST_DASH_SCHEDULES,
  HOST_DASH_TONIGHT,
  HOST_DASH_UPCOMING,
  HOST_UPCOMING_PREVIEW_COUNT,
  fmtHostDateSeparator,
  groupOccurrencesByDate,
  hostDashIsEmpty,
  hostDashSections,
  includeGreenOccurrence,
  occurrenceIsPinned,
  isRecurringNamedEventNight,
  shouldUseHostDashLayout,
  visibleHostUpcoming,
} from "./host-dash-sections.ts"

const TODAY = "2026-08-29"

function ev(
  event_id: number,
  start: string,
  seriesId: number | null = null,
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
    recurring_series_id: seriesId,
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
    days_of_week: [5],
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
    next_occurrence_date: "2026-09-04",
    product_kind: "event",
    ...extra,
  }
}

function program(
  id: number,
  extra: Partial<DoorAccessProgramSummary> = {},
): DoorAccessProgramSummary {
  return {
    id,
    name: extra.name ?? "The Bar Cover",
    days_of_week: [5],
    date_range_start: "2026-08-01",
    date_range_end: null,
    is_active: true,
    venue_id: 1,
    venue_name: "The Bar",
    start_time: "21:00:00",
    end_time: "02:00:00",
    flyer_image_url: null,
    redemption_mode: "native_scan",
    template_tickets: [],
    migrated_from_line_skip_id: null,
    promotion_enabled: false,
    upcoming_night_count: 8,
    next_night_date: "2026-09-04",
    tier_count: 1,
    lowest_price_usd: 5,
    ...extra,
  }
}

function night(date: string, extra: Partial<DoorAccessNight> = {}): DoorAccessNight {
  return {
    occurrence_date: date,
    is_stamped: extra.is_stamped ?? extra.event_id != null,
    is_scheduled: true,
    event_id: extra.event_id ?? null,
    status: extra.status ?? "published",
    start_date_time: extra.start_date_time ?? `${date} 21:00:00`,
    end_date_time: extra.end_date_time ?? `${date} 02:00:00`,
    passes_sold: extra.passes_sold ?? 0,
    paid_orders: extra.paid_orders ?? 0,
    is_customized: extra.is_customized ?? false,
    series_customized_at: extra.series_customized_at ?? null,
    has_override: extra.has_override ?? false,
    is_closed: extra.is_closed ?? false,
    start_time: extra.start_time ?? "21:00:00",
    end_time: extra.end_time ?? "02:00:00",
    tiers: extra.tiers ?? [],
    product_kind: extra.product_kind ?? "weekly_cover",
    ...extra,
  }
}

function sections(
  input: Omit<
    Parameters<typeof hostDashSections>[0],
    "today" | "showEvents" | "showAccessNights" | "showAccessSchedules"
  > &
    Partial<
      Pick<
        Parameters<typeof hostDashSections>[0],
        "today" | "showEvents" | "showAccessNights" | "showAccessSchedules"
      >
    >,
) {
  return hostDashSections({
    showEvents: true,
    showAccessNights: true,
    showAccessSchedules: true,
    today: TODAY,
    ...input,
  })
}

test("Host layout is Upcoming, Recurring, or the Weekly Cover segment", () => {
  assert.equal(shouldUseHostDashLayout("upcoming", "all"), true)
  assert.equal(shouldUseHostDashLayout("upcoming", "events"), true)
  assert.equal(shouldUseHostDashLayout("past", "all"), false)
  assert.equal(shouldUseHostDashLayout("drafts", "all"), false)
  assert.equal(shouldUseHostDashLayout("recurring", "all"), true)
  assert.equal(shouldUseHostDashLayout("recurring", "events"), true)
  assert.equal(shouldUseHostDashLayout("past", "access"), true)
})

test("Tonight is only today's night; a later series night is Upcoming", () => {
  const wc = program(23)
  const out = sections({
    events: [ev(10, "2026-09-04 21:00:00", 7, { name: "Trivia" })],
    programs: [wc],
    programNights: [
      {
        program: wc,
        nights: [
          night("2026-08-29", { event_id: 501 }),
          night("2026-09-04", { event_id: 502 }),
          night("2026-09-11", { event_id: 503 }),
          night("2026-10-09", { event_id: 504 }),
        ],
      },
    ],
    series: [series(7, "Trivia Fridays")],
    wcSeriesIds: [23],
  })
  assert.deepEqual(
    out.tonight.map((row) => row.date),
    ["2026-08-29"],
  )
  assert.equal(out.tonight[0]?.kind, "access")
  assert.ok(out.upcoming.every((row) => row.date !== TODAY))
  assert.ok(
    out.upcoming.some((row) => row.kind === "access" && row.date === "2026-09-04"),
    "in-window Friday WC is Upcoming",
  )
  assert.ok(
    out.upcoming.some((row) => row.kind === "event" && row.event.event_id === 10),
    "in-window RC night is Upcoming",
  )
  assert.ok(
    !out.upcoming.some((row) => row.kind === "access" && row.date === "2026-10-09"),
    "series WC past today+30 is not dumped",
  )
})

test("a far October Custom one-off stays listed and is pinned when collapsed", () => {
  const wc = program(23)
  const out = sections({
    events: [ev(80, "2026-10-15 21:00:00", null, { name: "Halloween one-off" })],
    programs: [wc],
    programNights: [
      {
        program: wc,
        nights: [
          night("2026-09-04", { event_id: 502 }),
          night("2026-09-11", { event_id: 503 }),
          night("2026-10-15", {
            event_id: 2001,
            series_customized_at: "2026-08-28 23:00:00",
            has_override: true,
          }),
        ],
      },
    ],
    wcSeriesIds: [23],
  })
  const farWc = out.upcoming.find((row) => row.kind === "access" && row.date === "2026-10-15")
  const farEvent = out.upcoming.find((row) => row.kind === "event" && row.event.event_id === 80)
  assert.ok(farWc, "D6: far WC Custom stays on Upcoming")
  assert.ok(farEvent, "D6: far standalone Custom/one-off stays on Upcoming")
  assert.equal(occurrenceIsPinned(farWc!), true)
  assert.equal(occurrenceIsPinned(farEvent!), true)
  assert.ok(
    out.upcomingPreview.some((row) => row.kind === "access" && row.date === "2026-10-15"),
    "collapsed Upcoming still shows the far Custom",
  )
  assert.ok(
    out.upcomingPreview.some((row) => row.kind === "event" && row.event.event_id === 80),
    "collapsed Upcoming still shows the far one-off",
  )
})

test("fresh weekday template nights are not Custom and clip at today+30", () => {
  const wc = program(23)
  const template = night("2026-10-09", { event_id: 8820, is_customized: true })
  const out = sections({
    events: [],
    programs: [wc],
    programNights: [{ program: wc, nights: [night("2026-09-04", { event_id: 502 }), template] }],
    wcSeriesIds: [23],
  })
  assert.ok(!out.upcoming.some((row) => row.date === "2026-10-09"))
  assert.equal(occurrenceIsPinned({
    kind: "access",
    key: "x",
    sortKey: "2026-09-04",
    date: "2026-09-04",
    program: wc,
    night: night("2026-09-04", { event_id: 502 }),
  }), false, "weekday template is not pinned Custom")
})

test("Schedules holds the WC template and the RC series, not every occurrence", () => {
  const wc = program(23)
  const trivia = series(7, "Trivia Fridays")
  const out = sections({
    events: [
      ev(10, "2026-09-04 21:00:00", 7, { name: "Trivia" }),
      ev(11, "2026-09-11 21:00:00", 7, { name: "Trivia" }),
      ev(12, "2026-10-02 21:00:00", 7, { name: "Trivia" }),
    ],
    programs: [wc],
    programNights: [
      {
        program: wc,
        nights: [night("2026-09-04", { event_id: 502 }), night("2026-09-11", { event_id: 503 })],
      },
    ],
    series: [trivia, series(23, "The Bar Cover", { program_kind: "door_access", product_kind: "weekly_cover" })],
    wcSeriesIds: [23],
  })
  assert.deepEqual(
    out.schedules.map((row) => row.kind),
    ["access", "series"],
  )
  assert.equal(out.schedules[0]?.kind === "access" && out.schedules[0].program.id, 23)
  assert.equal(out.schedules[1]?.kind === "series" && out.schedules[1].seriesId, 7)
  assert.ok(
    !out.schedules.some((row) => row.kind === "series" && row.seriesId === 23),
    "WC series is the AccessProgramRow, not a second green Series card",
  )
  assert.ok(
    !out.upcoming.some((row) => row.kind === "event" && row.event.event_id === 12),
    "far uncustomized RC night is not an Upcoming card",
  )
  assert.equal(
    out.upcoming.filter((row) => row.kind === "event").length,
    2,
    "only in-window RC nights are occurrence cards",
  )
})

test("expand shows the rest of the window, not a second product dump", () => {
  const wc = program(23)
  const nights = ["2026-09-04", "2026-09-05", "2026-09-06", "2026-09-07", "2026-09-08", "2026-09-11"].map(
    (date, i) => night(date, { event_id: 600 + i }),
  )
  const out = sections({
    events: [],
    programs: [wc],
    programNights: [{ program: wc, nights }],
    wcSeriesIds: [23],
  })
  assert.ok(out.upcoming.length > HOST_UPCOMING_PREVIEW_COUNT)
  assert.equal(out.upcomingPreview.length, HOST_UPCOMING_PREVIEW_COUNT)
  assert.equal(out.upcomingRestCount, out.upcoming.length - out.upcomingPreview.length)
  assert.deepEqual(
    visibleHostUpcoming(out, false).map((row) => row.date),
    out.upcomingPreview.map((row) => row.date),
  )
  assert.equal(visibleHostUpcoming(out, true).length, out.upcoming.length)
})

test("pending-cancel leftover of an ended series still lists as a night card", () => {
  const leftover = ev(775, "2026-09-04 21:00:00", 66, {
    name: "The Devil Dungeon Cover",
    product_kind: "weekly_cover",
    ticket_sales_count: 2,
  })
  assert.equal(includeGreenOccurrence(leftover, [66], new Set([66])), true)
  const out = sections({
    events: [leftover],
    programs: [],
    wcSeriesIds: [66],
    inactiveWcIds: [66],
  })
  assert.equal(out.upcoming.length, 1)
  assert.equal(out.upcoming[0]?.kind, "event")
  if (out.upcoming[0]?.kind === "event") assert.equal(out.upcoming[0].event.event_id, 775)
  assert.equal(out.schedules.length, 0, "ended WC is not a live schedule")
})

test("unstamped leftover nights of a host-ended series stay off the Host list", () => {
  const leftover = ev(774, "2026-09-04 21:00:00", 66, {
    name: "The Devil Dungeon Cover",
    access_kind: "event",
  })
  const out = sections({
    events: [leftover],
    programs: [],
    series: [series(66, "The Devil Dungeon Cover", { is_active: 0, product_kind: "weekly_cover" })],
    wcSeriesIds: [66],
    inactiveWcIds: [66],
  })
  assert.equal(hostDashIsEmpty(out), true)
})

test("Recurring chip lists RC + WC nights on dates, both schedules, no standalone one-off", () => {
  const wc = program(23)
  const trivia = series(7, "Trivia Fridays")
  const input = {
    events: [
      ev(80, "2026-09-04 21:00:00", null, { name: "Halloween one-off" }),
      ev(9, "2026-08-29 21:00:00", 7, { name: "Trivia tonight" }),
      ev(10, "2026-09-04 21:00:00", 7, { name: "Trivia" }),
      ev(11, "2026-09-11 21:00:00", 7, { name: "Trivia" }),
      ev(621, "2026-09-04 21:00:00", 23, {
        name: "Weekly Cover",
        product_kind: "weekly_cover" as const,
        access_kind: "door_access",
      }),
    ],
    programs: [wc],
    programNights: [
      {
        program: wc,
        nights: [
          night("2026-08-29", { event_id: 620 }),
          night("2026-09-04", { event_id: 621 }),
          night("2026-10-15", {
            event_id: 900,
            series_customized_at: "2026-08-28 23:00:00",
            has_override: true,
          }),
        ],
      },
    ],
    series: [trivia],
    wcSeriesIds: [23],
  }

  const all = sections(input)
  assert.ok(
    all.upcoming.some((row) => row.kind === "event" && row.event.event_id === 80),
    "All/Upcoming still lists a standalone one-off",
  )
  assert.ok(
    all.upcoming.some((row) => row.kind === "event" && row.event.event_id === 10),
    "All/Upcoming still lists RC nights",
  )
  assert.ok(
    all.upcoming.some((row) => row.kind === "access" || row.kind === "access-event"),
    "All/Upcoming still lists WC nights",
  )

  // Same flags the Events page passes for Recurring: Host layout + WC nights
  // on + recurringNightsOnly so green standalone one-offs stay off.
  const recurring = hostDashSections({
    ...input,
    today: TODAY,
    showEvents: true,
    showAccessNights: true,
    showAccessSchedules: true,
    recurringNightsOnly: true,
  })
  const nights = [...recurring.tonight, ...recurring.upcoming]
  const rcIds = nights
    .filter((row) => row.kind === "event")
    .map((row) => (row.kind === "event" ? row.event.event_id : 0))
  assert.deepEqual(rcIds, [9, 10, 11], "Recurring lists RC series nights, not standalones")
  assert.ok(
    recurring.tonight.some((row) => row.kind === "event" && row.event.event_id === 9),
    "Recurring Tonight includes an RC night",
  )
  assert.ok(
    recurring.tonight.some((row) => row.kind === "access" || row.kind === "access-event"),
    "Recurring Tonight includes a WC night",
  )
  assert.ok(
    recurring.upcoming.some((row) => row.kind === "event" && row.event.event_id === 10),
    "Recurring Upcoming includes an RC night",
  )
  assert.ok(
    recurring.upcoming.some((row) => row.kind === "access" || row.kind === "access-event"),
    "Recurring Upcoming includes a WC night",
  )
  assert.ok(
    nights.some((row) => row.date === "2026-10-15"),
    "far Custom WC never clips on Recurring",
  )
  assert.ok(
    nights.every((row) => row.kind !== "event" || row.event.event_id !== 80),
    "standalone named one-off stays off Recurring",
  )
  assert.ok(
    recurring.schedules.some((row) => row.kind === "series" && row.seriesId === 7),
    "Recurring Schedules includes the green RC series",
  )
  assert.ok(
    recurring.schedules.some((row) => row.kind === "access" && row.program.id === 23),
    "Recurring Schedules includes the pink WC program",
  )
  assert.ok(
    all.upcoming.some((row) => row.kind === "event" && row.event.event_id === 80) &&
      nights.every((row) => row.kind !== "event" || row.event.event_id !== 80),
    "Recurring is a real filter — it is not the unfiltered Host list",
  )
})

test("Weekly Cover chip keeps WC nights and a distinct Schedules block", () => {
  const wc = program(23)
  const trivia = series(7, "Trivia Fridays")
  const out = hostDashSections({
    events: [
      ev(10, "2026-09-04 21:00:00", 7, { name: "Trivia" }),
      ev(80, "2026-09-04 21:00:00", null, { name: "One-off" }),
      ev(900, "2026-10-15 21:00:00", 23, {
        name: "Custom WC",
        product_kind: "weekly_cover" as const,
        series_customized_at: "2026-08-28 23:00:00",
      }),
    ],
    programs: [wc],
    programNights: [
      {
        program: wc,
        nights: [
          night("2026-09-04", { event_id: 502 }),
          night("2026-10-15", {
            event_id: 900,
            series_customized_at: "2026-08-28 23:00:00",
            has_override: true,
          }),
        ],
      },
    ],
    series: [trivia],
    wcSeriesIds: [23],
    today: TODAY,
    showEvents: false,
    showAccessNights: true,
    showAccessSchedules: true,
  })
  const nights = [...out.tonight, ...out.upcoming]
  assert.ok(nights.length >= 2, "Weekly Cover lists individual WC nights")
  assert.ok(
    nights.every((row) => row.kind === "access" || row.kind === "access-event"),
    "Weekly Cover nights stay pink — no green RC / one-off cards",
  )
  assert.ok(
    nights.some((row) => row.date === "2026-10-15"),
    "Custom WC never clips, even past today+30",
  )
  assert.equal(out.schedules.length, 1, "Weekly Cover keeps a distinct Schedules block")
  assert.equal(out.schedules[0]?.kind, "access")
  assert.ok(
    !out.schedules.some((row) => row.kind === "series"),
    "Weekly Cover Schedules is WC programs only, not green RC series",
  )
  assert.equal(HOST_DASH_SCHEDULES, "Schedules")
})

test("isRecurringNamedEventNight is RC series nights only", () => {
  assert.equal(isRecurringNamedEventNight(ev(10, "2026-09-04 21:00:00", 7)), true)
  assert.equal(isRecurringNamedEventNight(ev(80, "2026-09-04 21:00:00", null)), false)
  assert.equal(
    isRecurringNamedEventNight(
      ev(621, "2026-09-04 21:00:00", 23, { product_kind: "weekly_cover" }),
      [23],
    ),
    false,
  )
  assert.equal(
    isRecurringNamedEventNight(ev(1, "2026-09-04 21:00:00", null, { is_recurring: true })),
    false,
    "legacy series TEMPLATE rows are not RC nights",
  )
})

test("Events-only hides WC; Weekly Cover-only hides green RC schedules", () => {
  const wc = program(23)
  const trivia = series(7, "Trivia Fridays")
  const both = {
    events: [ev(10, "2026-09-04 21:00:00", 7)],
    programs: [wc],
    programNights: [{ program: wc, nights: [night("2026-09-04", { event_id: 502 })] }],
    series: [trivia],
    wcSeriesIds: [23],
  }
  const eventsOnly = hostDashSections({
    ...both,
    today: TODAY,
    showEvents: true,
    showAccessNights: false,
    showAccessSchedules: false,
  })
  assert.ok(eventsOnly.upcoming.every((row) => row.kind === "event"))
  assert.ok(eventsOnly.schedules.every((row) => row.kind === "series"))

  const accessOnly = hostDashSections({
    ...both,
    today: TODAY,
    showEvents: false,
    showAccessNights: true,
    showAccessSchedules: true,
  })
  assert.ok(accessOnly.upcoming.every((row) => row.kind === "access" || row.kind === "access-event"))
  assert.ok(accessOnly.schedules.every((row) => row.kind !== "series"))
})

test("a stale next_night_date sorts the schedule row like an unstamped one", () => {
  // Same series-137 pattern as Home: the API's next_night_date stamp can be
  // yesterday. The schedule row must not sort (or read) as if that past date
  // were still its next night.
  const stale = program(23, { next_night_date: "2026-08-20" })
  const out = sections({ events: [], programs: [stale], wcSeriesIds: [23] })
  const row = out.schedules.find((r) => r.kind === "access")
  assert.ok(row, "the program still lists as a schedule")
  assert.equal(row!.sortKey, "", "a past next_night_date is not a sort stamp")
})

test("Events page uses the Host sections, not a flat night pile", () => {
  const page = readFileSync(join(process.cwd(), "src/app/business/(dashboard)/events/page.tsx"), "utf8")
  assert.ok(page.includes("hostDashSections"), "live list groups through hostDashSections")
  assert.ok(page.includes("HostDashList") || page.includes("HOST_DASH_TONIGHT"), "page renders the Host sections")
  assert.ok(page.includes("shouldUseHostDashLayout"), "Past/Drafts keep the existing list")
  assert.ok(page.includes("eventsListQueryTab"), "Recurring fetches upcoming nights, not tab=recurring")
  assert.ok(page.includes("recurringNightsOnly"), "Recurring chip drops standalone one-offs")
})

test("date separators are Sat Aug 29 / Thu Sep 3, not a comma stack", () => {
  assert.equal(fmtHostDateSeparator("2026-08-29"), "Sat Aug 29")
  assert.equal(fmtHostDateSeparator("2026-09-03"), "Thu Sep 3")
  assert.equal(fmtHostDateSeparator("2026-10-15"), "Thu Oct 15")
  const grouped = groupOccurrencesByDate([
    { date: "2026-08-29", key: "a" },
    { date: "2026-08-29", key: "b" },
    { date: "2026-09-03", key: "c" },
  ])
  assert.deepEqual(
    grouped.map((g) => ({ date: g.date, label: g.label, keys: g.rows.map((r) => r.key) })),
    [
      { date: "2026-08-29", label: "Sat Aug 29", keys: ["a", "b"] },
      { date: "2026-09-03", label: "Thu Sep 3", keys: ["c"] },
    ],
  )
})

test("section titles stay the Host product names", () => {
  assert.equal(HOST_DASH_TONIGHT, "Tonight")
  assert.equal(HOST_DASH_UPCOMING, "Upcoming events & WC")
  assert.equal(HOST_DASH_SCHEDULES, "Schedules")
  const list = readFileSync(
    join(process.cwd(), "src/components/business/v2/host/HostDashList.tsx"),
    "utf8",
  )
  assert.ok(list.includes("HOST_DASH_TONIGHT"))
  assert.ok(list.includes("HOST_DASH_UPCOMING"))
  assert.ok(list.includes("HOST_DASH_SCHEDULES"))
  assert.ok(list.includes("groupOccurrencesByDate"), "Tonight/Upcoming group cards under day headers")
  assert.ok(list.includes("OccurrenceDateGroups"), "date separators wrap occurrence cards only")
  assert.ok(
    !list.includes("groupOccurrencesByDate(sections.schedules"),
    "Schedules stay repeating setups, not day headers",
  )
  assert.ok(list.includes("AccessProgramRow"), "WC weekday templates stay AccessProgramRow")
  assert.ok(list.includes("AccessNightCard"), "WC nights render the night card")
  // Instance-manage pass (2026-08, supersedes #100's card Cancel): the list
  // card matches EventCard's anatomy — View + Manage, no Cancel, no Scan.
  // Cancel is unchanged as a flow; it lives inside manage / night / program.
  assert.ok(
    !list.includes("CancelEventModal"),
    "the list has no card-level cancel modal — cancel lives inside manage",
  )
  const nightCard = readFileSync(
    join(process.cwd(), "src/components/business/v2/host/AccessNightCard.tsx"),
    "utf8",
  )
  assert.ok(nightCard.includes('kind="access"'), "D12: WC night cards stay pink Weekly Cover")
  assert.ok(!nightCard.includes(">Cancel<"), "no Cancel button on WC/RC night cards")
  assert.ok(!nightCard.includes("weeklyCoverNightCancelEventId"), "card no longer wires the cancel path")
  assert.ok(nightCard.includes(">View<") || nightCard.includes("View\n"), "night cards offer View")
  assert.ok(nightCard.includes(">Manage<"), "night cards offer Manage")
  assert.ok(!nightCard.includes("ScanLine"), "no Scan on WC night cards — scan lives inside manage")
  assert.ok(nightCard.includes("/manage"), "the night card body opens the night's manage page")
  assert.ok(nightCard.includes("hostCustomChipTone"), "Custom chip stays on the Host voter")
})

test("R4: a detached WC leftover lists as exactly ONE pink card, chip off, even far out", () => {
  // Series delete detached this Custom-edited night: services NULLed its
  // series id and cleared the marker. It is a standalone one-off now — no
  // series window clips it, no Custom chip, one card.
  const leftover = ev(881, "2026-10-15 21:00:00", null, {
    name: "The Devil Dungeon Cover",
    product_kind: "weekly_cover",
    access_kind: "door_access",
    occurrence_date: "2026-10-15",
    series_customized_at: null,
  })
  const out = sections({
    programs: [],
    events: [leftover],
    series: [],
    wcSeriesIds: [],
    inactiveWcIds: [],
    windowDays: 14,
  })
  const rows = [...out.tonight, ...out.upcoming]
  assert.equal(rows.length, 1, "exactly one card — never a duplicate, never dropped")
  const row = rows[0]
  assert.equal(row.kind, "access-event", "the leftover stays a PINK access card")
  assert.equal(row.kind === "access-event" ? row.event.event_id : 0, 881)
  // Chip off is pinned in host-custom-night.test.ts (explicit-null detach).
})
