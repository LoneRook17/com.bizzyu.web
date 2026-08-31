// Business dashboard Home — which product sections each business shape sees (LSK-19).
//
// Runnable with the Node built-in test runner (no extra deps): `npm test`.

import { test } from "node:test"
import assert from "node:assert/strict"
import { homeSections, type HomeSectionsInput } from "./home-sections.ts"

/** Defaults to the 'events' dashboard mode; override per shape. */
const shape = (over: Partial<HomeSectionsInput> = {}): HomeSectionsInput => ({
  totalEvents: 0,
  hasLineSkipNights: false,
  showEvents: true,
  showLineSkips: true,
  showDeals: false,
  ...over,
})

// ── SHAPE: EVENTS ONLY (8 real businesses) ──────────────────────────────────

test("events only — exactly what it sees today, in events mode", () => {
  const s = homeSections(shape({ totalEvents: 23 }))
  assert.equal(s.events, true)
  assert.equal(s.lineSkips, false)
  assert.equal(s.revenueTile, true)
  assert.equal(s.dealsCard, false)
  assert.equal(s.tileCount, 3) // revenue + attendees + upcoming, as before
})

test("events only — unchanged in hybrid mode too", () => {
  const s = homeSections(shape({ totalEvents: 23, showDeals: true }))
  assert.equal(s.events, true)
  assert.equal(s.revenueTile, true)
  assert.equal(s.dealsCard, false) // the deals card never rendered beside events
  assert.equal(s.tileCount, 4) // revenue + active deals + attendees + upcoming
})

test("a business with events but ZERO revenue still sees the events section", () => {
  // Munchies: 23 events, $0. The gate is presence, so revenue never enters it —
  // there is no revenue input to this function at all.
  const s = homeSections(shape({ totalEvents: 23 }))
  assert.equal(s.events, true)
})

// ── SHAPE: LINE SKIPS ONLY (Paddock 150, Nephews 319) ───────────────────────

test("line skips only — the section appears and the event tiles do not", () => {
  const s = homeSections(shape({ hasLineSkipNights: true }))
  assert.equal(s.lineSkips, true)
  assert.equal(s.events, false) // no event tiles, no "Create an event" empty state
  assert.equal(s.dealsCard, false) // and no "No live deals" card in its place
  assert.equal(s.revenueTile, false) // the $0 event-revenue tile is gone
  assert.equal(s.tileCount, 0) // the whole top row goes; Skip the Line carries the page
})

// ── SHAPE: BOTH (Backroads 6, Munchies 306, 1785 323) ───────────────────────

test("both — event tiles as today, PLUS the Skip the Line section", () => {
  const s = homeSections(shape({ totalEvents: 12, hasLineSkipNights: true }))
  assert.equal(s.events, true)
  assert.equal(s.lineSkips, true)
  assert.equal(s.revenueTile, true)
  assert.equal(s.tileCount, 3)
})

test("both — the two figures are separate SECTIONS, so neither can absorb the other", () => {
  // Backroads is $171,782 of events against $12 of line skips. Both flags true
  // means two rows; there is no code path here that produces one combined total.
  const s = homeSections(shape({ totalEvents: 3, hasLineSkipNights: true, showDeals: true }))
  assert.equal(s.events, true)
  assert.equal(s.lineSkips, true)
})

// ── SHAPE: NIGHTS BUT NO SALES (Paddock Bar) ────────────────────────────────

test("nights scheduled and nothing sold — the section still shows, for a real $0", () => {
  // Revenue is not an input. A venue with 27 nights and no sales gets the
  // section (and a truthful $0 inside it), never a blank page.
  const s = homeSections(shape({ hasLineSkipNights: true }))
  assert.equal(s.lineSkips, true)
})

// ── SHAPE: NEITHER ──────────────────────────────────────────────────────────

test("neither product — neither section", () => {
  const s = homeSections(shape())
  assert.equal(s.events, false)
  assert.equal(s.lineSkips, false)
  assert.equal(s.tileCount, 0)
})

// ── DEALS-ONLY IS NOT COLLATERAL DAMAGE ─────────────────────────────────────

test("a deals-only business is untouched — it keeps its revenue tile", () => {
  const s = homeSections(shape({ showEvents: false, showLineSkips: false, showDeals: true }))
  assert.equal(s.events, false)
  assert.equal(s.lineSkips, false)
  assert.equal(s.dealsCard, true)
  assert.equal(s.revenueTile, true) // rendered in every mode before LSK-19; still does
  assert.equal(s.tileCount, 3) // revenue + active deals + claims, as before
})

test("a hybrid business with no events keeps deals and drops the two event tiles", () => {
  const s = homeSections(shape({ showDeals: true }))
  assert.equal(s.events, false)
  assert.equal(s.dealsCard, true)
  assert.equal(s.revenueTile, true)
  assert.equal(s.tileCount, 2) // the row shrinks to fit rather than leaving holes
})

// ── MODE IS STILL THE OPERATOR'S SWITCH ─────────────────────────────────────

test("mode can hide a product the business really runs — presence does not override it", () => {
  const s = homeSections(shape({ totalEvents: 9, hasLineSkipNights: true, showEvents: false, showLineSkips: false, showDeals: true }))
  assert.equal(s.events, false)
  assert.equal(s.lineSkips, false)
})

// ── FAILED FETCHES READ AS ABSENCE, NEVER AS A CRASH ────────────────────────

test("a zero event count and a false line-skip flag are the safe reading of a failed fetch", () => {
  const s = homeSections(shape({ totalEvents: 0, hasLineSkipNights: false }))
  assert.equal(s.events, false)
  assert.equal(s.lineSkips, false)
})

// ── MONEY TILES ARE OWNER-ONLY ──────────────────────────────────────────────

test("a manager's Home hides the revenue tile and the column count follows", () => {
  const owner = homeSections(shape({ totalEvents: 9, showEvents: true, showDeals: true, canViewRevenue: true }))
  const manager = homeSections(shape({ totalEvents: 9, showEvents: true, showDeals: true, canViewRevenue: false }))
  assert.equal(owner.revenueTile, true)
  assert.equal(manager.revenueTile, false)
  assert.equal(manager.tileCount, owner.tileCount - 1)
})

test("callers that do not state a role keep today's shapes (absent = owner)", () => {
  const s = homeSections(shape({ totalEvents: 9, showEvents: true, showDeals: true }))
  assert.equal(s.revenueTile, true)
})
