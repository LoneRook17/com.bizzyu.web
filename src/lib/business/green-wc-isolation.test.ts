// Green recurring vs Weekly Cover dash isolation + Custom freeze copy.
//
// Binding (Luke 2026-08-25): green recurring stays a green Event series;
// WC stays pink. Individual date edit is Custom. A later whole-series save
// must not change that Custom night. Never guess from titles.
//
// Done when these pins hold:
//   1. a green series id does not recover as door-access
//   2. WC rows do not open SeriesForm
//   3. EventCard Manage href matches View product

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import {
  doorAccessSeriesFromOwnedHydration,
  ownedSeriesRecoversAsDoorAccess,
  isWeeklyCoverSeriesPayload,
} from "./door-access.ts"
import {
  eventListHref,
  eventManageHref,
  greenRecurringSeriesOnly,
  GREEN_NIGHT_CUSTOM_COPY,
  isWeeklyCoverSeriesRef,
} from "./events-list.ts"
import { buildEventItems } from "./command-palette.ts"
import type { EventListItem } from "./types.ts"

function read(rel: string) {
  return readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8")
}

function ev(
  event_id: number,
  start: string,
  seriesId: number | null,
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

function productOf(href: string): "weekly_cover" | "event" | "other" {
  if (href.startsWith("/business/door-access/")) return "weekly_cover"
  if (href.startsWith("/business/events/")) return "event"
  return "other"
}

// ── 1. green series id does not recover as door-access ───────────────────────

test("a green Event series does not recover as door-access", () => {
  const trivia = {
    program_kind: "event",
    product_kind: "event",
    name: "Trivia Tuesdays",
  }
  assert.equal(isWeeklyCoverSeriesPayload(trivia), false)
  assert.equal(isWeeklyCoverSeriesRef({ id: 7, ...trivia }), false)
  assert.equal(
    ownedSeriesRecoversAsDoorAccess(trivia, [], 7),
    false,
    "program_kind=event and product_kind=event is Trivia Tuesdays, not a WC program",
  )
  assert.equal(
    ownedSeriesRecoversAsDoorAccess(
      { program_kind: "event", name: "Trivia Tuesdays" },
      [
        {
          product_kind: "event",
          access_kind: "event",
          recurring_series_id: 7,
        },
      ],
      7,
    ),
    false,
    "green nights on a green series are not a WC recover signal",
  )
  assert.equal(
    ownedSeriesRecoversAsDoorAccess(
      { program_kind: "event", name: "Weekly Cover Launch Party" },
      [],
      7,
    ),
    false,
    "never guess from the title",
  )
  assert.equal(
    doorAccessSeriesFromOwnedHydration({
      seriesId: 7,
      series: { name: "Trivia Tuesdays", program_kind: "event", product_kind: "event" },
      eventRows: [
        {
          event_id: 100,
          name: "Trivia Tuesdays",
          start_date_time: "2026-08-25 21:00:00",
          product_kind: "event",
          access_kind: "event",
          recurring_series_id: 7,
        },
      ],
      occurrences: [{ event_id: 100, occurrence_date: "2026-08-25" }],
    }),
    null,
    "hydrate must not turn Trivia Tuesdays into a pink program",
  )
  assert.equal(
    doorAccessSeriesFromOwnedHydration({
      seriesId: 7,
      series: { name: "Trivia Tuesdays", program_kind: "event" },
      eventRows: [],
      occurrences: [{ event_id: 100, occurrence_date: "2026-08-25" }],
    }),
    null,
    "an owned green series with nights but no WC stamp must not hydrate",
  )
})

test("series 23 still recovers when the wire says Weekly Cover", () => {
  assert.equal(
    ownedSeriesRecoversAsDoorAccess(
      { program_kind: "event", product_kind: "weekly_cover" },
      [],
      23,
    ),
    true,
    "product_kind=weekly_cover recovers even when program_kind is still event",
  )
  assert.equal(
    ownedSeriesRecoversAsDoorAccess(
      { program_kind: "event" },
      [{ product_kind: "weekly_cover", access_kind: "event", recurring_series_id: 23 }],
      23,
    ),
    true,
    "a WC-stamped night recovers the series when the series payload omitted product_kind",
  )
  assert.equal(
    doorAccessSeriesFromOwnedHydration({
      seriesId: 23,
      series: {
        name: "The Dungeon Weekly Cover (Escrow Test)",
        product_kind: "weekly_cover",
        program_kind: "event",
      },
      eventRows: [],
      occurrences: [],
    })?.program.id,
    23,
  )
})

test("recoverDoorAccessProgramId only sets ownedSeriesId for a WC series", () => {
  const src = read("./door-access.ts")
  assert.ok(src.includes("ownedSeriesRecoversAsDoorAccess"), "recover gates owned series on the WC stamp")
  assert.ok(src.includes("ownedSeriesRecoversAsDoorAccess(data.series, eventRows, id)"))
  assert.ok(src.includes("ownedSeriesRecoversAsDoorAccess("))
  assert.ok(
    src.includes("A green Event series is not hydrated") ||
      src.includes("A green Event series (Trivia Tuesdays) returns null"),
  )
})

// ── 2. WC rows do not open SeriesForm ────────────────────────────────────────

test("WC rows do not open SeriesForm", () => {
  const listed = greenRecurringSeriesOnly([
    { id: 7, name: "Trivia Tuesdays", program_kind: "event", product_kind: "event" },
    { id: 23, name: "The Dungeon Weekly Cover", program_kind: "event", product_kind: "weekly_cover" },
    { id: 9, name: "Cover", program_kind: "door_access" },
    { id: 11, name: "Weekly Cover Launch Party", product_kind: "event" },
  ])
  assert.deepEqual(
    listed.map((row) => row.id),
    [7, 11],
    "only green Event series stay on /business/recurring; titles are not a signal",
  )

  const listPage = read("../../app/business/(dashboard)/recurring/page.tsx")
  const detailPage = read("../../app/business/(dashboard)/recurring/[id]/page.tsx")
  const editPage = read("../../app/business/(dashboard)/recurring/[id]/edit/page.tsx")
  const form = read("../../components/business/v2/recurring/SeriesForm.tsx")

  assert.ok(listPage.includes("greenRecurringSeriesOnly"), "the Recurring list drops WC programs")
  assert.ok(detailPage.includes("isWeeklyCoverSeriesRef"), "the green detail page refuses WC")
  assert.ok(detailPage.includes("programHref"), "WC /recurring/:id goes to the pink program page")
  assert.ok(detailPage.includes("router.replace"), "WC detail redirects instead of rendering nights")
  assert.ok(editPage.includes("isWeeklyCoverSeriesRef"), "the green edit page refuses WC")
  assert.ok(editPage.includes("programEditHref"), "WC /recurring/:id/edit goes to the pink editor")
  assert.ok(
    editPage.indexOf("isWeeklyCoverSeriesRef") < editPage.indexOf("<SeriesForm"),
    "SeriesForm must not mount for a WC series",
  )
  assert.ok(form.includes("isWeeklyCoverSeriesRef"), "SeriesForm itself refuses a WC initialData")
  assert.ok(form.includes("programEditHref"), "SeriesForm sends WC to the pink editor")
})

// ── 3. Manage href matches View product ──────────────────────────────────────

test("EventCard Manage href matches View product", () => {
  const wcNight = ev(621, "2026-08-28 21:00:00", 23, {
    name: "The Dungeon Cover",
    product_kind: "weekly_cover",
    access_kind: "event",
  })
  const wcByAccess = ev(24, "2026-09-02 21:00:00", 9, { access_kind: "door_access" })
  const wcBySeriesList = ev(621, "2026-08-28 21:00:00", 23, {
    name: "The Dungeon Weekly Cover (Escrow Test)",
    access_kind: "event",
  })
  const greenNight = ev(100, "2026-08-25 21:00:00", 7, {
    name: "Trivia Tuesdays",
    product_kind: "event",
  })
  const oneOff = ev(1, "2026-09-01 21:00:00", null)

  assert.equal(productOf(eventListHref(wcNight)), "weekly_cover")
  assert.equal(productOf(eventManageHref(wcNight)), "weekly_cover")
  assert.equal(eventManageHref(wcNight), "/business/door-access/23/nights/2026-08-28")

  assert.equal(productOf(eventListHref(wcByAccess)), "weekly_cover")
  assert.equal(productOf(eventManageHref(wcByAccess)), "weekly_cover")

  assert.equal(eventListHref(wcBySeriesList, [], [23]), "/business/door-access/23")
  assert.equal(productOf(eventManageHref(wcBySeriesList, [], [23])), "weekly_cover")
  assert.notEqual(
    eventManageHref(wcBySeriesList, [], [23]),
    "/business/events/621/manage",
    "a pink series must not Manage through /events/:id/manage",
  )

  assert.equal(productOf(eventListHref(greenNight)), "event")
  assert.equal(productOf(eventManageHref(greenNight)), "event")
  assert.equal(eventManageHref(greenNight), "/business/events/100/manage")

  assert.equal(productOf(eventListHref(oneOff)), "event")
  assert.equal(productOf(eventManageHref(oneOff)), "event")
  assert.equal(eventManageHref(oneOff), "/business/events/1/manage")

  const card = read("../../components/business/v2/events/EventCard.tsx")
  assert.ok(card.includes("eventManageHref(event, programs, wcSeriesIds)"), "EventCard Manage uses the shared helper")
  assert.ok(card.includes("eventListHref(event, programs, wcSeriesIds)"), "EventCard View stays on eventListHref")
  assert.ok(card.includes("href={manageHref}"), "Manage follows the View product")
  assert.ok(!card.includes("href={`/business/events/${event.event_id}/manage`}"), "EventCard must not hardcode green Manage")
})

test("palette and Home do not open WC nights as green events", () => {
  const items = buildEventItems([
    {
      event_id: 621,
      name: "The Dungeon Cover",
      product_kind: "weekly_cover",
      recurring_series_id: 23,
      start_date_time: "2026-08-28 21:00:00",
    },
  ])
  assert.equal(items[0]?.href, "/business/door-access/23/nights/2026-08-28")

  const named = buildEventItems([{ event_id: 9, name: "Escrow Test", venue_name: "The Dungeon", status: "draft" }])
  assert.equal(named[0]?.href, "/business/events/9")

  const home = read("../../app/business/(dashboard)/page.tsx")
  assert.ok(home.includes("eventManageHref"), "Home attention Manage stays on the row's product")
  assert.ok(home.includes("isWeeklyCoverProduct"), "Home must not treat a WC night as the next green event")
  assert.ok(home.includes("eventListHref"), "Home upcoming green rows use the shared href")
})

test("Custom green night copy says this date only; a later series save will not change it", () => {
  assert.equal(
    GREEN_NIGHT_CUSTOM_COPY,
    "This night is Custom for this date only. A later series save will not change it.",
  )
  const banner = read("../../components/business/v2/recurring/SeriesNightBanner.tsx")
  const detail = read("../../app/business/(dashboard)/recurring/[id]/page.tsx")
  assert.ok(banner.includes("GREEN_NIGHT_CUSTOM_COPY"), "the green series-night banner uses the shared copy")
  assert.ok(banner.includes("A later series save will not change it"))
  assert.ok(detail.includes("GREEN_NIGHT_CUSTOM_COPY"))
  assert.ok(detail.includes("A later series save will not change it"))
})
