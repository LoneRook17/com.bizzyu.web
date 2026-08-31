// Unit tests for the Weekly Cover per-night layer.
// Runnable with the Node built-in test runner: `npm test`.
//
// Guards, in the order they cost us if they break:
//
//   1. THE FLYER-REMOVAL TRAP. Services' `extractNightFlyer` reads
//      `hasOwnProperty`, so `flyer_image_url: null` on a night write is an
//      instruction to DELETE that night's artwork. A payload builder that always
//      includes the key strips the flyer off every night the host customised, on
//      every save, silently.
//
//   2. THE SURGE ASYMMETRY. We WRITE `{after_sold, price_usd}` and READ
//      `{threshold_sold, price_cents, price_usd}` (svc migration 033). Reading
//      only `after_sold` re-opens a ladder saved as "after 7 sold" as "after 10
//      sold" — the price looks right and the threshold is quietly wrong.
//
//   3. THE FREE-DOOR TRAP. `template_tickets` is what a night inherits when its
//      override does not apply. Deriving it from the product pick's $0
//      placeholders instead of from a real configured night sells the door for
//      free the first time anything goes wrong.
//
//   4. THE PROMOTER GATE. Services counts template tiers PLUS the payload's
//      per-night edits PLUS surge rungs. A narrower count here refuses the host
//      locally and the prices never get the chance to be read.
//
//   5. THE DAY-SHIFT TRAP. These dates are plain calendar strings. Any helper
//      that routes one through the browser's timezone renders a Friday night as
//      Thursday for every US viewer, and it is invisible in a UTC-based CI.

import { test } from "node:test"
import assert from "node:assert/strict"
import {
  canonicalTierKey,
  cheapestPaidPrice,
  collapseTiers,
  copyNightToDay,
  dateEditsToWire,
  daysQuestion,
  defaultTierDescription,
  applyIncludesCover,
  derivedWeeklyCoverName,
  reviewSkipCoverSuffix,
  skipCoverIncludedClause,
  syncSkipTierDescriptions,
  withSkipCoverClause,
  weeklyCoverProgramDescription,
  weeklyCoverProgramName,
  flutterWizardStep,
  emptyTier,
  firstConfiguredNight,
  fmtGameDay,
  hasPaidPrice,
  isoWeekdayOfDate,
  looksClientInventedTierKey,
  nightPriceSummary,
  nightUnsetSubtitle,
  nightOwnFlyer,
  nightToWire,
  reviewFlyerUrl,
  reviewFlyerUrlForDay,
  paidPricesFromDraft,
  productsFromTiers,
  resolveTierKey,
  scheduledDates,
  seedNightDraft,
  seedTiersForProducts,
  surgeStepsFromWire,
  surgeStepsToWire,
  templateTicketsFromNights,
  tierFromWire,
  tierKindFrom,
  tierToWire,
  trimMoney,
  validateNightDraft,
  weekdayDraftFromWire,
  weekdayEditsFromNights,
  weekdayEditsToWire,
  weekdayFlyerByDayFromNights,
  weekdayHydrationNight,
  weekdayTemplateFlyer,
  weekdayTemplateToWire,
  type NightDraft,
  type NightTierDraft,
} from "./weekly-cover-nights.ts"

// ── helpers ─────────────────────────────────────────────────────────────────

function tier(over: Partial<NightTierDraft> = {}): NightTierDraft {
  return { ...emptyTier(over.kind ?? "cover"), ...over }
}

function night(over: Partial<NightDraft> = {}): NightDraft {
  return {
    startTime: "21:00",
    endTime: "02:00",
    is21Plus: false,
    isClosed: false,
    flyerImageUrl: "",
    flyerRemoved: false,
    inheritedFlyerUrl: "",
    tiers: [tier({ priceInput: "10" })],
    ...over,
  }
}

// ── 1. Flyer provenance ─────────────────────────────────────────────────────

test("a night that is inheriting OMITS flyer_image_url entirely", () => {
  const wire = nightToWire(night({ flyerImageUrl: "", inheritedFlyerUrl: "https://cdn/program.jpg" }))
  // Not "is null" — ABSENT. `extractNightFlyer` reads hasOwnProperty, so a
  // present null would delete the night's artwork.
  assert.equal("flyer_image_url" in wire, false)
})

test("a night with its own flyer sends the URL", () => {
  const wire = nightToWire(night({ flyerImageUrl: "https://cdn/thursday.jpg" }))
  assert.equal(wire.flyer_image_url, "https://cdn/thursday.jpg")
})

test("only an explicit removal sends flyer_image_url: null", () => {
  const wire = nightToWire(night({ flyerImageUrl: "", flyerRemoved: true }))
  assert.equal("flyer_image_url" in wire, true)
  assert.equal(wire.flyer_image_url, null)
})

test("an inherited flyer is never mistaken for the night's own", () => {
  const program = { flyer_image_url: "https://cdn/program.jpg", photo_url: "https://cdn/venue.jpg" }
  // GET resolves night → program → venue onto one field. A resolved value equal
  // to what the program or venue offers is not this night's own.
  assert.equal(nightOwnFlyer({ flyer_image_url: "https://cdn/program.jpg" }, program), "")
  assert.equal(nightOwnFlyer({ flyer_image_url: "https://cdn/venue.jpg" }, program), "")
  assert.equal(nightOwnFlyer({ flyer_image_url: "https://cdn/own.jpg" }, program), "https://cdn/own.jpg")
  // An explicit override row is unambiguous even when it matches the program.
  assert.equal(
    nightOwnFlyer({ flyer_image_url_override: "https://cdn/program.jpg" }, program),
    "https://cdn/program.jpg"
  )
})

