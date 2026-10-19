// Sales tax withheld (Update ALPHA) - event analytics shows "$X of revenue
// withheld for sales tax" directly above Tips, only when the API reports
// included-mode tax. Pure rules + source pins. Runnable with `npm test`.

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  TAX_WITHHELD_SUFFIX,
  hasTaxWithheld,
  taxWithheldCents,
  taxWithheldLabel,
  taxWithheldUsd,
} from "./event-tax.ts"

const usd = (n: number) => `$${n.toFixed(2)}`

test("tax_withheld_cents: integer cents pass through; int / numeric string parse", () => {
  assert.equal(taxWithheldCents({ tax_withheld_cents: 1085 }), 1085)
  assert.equal(taxWithheldCents({ tax_withheld_cents: "167" }), 167)
  assert.equal(taxWithheldUsd({ tax_withheld_cents: 167 }), 1.67)
})

test("missing / null / NaN / negative / zero reads as 0 and hides the row", () => {
  for (const revenue of [undefined, null, {}, { tax_withheld_cents: null }, { tax_withheld_cents: "abc" }, { tax_withheld_cents: -5 }, { tax_withheld_cents: 0 }, { tax_withheld_cents: true }]) {
    assert.equal(taxWithheldCents(revenue as never), 0)
    assert.equal(hasTaxWithheld(revenue as never), false)
  }
})

test("row copy is exactly `$X of revenue withheld for sales tax`", () => {
  assert.equal(taxWithheldLabel({ tax_withheld_cents: 1000 }, usd), "$10.00 of revenue withheld for sales tax")
  assert.equal(TAX_WITHHELD_SUFFIX, " of revenue withheld for sales tax")
  assert.ok(!TAX_WITHHELD_SUFFIX.includes("—") && !TAX_WITHHELD_SUFFIX.includes("–"))
})

test("the withheld figure is never added back into Revenue (no client math on revenue)", () => {
  const src = readFileSync(join(import.meta.dirname, "event-tax.ts"), "utf8")
  assert.ok(!/revenue\s*\+|\+\s*taxWithheld/.test(src))
})

// Source pins: both analytics views render the row through the helper, gated
// on hasTaxWithheld, and place it inside the Revenue card (above the Tips tile).
for (const rel of [
  "../../components/business/v2/events/EventAnalyticsView.tsx",
  "../../components/business/v2/analytics/EventsOverview.tsx",
]) {
  test(`${rel.split("/").pop()} renders the withheld row above Tips, gated on hasTaxWithheld`, () => {
    const src = readFileSync(join(import.meta.dirname, rel), "utf8")
    assert.ok(src.includes("hasTaxWithheld(data.revenue)"), "gated on hasTaxWithheld")
    assert.ok(src.includes("taxWithheldLabel(data.revenue, usd)"), "copy comes from the helper")
    const row = src.indexOf("taxWithheldLabel(data.revenue, usd)")
    const tips = src.indexOf("eventTipsVisible(data, perScanner)")
    assert.ok(row > 0 && tips > row, "the withheld row is rendered before the Tips tile")
  })
}
