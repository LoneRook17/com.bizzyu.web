// Analytics host copy (D-P5). The Weekly Access tab used to read "Line skips".
// These strings are the only ones the Analytics page, its empty states, and
// the Analytics help copy render — pin that none of them still name the old
// product, and that the student "Door Access" string stays off this surface.

import { test } from "node:test"
import assert from "node:assert/strict"
import { WEEKLY_ACCESS_SECTION_LABEL } from "./door-access.ts"
import {
  ANALYTICS_ACCESS_TAB_LABEL,
  ANALYTICS_HOST_COPY,
} from "./analytics-copy.ts"

const BANNED = /line\s*skip|skip the line|door access/i

test("Analytics tab uses the host Weekly Cover name (renamed from Weekly Access)", () => {
  assert.equal(ANALYTICS_ACCESS_TAB_LABEL, WEEKLY_ACCESS_SECTION_LABEL)
  assert.equal(ANALYTICS_ACCESS_TAB_LABEL, "Weekly Cover")
})

test("no host-facing Analytics copy says line skip or Door Access", () => {
  assert.ok(ANALYTICS_HOST_COPY.length > 0)
  for (const s of ANALYTICS_HOST_COPY) {
    assert.doesNotMatch(s, BANNED, JSON.stringify(s))
  }
})
