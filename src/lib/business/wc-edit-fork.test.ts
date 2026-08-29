// WC FLAW 3 — the restamp + generic-edit fork.
//
// A Weekly Cover night is a real events row, so every named-event surface
// (Edit event, Manage Tickets, the detail-page price pencil) can reach it.
// Those surfaces write PUT /business/events/:id and the event ticket writes,
// which stamp series_customized_at. One stamp and the program's
// weekday-global restamp skips the night forever; a mis-stamped first night
// then drops off the program feed with no way back.
//
// The fix is a routing fork, pinned here, per Luke's BINDING product decision:
//   - an individual WC night edit is Custom WC, on the WC/series path, and a
//     WC night is never treated as a green named Event;
//   - Custom is a later edit of one date. Changing the whole series does not
//     alter that Custom night. A night already stamped customized still
//     routes to the night editor (nightIsEditable), never a green Event.
//
// Identification is product_kind with the access_kind fallback, exactly PR
// #75's rule. The name is never a signal; looksLikeWeeklyCoverName stays dead.

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { weeklyCoverNightEditHref } from "./door-access.ts"
import { groupEventRows, doorAccessGroupsFromEvents } from "./events-list.ts"
import type { EventListItem } from "./types.ts"

function read(rel: string) {
  return readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8")
}

const HUB = "../../app/business/(dashboard)/events/[id]/manage/page.tsx"
const EDIT_PAGE = "../../app/business/(dashboard)/events/[id]/edit/page.tsx"
const TICKETS_PAGE = "../../app/business/(dashboard)/events/[id]/manage/tickets/page.tsx"
const DETAIL_PAGE = "../../app/business/(dashboard)/events/[id]/page.tsx"
const BANNER = "../../components/business/v2/recurring/SeriesNightBanner.tsx"
const NIGHT_PAGE = "../../app/business/(dashboard)/door-access/[id]/nights/[date]/page.tsx"
const WIZARD = "../../components/business/v2/door-access/DoorAccessWizard.tsx"

// ── the helper itself ────────────────────────────────────────────────────────

test("weeklyCoverNightEditHref sends an uncustomized WC night to the override editor", () => {
  assert.equal(
    weeklyCoverNightEditHref({
      product_kind: "weekly_cover",
      recurring_series_id: 23,
      occurrence_date: "2026-08-28",
    }),
    "/business/door-access/23/nights/2026-08-28",
  )
  // occurrence_date is authoritative; start_date_time's day is the fallback.
  assert.equal(
    weeklyCoverNightEditHref({
      product_kind: "weekly_cover",
      recurring_series_id: 23,
      start_date_time: "2026-08-28 21:00:00",
    }),
    "/business/door-access/23/nights/2026-08-28",
  )
  assert.equal(
    weeklyCoverNightEditHref({
      product_kind: "weekly_cover",
      recurring_series_id: "23",
      start_date_time: "2026-08-28T21:00:00.000Z",
    }),
    "/business/door-access/23/nights/2026-08-28",
    "string series ids and ISO datetimes still resolve",
  )
  // No readable date: the program page, never an invented night.
  assert.equal(
    weeklyCoverNightEditHref({ product_kind: "weekly_cover", recurring_series_id: 23 }),
    "/business/door-access/23",
  )
})

test("a night already stamped customized STILL routes to the night editor", () => {
  // BINDING: Custom WC, never a green Event. The series_customized_at stamp
  // does not reroute the night back onto the named-Event editors. Series
  // save leaves that Custom night alone.
  assert.equal(
    weeklyCoverNightEditHref({
      product_kind: "weekly_cover",
      recurring_series_id: 23,
      occurrence_date: "2026-08-28",
      series_customized_at: "2026-08-20 10:00:00",
    }),
    "/business/door-access/23/nights/2026-08-28",
  )
})

