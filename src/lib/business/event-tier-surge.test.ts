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

test("TicketTierForm gates surge to paid tiers with a price", () => {
  const src = read("../../components/business/v2/events/TicketTierForm.tsx")
  assert.ok(src.includes("Surge pricing"))
  assert.ok(/ticket_type === "paid" && Number\(tier\.price_usd\) > 0/.test(src))
  assert.ok(src.includes("Add another price jump"))
})
