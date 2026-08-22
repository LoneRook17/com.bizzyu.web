// Public venue board merge: published one-offs + weekly nights.
// Runnable with the Node built-in test runner: `npm test`.

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  coalesceVenuePhotoUrl,
  eventIdSeeds,
  eventMatchesVenue,
  formatAccessPrice,
  formatNightChipLabel,
  groupWeeklyAccessNights,
  lookaheadIds,
  mergeVenueEvents,
  nightChipPrice,
  parseCheckoutTicketTiers,
  programTemplateTiers,
  resolveVenueEventImageUrl,
  shouldListOnVenuePage,
  toVenueEvent,
  VENUE_EVENT_LOOKAHEAD,
  weeklyAccessPriceLines,
  applySharedProgramPrices,
  eventFromPrice,
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
    tickets: [],
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
  assert.deepEqual(row.tickets, [])
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

const DUNGEON = {
  id: 990198,
  venuePhotoUrl: "https://cdn.example/dungeon.jpg",
  photo_url: null as string | null,
}

test("empty flyer falls back to venuePhotoUrl, then photo_url", () => {
  assert.equal(
    resolveVenueEventImageUrl({ flyer_image_url: null, venue_id: 990198 }, DUNGEON),
    "https://cdn.example/dungeon.jpg",
  )
  assert.equal(
    resolveVenueEventImageUrl({ flyer_image_url: "", venue_id: 990198 }, DUNGEON),
    "https://cdn.example/dungeon.jpg",
  )
  assert.equal(
    resolveVenueEventImageUrl(
      { flyer_image_url: null, venue_id: 990198 },
      { id: 990198, venuePhotoUrl: null, photo_url: "https://cdn.example/photo-url.jpg" },
    ),
    "https://cdn.example/photo-url.jpg",
  )
  assert.equal(
    coalesceVenuePhotoUrl({ venuePhotoUrl: null, photo_url: "https://cdn.example/photo-url.jpg" }),
    "https://cdn.example/photo-url.jpg",
  )
})

test("a program flyer wins over the venue photo", () => {
  assert.equal(
    resolveVenueEventImageUrl(
      { flyer_image_url: "https://cdn.example/cover.jpg", venue_id: 990198 },
      DUNGEON,
    ),
    "https://cdn.example/cover.jpg",
  )
})

test("no flyer and no venue photo stays empty so the icon tile can stand in", () => {
  assert.equal(
    resolveVenueEventImageUrl(
      { flyer_image_url: null, venue_id: 990198 },
      { id: 990198, venuePhotoUrl: null, photo_url: null },
    ),
    null,
  )
})

test("venue page says Weekly Access, has no em dash in the walk-up line, and wires the flyer fallback", () => {
  const src = join(process.cwd(), "src")
  const page = readFileSync(join(src, "app/venue/[venueId]/page.tsx"), "utf8")
  const client = readFileSync(join(src, "app/venue/[venueId]/VenuePageClient.tsx"), "utf8")
  assert.ok(client.includes("WEEKLY_ACCESS_SECTION_LABEL"), "section heading must use the Weekly Access label")
  assert.ok(!client.includes('title="Door Access"'), "section heading still says Door Access")
  assert.ok(client.includes("weekly access"), "badge must say weekly access")
  assert.ok(!client.includes("door access ${"), "badge still says door access")
  assert.ok(
    client.includes("Pay the cover before you go and walk up. Scan with any phone camera at the door."),
    "walk-up copy is missing or still uses an em dash",
  )
  assert.ok(!client.includes("walk up —"), "walk-up copy still has an em dash")
  assert.ok(client.includes("resolveVenueEventImageUrl"), "Weekly Access cards must resolve flyer then venue photo")
  assert.ok(
    page.includes("WEEKLY_ACCESS_SECTION_LABEL"),
    "fallback meta description must say weekly access, not door access",
  )
  assert.ok(!page.includes("door access"), "meta description still says door access")
})

function coverNight(eventId: number, start: string, extra: Partial<VenueEvent> = {}): VenueEvent {
  return event({
    event_id: eventId,
    name: "Weekly Cover",
    start_date_time: start,
    access_kind: "door_access",
    status: "draft",
    flyer_image_url: null,
    min_ticket_price: "5.00",
    ...extra,
  })
}