test("Look it over flyer is the night's own artwork, not the inherited venue photo", () => {
  assert.equal(
    reviewFlyerUrl(night({ flyerImageUrl: "https://cdn/wed.jpg", inheritedFlyerUrl: "https://cdn/venue.jpg" })),
    "https://cdn/wed.jpg"
  )
  assert.equal(reviewFlyerUrl(night({ flyerImageUrl: "", inheritedFlyerUrl: "https://cdn/venue.jpg" })), "")
  assert.equal(reviewFlyerUrl(night({ flyerImageUrl: "   ", inheritedFlyerUrl: "https://cdn/venue.jpg" })), "")
  assert.equal(reviewFlyerUrl(night({ flyerImageUrl: "", flyerRemoved: true })), "")
  assert.equal(reviewFlyerUrl(undefined), "")
  assert.equal(reviewFlyerUrl(null), "")
})

test("Look it over flyer follows the selected weekday", () => {
  const edits = {
    3: night({ flyerImageUrl: "https://cdn/wed.jpg" }),
    5: night({ flyerImageUrl: "", inheritedFlyerUrl: "https://cdn/venue.jpg" }),
  }
  assert.equal(reviewFlyerUrlForDay(edits, 3), "https://cdn/wed.jpg")
  assert.equal(reviewFlyerUrlForDay(edits, 5), "", "Friday has no own flyer, so review shows a placeholder")
  assert.equal(reviewFlyerUrlForDay(edits, 1), "", "an unpicked Monday is empty, not a throw")
  assert.equal(reviewFlyerUrlForDay(edits, null), "")
})

test("copying a weekday onto another does not carry its artwork", () => {
  const source = night({ flyerImageUrl: "https://cdn/friday.jpg", tiers: [tier({ priceInput: "20" })] })
  const copied = copyNightToDay(source, { venueName: "The Bar", dayName: "Saturday" })
  assert.equal(copied.flyerImageUrl, "")
  assert.equal(copied.flyerRemoved, false)
  // Prices DO come across — that is the point of Copy.
  assert.equal(copied.tiers[0].priceInput, "20")
  assert.match(copied.tiers[0].description, /Saturdays/)
})

// ── 2. Surge, both directions ───────────────────────────────────────────────

test("surge WRITES after_sold, not threshold_sold", () => {
  const wire = tierToWire(
    tier({ priceInput: "10", surge_enabled: true, surge: [{ afterSoldInput: "7", priceInput: "15" }] })
  )
  assert.deepEqual(wire.surge_steps, [{ after_sold: 7, price_usd: 15 }])
  assert.equal(wire.surge_enabled, true)
})

test("surge READS threshold_sold and price_cents, the shape services echoes", () => {
  // svc migration 033 stores {threshold_sold, price_cents, price_usd}. Reading
  // only after_sold silently resets the threshold to the default.
  const steps = surgeStepsFromWire([{ threshold_sold: 7, price_cents: 1500, price_usd: 15 }])
  assert.deepEqual(steps, [{ afterSoldInput: "7", priceInput: "15" }])
})

test("surge read falls back to price_cents when price_usd is absent", () => {
  const steps = surgeStepsFromWire([{ threshold_sold: 25, price_cents: 1250 }])
  assert.deepEqual(steps, [{ afterSoldInput: "25", priceInput: "12.50" }])
})

test("surge read accepts our own write shape, so a round-trip is stable", () => {
  const steps = surgeStepsFromWire([{ after_sold: 12, price_usd: 20 }])
  assert.deepEqual(steps, [{ afterSoldInput: "12", priceInput: "20" }])
})

test("surge off travels as an explicit empty list, which is how a ladder is cleared", () => {
  const wire = tierToWire(tier({ surge_enabled: false, surge: [{ afterSoldInput: "7", priceInput: "15" }] }))
  assert.deepEqual(wire.surge_steps, [])
  assert.equal(wire.surge_enabled, false)
})

test("a half-typed surge rung is dropped rather than sent as a zero", () => {
  const wire = tierToWire(
    tier({
      surge_enabled: true,
      surge: [
        { afterSoldInput: "10", priceInput: "15" },
        { afterSoldInput: "", priceInput: "" },
      ],
    })
  )
  assert.deepEqual(wire.surge_steps, [{ after_sold: 10, price_usd: 15 }])
})

test("a stored ladder is read as ON even when the flag comes back as 1/0", () => {
  // Laravel and MySQL both hand booleans back as 1/0; `=== true` drops a real ladder.
  const parsed = tierFromWire({
    tier_key: "cover",
    name: "Cover",
    price_usd: 10,
    surge_enabled: 1,
    surge_steps: [{ threshold_sold: 5, price_cents: 1500 }],
  })
  assert.equal(parsed.surge_enabled, true)
  assert.deepEqual(parsed.surge, [{ afterSoldInput: "5", priceInput: "15" }])
})

test("surge waves stamped as extra -surge- tickets fold back onto the parent", () => {
  const collapsed = collapseTiers([
    tierFromWire({ tier_key: "cover", name: "Cover", price_usd: 10, quantity: 50 }),
    tierFromWire({ tier_key: "cover-surge-1", name: "Cover", price_usd: 15 }),
  ])
  assert.equal(collapsed.length, 1)
  assert.equal(collapsed[0].surge_enabled, true)
  assert.deepEqual(collapsed[0].surge, [{ afterSoldInput: "50", priceInput: "15" }])
})

