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
  fetchVenuePublicData,
  formatAccessPrice,
  formatNightChipLabel,
  groupWeeklyAccessNights,
  isCoverOnlyFallback,
  lookaheadIds,
  mergeVenueEvents,
  needsWeeklyAccessTierEnrichment,
  nightChipPrice,
  parseCheckoutTicketTiers,
  parseTierPriceUsd,
  parseTicketId,
  parseVenueAccessTiers,
  programTemplateTiers,
  resolveVenueEventImageUrl,
  shouldListOnVenuePage,
  toVenueEvent,
  VENUE_CHECKOUT_TICKET_PARAM,
  VENUE_CHECKOUT_TIERS_PATH,
  VENUE_EVENT_LOOKAHEAD,
  venueCheckoutTiersUrl,
  venueNightCheckoutHref,
  weeklyCoverCheckoutPath,
  nightsForCoverSeed,
  weeklyAccessPriceLines,
  applySharedProgramPrices,
  eventFromPrice,
  resolveNightTiers,
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

test("toVenueEvent aliases weekly_cover to door_access like Flutter readAccessKind", () => {
  const row = toVenueEvent({
    event_id: 621,
    name: "Weekly Cover",
    access_kind: "weekly_cover",
    status: "draft",
  })
  assert.ok(row)
  assert.equal(row.access_kind, "door_access")
  assert.equal(shouldListOnVenuePage(row), true)
})

