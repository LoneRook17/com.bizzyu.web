// LSK-18 regression guard: a blocked venue must reach the friendly
// "ticket sales are paused" screen on the IN-PAGE PI path, exactly as it
// already does on the session and free checkout paths.
//
// The bug: client.ts collapsed every non-OK response into
// `new Error(data.message)`, discarding the `code` that parseVenueStripeBlock
// keys on. The checkout page's catch had nothing to branch on, so a blocked
// venue fell through to setCheckoutError and rendered a raw error string in the
// generic banner.
//
// This must be fixed BEFORE the in-page flow is enabled in production
// (LINESKIP_PI_FLOW is a deploy-time config change, not a code change).
//
// Tests the pure classifier rather than the fetch wrapper, matching
// element-binding.test.ts — client.ts is transport only and calls straight into
// paymentIntentError.
//
// Runs with the Node built-in test runner: `npm test`.

import { test } from "node:test"
import assert from "node:assert/strict"

import { paymentIntentError } from "./error-mapping.ts"
import { LineSkipSoldOutError, LineSkipVenueBlockedError } from "./types.ts"
import { parseVenueStripeBlock } from "../venue-stripe-block.ts"

// The exact body the services API returns for a blocked venue: Boom 400 +
// code + details (pinned services-side by
// src/tests/lineSkips/piFlowVenueBlockedPayload.test.ts).
const blockedBody = (reason = "not_onboarded") => ({
  statusCode: 400,
  error: "Bad Request",
  message:
    "Ticket sales at this venue are paused until its Stripe account finishes onboarding. Please contact the event organizer.",
  code: "venue_stripe_account_not_ready",
  details: { reason, venue_id: 5, business_stripe_account_id: 88 },
})

test("blocked venue → LineSkipVenueBlockedError carrying the parsed block", () => {
  const err = paymentIntentError(400, blockedBody())
  // Pre-fix this was a plain Error and this assertion is what fails.
  assert.ok(
    err instanceof LineSkipVenueBlockedError,
    `expected LineSkipVenueBlockedError, got ${err?.name}`,
  )
  assert.equal(err.block.reason, "not_onboarded")
  assert.equal(err.block.venue_id, 5)
  assert.equal(err.block.business_stripe_account_id, 88)
})

test("the buyer-facing message survives as the error message", () => {
  const err = paymentIntentError(400, blockedBody())
  assert.match(err!.message, /paused/i)
})

test("the reason survives intact — dangling_account gets its own copy", () => {
  const err = paymentIntentError(400, blockedBody("dangling_account"))
  assert.ok(err instanceof LineSkipVenueBlockedError)
  // dangling_account gets different buyer copy than the setup-in-progress
  // reasons, so it must not be flattened.
  assert.equal(err.block.reason, "dangling_account")
})

test("the block matches what parseVenueStripeBlock produces for the same body", () => {
  // The session and free paths call parseVenueStripeBlock(data) directly. The
  // PI path must land on an identical block, or the three paths would render
  // different screens for the same server response.
  const body = blockedBody()
  const direct = parseVenueStripeBlock(body)
  const err = paymentIntentError(400, body)
  assert.ok(err instanceof LineSkipVenueBlockedError)
  assert.deepEqual(err.block, direct)
})

test("a partial/older services payload still blocks rather than showing a raw error", () => {
  // parseVenueStripeBlock is deliberately tolerant of missing details.
  const err = paymentIntentError(400, { code: "venue_stripe_account_not_ready", message: "paused" })
  assert.ok(err instanceof LineSkipVenueBlockedError)
  assert.equal(err.block.reason, "not_onboarded") // documented fallback
  assert.equal(err.block.venue_id, null)
})

test("an UNRELATED 400 is still a plain Error — the block arm must not swallow it", () => {
  const err = paymentIntentError(400, {
    statusCode: 400,
    message: "quantity must be between 1 and 10",
  })
  assert.ok(err instanceof Error)
  assert.ok(!(err instanceof LineSkipVenueBlockedError))
  assert.match(err.message, /quantity/)
})

test("a 500 with no body still yields the generic fallback message", () => {
  const err = paymentIntentError(500, {})
  assert.ok(err instanceof Error)
  assert.ok(!(err instanceof LineSkipVenueBlockedError))
  assert.equal(err.message, "Could not start payment")
})

test("sold-out still wins its own arm (409 SOLD_OUT is unchanged)", () => {
  const err = paymentIntentError(409, { code: "SOLD_OUT", message: "This night just sold out." })
  assert.ok(err instanceof LineSkipSoldOutError)
  assert.ok(!(err instanceof LineSkipVenueBlockedError))
})

test("a successful response yields NO error, so the caller uses the body", () => {
  assert.equal(paymentIntentError(200, { pi_id: "pi_x" }), null)
})