test("leftover cover_surge_* tickets fold back onto the Cover parent", () => {
  const collapsed = collapseTiers([
    tierFromWire({ tier_key: "cover", name: "Cover", price_usd: 10, quantity: 50 }),
    tierFromWire({ tier_key: "cover_surge_2300", name: "Cover", price_usd: 15 }),
  ])
  assert.equal(collapsed.length, 1)
  assert.equal(collapsed[0].surge_enabled, true)
  assert.deepEqual(collapsed[0].surge, [{ afterSoldInput: "50", priceInput: "15" }])
})

// ── 3. The template must carry real prices ──────────────────────────────────

test("template_tickets come from the first configured night, not the $0 seeds", () => {
  const template = templateTicketsFromNights({
    daysOfWeek: [4, 5],
    weekdayEdits: {
      5: night({ tiers: [tier({ priceInput: "20" })] }),
      4: night({ tiers: [tier({ priceInput: "10" })] }),
    },
    fallbackTiers: seedTiersForProducts("cover"),
  })
  // Thursday (4) sorts first, so its $10 is the template — never the seed's $0.
  assert.equal(template.length, 1)
  assert.equal(template[0].price_usd, 10)
  assert.equal(template[0].ticket_type, "paid")
})

test("a disabled tier on the first night is not the program's shape", () => {
  const template = templateTicketsFromNights({
    daysOfWeek: [5],
    weekdayEdits: {
      5: night({
        tiers: [tier({ priceInput: "10" }), tier({ kind: "skip", priceInput: "25", is_disabled: true })],
      }),
    },
    fallbackTiers: seedTiersForProducts("both"),
  })
  assert.equal(template.length, 1)
  assert.equal(template[0].tier_key, "cover")
})

test("with nothing configured yet the seeds stand in, so validate-step still has a shape", () => {
  const template = templateTicketsFromNights({
    daysOfWeek: [5],
    weekdayEdits: {},
    fallbackTiers: seedTiersForProducts("both"),
  })
  assert.equal(template.length, 2)
  assert.deepEqual(
    template.map((t) => t.tier_key),
    ["cover", "skip"]
  )
})

test("a closed night does not speak for the program", () => {
  const found = firstConfiguredNight([4, 5], {
    4: night({ isClosed: true, tiers: [tier({ priceInput: "99" })] }),
    5: night({ tiers: [tier({ priceInput: "10" })] }),
  })
  assert.equal(found?.tiers[0].priceInput, "10")
})

// ── 4. The promoter gate ────────────────────────────────────────────────────

test("a price on ONE game day is enough to qualify for the promoter program", () => {
  // The app hit this: hasPaidTiers ignored dateEdits, so a host who had priced
  // only a game day was refused locally and the payload's prices were never read.
  const prices = paidPricesFromDraft({
    templateTickets: [],
    weekdayEdits: {},
    dateEdits: { "2026-08-29": night({ tiers: [tier({ priceInput: "25" })] }) },
  })
  assert.equal(hasPaidPrice(prices), true)
  assert.equal(cheapestPaidPrice(prices), 25)
})

test("surge rungs count toward the paid-price universe", () => {
  const prices = paidPricesFromDraft({
    templateTickets: [],
    weekdayEdits: {
      5: night({
        tiers: [tier({ priceInput: "0", surge_enabled: true, surge: [{ afterSoldInput: "10", priceInput: "15" }] })],
      }),
    },
    dateEdits: {},
  })
  assert.deepEqual(prices, [15])
})

test("a closed night and a disabled tier are not evidence the program charges", () => {
  const prices = paidPricesFromDraft({
    templateTickets: [],
    weekdayEdits: {
      4: night({ isClosed: true, tiers: [tier({ priceInput: "40" })] }),
      5: night({ tiers: [tier({ priceInput: "40", is_disabled: true })] }),
    },
    dateEdits: {},
  })
  assert.deepEqual(prices, [])
  assert.equal(hasPaidPrice(prices), false)
  assert.equal(cheapestPaidPrice(prices), null)
})

test("the cheapest paid price spans template, weekdays and game days", () => {
  const prices = paidPricesFromDraft({
    templateTickets: [{ tier_key: "cover", name: "Cover", price_usd: 20, quantity: 0, max_per_person: 0, ticket_type: "paid", valid_from_time: null, valid_until_time: null, valid_from_day_offset: 0, valid_until_day_offset: 0 }],
    weekdayEdits: { 4: night({ tiers: [tier({ priceInput: "8" })] }) },
    dateEdits: { "2026-08-29": night({ tiers: [tier({ priceInput: "30" })] }) },
  })
  assert.equal(cheapestPaidPrice(prices), 8)
})

// ── The two maps ────────────────────────────────────────────────────────────

test("weekday_edits is keyed by ISO weekday as a string, in order", () => {
  const wire = weekdayEditsToWire({ 5: night(), 3: night() }, [3, 5])
  assert.deepEqual(Object.keys(wire), ["3", "5"])
})