test("toVenueEvent treats a Weekly Cover name as pink door_access when access_kind is event", () => {
  const row = toVenueEvent({
    event_id: 621,
    name: "The Dungeon Weekly Cover (Escrow Test)",
    access_kind: "event",
    status: "draft",
  })
  assert.ok(row)
  assert.equal(row.access_kind, "door_access")
  assert.equal(shouldListOnVenuePage(row), true)
  const namedEvent = toVenueEvent({
    event_id: 1,
    name: "Rumble",
    access_kind: "event",
    status: "draft",
  })
  assert.equal(namedEvent?.access_kind, "event")
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

test("toVenueEvent maps a Cover tier from tickets / tiers when min_ticket_price is null", () => {
  const fromTiers = toVenueEvent({
    event_id: 621,
    name: "Weekly Cover",
    access_kind: "door_access",
    min_ticket_price: null,
    tiers: [{ name: "Cover", price_usd: 5 }],
  })
  assert.deepEqual(fromTiers?.tickets, [{ name: "Cover", price_usd: 5 }])
  assert.equal(nightChipPrice(fromTiers!), "Cover $5")
  const withIds = toVenueEvent({
    event_id: 621,
    name: "Weekly Cover",
    access_kind: "door_access",
    tickets: [
      { ticket_id: 678, name: "Cover", price_usd: 5 },
      { ticket_id: 679, name: "Skip the Line", price_usd: 10 },
    ],
  })
  assert.deepEqual(withIds?.tickets, [
    { name: "Cover", price_usd: 5, ticket_id: 678 },
    { name: "Skip the Line", price_usd: 10, ticket_id: 679 },
  ])
})

test("toVenueEvent keeps amount / price_cents / lowest_price_usd when min_ticket_price is absent", () => {
  const fromUsd = toVenueEvent({
    event_id: 621,
    name: "Weekly Cover",
    lowest_price_usd: 5,
    access_kind: "door_access",
  })
  assert.equal(fromUsd?.min_ticket_price, 5)
  const fromCents = toVenueEvent({
    event_id: 622,
    name: "Weekly Cover",
    price_cents: 500,
    access_kind: "door_access",
  })
  assert.equal(fromCents?.min_ticket_price, 5)
  const fromAmount = toVenueEvent({
    event_id: 623,
    name: "Weekly Cover",
    amount: "5.00",
    access_kind: "door_access",
  })
  assert.equal(fromAmount?.min_ticket_price, "5.00")
})

test("parseVenueAccessTiers reads price, amount, and price_cents", () => {
  assert.equal(parseTierPriceUsd({ name: "Cover", price_usd: 5 }), 5)
  assert.equal(parseTierPriceUsd({ name: "Cover", amount: "5.00" }), 5)
  assert.equal(parseTierPriceUsd({ name: "Cover", price_cents: 500 }), 5)
  assert.deepEqual(parseVenueAccessTiers([{ name: "Cover", amount: 5 }]), [
    { name: "Cover", price_usd: 5 },
  ])
  assert.deepEqual(parseVenueAccessTiers([{ name: "Cover", price_cents: 500 }]), [
    { name: "Cover", price_usd: 5 },
  ])
})

test("parseVenueAccessTiers keeps tickets.id from ticket_id, ticketId, or id", () => {
  assert.equal(parseTicketId({ ticket_id: 678 }), 678)
  assert.equal(parseTicketId({ ticketId: "679" }), 679)
  assert.equal(parseTicketId({ id: 682 }), 682)
  assert.equal(parseTicketId({ ticket_id: 0 }), undefined)
  assert.deepEqual(
    parseVenueAccessTiers([
      { ticket_id: 678, name: "Cover", price_usd: 5 },
      { id: 679, name: "Skip the Line", price: 10 },
    ]),
    [
      { name: "Cover", price_usd: 5, ticket_id: 678 },
      { name: "Skip the Line", price_usd: 10, ticket_id: 679 },
    ],
  )
})

test("venueNightCheckoutHref uses ?ticket_id= and omits it when there is no id", () => {
  assert.equal(VENUE_CHECKOUT_TICKET_PARAM, "ticket_id")
  assert.equal(
    venueNightCheckoutHref("https://dev.bizzy-deals.com", 621, 678),
    "https://dev.bizzy-deals.com/checkout/621?ticket_id=678",
  )
  assert.equal(
    venueNightCheckoutHref("https://dev.bizzy-deals.com/", 621),
    "https://dev.bizzy-deals.com/checkout/621",
  )
  assert.equal(
    venueNightCheckoutHref("https://dev.bizzy-deals.com", 621, null),
    "https://dev.bizzy-deals.com/checkout/621",
  )
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

test("venue page copies the in-app venue board, not event-checkout chrome", () => {
  const src = join(process.cwd(), "src")
  const page = readFileSync(join(src, "app/venue/[venueId]/page.tsx"), "utf8")
  const client = readFileSync(join(src, "app/venue/[venueId]/VenuePageClient.tsx"), "utf8")
  assert.ok(client.includes("WEEKLY_ACCESS_TYPE_LABEL"), "row chip must use the Weekly Cover label")
  assert.ok(!client.includes('title="Door Access"'), "section heading still says Door Access")
  assert.ok(!client.includes("weekly access"), "badge must not say weekly access")
  assert.ok(!client.includes("door access ${"), "badge still says door access")
  assert.ok(
    !client.includes("Scan with any phone camera at the door."),
    "venue page must not show the door scan note under the description",
  )
  assert.ok(client.includes("resolveVenueEventImageUrl"), "rows must resolve flyer then venue photo")
  assert.ok(client.includes("aspect-square"), "hero is the in-app 1:1 venue photo")
  assert.ok(client.includes("Happening Tonight"), "today's group uses the tonight label")
  assert.ok(client.includes("UpcomingRow"), "nights render as compact in-app rows")
  assert.ok(!client.includes("flyer-glow"), "venue board is not event-checkout chrome")
  assert.ok(!client.includes("EVENT_FILL"), "venue board is not event-checkout chrome")
  assert.ok(!client.includes("lg:grid-cols-5"), "venue board is not the event-checkout 2/5 + 3/5 grid")
  assert.ok(!client.includes("pricedCtaLabel"), "top-level venue CTAs must not include prices")
  assert.ok(!client.includes("business.logo_image_url"), "venue page must not show the business logo")
  assert.ok(
    page.includes("WEEKLY_ACCESS_SECTION_LABEL"),
    "fallback meta description must use the Weekly Cover label, not door access",
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

test("applySharedProgramPrices copies Cover names but not another night's ticket_id", () => {
  const nights = [
    coverNight(621, "2026-08-24 21:00:00", {
      min_ticket_price: null,
      tickets: [],
    }),
    coverNight(623, "2026-08-26 21:00:00", {
      min_ticket_price: null,
      tickets: [
        { name: "Cover", price_usd: 5, ticket_id: 678 },
        { name: "Skip the Line", price_usd: 10, ticket_id: 679 },
      ],
    }),
  ]
  const filled = applySharedProgramPrices(nights)
  assert.deepEqual(filled[0].tickets, [
    { name: "Cover", price_usd: 5 },
    { name: "Skip the Line", price_usd: 10 },
  ])
  assert.equal(filled[0].tickets[0].ticket_id, undefined)
  assert.equal(filled[0].tickets[1].ticket_id, undefined)
  assert.equal(filled[1].tickets[0].ticket_id, 678)
  assert.equal(filled[1].tickets[1].ticket_id, 679)
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
  assert.deepEqual(parseCheckoutTicketTiers(html), [
    { name: "Cover", price_usd: 5, ticket_id: 670 },
  ])
})

test("parseCheckoutTicketTiers reads a distant General Admission h4 after data-price", () => {
  const pad = "x".repeat(1100)
  const html = `
    <div class="ticket-card bg-surface rounded-2xl"
         data-ticket-id="669"
         data-price="5.00">
      <div>${pad}</div>
      <h4 class="font-bold text-white text-lg">General Admission</h4>
    </div>
  `
  assert.deepEqual(parseCheckoutTicketTiers(html), [
    { name: "General Admission", price_usd: 5, ticket_id: 669 },
  ])
})

test("parseCheckoutTicketTiers ignores CSS .ticket-card rules and still finds Cover $5", () => {
  const html = `
    .ticket-card { transition: border-color 0.2s ease; }
    .ticket-card:hover { border-color: rgba(255, 62, 209, 0.5); }
    <div class="ticket-card bg-surface rounded-2xl border border-border p-5 cursor-pointer"
         data-ticket-id="670"
         data-price="5.00"
         data-fee-flat="0">
      <h4 class="font-bold text-white text-lg">Cover</h4>
      <p class="text-xl font-bold text-white">$5.00</p>
    </div>
    <h4 class="text-sm font-semibold text-gray-400 mb-3">Order Summary</h4>
  `
  assert.deepEqual(parseCheckoutTicketTiers(html), [
    { name: "Cover", price_usd: 5, ticket_id: 670 },
  ])
})

test("parseCheckoutTicketTiers keeps both Cover and Skip the Line ticket ids", () => {
  const html = `
    <div class="ticket-card bg-surface rounded-2xl"
      data-ticket-id="678"
      data-price="5.00">
      <h4 class="font-bold text-white text-lg">Cover</h4>
    </div>
    <div class="ticket-card bg-surface rounded-2xl"
      data-ticket-id="679"
      data-price="10.00">
      <h4 class="font-bold text-white text-lg">Skip the Line</h4>
    </div>
  `
  assert.deepEqual(parseCheckoutTicketTiers(html), [
    { name: "Cover", price_usd: 5, ticket_id: 678 },
    { name: "Skip the Line", price_usd: 10, ticket_id: 679 },
  ])
})

test("venue checkout tiers path is the same-origin Cover $5 reader", () => {
  assert.equal(VENUE_CHECKOUT_TIERS_PATH, "/api/venue-checkout-tiers")
  assert.equal(venueCheckoutTiersUrl(621), "/api/venue-checkout-tiers/621")
  const lib = readFileSync(join(process.cwd(), "src/lib/venuePublic.ts"), "utf8")
  const route = readFileSync(
    join(process.cwd(), "src/app/api/venue-checkout-tiers/[id]/route.ts"),
    "utf8",
  )
  assert.ok(lib.includes("venueCheckoutTiersUrl"), "browser poll must hit the same-origin tiers route")
  assert.ok(lib.includes("fetchCheckoutTicketTiers"), "draft nights must read checkout HTML or the proxy")
  assert.ok(lib.includes("needsWeeklyAccessTierEnrichment"), "a 1-item Cover list must still hydrate from checkout")
  assert.ok(lib.includes("tickets.length < 2"), "do not treat a 1-ticket night as complete")
  assert.ok(route.includes("parseCheckoutTicketTiers"), "API route must parse Laravel checkout HTML")
  assert.ok(route.includes("/checkout/"), "API route must fetch the night checkout page")
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
  assert.deepEqual(
    weeklyAccessPriceLines([
      coverNight(621, "2026-08-24 21:00:00", {
        min_ticket_price: null,
        tickets: [
          { name: "Cover", price_usd: 5, ticket_id: 678 },
          { name: "Skip the Line", price_usd: 10, ticket_id: 679 },
        ],
      }),
    ]),
    ["Cover $5", "Skip the Line $10"],
  )
})

const DUNGEON_TWO_TIERS = [
  { name: "Cover", price_usd: 5, ticket_id: 678 },
  { name: "Skip the Line", price_usd: 10, ticket_id: 679 },
] as const

test("min_ticket_price does not collapse Cover + Skip the Line to Cover-only", () => {
  const fri28 = coverNight(625, "2026-08-28 21:00:00", {
    min_ticket_price: "5.00",
    tickets: [],
    template_tickets: [...DUNGEON_TWO_TIERS],
  })
  assert.deepEqual(resolveNightTiers(fri28), [...DUNGEON_TWO_TIERS])
  assert.equal(nightChipPrice(fri28), "From $5")
  assert.deepEqual(weeklyAccessPriceLines([fri28]), ["Cover $5", "Skip the Line $10"])

  const fromProgram = coverNight(625, "2026-08-28 21:00:00", {
    min_ticket_price: "5.00",
    tickets: [],
  })
  assert.deepEqual(resolveNightTiers(fromProgram, [...DUNGEON_TWO_TIERS]), [...DUNGEON_TWO_TIERS])
  assert.equal(nightChipPrice(fromProgram, [...DUNGEON_TWO_TIERS]), "From $5")
  assert.deepEqual(
    weeklyAccessPriceLines([fromProgram], [...DUNGEON_TWO_TIERS]),
    ["Cover $5", "Skip the Line $10"],
  )

  const coverOnly = coverNight(621, "2026-08-24 21:00:00")
  assert.deepEqual(resolveNightTiers(coverOnly), [{ name: "Cover", price_usd: 5 }])
  assert.equal(nightChipPrice(coverOnly), "Cover $5")

  const oneCoverFromApi = coverNight(621, "2026-08-24 21:00:00", {
    min_ticket_price: "5.00",
    tickets: [{ name: "Cover", price_usd: 5 }],
  })
  assert.deepEqual(resolveNightTiers(oneCoverFromApi, [...DUNGEON_TWO_TIERS]), [...DUNGEON_TWO_TIERS])
  assert.equal(nightChipPrice(oneCoverFromApi, [...DUNGEON_TWO_TIERS]), "From $5")
  assert.deepEqual(weeklyAccessPriceLines([oneCoverFromApi], [...DUNGEON_TWO_TIERS]), [
    "Cover $5",
    "Skip the Line $10",
  ])
})

test("a 1-item Cover list is an incomplete Weekly Cover fallback", () => {
  assert.equal(isCoverOnlyFallback([{ name: "Cover", price_usd: 5 }]), true)
  assert.equal(isCoverOnlyFallback([{ name: "Cover", price_usd: 5, ticket_id: 678 }]), true)
  assert.equal(isCoverOnlyFallback([...DUNGEON_TWO_TIERS]), false)
  assert.equal(
    needsWeeklyAccessTierEnrichment(
      coverNight(621, "2026-08-24 21:00:00", {
        tickets: [{ name: "Cover", price_usd: 5 }],
      }),
    ),
    true,
  )
  assert.equal(
    needsWeeklyAccessTierEnrichment(
      coverNight(621, "2026-08-24 21:00:00", {
        min_ticket_price: "5.00",
        tickets: [],
      }),
    ),
    true,
  )
  assert.equal(
    needsWeeklyAccessTierEnrichment(
      coverNight(625, "2026-08-28 21:00:00", {
        tickets: [...DUNGEON_TWO_TIERS],
      }),
    ),
    false,
  )
  assert.equal(
    needsWeeklyAccessTierEnrichment(
      event({
        tickets: [{ name: "General Admission", price_usd: 5 }],
      }),
    ),
    false,
  )
})

test("mergeVenueEvents keeps Cover + Skip the Line over a single Cover with an id", () => {
  const oneCover = coverNight(621, "2026-08-24 21:00:00", {
    tickets: [{ name: "Cover", price_usd: 5, ticket_id: 678 }],
  })
  const twoTiers = coverNight(621, "2026-08-24 21:00:00", {
    tickets: [...DUNGEON_TWO_TIERS],
  })
  assert.deepEqual(mergeVenueEvents([oneCover], [twoTiers])[0].tickets, [...DUNGEON_TWO_TIERS])
  assert.deepEqual(mergeVenueEvents([twoTiers], [oneCover])[0].tickets, [...DUNGEON_TWO_TIERS])
})

test("Fri 28 date chip is From $5 when the program has Cover and Skip the Line", () => {
  const nights = [
    coverNight(621, "2026-08-24 21:00:00"),
    coverNight(623, "2026-08-26 21:00:00"),
    coverNight(625, "2026-08-28 21:00:00", {
      min_ticket_price: "5.00",
      tickets: [...DUNGEON_TWO_TIERS],
    }),
  ]
  const template = programTemplateTiers(nights)
  assert.equal(formatNightChipLabel(nights[2].start_date_time), "Fri 28")
  assert.equal(nightChipPrice(nights[2], template), "From $5")
  assert.deepEqual(weeklyAccessPriceLines([nights[2]], template), [
    "Cover $5",
    "Skip the Line $10",
  ])
  assert.equal(nightChipPrice(nights[0], template), "From $5")
})

test("venue nights: named events checkout, Weekly Cover opens the series page", () => {
  const client = readFileSync(join(process.cwd(), "src/app/venue/[venueId]/VenuePageClient.tsx"), "utf8")
  assert.ok(client.includes("UpcomingRow"), "must render compact in-app night rows")
  assert.ok(client.includes("venueNightCheckoutHref"), "named events share the checkout href helper")
  assert.ok(
    client.includes("venueNightCheckoutHref(checkoutBaseUrl, event.event_id)"),
    "a named-event row must checkout that night without forcing a ticket_id",
  )
  assert.ok(client.includes("weeklyCoverCheckoutPath"), "Weekly Cover rows open the series page")
  assert.ok(
    client.includes("weeklyCoverCheckoutPath(event.event_id)"),
    "a Weekly Cover row must open /cover/:eventId, not Laravel checkout",
  )
  assert.ok(!client.includes("WeeklyAccessProgramCard"), "venue does not use a program card")
  assert.ok(!client.includes("Get access"), "venue page must not use the legacy Get access label")
  assert.ok(!/<select[\s>]/.test(client), "do not ship a dropdown")
  assert.ok(!client.includes('type="date"'), "do not ship a calendar date input")
  assert.ok(!client.includes("<select"), "do not ship a dropdown")
})

test("top venue CTAs omit price and the hero matches the in-app venue", () => {
  const client = readFileSync(join(process.cwd(), "src/app/venue/[venueId]/VenuePageClient.tsx"), "utf8")
  assert.ok(client.includes("eventFromPrice"), "event rows must retain their pricing")
  assert.ok(!client.includes("pricedCtaLabel"), "Website / Instagram must not include a price")
  assert.ok(!client.includes("headerEventPrice"), "header must not resolve event prices")
  assert.ok(!client.includes("headerAccessPrice"), "header must not resolve cover prices")
  assert.ok(client.includes("Happening Tonight"), "today's group uses the tonight label")
  assert.ok(client.includes("Directions") || client.includes("venue.address"), "address stays outbound")
  assert.ok(client.includes("aspect-square"), "hero is the in-app 1:1 venue photo")
  assert.ok(!client.includes("flyer-glow"), "hero is not the event-checkout flyer glow")
  assert.ok(!client.includes("lg:grid-cols-5"), "layout is not event-checkout 2/5 + 3/5")
  assert.ok(!client.includes("business.logo_image_url"), "venue identity must not show the business logo")
  const page = readFileSync(join(process.cwd(), "src/app/venue/[venueId]/page.tsx"), "utf8")
  assert.ok(
    page.includes("CHECKOUT_BASE_URL"),
    "server fetch must pass the checkout base so draft Cover nights can resolve $5",
  )
})

test("venue upcoming rows use in-app cards, not line-skip glass", () => {
  const client = readFileSync(join(process.cwd(), "src/app/venue/[venueId]/VenuePageClient.tsx"), "utf8")
  assert.ok(client.includes("UpcomingRow"), "event and Weekly Cover nights share a card")
  assert.ok(client.includes("h-16 w-16"), "thumbs stay compact beside the title")
  assert.ok(!client.includes("FlyerFrame"), "nights are not full portrait flyer frames")
  assert.ok(!client.includes("relative h-48 w-full"), "flyer box must not be a short wide strip")
  assert.ok(!client.includes("ACCESS_CTA"), "venue must not copy the line-skip CTA gradient")
  const rowStart = client.indexOf("function UpcomingRow")
  assert.ok(rowStart >= 0, "UpcomingRow must exist")
  const row = client.slice(rowStart)
  assert.ok(row.includes("object-cover"), "row thumb crops the artwork")
  assert.ok(row.includes("WEEKLY_ACCESS_TYPE_LABEL"), "Weekly Cover label sits on the card")
  assert.ok(row.includes("weeklyCoverCheckoutPath"), "Weekly Cover rows go to the series page")
})

test("weeklyCoverCheckoutPath is the series page", () => {
  assert.equal(weeklyCoverCheckoutPath(621), "/cover/621")
})

test("nightsForCoverSeed returns every night in the same series", () => {
  const nights = [
    coverNight(621, "2026-08-24 21:00:00", { recurring_series_id: 10 }),
    coverNight(623, "2026-08-26 21:00:00", { recurring_series_id: 10 }),
    coverNight(625, "2026-08-28 21:00:00", { recurring_series_id: 11, name: "Late Cover" }),
  ]
  assert.deepEqual(
    nightsForCoverSeed(nights, 623).map((night) => night.event_id),
    [621, 623],
  )
  assert.deepEqual(
    nightsForCoverSeed(nights, 625).map((night) => night.event_id),
    [625],
  )
})

test("Weekly Cover series page copies the line-skip checkout format", () => {
  const client = readFileSync(
    join(process.cwd(), "src/app/cover/[id]/WeeklyCoverCheckoutClient.tsx"),
    "utf8",
  )
  const page = readFileSync(join(process.cwd(), "src/app/cover/[id]/page.tsx"), "utf8")
  assert.ok(client.includes("ACCESS_CTA"), "CTAs use the magenta access gradient")
  assert.ok(client.includes("ls-rise"), "entrance matches line-skip")
  assert.ok(client.includes("ls-hero-img"), "hero zoom matches line-skip")
  assert.ok(client.includes("Pick your night"), "later nights use the line-skip picker heading")
  assert.ok(client.includes("Happening Tonight"), "tonight group matches line-skip")
  assert.ok(client.includes("WEEKLY_ACCESS_SECTION_LABEL"), "product name is Weekly Cover")
  assert.ok(client.includes("/checkout/"), "Get Weekly Cover pays through event checkout")
  assert.ok(!client.includes("dev.bizzy-deals.com"), "must not bounce to Laravel checkout")
  assert.ok(page.includes("nightsForCoverSeed"), "one series page lists every night in the group")
})

test("event checkout paints Weekly Cover magenta", () => {
  const src = readFileSync(
    join(process.cwd(), "src/app/checkout/[id]/EventCheckoutClient.tsx"),
    "utf8",
  )
  assert.ok(src.includes("looksLikeWeeklyCoverName"), "name is the leftover Weekly Cover signal")
  assert.ok(src.includes("isDoorAccessKind"), "access_kind door_access is magenta")
  assert.ok(src.includes("const fill = cover ? ACCESS : EVENT_FILL"), "Weekly Cover uses ACCESS, named events stay green")
})

test("event checkout landing sends Weekly Cover nights to /cover", () => {
  const src = readFileSync(join(process.cwd(), "src/app/event/[id]/checkout/page.tsx"), "utf8")
  assert.ok(src.includes("weeklyCoverCheckoutPath"), "door nights must not stay on Laravel green")
  assert.ok(src.includes("looksLikeWeeklyCoverName"), "name is the leftover Weekly Cover signal")
  assert.ok(src.includes("LARAVEL_CHECKOUT_BASE_URL"), "named events still go to Laravel checkout")
})

async function withFetch<T>(
  impl: (url: string | URL | Request, init?: RequestInit) => Promise<unknown>,
  fn: () => Promise<T>,
): Promise<T> {
  const original = globalThis.fetch
  ;(globalThis as { fetch: typeof fetch }).fetch = impl as typeof fetch
  try {
    return await fn()
  } finally {
    globalThis.fetch = original
  }
}

function jsonResponse(body: unknown, ok = true, status = ok ? 200 : 404) {
  return {
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  }
}

function textResponse(body: string, ok = true, status = ok ? 200 : 404) {
  return {
    ok,
    status,
    json: async () => {
      throw new Error("not json")
    },
    text: async () => body,
  }
}

const DUNGEON_VENUE_SHELL = {
  venue: {
    id: 990198,
    name: "The Dungeon",
    address: "123 Campus Rd",
    description: null,
    venuePhotoUrl: null,
    website: null,
    instagram: null,
  },
  business: {
    business_id: 1,
    name: "The Dungeon",
    logo_image_url: null,
    instagram: null,
    website: null,
  },
  deals: [],
  line_skips: [],
}

const DUNGEON_ONE_COVER_ROW = {
  event_id: 621,
  name: "Weekly Cover",
  start_date_time: "2026-08-24 21:00:00",
  end_date_time: "2026-08-25 02:00:00",
  venue_name: "The Dungeon",
  flyer_image_url: null,
  min_ticket_price: "5.00",
  access_kind: "door_access",
  status: "draft",
  venue_id: 990198,
  tickets: [{ name: "Cover", price_usd: 5 }],
}

const DUNGEON_CHECKOUT_JSON_TICKETS = [
  { ticket_id: 678, name: "Cover", price_usd: 5 },
  { ticket_id: 679, name: "Skip the Line", price_usd: 10 },
]

const DUNGEON_CHECKOUT_HTML = `
  <div class="ticket-card bg-surface rounded-2xl"
    data-ticket-id="678"
    data-price="5.00">
    <h4 class="font-bold text-white text-lg">Cover</h4>
  </div>
  <div class="ticket-card bg-surface rounded-2xl"
    data-ticket-id="679"
    data-price="10.00">
    <h4 class="font-bold text-white text-lg">Skip the Line</h4>
  </div>
`

function dungeonVenueFetch(opts: {
  checkoutJson?: unknown
  checkoutHtml?: string
  rumbleTickets?: unknown
}) {
  return async (url: string | URL | Request) => {
    const u = String(url)
    if (u.includes("/ui/venues/venue/")) {
      return jsonResponse({ ...DUNGEON_VENUE_SHELL, events: [DUNGEON_ONE_COVER_ROW] })
    }
    if (u.endsWith("/ui/events") || u.endsWith("/ui/events/")) {
      return jsonResponse([])
    }
    if (/\/ui\/events\/621(?:\?|$)/.test(u)) {
      return jsonResponse(DUNGEON_ONE_COVER_ROW)
    }
    if (/\/checkout\/event\/621(?:\?|$)/.test(u)) {
      if (opts.checkoutJson === undefined) return jsonResponse(null, false, 404)
      return jsonResponse(opts.checkoutJson)
    }
    if (/\/checkout\/621(?:\?|$)/.test(u)) {
      if (opts.checkoutHtml == null) return textResponse("", false, 404)
      return textResponse(opts.checkoutHtml)
    }
    if (opts.rumbleTickets && /\/ui\/events\/620(?:\?|$)/.test(u)) {
      return jsonResponse({
        event_id: 620,
        name: "Rumble",
        start_date_time: "2026-08-22 15:55:00",
        end_date_time: "2026-08-23 14:55:00",
        venue_name: "The Dungeon",
        flyer_image_url: null,
        min_ticket_price: "5.00",
        access_kind: "event",
        status: "published",
        venue_id: 990198,
        tickets: opts.rumbleTickets,
      })
    }
    return jsonResponse(null, false, 404)
  }
}

test("venue one-Cover payload + checkout JSON Cover + Skip the Line becomes two chips with ids", async () => {
  const data = await withFetch(
    dungeonVenueFetch({
      checkoutJson: {
        event_id: 621,
        name: "Weekly Cover",
        access_kind: "door_access",
        venue_id: 990198,
        tickets: DUNGEON_CHECKOUT_JSON_TICKETS,
      },
    }),
    () => fetchVenuePublicData("990198", "https://api.test", "https://checkout.test"),
  )
  assert.ok(data)
  const night = data!.events.find((row) => row.event_id === 621)
  assert.ok(night)
  const tiers = resolveNightTiers(night!)
  assert.deepEqual(tiers, [...DUNGEON_TWO_TIERS])
  assert.equal(nightChipPrice(night!), "From $5")
  assert.deepEqual(weeklyAccessPriceLines([night!]), ["Cover $5", "Skip the Line $10"])
  assert.equal(tiers[0].ticket_id, 678)
  assert.equal(tiers[1].ticket_id, 679)
})

test("venue one-Cover payload + checkout HTML Cover + Skip the Line becomes two chips with ids", async () => {
  const data = await withFetch(
    dungeonVenueFetch({
      checkoutJson: {
        event_id: 621,
        name: "Weekly Cover",
        access_kind: "door_access",
        venue_id: 990198,
        tickets: [{ name: "Cover", price_usd: 5 }],
      },
      checkoutHtml: DUNGEON_CHECKOUT_HTML,
    }),
    () => fetchVenuePublicData("990198", "https://api.test", "https://checkout.test"),
  )
  assert.ok(data)
  const night = data!.events.find((row) => row.event_id === 621)
  assert.ok(night)
  const tiers = resolveNightTiers(night!)
  assert.deepEqual(tiers, [...DUNGEON_TWO_TIERS])
  assert.equal(nightChipPrice(night!), "From $5")
  assert.deepEqual(weeklyAccessPriceLines([night!]), ["Cover $5", "Skip the Line $10"])
})

test("a regular one-off with one ticket is not replaced by a richer checkout list", async () => {
  const rumble = {
    event_id: 620,
    name: "Rumble",
    start_date_time: "2026-08-22 15:55:00",
    end_date_time: "2026-08-23 14:55:00",
    venue_name: "The Dungeon",
    flyer_image_url: null,
    min_ticket_price: "5.00",
    access_kind: "event" as const,
    status: "published",
    venue_id: 990198,
    tickets: [{ name: "General Admission", price_usd: 5, ticket_id: 500 }],
  }
  const data = await withFetch(async (url: string | URL | Request) => {
    const u = String(url)
    if (u.includes("/ui/venues/venue/")) {
      return jsonResponse({ ...DUNGEON_VENUE_SHELL, events: [rumble] })
    }
    if (u.endsWith("/ui/events") || u.endsWith("/ui/events/")) return jsonResponse([])
    if (/\/ui\/events\/620(?:\?|$)/.test(u)) return jsonResponse(rumble)
    if (u.includes("/checkout/")) {
      return textResponse(DUNGEON_CHECKOUT_HTML)
    }
    return jsonResponse(null, false, 404)
  }, () => fetchVenuePublicData("990198", "https://api.test", "https://checkout.test"))
  assert.ok(data)
  const row = data!.events.find((event) => event.event_id === 620)
  assert.ok(row)
  assert.deepEqual(row!.tickets, [{ name: "General Admission", price_usd: 5, ticket_id: 500 }])
  assert.equal(needsWeeklyAccessTierEnrichment(row!), false)
})
