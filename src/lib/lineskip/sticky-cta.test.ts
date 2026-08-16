// Guard for the sticky-bar price removal (LSK-24).
//
// The night card showed the ticket price ($1); the mobile sticky bar floating
// over it showed the fee-inclusive total ("Get Line Skip: $1.50"). Two
// different numbers on one screen, with nothing explaining the gap — customers
// read it as a bait-and-switch. The bar is now a pure call to action, and the
// breakdown lives on the phone step instead (LSK-25, order-summary.ts).
//
// The in-flow CTA deliberately still shows the total: it sits directly beneath
// the order-summary card that itemises it, so its number is explained. Only the
// floating bar was ambiguous. That distinction is asserted below, so a later
// "consistency" cleanup does not strip the wrong one.
//
// Source-level guard, in the style of promoter-view-removal.test.ts: the bar
// lives in an 1800-line JSX client component full of @/ alias imports, which the
// Node built-in test runner cannot load. The sticky-bar region is isolated
// between its two block comments so these assertions say nothing about the rest
// of the file.
//
// Runnable with the Node built-in test runner (no extra deps): `npm test`.

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const CHECKOUT = "src/app/lineskip/[slug]/LineSkipCheckoutClient.tsx"

const source = () => readFileSync(join(process.cwd(), CHECKOUT), "utf8")

function stickyBarBlock(src: string): string {
  const start = src.indexOf("Mobile sticky CTA bar")
  const end = src.indexOf("Checkout Modal", start)
  assert.ok(start !== -1 && end > start, "could not locate the sticky CTA bar block")
  return src.slice(start, end)
}

test("the sticky bar shows no price — that was the bait-and-switch", () => {
  const bar = stickyBarBlock(source())
  assert.ok(!bar.includes("formatPrice"), "a formatted price is back in the sticky bar")
  assert.ok(!bar.includes("fees.total"), "the fee-inclusive total is back in the sticky bar")
})

test("the sticky bar is still a clear CTA, in the existing product wording", () => {
  const bar = stickyBarBlock(source())
  assert.ok(bar.includes("Get Line Skip"), "the sticky CTA lost its label")
  // A rename of "Line Skip" is pending and undecided; this change must not
  // pre-empt it, so the wording is pinned as it stands.
  assert.ok(!/Skip the Line|Fast Pass|Line Pass/i.test(bar), "the product was renamed here")
})

test("the in-flow CTA keeps its total — it is the one with context", () => {
  const src = source()
  const bar = stickyBarBlock(src)
  const elsewhere = src.replace(bar, "")
  assert.ok(
    elsewhere.includes("`Get Line Skip: ${formatPrice(fees.total)}`"),
    "the in-flow CTA lost its total — it sits under the order summary and should keep it",
  )
})