test("the Thursday weekday slot is the FULL setup, not flyer-only", () => {
  // Luke 2026-08-25: tickets, prices, doors, capacity, flyer. Flyer-only is a fail.
  const thu = night({
    startTime: "21:00",
    endTime: "02:00",
    flyerImageUrl: "https://cdn/thursday.jpg",
    tiers: [tier({ priceInput: "15", quantityInput: "80" })],
  })
  const slot = weekdayTemplateToWire(thu)
  assert.equal(slot.start_time, "21:00")
  assert.equal(slot.end_time, "02:00")
  assert.ok(Array.isArray(slot.tiers) && slot.tiers.length === 1)
  assert.equal((slot.tiers as Array<{ price_usd: number; quantity: number }>)[0].price_usd, 15)
  assert.equal((slot.tiers as Array<{ price_usd: number; quantity: number }>)[0].quantity, 80)
  assert.equal(slot.flyer_image_url, "https://cdn/thursday.jpg")
  assert.equal(slot.is_closed, false)

  const wire = weekdayEditsToWire({ 4: thu }, [4])
  const sent = wire["4"] as Record<string, unknown>
  assert.equal(sent.start_time, "21:00")
  assert.equal(sent.end_time, "02:00")
  assert.ok(Array.isArray(sent.tiers))
  assert.equal(sent.flyer_image_url, "https://cdn/thursday.jpg")
  const keys = Object.keys(sent)
  assert.ok(keys.includes("start_time") && keys.includes("end_time") && keys.includes("tiers"))
  assert.ok(
    keys.includes("flyer_image_url") && keys.length > 2,
    "weekday slot must not be flyer-only",
  )
})

test("a weekday no longer on the schedule is not sent", () => {
  // Services 400s a `weekday_edits` key that is not in days_of_week, and one
  // stale key would take the whole create down.
  const wire = weekdayEditsToWire({ 3: night(), 5: night() }, [5])
  assert.deepEqual(Object.keys(wire), ["5"])
})

test("an off-schedule game day is dropped instead of 400ing the create", () => {
  // 2026-08-29 is a Saturday (6); 2026-08-28 is a Friday (5).
  const wire = dateEditsToWire(
    { "2026-08-28": night(), "2026-08-29": night() },
    [5]
  )
  assert.deepEqual(Object.keys(wire), ["2026-08-28"])
})

test("a night write always states is_closed and is_21_plus", () => {
  const wire = nightToWire(night())
  assert.equal(wire.is_closed, false)
  assert.equal(wire.is_21_plus, false)
})

test("any live 21+ price lights the night's badge", () => {
  const wire = nightToWire(night({ tiers: [tier({ priceInput: "10", is_21_plus: true })] }))
  assert.equal(wire.is_21_plus, true)
})

test("a disabled 21+ tier does not light the night", () => {
  const wire = nightToWire(
    night({ tiers: [tier({ priceInput: "10" }), tier({ kind: "skip", is_21_plus: true, is_disabled: true })] })
  )
  assert.equal(wire.is_21_plus, false)
})

// ── Tier identity ───────────────────────────────────────────────────────────

test("tier keys are the canonical ones the app also writes", () => {
  assert.equal(canonicalTierKey("cover"), "cover")
  assert.equal(canonicalTierKey("skip"), "skip")
})

test("a per-day invented key is replaced, a real server key is kept", () => {
  // `cover-wed` is what 400s a night write with "does not belong to this program".
  assert.equal(looksClientInventedTierKey("cover-wed"), true)
  assert.equal(looksClientInventedTierKey("skip-1755"), true)
  assert.equal(looksClientInventedTierKey("skip-the-line"), false)
  assert.equal(looksClientInventedTierKey("ga"), false)
  assert.equal(resolveTierKey("cover", "cover-wed"), "cover")
  assert.equal(resolveTierKey("skip", "skip-the-line"), "skip-the-line")
  assert.equal(resolveTierKey("skip", ""), "skip")
})

test("kind is read from an explicit field, then from the name", () => {
  assert.equal(tierKindFrom("skip", "Anything"), "skip")
  assert.equal(tierKindFrom("skip-the-line", ""), "skip")
  assert.equal(tierKindFrom("cover", "Skip the Line"), "cover")
  assert.equal(tierKindFrom(null, "Skip the Line"), "skip")
  assert.equal(tierKindFrom(null, "Line Skip"), "skip")
  assert.equal(tierKindFrom(null, "Cover"), "cover")
  assert.equal(tierKindFrom(undefined, undefined), "cover")
})

test("includes_cover only travels on a skip tier", () => {
  assert.equal(tierToWire(tier({ kind: "cover", includes_cover: true })).includes_cover, false)
  assert.equal(tierToWire(tier({ kind: "skip", includes_cover: true })).includes_cover, true)
})

test("the product pick seeds the right tiers", () => {
  assert.deepEqual(seedTiersForProducts("cover").map((t) => t.kind), ["cover"])
  assert.deepEqual(seedTiersForProducts("skip").map((t) => t.kind), ["skip"])
  assert.deepEqual(seedTiersForProducts("both").map((t) => t.kind), ["cover", "skip"])
  // A skip tier includes cover by default — the common case at a door.
  assert.equal(seedTiersForProducts("skip")[0].includes_cover, true)
})

test("the product is read back off a saved program's tiers", () => {
  assert.equal(productsFromTiers([tier({ kind: "cover" })]), "cover")
  assert.equal(productsFromTiers([tier({ kind: "skip" })]), "skip")
  assert.equal(productsFromTiers([tier({ kind: "cover" }), tier({ kind: "skip" })]), "both")
})

