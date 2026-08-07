// Unit tests for the surge ladder editor's client-side validation (D8) +
// multiplier preview + role gate. Pure, no imports beyond the module under test.
// Runnable with the Node built-in test runner: `node --test`.
import { test } from "node:test"
import assert from "node:assert/strict"
import { validateLadderSteps, stepMultiplier, canConfigureSurge, fmtCents } from "./surge-validation.ts"

test("accepts a strictly-increasing ladder above the base", () => {
  assert.equal(
    validateLadderSteps(1000, [
      { threshold_sold: 10, price_cents: 1500 },
      { threshold_sold: 50, price_cents: 3000 },
      { threshold_sold: 100, price_cents: 10000 },
    ]),
    null,
  )
})

test("accepts an uncapped 10× jump (no client cap — the preview is the guard)", () => {
  assert.equal(validateLadderSteps(1000, [{ threshold_sold: 100, price_cents: 100000 }]), null)
})

test("rejects an empty ladder", () => {
  assert.match(validateLadderSteps(1000, []) ?? "", /at least one/)
})

test("rejects a first step at or below the base", () => {
  assert.match(validateLadderSteps(1000, [{ threshold_sold: 10, price_cents: 1000 }]) ?? "", /base price/)
})

test("rejects non-increasing thresholds", () => {
  const err = validateLadderSteps(1000, [
    { threshold_sold: 50, price_cents: 1500 },
    { threshold_sold: 50, price_cents: 3000 },
  ])
  assert.match(err ?? "", /threshold/)
})

test("rejects non-increasing prices", () => {
  const err = validateLadderSteps(1000, [
    { threshold_sold: 10, price_cents: 3000 },
    { threshold_sold: 50, price_cents: 2000 },
  ])
  assert.match(err ?? "", /price/)
})

test("rejects a zero / negative threshold", () => {
  assert.match(validateLadderSteps(1000, [{ threshold_sold: 0, price_cents: 1500 }]) ?? "", /positive/)
})

test("stepMultiplier: $10 → $100 is 10×", () => {
  assert.equal(stepMultiplier(1000, 10000), 10)
  assert.equal(stepMultiplier(1000, 1500), 1.5)
  assert.equal(stepMultiplier(0, 1500), 0)
})

test("canConfigureSurge: owner + manager only (D18)", () => {
  assert.equal(canConfigureSurge("owner"), true)
  assert.equal(canConfigureSurge("manager"), true)
  assert.equal(canConfigureSurge("staff"), false)
  assert.equal(canConfigureSurge(null), false)
})

test("fmtCents", () => {
  assert.equal(fmtCents(1000), "$10.00")
  assert.equal(fmtCents(0), "$0.00")
  assert.equal(fmtCents(null), "—")
})
