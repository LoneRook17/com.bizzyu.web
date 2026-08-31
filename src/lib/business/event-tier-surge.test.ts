// O4 — surge ladders on the event create/edit form. The dash posts to
// /business/events, so the payload must speak the same surge contract the app
// and the Weekly Cover dialog already use: write {after_sold, price_usd},
// read the services echo {threshold_sold, price_cents, price_usd}, and send
// surge OFF as an explicit clear (omission means "leave the ladder alone").

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import {
  nextSurgeStep,
  seededSurgeStep,
  tierSurgeToWire,
  tierWithSurgeDrafts,
  validateRecurringTierSurge,
  validateTierSurge,
} from "./event-tier-surge.ts"
import type { TicketTier } from "./types.ts"

function tier(overrides: Partial<TicketTier> = {}): TicketTier {
  return {
    name: "GA",
    description: "",
    price_usd: 20,
    quantity: 100,
    ticket_type: "paid",
    ...overrides,
  }
}

function read(rel: string) {
  return readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8")
}

// ── Read: hydrating served rows ─────────────────────────────────────────────

test("tierWithSurgeDrafts reads the services echo shape (threshold_sold + price_cents)", () => {
  const t = tierWithSurgeDrafts(
    tier({
      surge_enabled: 1 as unknown as boolean, // MySQL hands booleans back as 1/0
      surge_steps: [{ threshold_sold: 7, price_cents: 2550 }],
      surge_base_price_usd: 20,
    })
  )
  assert.equal(t.surge_enabled, true)
  assert.deepEqual(t.surge, [{ afterSoldInput: "7", priceInput: "25.50" }])
  assert.equal(t.surge_base_price_usd, 20)
})

test("a ladder that came back is ON whatever the flag says", () => {
  const t = tierWithSurgeDrafts(
    tier({ surge_steps: [{ after_sold: 10, price_usd: 30 }] })
  )
  assert.equal(t.surge_enabled, true)
  assert.deepEqual(t.surge, [{ afterSoldInput: "10", priceInput: "30" }])
})

test("no ladder hydrates to off with no rungs", () => {
  const t = tierWithSurgeDrafts(tier())
  assert.equal(t.surge_enabled, false)
  assert.deepEqual(t.surge, [])
  assert.equal(t.surge_base_price_usd, null)
})

// ── Write: the two wire keys ────────────────────────────────────────────────

test("surge off travels as an explicit clear — both keys, empty list", () => {
  assert.deepEqual(tierSurgeToWire(tier({ surge_enabled: false })), {
    surge_enabled: false,
    surge_steps: [],
  })
})

test("enabled rungs go out as {after_sold, price_usd}; blank rungs are dropped", () => {
  const out = tierSurgeToWire(
    tier({
      surge_enabled: true,
      surge: [
        { afterSoldInput: "10", priceInput: "25" },
        { afterSoldInput: "", priceInput: "30" }, // half-typed — dropped
        { afterSoldInput: "20", priceInput: "30" },
      ],
    })
  )
  assert.deepEqual(out, {
    surge_enabled: true,
    surge_steps: [
      { after_sold: 10, price_usd: 25 },
      { after_sold: 20, price_usd: 30 },
    ],
  })
})

test("enabled with only blank rungs collapses to an explicit clear, not a 400", () => {
  const out = tierSurgeToWire(
    tier({ surge_enabled: true, surge: [{ afterSoldInput: "", priceInput: "" }] })
  )
  assert.deepEqual(out, { surge_enabled: false, surge_steps: [] })
})

// ── Validate ────────────────────────────────────────────────────────────────

test("a new ladder validates against the price in the box", () => {
  const bad = tier({
    surge_enabled: true,
    surge: [{ afterSoldInput: "10", priceInput: "15" }], // ≤ base 20
  })
  assert.match(validateTierSurge(bad) ?? "", /more than the starting price/)
  const good = tier({
    surge_enabled: true,
    surge: [{ afterSoldInput: "10", priceInput: "25" }],
  })
  assert.equal(validateTierSurge(good), null)
})

test("an EXISTING ladder validates against the stored base, not the ratcheted price", () => {
  // Ladder part-way fired: price box shows 30, stored base is 20. A jump of 25
  // is valid — rejecting it against the box price would brick unrelated edits.
  const t = tier({
    price_usd: 30,
    surge_base_price_usd: 20,
    surge_enabled: true,
    surge: [{ afterSoldInput: "5", priceInput: "25" }],
  })
  assert.equal(validateTierSurge(t), null)
})

test("thresholds and prices must strictly increase", () => {
  const sameThreshold = tier({
    surge_enabled: true,
    surge: [
      { afterSoldInput: "10", priceInput: "25" },
      { afterSoldInput: "10", priceInput: "30" },
    ],
  })
  assert.match(validateTierSurge(sameThreshold) ?? "", /has to come after 10 sold/)
  const priceDown = tier({
    surge_enabled: true,
    surge: [
      { afterSoldInput: "10", priceInput: "25" },
      { afterSoldInput: "20", priceInput: "25" },
    ],
  })
  assert.match(validateTierSurge(priceDown) ?? "", /has to raise the price/)
})

test("enabled with no rungs is an error; disabled never validates", () => {
  assert.match(
    validateTierSurge(tier({ surge_enabled: true, surge: [] })) ?? "",
    /at least one price jump/
  )
  assert.equal(validateTierSurge(tier({ surge_enabled: false })), null)
})

// ── Seeds ───────────────────────────────────────────────────────────────────