test("a skip tier's blurb says whether cover is included", () => {
  assert.equal(
    defaultTierDescription({ kind: "skip", includesCover: true, venueName: "The Bar", dayName: "Friday" }),
    "Skip the line at The Bar on Fridays. Cover included."
  )
  assert.equal(
    defaultTierDescription({ kind: "skip", includesCover: false, venueName: "The Bar", dayName: "Friday" }),
    "Skip the line at The Bar on Fridays. Cover NOT Included"
  )
  assert.equal(
    defaultTierDescription({ kind: "cover", includesCover: false, venueName: "The Bar", dayName: "Friday" }),
    "Cover at The Bar on Fridays. Grants entry."
  )
  assert.equal(skipCoverIncludedClause(true), "Cover included.")
  assert.equal(skipCoverIncludedClause(false), "Cover NOT Included")
  assert.equal(reviewSkipCoverSuffix(true), " · Cover included")
  assert.equal(reviewSkipCoverSuffix(false), " · Cover NOT Included")
})

test("toggling Cover included rewrites the skip ticket description", () => {
  const seeded = seedNightDraft({
    products: "skip",
    startTime: "21:00",
    endTime: "02:00",
    venueName: "The Bar",
    dayName: "Friday",
  })
  assert.equal(seeded.tiers[0].includes_cover, true)
  assert.equal(seeded.tiers[0].description, "Skip the line at The Bar on Fridays. Cover included.")

  const off = applyIncludesCover(seeded.tiers[0], false, { venueName: "The Bar", dayName: "Friday" })
  assert.equal(off.includes_cover, false)
  assert.equal(off.description, "Skip the line at The Bar on Fridays. Cover NOT Included")

  const on = applyIncludesCover(off, true, { venueName: "The Bar", dayName: "Friday" })
  assert.equal(on.includes_cover, true)
  assert.equal(on.description, "Skip the line at The Bar on Fridays. Cover included.")

  const cover = applyIncludesCover(tier({ kind: "cover", description: "Cover at The Bar on Fridays. Grants entry." }), true, {
    venueName: "The Bar",
    dayName: "Friday",
  })
  assert.equal(cover.includes_cover, false)
  assert.equal(cover.description, "Cover at The Bar on Fridays. Grants entry.")
})

test("create payload skip description follows the Cover included toggle", () => {
  const venue = { venueName: "The Bar", dayName: "Friday" }
  const onNight = seedNightDraft({
    products: "both",
    startTime: "21:00",
    endTime: "02:00",
    ...venue,
  })
  const skipOn = onNight.tiers.find((t) => t.kind === "skip")
  assert.ok(skipOn)
  skipOn.priceInput = "25"
  const onWire = weekdayTemplateToWire(onNight)
  const onSkip = (onWire.tiers as { kind: string; description: string | null; includes_cover: boolean }[]).find(
    (t) => t.kind === "skip"
  )
  assert.equal(onSkip?.includes_cover, true)
  assert.equal(onSkip?.description, "Skip the line at The Bar on Fridays. Cover included.")

  const offNight = syncSkipTierDescriptions(
    {
      ...onNight,
      tiers: onNight.tiers.map((t) => (t.kind === "skip" ? { ...t, includes_cover: false } : t)),
    },
    venue
  )
  const offWire = weekdayTemplateToWire(offNight)
  const offSkip = (offWire.tiers as { kind: string; description: string | null; includes_cover: boolean }[]).find(
    (t) => t.kind === "skip"
  )
  assert.equal(offSkip?.includes_cover, false)
  assert.equal(offSkip?.description, "Skip the line at The Bar on Fridays. Cover NOT Included")

  const tickets = templateTicketsFromNights({
    daysOfWeek: [5],
    weekdayEdits: { 5: offNight },
    fallbackTiers: seedTiersForProducts("both"),
  })
  const skipTicket = tickets.find((t) => t.tier_key === "skip")
  assert.equal(skipTicket?.description, "Skip the line at The Bar on Fridays. Cover NOT Included")

  const coverTicket = tickets.find((t) => t.tier_key === "cover")
  assert.equal(coverTicket?.description, "Cover at The Bar on Fridays. Grants entry.")
})

test("tierToWire rewrites a stale Cover included clause when the toggle is off", () => {
  const staleOff = tier({
    kind: "skip",
    includes_cover: false,
    description: "Skip the line at The Bar on Fridays. Cover included.",
  })
  assert.equal(tierToWire(staleOff).description, "Skip the line at The Bar on Fridays. Cover NOT Included")
  assert.equal(tierToWire(staleOff).includes_cover, false)

  const staleOn = tier({
    kind: "skip",
    includes_cover: true,
    description: "Skip the line at The Bar on Fridays. Cover NOT Included",
  })
  assert.equal(tierToWire(staleOn).description, "Skip the line at The Bar on Fridays. Cover included.")

  const oldOffCopy = tier({
    kind: "skip",
    includes_cover: false,
    description: "Skip the line at The Bar on Fridays. Cover not included, paid separately.",
  })
  assert.equal(tierToWire(oldOffCopy).description, "Skip the line at The Bar on Fridays. Cover NOT Included")

  assert.equal(withSkipCoverClause("", false), "")
  assert.equal(withSkipCoverClause("Front door, no wait", false), "Front door, no wait")
})

// ── 5. Dates never round-trip through a timezone ────────────────────────────

test("isoWeekdayOfDate does not shift the day", () => {
  // 2026-08-28 is a Friday. `new Date("2026-08-28")` is UTC midnight and reads
  // as Thursday west of Greenwich — this must not.
  assert.equal(isoWeekdayOfDate("2026-08-28"), 5)
  assert.equal(isoWeekdayOfDate("2026-08-29"), 6)
  assert.equal(isoWeekdayOfDate("2026-08-30"), 7)
  assert.equal(isoWeekdayOfDate("2026-08-31"), 1)
  assert.equal(isoWeekdayOfDate("not a date"), null)
})

