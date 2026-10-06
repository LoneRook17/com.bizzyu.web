import test from "node:test"
import assert from "node:assert/strict"
import { KNIGHT_BUSINESS_ID, isKnightBusiness } from "./knight.ts"

test("KNIGHT_BUSINESS_ID defaults to the DEV Knight business", () => {
  assert.equal(KNIGHT_BUSINESS_ID, 999935)
})

test("isKnightBusiness: only business 999935 passes; nothing else ever does", () => {
  assert.equal(isKnightBusiness({ business_id: 999935 }), true)
  assert.equal(isKnightBusiness({ business_id: 267 }), false)
  assert.equal(isKnightBusiness({ business_id: 0 }), false)
  assert.equal(isKnightBusiness(null), false)
  assert.equal(isKnightBusiness(undefined), false)
})