test("groupWeeklyAccessNights collapses same-name nights into one program", () => {
  const nights = [
    coverNight(621, "2026-08-24 21:00:00"),
    coverNight(623, "2026-08-26 21:00:00"),
    coverNight(625, "2026-08-28 21:00:00"),
  ]
  const groups = groupWeeklyAccessNights(nights)
  assert.equal(groups.length, 1)
  assert.deepEqual(
    groups[0].map((n) => n.event_id),
    [621, 623, 625],
  )
})

test("groupWeeklyAccessNights keeps separate series apart", () => {
  const groups = groupWeeklyAccessNights([
    coverNight(1, "2026-08-24 21:00:00", { recurring_series_id: 10 }),
    coverNight(2, "2026-08-25 21:00:00", { recurring_series_id: 11, name: "Late Cover" }),
    coverNight(3, "2026-08-26 21:00:00", { recurring_series_id: 10 }),
  ])
  assert.equal(groups.length, 2)
  assert.deepEqual(
    groups[0].map((n) => n.event_id),
    [1, 3],
  )
  assert.deepEqual(
    groups[1].map((n) => n.event_id),
    [2],
  )
})

test("night chips are weekday + day, never timezone-shifted", () => {
  assert.equal(formatNightChipLabel("2026-08-24 21:00:00"), "Mon 24")
  assert.equal(formatNightChipLabel("2026-08-26 21:00:00"), "Wed 26")
  assert.equal(formatNightChipLabel("2026-08-28 21:00:00"), "Fri 28")
})

test("night chip price uses that night's min cover, From when tiers", () => {
  assert.equal(nightChipPrice(coverNight(621, "2026-08-24 21:00:00")), "Cover $5")
  assert.equal(
    nightChipPrice(coverNight(623, "2026-08-26 21:00:00", { min_ticket_price: "10.00" })),
    "Cover $10",
  )
  assert.equal(
    nightChipPrice(
      coverNight(625, "2026-08-28 21:00:00", {
        min_ticket_price: null,
        tickets: [
          { name: "Cover", price_usd: 8 },
          { name: "Line skip", price_usd: 15 },
        ],
      }),
    ),
    "From $8",
  )
  assert.equal(
    nightChipPrice(coverNight(626, "2026-08-29 21:00:00", { min_ticket_price: null, tickets: [] })),
    "",
  )
})

test("a $5 cover night renders $5 on the chip when min_ticket_price is null", () => {
  assert.equal(
    nightChipPrice({
      min_ticket_price: null,
      tickets: [{ name: "Cover", price_usd: 5 }],
    }),
    "Cover $5",
  )
  assert.match(
    nightChipPrice({
      min_ticket_price: null,
      tickets: [{ name: "Cover", price_usd: 5 }],
    }),
    /\$5/,
  )
  assert.equal(
    nightChipPrice({ min_ticket_price: null, tickets: [] }, [{ name: "Cover", price_usd: 5 }]),
    "Cover $5",
  )
})

test("program template Cover fills nights that shipped with a null min price", () => {
  const nights = [
    coverNight(621, "2026-08-24 21:00:00", { min_ticket_price: null, tickets: [] }),
    coverNight(623, "2026-08-26 21:00:00", {
      min_ticket_price: null,
      tickets: [{ name: "Cover", price_usd: 5 }],
    }),
    coverNight(625, "2026-08-28 21:00:00", { min_ticket_price: null, tickets: [] }),
  ]
  const filled = applySharedProgramPrices(nights)
  assert.equal(nightChipPrice(filled[0], programTemplateTiers(filled)), "Cover $5")
  assert.equal(nightChipPrice(filled[2], programTemplateTiers(filled)), "Cover $5")
  assert.deepEqual(weeklyAccessPriceLines(filled), ["Cover $5"])
})

test("parseCheckoutTicketTiers reads Cover $5 off the Laravel checkout card", () => {
  const html = `
    <div class="ticket-card bg-surface rounded-2xl"
      data-ticket-id="670"
      data-price="5.00">
      <h4 class="font-bold text-white text-lg">Cover</h4>
      <p class="text-xl font-bold text-white">$5.00</p>
    </div>
  `
  assert.deepEqual(parseCheckoutTicketTiers(html), [{ name: "Cover", price_usd: 5 }])
})

test("Rumble / happening-today row is From $5 when we have a price", () => {
  assert.equal(eventFromPrice(event({ min_ticket_price: "5.00", tickets: [] })), "From $5")
  assert.equal(
    eventFromPrice({
      min_ticket_price: null,
      tickets: [{ name: "General Admission", price_usd: 5 }],
    }),
    "From $5",
  )
})

