// Never-blank promoter Name on event analytics (Promoter Performance).
// The live views bind Name through promoterDisplayName; this pins the
// fallbacks so an empty legacy promoter_name cannot blank the cell.
//
// Runnable with the Node built-in test runner: `npm test`.

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  PROMOTER_NAME_FALLBACK,
  promoterDisplayName,
} from "./promoter-display-name.ts"

const SRC = join(process.cwd(), "src")

const VIEWS = [
  "components/business/v2/events/EventAnalyticsView.tsx",
  "components/business/dashboard/EventAnalyticsView.tsx",
  "components/business/v2/analytics/EventsOverview.tsx",
]

test("display_name wins over promoter_name", () => {
  assert.equal(
    promoterDisplayName({ display_name: "Alex Rivera", promoter_name: "Legacy" }),
    "Alex Rivera",
  )
})

test("non-empty promoter_name is used when no display_name", () => {
  assert.equal(promoterDisplayName({ promoter_name: "Sam Lee", code: "SAM10" }), "Sam Lee")
})

test("empty and whitespace promoter_name are missing", () => {
  assert.equal(promoterDisplayName({ promoter_name: "", code: "JULES" }), "JULES")
  assert.equal(promoterDisplayName({ promoter_name: "   ", code: "JULES" }), "JULES")
  assert.equal(promoterDisplayName({ promoter_name: null, code: "JULES" }), "JULES")
})

test("the reported blank-name row with sales still shows a name", () => {
  // Blank Name, Clicks 0, Sales 1, Commission $4.00: code is the visible label.
  assert.equal(
    promoterDisplayName({
      promoter_name: "",
      code: "MAYA4",
      first_name: "",
      last_name: "",
      email: "",
    }),
    "MAYA4",
  )
})

test("first + last join when both are present", () => {
  assert.equal(
    promoterDisplayName({ promoter_name: "", first_name: "Maya", last_name: "Chen" }),
    "Maya Chen",
  )
})

test("a single first or last name is enough", () => {
  assert.equal(promoterDisplayName({ promoter_name: "", first_name: "Maya" }), "Maya")
  assert.equal(promoterDisplayName({ promoter_name: "", last_name: "Chen" }), "Chen")
})

test("email local-part is used when names are missing", () => {
  assert.equal(
    promoterDisplayName({ promoter_name: "", email: "maya.chen@campus.edu", code: "X" }),
    "maya.chen",
  )
})

test("email without a local-part is skipped", () => {
  assert.equal(
    promoterDisplayName({ promoter_name: "", email: "@campus.edu", code: "X" }),
    "X",
  )
})

test("last resort is Promoter, never an empty string", () => {
  assert.equal(promoterDisplayName({ promoter_name: "" }), PROMOTER_NAME_FALLBACK)
  assert.equal(promoterDisplayName({}), PROMOTER_NAME_FALLBACK)
  assert.ok(promoterDisplayName({ promoter_name: "  ", code: "  " }).length > 0)
})

test("analytics promoter tables bind Name through the helper", () => {
  for (const rel of VIEWS) {
    const src = readFileSync(join(SRC, rel), "utf8")
    assert.ok(
      src.includes("promoterDisplayName"),
      `${rel} must call promoterDisplayName so Name is never blank`,
    )
    assert.ok(
      !src.includes("{link.promoter_name}"),
      `${rel} still binds Name to promoter_name only`,
    )
  }
})
