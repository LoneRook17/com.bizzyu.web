// TM-B2 (#15) — Venue-SET team membership contract logic. Runs under the repo's
// built-in runner (`node --test`, no extra deps): see venue-campus.test.ts.
//
// Proves the contract the services half (TM-B1) must match, and the grandfather
// guarantee: legacy rows (no `venues` field) behave byte-identically to today.

import { test } from "node:test"
import assert from "node:assert/strict"
import {
  memberVenueIds,
  userVenueIds,
  venueScopeLabel,
  memberVenuesPayload,
  memberVenuesPath,
  resolveSwitcherScope,
  initialSetSelection,
} from "./team-venues.ts"

const VENUES = [
  { id: 1, name: "Backroads" },
  { id: 2, name: "The Cellar" },
  { id: 3, name: "Rooftop" },
]

// --- memberVenueIds: 0 / 1 / N + legacy grandfather -----------------------

test("memberVenueIds: absent `venues` field → scalar fallback (grandfather)", () => {
  // Legacy global: no venues field, venue_id null.
  assert.deepEqual(memberVenueIds({ venue_id: null }), [])
  // Legacy single-venue: no venues field, scalar venue_id set.
  assert.deepEqual(memberVenueIds({ venue_id: 2 }), [2])
})

test("memberVenueIds: empty `venues` array is treated as legacy (falls back to scalar)", () => {
  assert.deepEqual(memberVenueIds({ venue_id: 2, venues: [] }), [2])
  assert.deepEqual(memberVenueIds({ venue_id: null, venues: [] }), [])
})

test("memberVenueIds: non-empty set wins over the scalar", () => {
  assert.deepEqual(
    memberVenueIds({ venue_id: 9, venues: [{ venue_id: 1, name: "Backroads" }, { venue_id: 3, name: "Rooftop" }] }),
    [1, 3],
  )
  // Single-element set.
  assert.deepEqual(memberVenueIds({ venue_id: null, venues: [{ venue_id: 2, name: "The Cellar" }] }), [2])
})

// --- userVenueIds: the /me shape (venue_ids ?? scalar) --------------------

test("userVenueIds: legacy /me (no venue_ids) collapses to the scalar", () => {
  assert.deepEqual(userVenueIds(null), [])
  assert.deepEqual(userVenueIds(undefined), [])
  assert.deepEqual(userVenueIds({ venue_id: null }), [])
  assert.deepEqual(userVenueIds({ venue_id: 5 }), [5])
})

test("userVenueIds: venue_ids set wins; empty falls back to scalar", () => {
  assert.deepEqual(userVenueIds({ venue_id: 9, venue_ids: [1, 2] }), [1, 2])
  assert.deepEqual(userVenueIds({ venue_id: 9, venue_ids: [] }), [9])
  assert.deepEqual(userVenueIds({ venue_id: null, venue_ids: null }), [])
})

// --- venueScopeLabel: "Global" / "1 venue: X" / "N venues: X, Y" ----------

test("venueScopeLabel: global (empty)", () => {
  assert.equal(venueScopeLabel({ venue_id: null }, VENUES), "Global")
  assert.equal(venueScopeLabel({ venue_id: null, venues: [] }, VENUES), "Global")
})

test("venueScopeLabel: single venue via scalar and via set", () => {
  // Scalar with venue_name present.
  assert.equal(venueScopeLabel({ venue_id: 1, venue_name: "Backroads" }), "1 venue: Backroads")
  // Scalar, name resolved from the venue list.
  assert.equal(venueScopeLabel({ venue_id: 2 }, VENUES), "1 venue: The Cellar")
  // Single-element set carries its own name.
  assert.equal(venueScopeLabel({ venue_id: null, venues: [{ venue_id: 3, name: "Rooftop" }] }), "1 venue: Rooftop")
})

test("venueScopeLabel: multi-venue lists names in set order", () => {
  assert.equal(
    venueScopeLabel({ venue_id: null, venues: [{ venue_id: 1, name: "Backroads" }, { venue_id: 2, name: "The Cellar" }] }),
    "2 venues: Backroads, The Cellar",
  )
})

test("venueScopeLabel: unknown venue falls back to a placeholder name", () => {
  assert.equal(venueScopeLabel({ venue_id: 99 }, VENUES), "1 venue: Venue #99")
})

// --- memberVenuesPayload: PUT body shapes (incl. clear-to-global) ---------

test("memberVenuesPayload: clear-to-global is an empty array", () => {
  assert.deepEqual(memberVenuesPayload([]), { venue_ids: [] })
})

test("memberVenuesPayload: de-dups, drops non-finite, sorts deterministically", () => {
  assert.deepEqual(memberVenuesPayload([3, 1, 2]), { venue_ids: [1, 2, 3] })
  assert.deepEqual(memberVenuesPayload([2, 2, 1]), { venue_ids: [1, 2] })
  assert.deepEqual(memberVenuesPayload([1, NaN, 2, Infinity]), { venue_ids: [1, 2] })
})

test("memberVenuesPath: set-aware endpoint", () => {
  assert.equal(memberVenuesPath(42), "/business/team/members/42/venues")
})

// --- resolveSwitcherScope: global / single / set --------------------------

test("resolveSwitcherScope: global (empty) — no restriction, no lock", () => {
  const s = resolveSwitcherScope([], VENUES)
  assert.equal(s.mode, "global")
  assert.deepEqual(s.venues, VENUES)
  assert.equal(s.lockedVenueId, null)
})

test("resolveSwitcherScope: single — restrict to one, hard lock", () => {
  const s = resolveSwitcherScope([2], VENUES)
  assert.equal(s.mode, "single")
  assert.deepEqual(s.venues, [{ id: 2, name: "The Cellar" }])
  assert.equal(s.lockedVenueId, 2)
})

test("resolveSwitcherScope: set (>1) — restrict to the set, switchable (no lock)", () => {
  const s = resolveSwitcherScope([1, 3], VENUES)
  assert.equal(s.mode, "set")
  assert.deepEqual(s.venues, [{ id: 1, name: "Backroads" }, { id: 3, name: "Rooftop" }])
  assert.equal(s.lockedVenueId, null)
})

// --- initialSetSelection: default all-of-mine, honor in-set prefs only -----

test("initialSetSelection: defaults to all-of-mine (union)", () => {
  assert.equal(initialSetSelection([1, 3], null, null), "all")
})

test("initialSetSelection: URL 'all' wins", () => {
  assert.equal(initialSetSelection([1, 3], "all", "1"), "all")
})

test("initialSetSelection: URL venue honored only when inside the set", () => {
  assert.equal(initialSetSelection([1, 3], "3", null), 3)
  // Venue 2 is outside the set → ignored, default all.
  assert.equal(initialSetSelection([1, 3], "2", null), "all")
})

test("initialSetSelection: stored preference honored only when inside the set", () => {
  assert.equal(initialSetSelection([1, 3], null, "1"), 1)
  assert.equal(initialSetSelection([1, 3], null, "all"), "all")
  assert.equal(initialSetSelection([1, 3], null, "2"), "all")
})
