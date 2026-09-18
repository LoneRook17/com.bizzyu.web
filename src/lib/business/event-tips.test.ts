// Tipping Slice 3: event analytics shows Tips separate from Revenue.
//
// `revenue.tips` is absent on services deploys that predate Slice 3, so the
// reader must coerce missing / null / NaN to 0 and the Tips tile must hide at
// 0 (tip-off businesses see an unchanged page). The source pins keep every
// analytics view reading tips through the helper, and keep tips out of the
// Revenue figure.
//
// Runnable with the Node built-in test runner: `npm test`.

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  TIPS_TILE_CAPTION,
  TIPS_TILE_TITLE,
  eventTips,
  showTipsTile,
  takeHomeWithTips,
} from "./event-tips.ts"

const SRC = join(process.cwd(), "src")

const VIEWS = [
  "components/business/v2/events/EventAnalyticsView.tsx",
  "components/business/dashboard/EventAnalyticsView.tsx",
  "components/business/v2/analytics/EventsOverview.tsx",
]

test("reads tips in USD from the revenue object", () => {
  assert.equal(eventTips({ tips: 1.5 }), 1.5)
  assert.equal(eventTips({ tips: 42 }), 42)
})

test("missing tips (services not deployed yet) reads as 0", () => {
  assert.equal(eventTips({}), 0)
  assert.equal(eventTips(undefined), 0)
  assert.equal(eventTips(null), 0)
})

test("null, NaN, Infinity and junk tips read as 0", () => {
  assert.equal(eventTips({ tips: null }), 0)
  assert.equal(eventTips({ tips: NaN }), 0)
  assert.equal(eventTips({ tips: Infinity }), 0)
  assert.equal(eventTips({ tips: "abc" }), 0)
  assert.equal(eventTips({ tips: "" }), 0)
  assert.equal(eventTips({ tips: {} }), 0)
})

test("negative tips read as 0", () => {
  assert.equal(eventTips({ tips: -3 }), 0)
})

test("numeric string tips (mysql DECIMAL) are coerced", () => {
  assert.equal(eventTips({ tips: "12.50" }), 12.5)
})

test("Tips tile hides at 0 and when the field is missing", () => {
  assert.equal(showTipsTile({}), false)
  assert.equal(showTipsTile(undefined), false)
  assert.equal(showTipsTile({ tips: 0 }), false)
  assert.equal(showTipsTile({ tips: NaN }), false)
})

test("Tips tile shows when there are tips", () => {
  assert.equal(showTipsTile({ tips: 0.01 }), true)
  assert.equal(showTipsTile({ tips: 1.5 }), true)
})

test("take-home incl. tips comes only from the API, null when absent", () => {
  assert.equal(takeHomeWithTips({ take_home_with_tips: 101.5 }), 101.5)
  assert.equal(takeHomeWithTips({ tips: 1.5 }), null)
  assert.equal(takeHomeWithTips({ take_home_with_tips: null }), null)
  assert.equal(takeHomeWithTips({ take_home_with_tips: NaN }), null)
  assert.equal(takeHomeWithTips(undefined), null)
})

test("tips copy never calls tips revenue", () => {
  assert.equal(TIPS_TILE_TITLE, "Tips")
  assert.doesNotMatch(TIPS_TILE_TITLE, /revenue/i)
  assert.match(TIPS_TILE_CAPTION, /not included in revenue/i)
})

for (const rel of VIEWS) {
  test(`${rel} renders Tips through the helper, gated on showTipsTile`, () => {
    const src = readFileSync(join(SRC, rel), "utf8")
    assert.ok(src.includes("showTipsTile(data.revenue)"), "Tips tile must be gated on showTipsTile")
    assert.ok(src.includes("eventTips(data.revenue)"), "Tips amount must come from eventTips")
    assert.ok(src.includes("TIPS_TILE_TITLE"), "Tips tile must use the shared title")
    assert.ok(!/revenue\??\.tips/.test(src), "views must not read revenue.tips directly")
  })

  test(`${rel} keeps Revenue on revenue.revenue and never adds tips into it`, () => {
    const src = readFileSync(join(SRC, rel), "utf8")
    assert.ok(src.includes("data.revenue?.revenue ?? 0"), "Revenue tile must still read revenue.revenue")
    assert.ok(!/\+\s*eventTips\(|eventTips\([^)]*\)\s*\+/.test(src), "tips must never be summed on the web")
  })
}