test("fmtGameDay renders the calendar day it was given", () => {
  assert.match(fmtGameDay("2026-08-28"), /Friday/)
  assert.match(fmtGameDay("2026-08-28"), /Aug 28/)
})

test("scheduledDates returns only the picked weekdays, inside the range", () => {
  const dates = scheduledDates({
    daysOfWeek: [5],
    rangeStart: "2026-08-24",
    rangeEnd: "2026-09-12",
    lookaheadDays: 120,
    today: "2026-08-24",
  })
  assert.deepEqual(dates, ["2026-08-28", "2026-09-04", "2026-09-11"])
})

test("an open-ended program is bounded by the lookahead, not by nothing", () => {
  const dates = scheduledDates({
    daysOfWeek: [5],
    rangeStart: "2026-08-24",
    rangeEnd: "",
    lookaheadDays: 14,
    today: "2026-08-24",
  })
  assert.deepEqual(dates, ["2026-08-28", "2026-09-04"])
})

test("a range starting in the future is honoured over today", () => {
  const dates = scheduledDates({
    daysOfWeek: [5],
    rangeStart: "2026-09-01",
    lookaheadDays: 14,
    today: "2026-08-24",
  })
  assert.equal(dates[0], "2026-09-04")
})

test("no nights picked means no scheduled dates", () => {
  assert.deepEqual(scheduledDates({ daysOfWeek: [], today: "2026-08-24" }), [])
})

// ── Validation mirrors the server's rules ───────────────────────────────────

test("a night needs hours and at least one live way in", () => {
  assert.deepEqual(validateNightDraft(night({ startTime: "", endTime: "" }), "Friday").length, 1)
  const noTiers = validateNightDraft(night({ tiers: [tier({ is_disabled: true })] }), "Friday")
  assert.equal(noTiers.length, 1)
  assert.match(noTiers[0], /at least one way in/)
})

test("a closed night needs nothing else", () => {
  assert.deepEqual(validateNightDraft(night({ isClosed: true, startTime: "", tiers: [] }), "Friday"), [])
})

test("surge thresholds have to ascend", () => {
  const errors = validateNightDraft(
    night({
      tiers: [
        tier({
          priceInput: "10",
          surge_enabled: true,
          surge: [
            { afterSoldInput: "20", priceInput: "15" },
            { afterSoldInput: "10", priceInput: "20" },
          ],
        }),
      ],
    }),
    "Friday"
  )
  assert.ok(errors.some((e) => /has to come after 20 sold/.test(e)))
})

test("the first surge jump has to beat the starting price", () => {
  const errors = validateNightDraft(
    night({
      tiers: [tier({ priceInput: "20", surge_enabled: true, surge: [{ afterSoldInput: "10", priceInput: "15" }] })],
    }),
    "Friday"
  )
  assert.ok(errors.some((e) => /more than the starting price/.test(e)))
})

test("surge on with no rungs is caught locally", () => {
  const errors = validateNightDraft(
    night({ tiers: [tier({ priceInput: "10", surge_enabled: true, surge: [] })] }),
    "Friday"
  )
  assert.ok(errors.some((e) => /at least one price jump/.test(e)))
})

test("a scan window must end after it starts, offsets included", () => {
  const sameNight = validateNightDraft(
    night({
      tiers: [tier({ priceInput: "10", valid_from_time: "22:00", valid_until_time: "21:00" })],
    }),
    "Friday"
  )
  assert.ok(sameNight.some((e) => /must end after it starts/.test(e)))

  // 10 PM → 2 AM next morning is legal, and is the normal case here.
  const overnight = validateNightDraft(
    night({
      tiers: [
        tier({ priceInput: "10", valid_from_time: "22:00", valid_until_time: "02:00", valid_until_day_offset: 1 }),
      ],
    }),
    "Friday"
  )
  assert.deepEqual(overnight, [])
})

// ── Display ─────────────────────────────────────────────────────────────────

test("a weekday card summarises its prices and flags surge", () => {
  assert.equal(
    nightPriceSummary(night({ tiers: [tier({ priceInput: "10" }), tier({ kind: "skip", priceInput: "20" })] })),
    "Cover $10 · Skip $20"
  )
  assert.equal(
    nightPriceSummary(
      night({
        tiers: [tier({ priceInput: "10", surge_enabled: true, surge: [{ afterSoldInput: "10", priceInput: "15" }] })],
      })
    ),
    "Cover $10 · Surge"
  )
  assert.equal(nightPriceSummary(night({ isClosed: true })), "Closed")
  assert.equal(nightPriceSummary(night({ tiers: [tier({ priceInput: "0" })] })), "Cover Free")
  assert.equal(nightPriceSummary(undefined), "")
})

test("money reads as typed, not as padded decimals", () => {
  assert.equal(trimMoney(10), "10")
  assert.equal(trimMoney(12.5), "12.50")
})

// ── Weekday hydration ───────────────────────────────────────────────────────

function servedNight(date: string, price: number, over: Record<string, unknown> = {}) {
  return {
    occurrence_date: date,
    is_stamped: true,
    is_scheduled: true,
    event_id: 1,
    status: "published",
    start_date_time: null,
    end_date_time: null,
    passes_sold: 0,
    paid_orders: 0,
    is_customized: false,
    is_closed: false,
    has_override: false,
    start_time: "21:00",
    end_time: "02:00",
    tiers: [
      {
        tier_key: "cover",
        name: "Cover",
        description: null,
        price_usd: price,
        quantity: 0,
        max_per_person: 0,
        sort_order: 1,
        is_disabled: false,
        sold_out: false,
        is_overridden: false,
        template_price_usd: price,
        template_quantity: 0,
      },
    ],
    ...over,
  } as never
}