test("weeklyCoverNightEditHref leaves the generic surface in charge when it should", () => {
  // Named events are not rerouted.
  assert.equal(
    weeklyCoverNightEditHref({
      product_kind: "event",
      recurring_series_id: 9,
      occurrence_date: "2026-08-28",
    }),
    null,
  )
  // product_kind is authoritative over a stale access_kind (PR #75).
  assert.equal(
    weeklyCoverNightEditHref({
      product_kind: "event",
      access_kind: "door_access",
      recurring_series_id: 9,
      occurrence_date: "2026-08-28",
    }),
    null,
  )
  // No series id: nothing for the stamp to detach from.
  assert.equal(
    weeklyCoverNightEditHref({ product_kind: "weekly_cover", occurrence_date: "2026-08-28" }),
    null,
  )
})

test("weeklyCoverNightEditHref falls back to access_kind, never to the name", () => {
  assert.equal(
    weeklyCoverNightEditHref({
      access_kind: "door_access",
      recurring_series_id: 23,
      occurrence_date: "2026-08-28",
    }),
    "/business/door-access/23/nights/2026-08-28",
  )
  assert.equal(
    weeklyCoverNightEditHref({
      access_kind: "weekly_cover",
      recurring_series_id: 23,
      occurrence_date: "2026-08-28",
    }),
    "/business/door-access/23/nights/2026-08-28",
    "the Flutter alias reads as door_access",
  )
  // A show NAMED "Weekly Cover" whose wire says event stays on the event path.
  assert.equal(
    weeklyCoverNightEditHref({
      ...{ name: "Weekly Cover Launch Party" },
      access_kind: "event",
      recurring_series_id: 23,
      occurrence_date: "2026-08-28",
    }),
    null,
  )
})

// ── the surfaces that used to fall through to the generic PUT ───────────────

test("edit page redirects an uncustomized WC night instead of mounting EventForm", () => {
  const src = read(EDIT_PAGE)
  assert.ok(src.includes("weeklyCoverNightEditHref"), "the fork must use the shared helper")
  assert.ok(src.includes("router.replace(wcNightEdit)"), "WC nights leave before the form mounts")
  assert.ok(src.includes("<EventForm"), "named events keep the generic form")
  assert.ok(!src.includes("looksLikeWeeklyCoverName"), "the name-regex signal stays dead")
})

test("Manage Tickets page never mounts the event ticket writer for an uncustomized WC night", () => {
  const src = read(TICKETS_PAGE)
  assert.ok(src.includes("weeklyCoverNightEditHref"), "the fork must use the shared helper")
  assert.ok(src.includes("router.replace(wcNightEdit)"), "WC nights go to the night editor")
  assert.ok(src.includes("<ManageSalesTickets"), "named events keep the shared editor")
  assert.ok(
    src.indexOf("weeklyCoverNightEditHref") < src.indexOf("<ManageSalesTickets"),
    "the guard decides before the writer renders",
  )
})

test("manage hub setup tiles fork to the WC path for an uncustomized night", () => {
  const src = read(HUB)
  assert.ok(src.includes("weeklyCoverNightEditHref"), "the fork must use the shared helper")
  assert.ok(src.includes('title: "Edit night"'), "WC branch edits the night override")
  assert.ok(src.includes("programEditHref("), "weekday-global changes go to the program editor")
  assert.ok(src.includes('title: "Edit program"'), "WC branch names the program editor")
  // The generic branch survives for named events and customized nights.
  assert.ok(src.includes('title: "Edit event"'))
  assert.ok(src.includes('title: "Manage Tickets"'))
  assert.ok(src.includes("`/business/events/${id}/edit`"))
})

test("detail page routes WC price edits to the night editor, not the PATCH dialog", () => {
  const src = read(DETAIL_PAGE)
  assert.ok(src.includes("weeklyCoverNightEditHref"), "the fork must use the shared helper")
  assert.ok(src.includes("wcNightEdit != null"), "the pencil forks on the WC href")
  assert.ok(src.includes('title="Edit price on the night page"'), "the pencil says where it goes")
  assert.ok(src.includes("openPriceEdit"), "named events keep the inline price dialog")
})

test("series-night banner sends WC nights to the program, never /business/recurring", () => {
  const src = read(BANNER)
  assert.ok(src.includes("programIdFromOwnedEvent"), "WC detection is product_kind + fallback")
  assert.ok(src.includes("programHref(wcProgramId)"), "the WC series link is the program page")
  assert.ok(src.includes("weeklyCoverNightEditHref"), "WC nights link the night editor")
  assert.ok(src.includes("View the program"))
  // The named-series branch is untouched.
  assert.ok(src.includes("/business/recurring/${event.recurring_series_id}"))
})

