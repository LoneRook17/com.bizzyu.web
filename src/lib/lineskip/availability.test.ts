// LS-UI-2 picker states. Customer-facing rule: limited-but-open reads the SAME
// as unlimited ("available"); only a truly sold-out night is distinct. No count
// ever leaves this module. Runs with the Node built-in test runner: `npm test`.

import { test } from "node:test"
import assert from "node:assert/strict"
import { nightAvailability, remainingCapacity } from "./availability.ts"

test("unlimited night → available (no count disclosed)", () => {
  assert.equal(nightAvailability({ capacity: null, tickets_sold: 40 }), "available")
})

test("capacity-limited but open → available, IDENTICAL to unlimited (the LS-UI-2 fix)", () => {
  // The exact case that used to render "1 left" + a capacity bar.
  assert.equal(nightAvailability({ capacity: 1, tickets_sold: 0 }), "available")
  assert.equal(nightAvailability({ capacity: 100, tickets_sold: 99 }), "available")
})

test("sold out (sold ≥ capacity) → distinct sold_out state kept", () => {
  assert.equal(nightAvailability({ capacity: 5, tickets_sold: 5 }), "sold_out")
  assert.equal(nightAvailability({ capacity: 5, tickets_sold: 6 }), "sold_out")
})

test("remainingCapacity: internal clamp only — null when unlimited", () => {
  assert.equal(remainingCapacity({ capacity: null, tickets_sold: 3 }), null)
  assert.equal(remainingCapacity({ capacity: 10, tickets_sold: 3 }), 7)
  assert.equal(remainingCapacity({ capacity: 1, tickets_sold: 0 }), 1)
})
