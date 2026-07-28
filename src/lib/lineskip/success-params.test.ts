// TF-DRIVE-W1 — line-skip success-arrival detection. Runs under `node --test`.
//
// Gates BOTH the venue-page success screen and the confetti burst, so confetti
// fires on a real purchase confirmation and never on the plain venue page.

import { test } from "node:test"
import assert from "node:assert/strict"
import { isLineSkipSuccessArrival } from "./success-params.ts"

test("isLineSkipSuccessArrival: fires on the paid PI flow's purchase_success=1", () => {
  // Luke's real confirmation URL shape: /lineskip/260?purchase_success=1&venue_name=…&tickets=…&wallet_token=…
  assert.equal(
    isLineSkipSuccessArrival("?purchase_success=1&venue_name=The%20Cellar&tickets=abc,def&wallet_token=xyz"),
    true,
  )
  // Leading '?' is optional.
  assert.equal(isLineSkipSuccessArrival("purchase_success=1"), true)
})

test("isLineSkipSuccessArrival: fires on the free-checkout free_success=1", () => {
  assert.equal(isLineSkipSuccessArrival("?free_success=1&count=2"), true)
})

test("isLineSkipSuccessArrival: does NOT fire on the plain venue page", () => {
  assert.equal(isLineSkipSuccessArrival(""), false)
  assert.equal(isLineSkipSuccessArrival("?"), false)
  // A visitor just browsing nights — no success param.
  assert.equal(isLineSkipSuccessArrival("?utm_source=web_share"), false)
})

test("isLineSkipSuccessArrival: does NOT fire on falsey/other param values", () => {
  assert.equal(isLineSkipSuccessArrival("?purchase_success=0"), false)
  assert.equal(isLineSkipSuccessArrival("?purchase_success=true"), false)
  assert.equal(isLineSkipSuccessArrival("?free_success=2"), false)
  // The off-site PI return leg (?pi_return=1) is a finalizer, not a confirmation.
  assert.equal(isLineSkipSuccessArrival("?pi_return=1&payment_intent=pi_123"), false)
})
