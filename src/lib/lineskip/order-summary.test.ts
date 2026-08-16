// Line-skip pre-payment cost breakdown (LSK-25) and the sticky-bar price
// removal (LSK-24).
//
// Both are about the same complaint: the buyer could not tell what they were
// going to be charged until it was too late. LSK-24 removed a total that
// contradicted the card next to it; LSK-25 put the real breakdown on the step
// before payment.
//
// The money itself is NOT under test here and is not touched by either change —
// calcFees() in LineSkipCheckoutClient is unchanged. What is under test is that
// the rows shown to the buyer add up to the amount that is charged.
//
// Runnable with the Node built-in test runner (no extra deps): `npm test`.

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  orderSummaryRows,
  summaryReconciles,
  type LineSkipFees,
} from "./order-summary.ts"

// The exact shape calcFees() returns for the case in the LSK-24 report: a $1
// ticket whose fee-inclusive total is $1.50.
const ONE_DOLLAR_TICKET: LineSkipFees = { subtotal: 100, discount: 0, service_fee: 50, total: 150 }

const labels = (f: LineSkipFees, q = 1) => orderSummaryRows(f, q).map((r) => r.label)
const byKind = (f: LineSkipFees, q = 1) =>
  Object.fromEntries(orderSummaryRows(f, q).map((r) => [r.kind, r]))

// ── the breakdown a buyer sees ──────────────────────────────────────────────

test("the events-checkout shape: Subtotal / Service fee / Total", () => {
  assert.deepEqual(labels(ONE_DOLLAR_TICKET), ["Subtotal", "Service fee", "Total"])
})

test("the $1 ticket that started LSK-24 breaks down to the $1.50 actually charged", () => {
  const rows = byKind(ONE_DOLLAR_TICKET)
  assert.equal(rows.subtotal.cents, 100)
  assert.equal(rows.fee.cents, 50)
  assert.equal(rows.total.cents, 150)
  assert.ok(summaryReconciles(ONE_DOLLAR_TICKET), "100 - 0 + 50 must equal 150")
})

test("no discount row unless a promo actually reduced the price", () => {
  assert.ok(!labels(ONE_DOLLAR_TICKET).includes("Promo discount"))
  const promo: LineSkipFees = { subtotal: 1000, discount: 250, service_fee: 88, total: 838 }
  assert.deepEqual(labels(promo), ["Subtotal", "Promo discount", "Service fee", "Total"])
  assert.equal(byKind(promo).discount.cents, -250, "the discount row renders negative")
  assert.ok(summaryReconciles(promo), "1000 - 250 + 88 must equal 838")
})

test("quantity decorates only the subtotal label — every figure already includes it", () => {
  const two: LineSkipFees = { subtotal: 200, discount: 0, service_fee: 100, total: 300 }
  assert.deepEqual(labels(two, 2), ["Subtotal (× 2)", "Service fee", "Total"])
  assert.equal(byKind(two, 2).subtotal.cents, 200, "the label carries the quantity, not the math")
  assert.deepEqual(labels(two, 1), ["Subtotal", "Service fee", "Total"])
})

test("a zero fee and a free night say Free rather than $0.00", () => {
  const free: LineSkipFees = { subtotal: 0, discount: 0, service_fee: 0, total: 0 }
  const rows = byKind(free)
  assert.equal(rows.fee.free, true)
  assert.equal(rows.total.free, true)
  // A paid ticket with a waived fee: fee is Free, total is not.
  const waived: LineSkipFees = { subtotal: 500, discount: 0, service_fee: 0, total: 500 }
  assert.equal(byKind(waived).fee.free, true)
  assert.equal(byKind(waived).total.free, false)
})

test("a promo covering the whole ticket still reconciles", () => {
  const comped: LineSkipFees = { subtotal: 500, discount: 500, service_fee: 0, total: 0 }
  assert.ok(summaryReconciles(comped))
  assert.equal(byKind(comped).total.free, true)
})

test("Total is always the last row — it is the number that matters", () => {
  for (const f of [
    ONE_DOLLAR_TICKET,
    { subtotal: 1000, discount: 250, service_fee: 88, total: 838 },
    { subtotal: 0, discount: 0, service_fee: 0, total: 0 },
  ]) {
    const rows = orderSummaryRows(f, 1)
    assert.equal(rows[rows.length - 1].kind, "total")
  }
})

// ── the breakdown actually reaches the phone step ───────────────────────────
//
// Source-level guard, in the style of promoter-view-removal.test.ts: the modal
// lives in an 1800-line JSX client component that the Node test runner cannot
// load. This pins the wiring — that the summary card renders these rows from
// the shared `fees` object rather than a second, drifting calculation.

const checkoutSource = () =>
  readFileSync(join(process.cwd(), "src/app/lineskip/[slug]/LineSkipCheckoutClient.tsx"), "utf8")

test("the checkout modal renders the breakdown from the shared fees object", () => {
  const src = checkoutSource()
  assert.ok(
    src.includes('from "@/lib/lineskip/order-summary"'),
    "the modal no longer imports the shared breakdown",
  )
  assert.ok(
    src.includes("orderSummaryRows(fees, quantity)"),
    "the modal is not driving its rows from the shared `fees` — it may be recomputing",
  )
})

test("the summary card is still hidden on the pay and outcome steps", () => {
  // The pay step has the server's own breakdown, and by the outcome steps the
  // money question is settled. Adding rows must not have changed when the card
  // appears — only what it contains.
  const src = checkoutSource()
  assert.ok(
    src.includes('checkoutStep !== "pay" && !isOutcomeStep'),
    "the summary card's visibility condition changed",
  )
})
