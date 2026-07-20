// LS-UI-2 scroll-trap regression guard. The checkout modal panel must always be
// able to scroll its own overflow and cap its height, so the tall pay-step
// content can never trap the buyer above the Pay button again.
// Runs with the Node built-in test runner: `npm test`.

import { test } from "node:test"
import assert from "node:assert/strict"
import { CHECKOUT_PANEL_CLASS } from "./checkout-modal.ts"

test("panel scrolls its own overflow", () => {
  assert.ok(CHECKOUT_PANEL_CLASS.includes("overflow-y-auto"), "must allow vertical scroll")
})

test("panel caps its height so it never exceeds the viewport", () => {
  assert.match(CHECKOUT_PANEL_CLASS, /max-h-\[\d+dvh\]/, "must have a viewport-relative max height")
})

test("scroll is contained, never chaining to the body behind the overlay", () => {
  assert.ok(CHECKOUT_PANEL_CLASS.includes("overscroll-contain"))
})
