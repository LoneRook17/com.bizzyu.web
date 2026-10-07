import test from "node:test"
import assert from "node:assert/strict"
import { KNIGHT_BUSINESS_ID, isKnightBusiness } from "./knight.ts"
import { moveRow, effectivePrice, normalizePrice, type DrinkMenuItem, type DrinkMenuSection } from "./drink-menu.ts"

test("Lib Menu tab gate: only Knight business 999935", () => {
  assert.equal(KNIGHT_BUSINESS_ID, 999935)
  assert.equal(isKnightBusiness({ business_id: 999935 }), true)
  assert.equal(isKnightBusiness({ business_id: 267 }), false)
  assert.equal(isKnightBusiness(null), false)
})

test("moveRow reorders without mutating", () => {
  const ids = [10, 20, 30]
  assert.deepEqual(moveRow(ids, 2, 0), [30, 10, 20])
  assert.deepEqual(ids, [10, 20, 30])
  assert.deepEqual(moveRow(ids, 0, 0), [10, 20, 30])
  assert.deepEqual(moveRow(ids, -1, 1), [10, 20, 30])
})

test("effectivePrice prefers item override and formats old numeric rows", () => {
  const section = { price_label: "$4" } as DrinkMenuSection
  const withOverride = { price: "$5" } as DrinkMenuItem
  const inherit = { price: null } as DrinkMenuItem
  const legacy = { price: "5" } as DrinkMenuItem
  assert.equal(effectivePrice(withOverride, section), "$5")
  assert.equal(effectivePrice(inherit, section), "$4")
  assert.equal(effectivePrice(legacy, section), "$5")
  assert.equal(effectivePrice(inherit, { price_label: "" } as DrinkMenuSection), "")
})

test("normalizePrice: numbers gain $, decimals get 2 places, text passes through", () => {
  assert.equal(normalizePrice("5"), "$5")
  assert.equal(normalizePrice(" 25.5 "), "$25.50")
  assert.equal(normalizePrice("25.50"), "$25.50")
  assert.equal(normalizePrice("0.99"), "$0.99")
  assert.equal(normalizePrice("25.0"), "$25")
  assert.equal(normalizePrice("$5"), "$5")
  assert.equal(normalizePrice("$ 7.5"), "$7.50")
  assert.equal(normalizePrice("CUSTOM"), "CUSTOM")
  assert.equal(normalizePrice("MP"), "MP")
  assert.equal(normalizePrice("2 for $10"), "2 for $10")
  assert.equal(normalizePrice("5."), "5.")
  assert.equal(normalizePrice(""), "")
  assert.equal(normalizePrice(null), "")
})