test("the night editor edits a customized night instead of handing it back to the event page", () => {
  const src = read(NIGHT_PAGE)
  assert.ok(!src.includes("Change it on its event page"), "no event-page handoff for customized nights")
  assert.ok(src.includes("night.is_customized"), "the stamp is still surfaced to the host")
  assert.ok(src.includes("NIGHT_CUSTOMIZED_NOTICE"), "the customized notice says this date stays Custom")
  assert.ok(src.includes("NIGHT_CUSTOM_HELPER"), "copy says series/program save will not change this night")
  assert.ok(!src.includes("the rest keeps following the program"), "Custom nights do not pick up series changes")
  assert.ok(!src.includes("program-wide edits still apply"), "Custom nights do not pick up series changes")
  assert.ok(src.includes("nightIsEditable"), "cancelled / host-deleted series nights are read-only")
})

test("series-night banner does not tell hosts Custom nights pick up program edits", () => {
  const src = read(BANNER)
  assert.ok(src.includes("Changing the whole program will not"), "Custom nights stay as they are")
  assert.ok(!src.includes("program-wide edits still apply"), "old restamp copy is gone")
})

test("program create/edit sends the full weekday template and does not restamp Custom nights", () => {
  const src = read(WIZARD)
  assert.ok(src.includes("weeklyCoverCreateSalesMaps"), "weekday slots go out as weekday_edits")
  assert.ok(src.includes("weekday_edits"), "create always sends weekday_edits")
  assert.ok(src.includes("weekdayEditsFromNights"), "edit hydrates weekdays from served nights")
  assert.ok(src.includes("dateEditsToWire"), "create can still send game-day Custom dates")
  assert.ok(
    src.includes('useState<Record<string, NightDraft>>({})'),
    "edit does not hydrate Custom nights into date_edits",
  )
  assert.ok(
    src.includes("cannot send night-local Custom fields"),
    "program save must not restamp Custom nights from their own fields",
  )
})

// ── never a green named Event row ────────────────────────────────────────────

function wcNight(extra: Partial<EventListItem> = {}): EventListItem {
  return {
    event_id: 621,
    name: "The Dungeon Cover",
    description: "",
    venue_name: "The Dungeon",
    venue_address: "",
    start_date_time: "2026-08-28 21:00:00",
    end_date_time: "2026-08-29 02:00:00",
    type: "Ticketed",
    status: "published",
    is_21_plus: false,
    flyer_image_url: "",
    is_recurring: false,
    recurring_series_id: 23,
    total_attendees: 0,
    total_revenue: 0,
    ticket_sales_count: 0,
    checkin_rate: 0,
    ...extra,
  } as EventListItem
}

test("a product_kind night never renders as a green Event row, even with stale access_kind", () => {
  const night = wcNight({ product_kind: "weekly_cover", access_kind: "event" })
  // Neither lookup list knows the series — the exact leak: before this fork
  // the night rendered as a green EventCard whose Manage led to the generic
  // editors.
  assert.deepEqual(groupEventRows([night], [], []), [])
  // It is not lost: the same helper groups it for the pink Weekly Cover rows.
  const groups = doorAccessGroupsFromEvents([night], [])
  assert.equal(groups.length, 1)
  assert.equal(groups[0].programId, 23)
})

test("a WC-stamped row with NO series id stays green — there is no program to open", () => {
  const orphan = wcNight({ product_kind: "weekly_cover", access_kind: "event", recurring_series_id: null })
  const rows = groupEventRows([orphan], [], [])
  assert.equal(rows.length, 1)
  assert.equal(rows[0].kind, "single")
})

test("no touched surface resurrects the Weekly Cover name regex", () => {
  for (const rel of [HUB, EDIT_PAGE, TICKETS_PAGE, DETAIL_PAGE, BANNER, NIGHT_PAGE, WIZARD]) {
    const src = read(rel)
    assert.ok(!src.includes("looksLikeWeeklyCoverName"), `${rel} must not use the name signal`)
    assert.ok(!/weekly\\s\*cover/i.test(src), `${rel} must not inline a name regex`)
  }
})