test("a weekday hydrates from the night its siblings agree on, not from a game day", () => {
  // Three Fridays at $10 and one priced up for a game — the weekday is $10.
  const nights = [
    servedNight("2026-08-28", 30),
    servedNight("2026-09-04", 10),
    servedNight("2026-09-11", 10),
    servedNight("2026-09-18", 10),
  ]
  const hit = weekdayHydrationNight({ isoWeekday: 5, nights, today: "2026-08-24" })
  assert.equal(hit?.tiers[0].price_usd, 10)
})

test("weekday hydration ignores past nights, which the fan-out never rewrote", () => {
  const nights = [servedNight("2026-08-14", 5), servedNight("2026-08-28", 10)]
  const hit = weekdayHydrationNight({ isoWeekday: 5, nights, today: "2026-08-24" })
  assert.equal(hit?.occurrence_date, "2026-08-28")
})

test("a weekday whose every night is cancelled still hydrates, so it opens as it is", () => {
  const nights = [servedNight("2026-08-28", 10, { status: "cancelled" })]
  const hit = weekdayHydrationNight({ isoWeekday: 5, nights, today: "2026-08-24" })
  assert.equal(hit?.occurrence_date, "2026-08-28")
})

test("a weekday with nothing left returns null, so the caller falls back", () => {
  assert.equal(weekdayHydrationNight({ isoWeekday: 2, nights: [], today: "2026-08-24" }), null)
})

test("weekday hydration never seeds from a Custom night", () => {
  // Custom Friday at $30 must not become the Friday template when siblings are $10.
  const nights = [
    servedNight("2026-08-28", 30, { is_customized: true, flyer_image_url: "https://cdn/custom.jpg" }),
    servedNight("2026-09-04", 10, { flyer_image_url: "https://cdn/friday.jpg" }),
    servedNight("2026-09-11", 10, { flyer_image_url: "https://cdn/friday.jpg" }),
  ]
  const hit = weekdayHydrationNight({ isoWeekday: 5, nights, today: "2026-08-24" })
  assert.equal(hit?.occurrence_date, "2026-09-04")
  assert.equal(hit?.tiers[0].price_usd, 10)
})

test("a weekday whose every remaining night is Custom has no template to read", () => {
  const nights = [
    servedNight("2026-08-28", 30, { is_customized: true }),
    servedNight("2026-09-04", 25, { is_customized: true }),
  ]
  assert.equal(weekdayHydrationNight({ isoWeekday: 5, nights, today: "2026-08-24" }), null)
})

test("weekday night-card flyers skip Custom art and keep the weekday poster", () => {
  const program = {
    days_of_week: [5],
    flyer_image_url: "https://cdn/program.jpg",
    photo_url: "https://cdn/venue.jpg",
  } as never
  const nights = [
    servedNight("2026-08-28", 30, { is_customized: true, flyer_image_url: "https://cdn/custom.jpg" }),
    servedNight("2026-09-04", 10, { flyer_image_url: "https://cdn/friday.jpg" }),
    servedNight("2026-09-11", 10, { flyer_image_url: "https://cdn/friday.jpg" }),
  ]
  const byDay = weekdayFlyerByDayFromNights({ program, nights, today: "2026-08-24" })
  assert.equal(byDay[5], "https://cdn/friday.jpg")
  assert.equal(
    weekdayFlyerByDayFromNights({
      program,
      nights: [
        servedNight("2026-08-28", 30, { is_customized: true, flyer_image_url: "https://cdn/custom.jpg" }),
        servedNight("2026-09-04", 25, { is_customized: true, flyer_image_url: "https://cdn/other.jpg" }),
      ],
      today: "2026-08-24",
    })[5],
    undefined,
    "when every remaining Friday is Custom there is no weekday poster to inherit",
  )
})

test("a flyer-only Custom Friday does not become the Friday template", () => {
  const nights = [
    servedNight("2026-08-28", 10, {
      is_customized: true,
      flyer_image_url: "https://cdn/one-off.jpg",
    }),
    servedNight("2026-09-04", 10, { flyer_image_url: "https://cdn/friday.jpg" }),
    servedNight("2026-09-11", 10, { flyer_image_url: "https://cdn/friday.jpg" }),
  ]
  const hit = weekdayHydrationNight({ isoWeekday: 5, nights, today: "2026-08-24" })
  assert.equal(hit?.occurrence_date, "2026-09-04")
  assert.equal((hit as { flyer_image_url?: string })?.flyer_image_url, "https://cdn/friday.jpg")
})

test("weekday template flyer stays on the Thursday slot even when it matches the program flyer", () => {
  const program = {
    flyer_image_url: "https://cdn/thursday.jpg",
    photo_url: "https://cdn/venue.jpg",
  }
  assert.equal(
    weekdayTemplateFlyer({ flyer_image_url: "https://cdn/thursday.jpg" }, program),
    "https://cdn/thursday.jpg",
    "matching the program flyer is still the Thursday poster",
  )
  assert.equal(weekdayTemplateFlyer({ flyer_image_url: "https://cdn/venue.jpg" }, program), "")
  assert.equal(
    nightOwnFlyer({ flyer_image_url: "https://cdn/thursday.jpg" }, program),
    "",
    "date-local Custom editor still treats the program flyer as inherited",
  )
})