test("toggle-on seeds base + $5 after 10 sold; the next rung steps +10/+$5", () => {
  assert.deepEqual(seededSurgeStep(tier({ price_usd: 20 })), {
    afterSoldInput: "10",
    priceInput: "25",
  })
  assert.deepEqual(
    nextSurgeStep(
      tier({ surge: [{ afterSoldInput: "10", priceInput: "25" }] })
    ),
    { afterSoldInput: "20", priceInput: "30" }
  )
})

// ── Source guards: the form actually speaks the contract ────────────────────

test("EventForm hydrates drafts, validates ladders, and spreads the wire keys", () => {
  const src = read("../../components/business/v2/events/EventForm.tsx")
  assert.ok(src.includes("tierWithSurgeDrafts"), "served rows must be normalized to drafts")
  assert.ok(src.includes("validateTierSurge"), "ticket step must validate ladders client-side")
  assert.ok(src.includes("...tierSurgeToWire(t)"), "tier payload must always carry both surge keys")
})

test("TicketTierForm always shows the surge checkbox — never gated on a price", () => {
  // Luke, 2026-08-29: hidden-until-priced read as missing. The box is always
  // there and clickable; save validation refuses nonsense inline instead.
  const src = read("../../components/business/v2/events/TicketTierForm.tsx")
  assert.ok(src.includes("Surge pricing"))
  assert.ok(
    !/ticket_type === "paid" && Number\(tier\.price_usd\) > 0/.test(src),
    "no paid-price gate around the surge checkbox",
  )
  assert.ok(src.includes("Add another price jump"))
})

test("surge on a free tier or with no paid price is refused at save, inline", () => {
  assert.match(
    validateTierSurge(
      tier({ ticket_type: "free", price_usd: 0, surge_enabled: true, surge: [] })
    ) ?? "",
    /set a paid ticket price before adding surge/,
  )
  assert.match(
    validateTierSurge(
      tier({ price_usd: 0, surge_enabled: true, surge: [{ afterSoldInput: "10", priceInput: "25" }] })
    ) ?? "",
    /set a paid ticket price before adding surge/,
  )
})

// ── RC (named recurring series) shares the contract ─────────────────────────

test("validateRecurringTierSurge mirrors the event rules on RC rows", () => {
  const row = (over: Record<string, unknown> = {}) => ({
    name: "GA",
    ticket_type: "paid" as const,
    priceInput: "20",
    surge_enabled: true,
    surge: [{ afterSoldInput: "10", priceInput: "25" }],
    ...over,
  })
  assert.equal(validateRecurringTierSurge(row()), null)
  assert.match(
    validateRecurringTierSurge(row({ ticket_type: "free", priceInput: "0" })) ?? "",
    /set a paid ticket price/,
  )
  assert.match(validateRecurringTierSurge(row({ surge: [] })) ?? "", /at least one price jump/)
  assert.match(
    validateRecurringTierSurge(
      row({ surge: [{ afterSoldInput: "10", priceInput: "15" }] })
    ) ?? "",
    /more than the starting price/,
  )
  assert.equal(validateRecurringTierSurge(row({ surge_enabled: false, surge: [] })), null)
})

test("RC template rows round-trip surge and send both wire keys", async () => {
  const { templateToTierRows, tierRowsToTemplate, EMPTY_RECURRING_TIER } = await import(
    "./recurring-tier-rows.ts"
  )
  const rows = templateToTierRows([
    {
      name: "GA",
      price_usd: 20,
      quantity: 0,
      max_per_person: 0,
      ticket_type: "paid",
      valid_from_time: null,
      valid_until_time: null,
      valid_from_day_offset: 0,
      valid_until_day_offset: 0,
      surge_steps: [{ threshold_sold: 7, price_cents: 2550 }],
    },
  ])
  assert.equal(rows[0].surge_enabled, true, "a served ladder hydrates ON")
  assert.deepEqual(rows[0].surge, [{ afterSoldInput: "7", priceInput: "25.50" }])

  const wire = tierRowsToTemplate(rows)
  assert.equal(wire[0].surge_enabled, true)
  assert.deepEqual(wire[0].surge_steps, [{ after_sold: 7, price_usd: 25.5 }])

  // Surge off travels as an explicit clear on RC rows...
  const off = tierRowsToTemplate([{ ...rows[0], surge_enabled: false, surge: [] }])
  assert.equal(off[0].surge_enabled, false)
  assert.deepEqual(off[0].surge_steps, [])

  // ...but a row with NO surge state (the WC night page adapter) OMITS both
  // keys, so a stored ladder is kept, never cleared by accident.
  const { surge_enabled: _e, surge: _s, ...bare } = { ...EMPTY_RECURRING_TIER, name: "Cover" }
  const omitted = tierRowsToTemplate([bare])
  assert.ok(!("surge_enabled" in omitted[0]))
  assert.ok(!("surge_steps" in omitted[0]))
})

test("RC surfaces opt into surge; the WC night page does not", () => {
  const editor = read("../../components/business/v2/recurring/RecurringTierEditor.tsx")
  assert.ok(editor.includes("showSurge = false"), "surge UI is opt-in on the shared editor")
  assert.ok(editor.includes("Surge pricing"))
  const wizard = read("../../components/business/v2/recurring/RecurringEventWizard.tsx")
  assert.ok(wizard.includes("showSurge"), "green RC create offers surge")
  assert.ok(wizard.includes("validateRecurringTierSurge"), "RC create validates ladders inline")
  const seriesForm = read("../../components/business/v2/recurring/SeriesForm.tsx")
  assert.ok(seriesForm.includes("showSurge"), "RC series edit offers surge")
  assert.ok(seriesForm.includes("validateRecurringTierSurge"))
  const nightEditor = read("../../components/business/v2/door-access/NightTicketsEditor.tsx")
  assert.ok(!nightEditor.includes("showSurge"), "the WC night page keeps its own surge story")
})
