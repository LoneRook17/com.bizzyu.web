import test from "node:test"
import assert from "node:assert/strict"
import {
  EVENT_TYPE_FILTERS,
  MISSING_ROW_AGGREGATES,
  doorAccessGroupsFromEvents,
  eventAccessGroupsForPrograms,
  eventListHref,
  recoverProgramIdFromLookups,
  weeklyCoverSeriesIds,
  isWeeklyCoverSeriesRef,
  workingProgramIdForEventGroup,
  eventRowStats,
  fmtRowDate,
  groupEventRows,
  relativeDayLabel,
  seriesRowHref,
  seriesRowNumbers,
  parseEventTypeFilter,
  seriesHref,
  seriesRowStats,
  showsAccess,
  showsEvents,
} from "./events-list.ts"
import { WEEKLY_ACCESS_SECTION_LABEL } from "./weekly-cover-label.ts"
import type { EventListItem, RecurringSeriesListItem } from "./types.ts"

function ev(
  event_id: number,
  start: string,
  seriesId: number | null = null,
  extra: Partial<EventListItem> & { access_kind?: string | null } = {},
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

test("access filter uses the shared Weekly Cover label (renamed from Weekly Access)", () => {
  const access = EVENT_TYPE_FILTERS.find((t) => t.value === "access")
  assert.equal(access?.label, WEEKLY_ACCESS_SECTION_LABEL)
  assert.equal(access?.label, "Weekly Cover")
})

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

test("door_access nights are excluded from green Event/Series rows", () => {
  const rows = groupEventRows(
    [
      ev(1, "2026-09-01 21:00:00"),
      ev(24, "2026-09-02 21:00:00", 9, { name: "Weekly Cover", access_kind: "door_access" }),
      ev(26, "2026-09-09 21:00:00", 9, { name: "Weekly Cover", access_kind: "weekly_cover" }),
      ev(3, "2026-09-03 21:00:00", 7),
    ],
    [series(7, "Trivia Tuesdays"), series(9, "Weekly Cover")],
  )
  assert.deepEqual(rows.map((r) => r.key), ["event-1", "series-7"])
  assert.ok(rows.every((r) => r.kind !== "single" || r.event.access_kind !== "door_access"))
})

test("Weekly Cover nights group by recurring_series_id for the access segment", () => {
  const groups = doorAccessGroupsFromEvents([
    ev(24, "2026-09-02 21:00:00", 9, { name: "Weekly Cover", access_kind: "door_access" }),
    ev(1, "2026-09-01 21:00:00"),
    ev(26, "2026-09-09 21:00:00", 9, { name: "Weekly Cover", access_kind: "weekly_cover" }),
    ev(40, "2026-09-04 21:00:00", null, { name: "Orphan cover", access_kind: "door_access" }),
  ])
  assert.equal(groups.length, 1)
  assert.equal(groups[0].programId, 9)
  assert.equal(groups[0].events.length, 2)
  assert.equal(groups[0].name, "Weekly Cover")
})

test("stamped nights keep recurring_series_id even when the programs list omits it", () => {
  const nights = [
    ev(621, "2026-08-24 21:00:00", 23, {
      name: "Weekly Cover",
      venue_name: "The Dungeon",
      access_kind: "door_access",
    }),
  ]
  const groups = doorAccessGroupsFromEvents(nights)
  assert.equal(groups[0].programId, 23)
  assert.equal(
    workingProgramIdForEventGroup(groups[0], [
      {
        id: 88,
        name: "Weekly Cover",
        venue_name: "The Dungeon",
        next_night_date: "2026-08-24",
        date_range_start: "2026-08-01",
        date_range_end: null,
      },
    ]),
    23,
    "stamped nights keep recurring_series_id; do not rematch to another listed id",
  )
  assert.equal(workingProgramIdForEventGroup(groups[0], []), 23)
  assert.equal(
    workingProgramIdForEventGroup(groups[0], [
      {
        id: 88,
        name: "Other Cover",
        venue_name: "Another Bar",
        next_night_date: "2026-09-01",
        date_range_start: "2026-08-01",
        date_range_end: null,
      },
    ]),
    23,
    "list omit of series 23 still opens the series",
  )
  const fallback = eventAccessGroupsForPrograms(nights, [
    {
      id: 88,
      name: "Weekly Cover",
      venue_name: "The Dungeon",
      next_night_date: "2026-08-24",
      date_range_start: "2026-08-01",
      date_range_end: null,
    },
  ])
  assert.equal(fallback[0]?.programId, 23, "omitted series 23 still gets a Weekly Cover row")
  const emptyList = eventAccessGroupsForPrograms(nights, [])
  assert.equal(emptyList[0]?.programId, 23)
  assert.deepEqual(
    eventAccessGroupsForPrograms(nights, [
      {
        id: 23,
        name: "Weekly Cover",
        venue_name: "The Dungeon",
        next_night_date: "2026-08-24",
        date_range_start: "2026-08-01",
        date_range_end: null,
      },
    ]),
    [],
    "AccessProgramRow already owns the listed series",
  )
})

test("eventListHref uses series 23 and never a night event_id", () => {
  const night = ev(621, "2026-08-24 21:00:00", 23, {
    name: "Weekly Cover",
    venue_name: "The Dungeon",
    access_kind: "door_access",
  })
  const listed = [
    {
      id: 88,
      name: "Weekly Cover",
      venue_name: "The Dungeon",
      next_night_date: "2026-08-24",
      date_range_start: "2026-08-01",
      date_range_end: null,
    },
  ]
  assert.equal(eventListHref(night, listed), "/business/door-access/23")
  assert.equal(eventListHref(night, [{ ...listed[0], id: 23 }]), "/business/door-access/23")
  assert.equal(eventListHref(night, []), "/business/door-access/23")
  assert.equal(
    eventListHref(night, [
      {
        id: 99,
        name: "Other Cover",
        venue_name: "Another Bar",
        next_night_date: "2026-09-01",
        date_range_start: "2026-08-01",
        date_range_end: null,
      },
    ]),
    "/business/door-access/23",
    "never deep-link a night event_id or drop an omitted series",
  )
})

test("recoverProgramIdFromLookups surfaces series 23 and redirects night event_ids", () => {
  const dungeon = {
    id: 88,
    name: "Weekly Cover",
    venue_name: "The Dungeon",
    next_night_date: "2026-08-24",
    date_range_start: "2026-08-01",
    date_range_end: null,
  }
  const group = {
    programId: 23,
    name: "Weekly Cover",
    events: [
      ev(621, "2026-08-24 21:00:00", 23, {
        name: "Weekly Cover",
        venue_name: "The Dungeon",
        access_kind: "door_access",
      }),
    ],
  }
  assert.equal(
    recoverProgramIdFromLookups({
      pathId: 23,
      programs: [{ ...dungeon, id: 23 }],
      eventSeriesId: 23,
      eventGroup: group,
    }),
    23,
    "listed series that 404s is retried as the series, not treated as an event",
  )
  assert.equal(
    recoverProgramIdFromLookups({
      pathId: 621,
      programs: [dungeon],
      eventSeriesId: 23,
      eventGroup: { ...group, programId: 23 },
    }),
    23,
    "night event_id redirects to recurring_series_id",
  )
  assert.equal(
    recoverProgramIdFromLookups({
      pathId: 621,
      programs: [],
      eventSeriesId: 23,
      eventGroup: { ...group, programId: 23 },
    }),
    23,
  )
  assert.equal(
    recoverProgramIdFromLookups({
      pathId: 23,
      programs: [dungeon],
      eventSeriesId: null,
      eventGroup: group,
    }),
    23,
    "Events-list grouping surfaces series 23 even when the programs list omits it",
  )
  assert.equal(
    recoverProgramIdFromLookups({
      pathId: 23,
      programs: [],
      eventSeriesId: null,
      eventGroup: group,
    }),
    23,
    "empty list + series 23 from nights still surfaces the series",
  )
  assert.equal(
    recoverProgramIdFromLookups({
      pathId: 23,
      programs: [dungeon],
      eventSeriesId: null,
      eventGroup: null,
    }),
    null,
    "do not guess the only listed program",
  )
  assert.equal(
    recoverProgramIdFromLookups({
      pathId: 23,
      programs: [],
      eventSeriesId: null,
      eventGroup: null,
      ownedSeriesId: 23,
    }),
    23,
    "owning host GET recurring-series/23 recovers the series after door-access 404",
  )
  assert.equal(
    recoverProgramIdFromLookups({
      pathId: 23,
      programs: [dungeon],
      eventSeriesId: null,
      eventGroup: null,
      ownedSeriesId: 99,
    }),
    99,
    "owned series id is the recover target, not the only listed program",
  )
})

test("list hrefs door-access/23 when access_kind is still event", () => {
  const night = ev(621, "2026-08-24 21:00:00", 23, {
    name: "The Dungeon Weekly Cover (Escrow Test)",
    venue_name: "The Dungeon",
    access_kind: "event",
  })
  assert.equal(eventListHref(night, [], [23]), "/business/door-access/23")
  assert.equal(eventListHref(night, [], []), "/business/events/621")
  assert.deepEqual(weeklyCoverSeriesIds([], [{ id: 23, name: "The Dungeon Weekly Cover (Escrow Test)" }]), [23])
  assert.equal(isWeeklyCoverSeriesRef({ id: 7, name: "Trivia Tuesdays" }), false)
  assert.equal(isWeeklyCoverSeriesRef({ id: 9, program_kind: "door_access" }), true)

  const skipped = groupEventRows([night], [], [23])
  assert.equal(skipped.length, 0, "WC series 23 nights leave the green Events list")
  const groups = eventAccessGroupsForPrograms([night], [], [23])
  assert.equal(groups[0]?.programId, 23)
  assert.equal(eventListHref(groups[0]!.events[0] as typeof night, [], [23]), "/business/door-access/23")
})

test("Events list href for The Dungeon series 23 is the series, never a night event_id", () => {
  const night = ev(621, "2026-08-24 21:00:00", 23, {
    name: "The Dungeon Cover",
    venue_name: "The Dungeon",
    access_kind: "door_access",
  })
  assert.equal(eventListHref(night, []), "/business/door-access/23")
  assert.equal(
    recoverProgramIdFromLookups({
      pathId: 621,
      programs: [],
      eventSeriesId: 23,
      eventGroup: {
        programId: 23,
        name: "The Dungeon Cover",
        events: [night],
      },
    }),
    23,
  )
})

test("a dated Weekly Cover row opens the program, never event_id as the path segment", () => {
  const night = ev(24, "2026-09-02 21:00:00", 9, { access_kind: "door_access" })
  assert.equal(eventListHref(night), "/business/door-access/9")
  assert.equal(eventListHref(ev(1, "2026-09-01 21:00:00")), "/business/events/1")
  const leaked = groupEventRows(
    [ev(24, "2026-09-02 21:00:00", 9, { access_kind: "event" })],
    [series(9, "Weekly Cover")],
  )
  assert.equal(leaked[0].kind, "series")
  if (leaked[0].kind !== "series") return
  leaked[0].events[0].access_kind = "door_access"
  assert.equal(seriesRowHref(leaked[0]), "/business/door-access/9")
  assert.equal(
    seriesRowHref(leaked[0], [
      {
        id: 88,
        name: "Weekly Cover",
        venue_name: "The Bar",
        next_night_date: "2026-09-02",
        date_range_start: "2026-09-01",
        date_range_end: null,
      },
    ]),
    "/business/door-access/9",
  )
  assert.equal(seriesHref(leaked[0].seriesId), "/business/recurring/9")
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

// ── D2-C: the at-a-glance numbers ───────────────────────────────────────────

test("an event row leads with sold, revenue and when", () => {
  const now = new Date(2026, 8, 1, 12, 0, 0) // Sep 1 2026, midday local
  const stats = eventRowStats(
    ev(1, "2026-09-04 21:00:00", null, { ticket_sales_count: 1234, total_revenue: 8210.4 }),
    now,
  )
  assert.deepEqual(
    stats.map((s) => [s.label, s.value]),
    [["sold", "1,234"], ["revenue", "$8,210"], ["in 3 days", "Sep 4"]],
  )
})

test("checked-in only earns a cell once someone has actually checked in", () => {
  const now = new Date(2026, 8, 1)
  const upcoming = eventRowStats(ev(1, "2026-09-04 21:00:00"), now)
  // A zero next to two live numbers reads as "nobody is coming", not "the
  // doors haven't opened" — so it is absent, not zeroed.
  assert.ok(!upcoming.some((s) => s.label === "checked in"))

  const ran = eventRowStats(ev(1, "2026-08-29 21:00:00", null, { total_attendees: 210 }), now)
  assert.deepEqual(
    ran.find((s) => s.label === "checked in"),
    { label: "checked in", value: "210" },
  )
})

test("relative labels are whole calendar days, not rounded hours", () => {
  const now = new Date(2026, 8, 1, 9, 0, 0)
  // 11 PM tonight is TONIGHT, however many hours away it is.
  assert.equal(relativeDayLabel("2026-09-01 23:00:00", now), "tonight")
  assert.equal(relativeDayLabel("2026-09-02 01:00:00", now), "tomorrow")
  assert.equal(relativeDayLabel("2026-08-31 23:00:00", now), "yesterday")
  assert.equal(relativeDayLabel("2026-09-06 21:00:00", now), "in 5 days")
  assert.equal(relativeDayLabel("2026-08-20 21:00:00", now), "12 days ago")
  assert.equal(relativeDayLabel(null, now), "")
})

test("THE DAY-SHIFT TRAP: a date-only string is a calendar date, never UTC midnight", () => {
  // next_occurrence_date arrives as "YYYY-MM-DD". new Date() would make that
  // UTC midnight and render Friday's night as Thursday for every US viewer.
  const now = new Date(2026, 8, 1, 9, 0, 0)
  assert.equal(fmtRowDate("2026-09-04", now), "Sep 4")
  assert.equal(relativeDayLabel("2026-09-01", now), "tonight")
  // And the year shows only when it isn't this one.
  assert.equal(fmtRowDate("2027-01-02", now), "Jan 2, 2027")
})

test("a series whose nights are ALL on this page shows real series totals", () => {
  const rows = groupEventRows(
    [
      ev(1, "2026-09-01 21:00:00", 7, { ticket_sales_count: 10, total_revenue: 100 }),
      ev(2, "2026-09-08 21:00:00", 7, { ticket_sales_count: 5, total_revenue: 42.5 }),
    ],
    [series(7, "Trivia Tuesdays", { occurrence_count: 2, upcoming_count: 2 })],
  )
  assert.equal(rows[0].kind, "series")
  if (rows[0].kind !== "series") return
  const { stats, isWholeSeries } = seriesRowNumbers(rows[0], new Date(2026, 8, 1))
  assert.equal(isWholeSeries, true)
  // Unqualified labels, and no pending cell — the sums ARE the totals.
  assert.deepEqual(stats.map((s) => s.label), ["sold", "revenue", "tonight"])
  assert.ok(!stats.some((s) => s.pending))
})

test("a partial series LABELS its sums and stubs the total it cannot compute", () => {
  const rows = groupEventRows(
    [ev(1, "2026-09-01 21:00:00", 7, { ticket_sales_count: 10, total_revenue: 100 })],
    [series(7, "Trivia Tuesdays", { occurrence_count: 12, upcoming_count: 12 })],
  )
  assert.equal(rows[0].kind, "series")
  if (rows[0].kind !== "series") return
  const { stats, isWholeSeries } = seriesRowNumbers(rows[0], new Date(2026, 8, 1))
  assert.equal(isWholeSeries, false)
  // The sums say what they cover. Labelling a one-night sum "Revenue" on a
  // twelve-night series would be a wrong number on a money column.
  assert.equal(stats[0].label, "sold · 1 shown")
  assert.equal(stats[1].label, "revenue · 1 shown")
  const pending = stats.find((s) => s.pending)
  assert.ok(pending, "the whole-series total is stubbed, not silently omitted")
  assert.equal(pending?.value, "-", "a stub is a dash, never a zero")
  assert.match(pending?.hint ?? "", /12 nights/)
  assert.match(pending?.hint ?? "", /recurring-series/)
})

test("the missing aggregates are registered, not just commented", () => {
  assert.deepEqual(
    MISSING_ROW_AGGREGATES.map((g) => g.key),
    ["series_totals", "access_week_sold"],
  )
  for (const gap of MISSING_ROW_AGGREGATES) {
    assert.ok(gap.needs.length > 0, `${gap.key} must say what would fill it in`)
  }
})
