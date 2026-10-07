import test from "node:test"
import assert from "node:assert/strict"
import { KNIGHT_BUSINESS_ID, isKnightBusiness } from "./knight.ts"
import { moveRow, effectivePrice, type DrinkMenuItem, type DrinkMenuSection } from "./drink-menu.ts"

test("Drinks tab gate: only Knight business 999935", () => {
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

test("effectivePrice prefers item override", () => {
  const section = { price_label: "$4" } as DrinkMenuSection
  const withOverride = { price: "$5" } as DrinkMenuItem
  const inherit = { price: null } as DrinkMenuItem
  assert.equal(effectivePrice(withOverride, section), "$5")
  assert.equal(effectivePrice(inherit, section), "$4")
})
