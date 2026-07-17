// F1d regression guard: the line-skip Payment Element must NEVER mount in
// deferred mode in live checkout, because deferred mode renders the account's
// dashboard-default methods (ACH "Direct debit") instead of the card-only PI's.
// Runs with the Node built-in test runner: `npm test`.

import { test } from "node:test"
import assert from "node:assert/strict"
import { resolveElementsMode, elementsKey } from "./element-binding.ts"

test("live + no secret yet → skeleton (NEVER deferred — the bug this fixes)", () => {
  // This is the exact pattern that produced the Direct-debit tab: a live mount
  // with no clientSecret must show a loader, not a deferred <Elements>.
  const mode = resolveElementsMode({ clientSecret: null, mock: false })
  assert.equal(mode.kind, "skeleton")
})

test("live + secret present → bound, options carry the clientSecret", () => {
  const mode = resolveElementsMode({ clientSecret: "pi_3Tuxxx_secret_abc", mock: false })
  assert.equal(mode.kind, "bound")
  // Options built from a bound mode contain the exact PI secret → Element
  // renders only the PI's methods (card).
  assert.equal(mode.kind === "bound" && mode.clientSecret, "pi_3Tuxxx_secret_abc")
})

test("mock + no secret → deferred (dev tool only; no real PI to bind to)", () => {
  const mode = resolveElementsMode({ clientSecret: null, mock: true })
  assert.equal(mode.kind, "deferred")
})

test("a real secret always binds, even if mock is somehow true (never dashboard defaults)", () => {
  const mode = resolveElementsMode({ clientSecret: "pi_live_secret", mock: true })
  assert.equal(mode.kind, "bound")
})

test("elementsKey: remounts on the secret; stable 'deferred' when absent", () => {
  assert.equal(elementsKey("pi_a"), "pi_a")
  assert.equal(elementsKey("pi_b"), "pi_b")
  assert.equal(elementsKey(null), "deferred")
})