test("weekdayEditsFromNights hydrates the full Friday template and skips Custom nights", () => {
  const program = {
    days_of_week: [5],
    start_time: "21:00",
    end_time: "02:00",
    is_21_plus: false,
    flyer_image_url: "https://cdn/friday.jpg",
    photo_url: "https://cdn/venue.jpg",
    template_tickets: [],
  } as never
  const nights = [
    servedNight("2026-08-28", 40, { is_customized: true, flyer_image_url: "https://cdn/custom.jpg" }),
    servedNight("2026-09-04", 12, {
      flyer_image_url: "https://cdn/friday.jpg",
      start_time: "22:00",
      end_time: "03:00",
      tiers: [
        {
          tier_key: "cover",
          name: "Cover",
          description: null,
          price_usd: 12,
          quantity: 60,
          max_per_person: 0,
          sort_order: 1,
          is_disabled: false,
          sold_out: false,
          is_overridden: false,
          template_price_usd: 12,
          template_quantity: 60,
        },
      ],
    }),
  ]
  const edits = weekdayEditsFromNights({ program, nights, today: "2026-08-24" })
  const friday = edits[5]
  assert.ok(friday, "Friday template comes from the non-Custom night")
  assert.equal(friday.startTime, "22:00")
  assert.equal(friday.endTime, "03:00")
  assert.equal(friday.tiers[0].priceInput, "12")
  assert.equal(friday.tiers[0].quantityInput, "60")
  assert.equal(friday.flyerImageUrl, "https://cdn/friday.jpg")
  const slot = weekdayTemplateToWire(friday)
  assert.equal(slot.start_time, "22:00")
  assert.equal(slot.flyer_image_url, "https://cdn/friday.jpg")
  assert.equal((slot.tiers as Array<{ quantity: number }>)[0].quantity, 60)
})

test("weekdayDraftFromWire keeps the weekday poster when it matches the program flyer", () => {
  const program = {
    start_time: "21:00",
    end_time: "02:00",
    is_21_plus: false,
    flyer_image_url: "https://cdn/thursday.jpg",
    photo_url: "https://cdn/venue.jpg",
    template_tickets: [],
  } as never
  const draft = weekdayDraftFromWire(
    servedNight("2026-08-27", 10, { flyer_image_url: "https://cdn/thursday.jpg" }) as never,
    program,
  )
  assert.equal(draft.flyerImageUrl, "https://cdn/thursday.jpg")
})

test("create derives {Venue} Cover and never asks for a typed name", () => {
  assert.equal(derivedWeeklyCoverName("The Dungeon"), "The Dungeon Cover")
  assert.equal(derivedWeeklyCoverName("  The Bar  "), "The Bar Cover")
  assert.equal(derivedWeeklyCoverName(""), "Weekly Cover")
  assert.equal(derivedWeeklyCoverName(null), "Weekly Cover")
})

test("create ignores a leftover typed name; edit keeps the saved name", () => {
  assert.equal(
    weeklyCoverProgramName({ isEdit: false, venueName: "The Dungeon", existingName: "Luke Custom Cover" }),
    "The Dungeon Cover",
  )
  assert.equal(
    weeklyCoverProgramName({ isEdit: false, venueName: "The Dungeon", existingName: "" }),
    "The Dungeon Cover",
  )
  assert.equal(
    weeklyCoverProgramName({ isEdit: true, venueName: "The Dungeon", existingName: "Saved Custom Cover" }),
    "Saved Custom Cover",
  )
  assert.equal(
    weeklyCoverProgramName({ isEdit: true, venueName: "The Dungeon", existingName: "  " }),
    "The Dungeon Cover",
  )
  assert.equal(weeklyCoverProgramDescription({ isEdit: false, existingDescription: "typed blurb" }), null)
  assert.equal(weeklyCoverProgramDescription({ isEdit: true, existingDescription: "saved blurb" }), "saved blurb")
  assert.equal(weeklyCoverProgramDescription({ isEdit: true, existingDescription: null }), null)
})

test("days question and unset night subtitle follow the product pick", () => {
  assert.equal(daysQuestion("both"), "What days do you have cover or skip the line?")
  assert.equal(daysQuestion(null), "What days do you have cover or skip the line?")
  assert.equal(daysQuestion("cover"), "What days do you have cover?")
  assert.equal(nightUnsetSubtitle("both"), "Set doors open & close / Cover $0 / Skip $0")
  assert.equal(nightUnsetSubtitle("cover"), "Set doors open & close / Cover $0")
  assert.equal(nightUnsetSubtitle("skip"), "Set doors open & close / Skip $0")
})

test("Flutter wizard progress is screens 2-9, with the editor and copy as 5 and 6", () => {
  assert.equal(flutterWizardStep({ wizardIndex: 0 }), 2)
  assert.equal(flutterWizardStep({ wizardIndex: 1 }), 3)
  assert.equal(flutterWizardStep({ wizardIndex: 2 }), 4)
  assert.equal(flutterWizardStep({ wizardIndex: 2, editorOpen: true }), 5)
  assert.equal(flutterWizardStep({ wizardIndex: 2, nightsSaved: 1 }), 6)
  assert.equal(flutterWizardStep({ wizardIndex: 3 }), 7)
  assert.equal(flutterWizardStep({ wizardIndex: 4 }), 8)
  assert.equal(flutterWizardStep({ wizardIndex: 5 }), 9)
})

test("blank qty and max serialize as 0 (unlimited)", () => {
  const wire = tierToWire(tier({ quantityInput: "", maxPerPersonInput: "" }))
  assert.equal(wire.quantity, 0)
  assert.equal(wire.max_per_person, 0)
})
