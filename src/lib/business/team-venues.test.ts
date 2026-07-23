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
  isScopedEditor,
  venueEditorModel,
  editorCommitVenueIds,
  inviteDefaultVenueIds,
  inviteVenuePayload,
  venueIdsLabel,
  lockedVenueChips,
  isVenueScopeForbidden,
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

// ── TM-B3 (#15b): editor-scoped assignment (managers + invite) ─────────────

const OWNER = { role: "owner", venueIds: [] }
const GLOBAL_MGR = { role: "manager", venueIds: [] }
const SCOPED_MGR = { role: "manager", venueIds: [1, 2] } // owns Backroads + The Cellar
const STAFF = { role: "staff", venueIds: [1] }

// --- isScopedEditor ---------------------------------------------------------

test("isScopedEditor: only a manager with a non-empty own set is scoped", () => {
  assert.equal(isScopedEditor(OWNER), false)        // owners are never scoped
  assert.equal(isScopedEditor(GLOBAL_MGR), false)   // empty own set = global
  assert.equal(isScopedEditor(SCOPED_MGR), true)
  assert.equal(isScopedEditor({ role: "owner", venueIds: [1] }), false) // owner ignores set
})

// --- venueEditorModel: the render matrix -----------------------------------

test("venueEditorModel: OWNER is unrestricted — all selectable, global allowed, nothing locked", () => {
  const m = venueEditorModel(OWNER, [2], VENUES)
  assert.deepEqual(m.selectableVenues, VENUES)
  assert.equal(m.allowGlobal, true)
  assert.deepEqual(m.lockedVenueIds, [])
  assert.equal(m.canEdit, true)
})

test("venueEditorModel: GLOBAL manager is unrestricted too", () => {
  const m = venueEditorModel(GLOBAL_MGR, [], VENUES)
  assert.deepEqual(m.selectableVenues, VENUES)
  assert.equal(m.allowGlobal, true)
  assert.deepEqual(m.lockedVenueIds, [])
  assert.equal(m.canEdit, true)
})

test("venueEditorModel: SCOPED manager — only own venues selectable, global hidden", () => {
  const m = venueEditorModel(SCOPED_MGR, [1], VENUES)
  assert.deepEqual(m.selectableVenues, [{ id: 1, name: "Backroads" }, { id: 2, name: "The Cellar" }])
  assert.equal(m.allowGlobal, false)
  assert.deepEqual(m.lockedVenueIds, []) // member's venue (1) is inside the manager's scope
  assert.equal(m.canEdit, true)
})

test("venueEditorModel: SCOPED manager — member's OUT-OF-SCOPE venues lock (preserved)", () => {
  // Member is assigned venues 1 (in scope) + 3 (Rooftop, OUT of the manager's 1,2 scope).
  const m = venueEditorModel(SCOPED_MGR, [1, 3], VENUES)
  assert.deepEqual(m.selectableVenues.map((v) => v.id), [1, 2])
  assert.equal(m.allowGlobal, false)
  assert.deepEqual(m.lockedVenueIds, [3]) // Rooftop is locked — the manager can't touch it
})

test("venueEditorModel: STAFF cannot edit venue scope", () => {
  const m = venueEditorModel(STAFF, [1], VENUES)
  assert.equal(m.canEdit, false)
})

// --- editorCommitVenueIds: payload = selection ∪ preserved (locked) --------

test("editorCommitVenueIds: unrestricted editor commits exactly the selection", () => {
  const m = venueEditorModel(OWNER, [], VENUES)
  assert.deepEqual(editorCommitVenueIds(m, [3, 1]), [1, 3])   // dedup + sort
  assert.deepEqual(editorCommitVenueIds(m, []), [])            // empty = clear-to-global
})

test("editorCommitVenueIds: scoped editor ALWAYS re-includes locked ids", () => {
  const m = venueEditorModel(SCOPED_MGR, [1, 3], VENUES) // locked = [3]
  // Manager selects only venue 2 of their own; locked 3 must survive the PUT.
  assert.deepEqual(editorCommitVenueIds(m, [2]), [2, 3])
  // Manager clears all of their own; locked 3 still preserved (never global).
  assert.deepEqual(editorCommitVenueIds(m, []), [3])
})

