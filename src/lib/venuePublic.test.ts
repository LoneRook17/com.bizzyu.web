// Public venue board merge: published one-offs + weekly nights.
// Runnable with the Node built-in test runner: `npm test`.

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  eventIdSeeds,
  eventMatchesVenue,
  lookaheadIds,
  mergeVenueEvents,
  shouldListOnVenuePage,
  toVenueEvent,
  VENUE_EVENT_LOOKAHEAD,
  type VenueEvent,
} from "./venuePublic.ts"

function event(extra: Partial<VenueEvent> = {}): VenueEvent {
  return {
    event_id: 620,
    name: "Rumble",
    start_date_time: "2026-08-22 15:55:00",
    end_date_time: "2026-08-23 14:55:00",
    venue_name: "The Dungeon",
    flyer_image_url: "https://example.com/rumble.jpg",
    min_ticket_price: "5.00",
    access_kind: "event",
    status: "published",
    venue_id: 990198,
    ...extra,
  }
}

test("eventMatchesVenue compares numeric ids, including string venue_id", () => {
  assert.equal(eventMatchesVenue({ venue_id: 990198 }, "990198"), true)
  assert.equal(eventMatchesVenue({ venue_id: "990198" }, 990198), true)
  assert.equal(eventMatchesVenue({ venue_id: 990155 }, "990198"), false)
  assert.equal(eventMatchesVenue({ venue_id: null }, "990198"), false)
})

test("toVenueEvent maps /ui/events lowest_price onto min_ticket_price", () => {
  const row = toVenueEvent({
    event_id: 621,
    name: "Weekly Cover",
    start_date_time: "2026-08-24 21:00:00",
    end_date_time: "2026-08-25 02:00:00",
    venue_name: "The Dungeon",
    flyer_image_url: null,
    lowest_price: "10.00",
    access_kind: "door_access",
    status: "draft",
    venue_id: 990198,
  })
  assert.ok(row)
  assert.equal(row.min_ticket_price, "10.00")
  assert.equal(row.access_kind, "door_access")
  assert.equal(row.status, "draft")
})

test("toVenueEvent drops a row with no id or name", () => {
  assert.equal(toVenueEvent({ name: "Nope" }), null)
  assert.equal(toVenueEvent({ event_id: 1 }), null)
})

test("shouldListOnVenuePage keeps published one-offs and draft door-access nights", () => {
  assert.equal(shouldListOnVenuePage(event()), true)
  assert.equal(
    shouldListOnVenuePage(
      event({
        event_id: 621,
        name: "Weekly Cover",
        access_kind: "door_access",
        status: "draft",
        flyer_image_url: null,
      }),
    ),
    true,
  )
  assert.equal(
    shouldListOnVenuePage(event({ event_id: 618, name: "Paid Event", status: "draft" })),
    false,
  )
  // Venue-endpoint rows often omit status. Those stay.
  assert.equal(shouldListOnVenuePage(event({ status: null })), true)
})

test("mergeVenueEvents dedupes by id, keeps door-access, sorts by start", () => {
  const rumble = event()
  const cover = event({
    event_id: 621,
    name: "Weekly Cover",
    start_date_time: "2026-08-24 21:00:00",
    access_kind: "door_access",
    status: "draft",
    flyer_image_url: null,
    min_ticket_price: null,
  })
  const draftOneOff = event({ event_id: 618, name: "Paid Event", status: "draft" })
  const merged = mergeVenueEvents([rumble], [cover, rumble, draftOneOff])
  assert.deepEqual(
    merged.map((e) => e.event_id),
    [620, 621],
  )
  assert.equal(merged[1].name, "Weekly Cover")
})

test("lookaheadIds walks forward from the newest known event id", () => {
  assert.equal(VENUE_EVENT_LOOKAHEAD, 20)
  assert.deepEqual(lookaheadIds(620, 3), [621, 622, 623])
  assert.deepEqual(lookaheadIds(0, 3), [])
  assert.deepEqual(eventIdSeeds([event(), event({ event_id: 621 })]), [620, 621])
})

test("the venue page loads through fetchVenuePublicData, not the venue list alone", () => {
  const src = join(process.cwd(), "src")
  const page = readFileSync(join(src, "app/venue/[venueId]/page.tsx"), "utf8")
  const client = readFileSync(join(src, "app/venue/[venueId]/VenuePageClient.tsx"), "utf8")
  const lib = readFileSync(join(src, "lib/venuePublic.ts"), "utf8")
  assert.match(page, /fetchVenuePublicData/)
  assert.match(client, /fetchVenuePublicData/)
  assert.match(lib, /\/ui\/venues\/venue\//)
  assert.match(lib, /\/ui\/events/)
  assert.ok(
    !/fetch\(`\$\{API_URL\}\/ui\/venues\/venue/.test(page),
    "page.tsx still fetches the venue endpoint inline; it must go through fetchVenuePublicData",
  )
})