test("one tier or only a min price reads Cover $5; several tiers list names", () => {
  assert.equal(formatAccessPrice(5), "$5")
  assert.deepEqual(
    weeklyAccessPriceLines([coverNight(621, "2026-08-24 21:00:00")]),
    ["Cover $5"],
  )
  assert.deepEqual(
    weeklyAccessPriceLines([
      coverNight(621, "2026-08-24 21:00:00", {
        min_ticket_price: null,
        tickets: [
          { name: "Cover", price_usd: 5 },
          { name: "Line skip", price_usd: 15 },
        ],
      }),
    ]),
    ["Cover $5", "Line skip $15"],
  )
})

test("venue Weekly Access is one program card with night chips, not a picker", () => {
  const client = readFileSync(join(process.cwd(), "src/app/venue/[venueId]/VenuePageClient.tsx"), "utf8")
  assert.ok(client.includes("WeeklyAccessProgramCard"), "must render one program card")
  assert.ok(client.includes("groupWeeklyAccessNights"), "nights must group into programs")
  assert.ok(client.includes("formatNightChipLabel"), "upcoming nights are chips")
  assert.ok(client.includes("nightChipPrice"), "chips must show that night's price")
  assert.ok(client.includes("min-h-11"), "chips must be large tap targets")
  assert.ok(client.includes("text-[15px]"), "chip type must be 14-16px")
  assert.ok(!client.includes("rounded-full px-3.5 py-1.5"), "chips must not be tiny pills")
  assert.ok(client.includes("weeklyAccessPriceLines"), "card must show Cover or real tiers")
  assert.ok(client.includes("Get access"), "CTA stays Get access")
  assert.ok(client.includes("checkout/${selected.event_id}"), "Get access must checkout the selected night")
  assert.ok(!/<select[\s>]/.test(client), "do not ship a dropdown")
  assert.ok(!client.includes('type="date"'), "do not ship a calendar date input")
  assert.ok(!client.includes("<select"), "do not ship a dropdown")
})

test("happening today rows print From $5 and the header shows the full venue photo", () => {
  const client = readFileSync(join(process.cwd(), "src/app/venue/[venueId]/VenuePageClient.tsx"), "utf8")
  assert.ok(client.includes("eventFromPrice"), "Happening today / event rows must resolve From $5")
  const heroStart = client.indexOf("Header: full venue photo")
  const heroEnd = client.indexOf('className="mx-auto max-w-5xl px-5 pb-24"')
  assert.ok(heroStart >= 0 && heroEnd > heroStart, "venue header block must exist")
  const hero = client.slice(heroStart, heroEnd)
  assert.ok(hero.includes("aspect-[16/9]"), "header photo must be a wide contain frame")
  assert.ok(hero.includes("object-contain"), "full venue photo must show, not a cover crop")
  assert.ok(!hero.includes("object-cover"), "header must not crop the venue photo")
  assert.ok(!hero.includes("absolute inset-x-0 bottom-0"), "identity must not sit on top of the photo")
  assert.ok(hero.includes("Get tickets"), "Get tickets sits beside or below the photo")
  assert.ok(!hero.includes("—"), "header must not use an em dash")
  const page = readFileSync(join(process.cwd(), "src/app/venue/[venueId]/page.tsx"), "utf8")
  assert.ok(
    page.includes("CHECKOUT_BASE_URL"),
    "server fetch must pass the checkout base so draft Cover nights can resolve $5",
  )
})

test("venue event and Weekly Access flyers are full portrait frames, not wide crops", () => {
  const client = readFileSync(join(process.cwd(), "src/app/venue/[venueId]/VenuePageClient.tsx"), "utf8")
  assert.ok(client.includes("FlyerFrame"), "event and Weekly Access cards share a flyer frame")
  assert.ok(client.includes("aspect-[4/5]"), "flyer box must be a portrait rectangle")
  assert.ok(
    client.includes('className="h-full w-full object-contain"'),
    "full flyer must show, not a cover crop",
  )
  assert.ok(!client.includes("relative h-48 w-full"), "flyer box must not be a short wide strip")
  const frameStart = client.indexOf("function FlyerFrame")
  const frameEnd = client.indexOf("function DateChip")
  assert.ok(frameStart >= 0 && frameEnd > frameStart, "FlyerFrame must sit above DateChip")
  const frame = client.slice(frameStart, frameEnd)
  assert.ok(frame.includes("object-contain"), "FlyerFrame image must contain")
  assert.ok(!frame.includes("object-cover"), "FlyerFrame must not crop with object-cover")
})
