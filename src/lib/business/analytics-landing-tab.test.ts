// Analytics landing-tab selection (LSK-23).
//
// The bug: <Tabs defaultValue="deals"> meant a line-skip-only venue opened on a
// blank Deals tab. The fix is a controlled tab picked once, after the fetches
// settle. Two properties matter and are both pinned here:
//
//   1. it lands somewhere non-empty, and
//   2. it never moves again once pinned — a manual selection must survive every
//      later refetch (venue switch, revisit).
//
// Runnable with the Node built-in test runner (no extra deps): `npm test`.

import { test } from "node:test"
import assert from "node:assert/strict"
import {
  landingTab,
  resolveLandingTab,
  DEFAULT_ANALYTICS_TAB,
  type AnalyticsTabData,
} from "./analytics-landing-tab.ts"

const state = (over: Partial<AnalyticsTabData> = {}): AnalyticsTabData => ({
  settled: true,
  dealsCount: 0,
  eventsCount: 0,
  lineSkipsCount: 0,
  showEvents: true,
  ...over,
})

// ── preference order ────────────────────────────────────────────────────────

test("deals wins whenever it has data — the historical default is preserved", () => {
  assert.equal(landingTab(state({ dealsCount: 3 })), "deals")
  assert.equal(landingTab(state({ dealsCount: 3, eventsCount: 9, lineSkipsCount: 9 })), "deals")
})

test("events is next when deals is empty", () => {
  assert.equal(landingTab(state({ eventsCount: 2 })), "events")
  assert.equal(landingTab(state({ eventsCount: 2, lineSkipsCount: 5 })), "events")
})

test("a line-skip-only venue lands on line skips — the whole point of LSK-23", () => {
  assert.equal(landingTab(state({ lineSkipsCount: 4 })), "line-skips")
})

// ── the role gate is not an offerings signal ────────────────────────────────

test("a hidden Events tab is never chosen, even holding data", () => {
  // showEvents false means the trigger and content are not rendered at all;
  // landing there would show a blank page with no tab highlighted.
  assert.equal(landingTab(state({ eventsCount: 7, showEvents: false })), DEFAULT_ANALYTICS_TAB)
  assert.equal(
    landingTab(state({ eventsCount: 7, lineSkipsCount: 1, showEvents: false })),
    "line-skips",
  )
})

// ── all-empty ───────────────────────────────────────────────────────────────

test("all empty falls back to Deals, which explains itself via its EmptyState", () => {
  assert.equal(landingTab(state()), "deals")
  assert.equal(landingTab(state({ showEvents: false })), "deals")
})

test("a failed or forbidden fetch reads as empty and is skipped, never landed on", () => {
  // The page passes `?? 0` for a null payload, so an errored deals fetch looks
  // empty here and the next non-empty tab wins.
  assert.equal(landingTab(state({ dealsCount: 0, lineSkipsCount: 2 })), "line-skips")
})

// ── set-once semantics ──────────────────────────────────────────────────────

test("nothing is chosen while any fetch is still in flight", () => {
  assert.equal(resolveLandingTab(state({ settled: false, lineSkipsCount: 4 }), false), null)
})

test("the choice is made on the settle, once", () => {
  assert.equal(resolveLandingTab(state({ lineSkipsCount: 4 }), false), "line-skips")
})

test("pinned means pinned — a later refetch never re-snaps the tab", () => {
  // The operator is reading Deals; a venue switch brings back a payload where
  // only line skips have data. The tab must not move under them.
  assert.equal(resolveLandingTab(state({ lineSkipsCount: 9 }), true), null)
  // Still nothing even on a fresh settle with different data.
  assert.equal(resolveLandingTab(state({ dealsCount: 1, eventsCount: 1 }), true), null)
})

test("a manual click before the data settles wins — explicit intent outranks the heuristic", () => {
  // The page pins on click, so by the time the fetches settle, pinned is true.
  assert.equal(resolveLandingTab(state({ settled: false, lineSkipsCount: 4 }), true), null)
  assert.equal(resolveLandingTab(state({ settled: true, lineSkipsCount: 4 }), true), null)
})

test("resolveLandingTab agrees with landingTab whenever it does choose", () => {
  for (const over of [
    { dealsCount: 1 },
    { eventsCount: 1 },
    { lineSkipsCount: 1 },
    { eventsCount: 1, showEvents: false },
    {},
  ]) {
    const s = state(over)
    assert.equal(resolveLandingTab(s, false), landingTab(s))
  }
})