// --- inviteDefaultVenueIds --------------------------------------------------

test("inviteDefaultVenueIds: owner/global default to global (empty)", () => {
  assert.deepEqual(inviteDefaultVenueIds(OWNER), [])
  assert.deepEqual(inviteDefaultVenueIds(GLOBAL_MGR), [])
})

test("inviteDefaultVenueIds: scoped manager defaults to all their own venues (minimum-one satisfied)", () => {
  assert.deepEqual(inviteDefaultVenueIds(SCOPED_MGR), [1, 2])
  assert.deepEqual(inviteDefaultVenueIds({ role: "manager", venueIds: [3, 1] }), [1, 3]) // sorted
})

// --- inviteVenuePayload: venue_ids + back-compat scalar mirror --------------

test("inviteVenuePayload: single venue → array + scalar mirror", () => {
  assert.deepEqual(inviteVenuePayload([2]), { venue_ids: [2], venue_id: 2 })
})

test("inviteVenuePayload: multi-venue set → array, scalar null (set inexpressible for old services)", () => {
  assert.deepEqual(inviteVenuePayload([3, 1]), { venue_ids: [1, 3], venue_id: null })
})

test("inviteVenuePayload: global (empty) → empty array, scalar null", () => {
  assert.deepEqual(inviteVenuePayload([]), { venue_ids: [], venue_id: null })
})

// --- venueIdsLabel: trigger/summary label for a raw id list ----------------

test("venueIdsLabel: global / single / multi", () => {
  assert.equal(venueIdsLabel([], VENUES), "All venues (global)")
  assert.equal(venueIdsLabel([2], VENUES), "The Cellar")
  assert.equal(venueIdsLabel([1, 3], VENUES), "2 venues: Backroads, Rooftop")
  assert.equal(venueIdsLabel([99], VENUES), "Venue #99") // unknown → placeholder
})

// --- lockedVenueChips: resolve names (prefer the member's own set) ---------

test("lockedVenueChips: names resolved from the member's set, then the venue list", () => {
  const member = { venue_id: null, venues: [{ venue_id: 3, name: "Rooftop" }] }
  assert.deepEqual(lockedVenueChips([3], member, VENUES), [{ id: 3, name: "Rooftop" }])
  // Not in the member set → fall back to the venue list.
  assert.deepEqual(lockedVenueChips([1], { venue_id: null }, VENUES), [{ id: 1, name: "Backroads" }])
  // Unknown everywhere → placeholder.
  assert.deepEqual(lockedVenueChips([99], { venue_id: null }, VENUES), [{ id: 99, name: "Venue #99" }])
})

// --- isVenueScopeForbidden: robust 403 detection ---------------------------

test("isVenueScopeForbidden: matches on body.code, body.error, or message", () => {
  assert.equal(isVenueScopeForbidden({ status: 403, body: { code: "VENUE_SCOPE_FORBIDDEN" } }), true)
  assert.equal(isVenueScopeForbidden({ status: 403, body: { error: "VENUE_SCOPE_FORBIDDEN" } }), true)
  assert.equal(isVenueScopeForbidden({ status: 403, message: "denied: VENUE_SCOPE_FORBIDDEN" }), true)
})

test("isVenueScopeForbidden: false for non-403, wrong code, or non-objects", () => {
  assert.equal(isVenueScopeForbidden({ status: 400, body: { code: "VENUE_SCOPE_FORBIDDEN" } }), false)
  assert.equal(isVenueScopeForbidden({ status: 403, body: { code: "SOMETHING_ELSE" } }), false)
  assert.equal(isVenueScopeForbidden({ status: 403 }), false)
  assert.equal(isVenueScopeForbidden(null), false)
  assert.equal(isVenueScopeForbidden("nope"), false)
})
