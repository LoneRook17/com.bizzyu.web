// Unit tests for the venue-scoped payouts decision layer (PAYOUTS-PER-PERSON-
// ACCESS, web half). These pin the EXACT rules the payouts page + ReconcileView
// wire — the calm "pick a venue" chooser (line-skips pattern), the sibling-hide
// under scope_restricted, the 403/404 fallbacks, and the switcher-sync intent —
// so a component edit can't drift them. Node built-in runner: `npm test`.

import { test } from "node:test"
import assert from "node:assert/strict"
import {
  isScopedPayoutsMember,
  shouldShowVenuePicker,
  pickerVenueList,
  hideCombinedAccount,
  scopeRequiredVenuesFromError,
  scoped404IsOutOfScope,
  venuePickIntent,
  PAYOUTS_VENUE_PICKER_COPY,
  type PayoutsAccess,
  type ScopeVenue,
} from "./payouts-scope.ts"

// /me payouts_access fixtures ----------------------------------------------------
const owner: PayoutsAccess = { granted: true, all_venues: true }
const globalMember: PayoutsAccess = { granted: true, all_venues: true }
const scopedTwo: PayoutsAccess = {
  granted: true,
  all_venues: false,
  venues: [
    { id: 261, name: "Brewhouse" },
    { id: 262, name: "Nauti" },
  ],
}
const notGranted: PayoutsAccess = { granted: false, all_venues: false }

// ── isScopedPayoutsMember ────────────────────────────────────────────────────

test("isScopedPayoutsMember: granted AND not all-venues → true (owner/global/absent → false)", () => {
  assert.equal(isScopedPayoutsMember(scopedTwo), true)
  assert.equal(isScopedPayoutsMember(owner), false)
  assert.equal(isScopedPayoutsMember(globalMember), false)
  assert.equal(isScopedPayoutsMember(notGranted), false) // not granted ⇒ never scoped-picker
  assert.equal(isScopedPayoutsMember(undefined), false) // pre-contract /me
  assert.equal(isScopedPayoutsMember(null), false)
})

// ── shouldShowVenuePicker: the picker-state decision ─────────────────────────

test("picker: scoped member on All venues → picker; on a selected venue → data", () => {
  assert.equal(shouldShowVenuePicker({ isAllVenues: true, access: scopedTwo }), true)
  assert.equal(shouldShowVenuePicker({ isAllVenues: false, access: scopedTwo }), false)
})

test("picker: owner + global members NEVER see it (all-venues OR a selected venue)", () => {
  assert.equal(shouldShowVenuePicker({ isAllVenues: true, access: owner }), false)
  assert.equal(shouldShowVenuePicker({ isAllVenues: false, access: owner }), false)
  assert.equal(shouldShowVenuePicker({ isAllVenues: true, access: globalMember }), false)
  // A stray scopeForced can't be produced for them (server never 403s / the 404
  // path is gated on scoped), but even the primary predicate stays false.
  assert.equal(shouldShowVenuePicker({ isAllVenues: false, access: owner, scopeForced: false }), false)
})

test("picker: a scopeForced fetch (VENUE_SCOPE_REQUIRED 403 / out-of-scope 404) forces the chooser", () => {
  // Even with a pre-contract /me (no access) — a 403 provably means scoped.
  assert.equal(shouldShowVenuePicker({ isAllVenues: false, access: undefined, scopeForced: true }), true)
  // And with a selected (out-of-scope) venue for a scoped member.
  assert.equal(shouldShowVenuePicker({ isAllVenues: false, access: scopedTwo, scopeForced: true }), true)
})

test("picker: no access + All venues (owner-role fallback session) → NOT the scoped picker", () => {
  // A pre-contract /me with no payouts_access renders today's all-venues view;
  // only a real VENUE_SCOPE_REQUIRED 403 (scopeForced) would flip it to the picker.
  assert.equal(shouldShowVenuePicker({ isAllVenues: true, access: undefined }), false)
})

// ── pickerVenueList: the venue-list source ───────────────────────────────────

test("venue list: prefers payouts_access.venues", () => {
  assert.deepEqual(pickerVenueList(scopedTwo, null), scopedTwo.venues)
})

test("venue list: falls back to the 403-body venues when /me carried none", () => {
  const fromBody: ScopeVenue[] = [{ id: 7, name: "Only From 403" }]
  // /me had no payouts_access (pre-contract) → use the 403 body.
  assert.deepEqual(pickerVenueList(undefined, fromBody), fromBody)
  // access present but without a venues array (defensive) → still the body.
  assert.deepEqual(pickerVenueList({ granted: true, all_venues: false }, fromBody), fromBody)
})

test("venue list: neither source → empty (caller falls back to the switcher's set)", () => {
  assert.deepEqual(pickerVenueList(undefined, null), [])
  assert.deepEqual(pickerVenueList({ granted: true, all_venues: false, venues: [] }, []), [])
})

// ── hideCombinedAccount: scope_restricted → hide the combined table ──────────

test("hide-combined: scope_restricted:true → hide siblings; false/absent → full combined view", () => {
  assert.equal(hideCombinedAccount({ scope_restricted: true }), true)
  assert.equal(hideCombinedAccount({ scope_restricted: false }), false)
  assert.equal(hideCombinedAccount({}), false) // owner/global summary → unchanged
  assert.equal(hideCombinedAccount(null), false)
  assert.equal(hideCombinedAccount(undefined), false)
})

// ── scopeRequiredVenuesFromError: the 403 fallback venue source ──────────────

test("403 fallback: VENUE_SCOPE_REQUIRED body → its venues (id coerced, name tolerated)", () => {
  const err = {
    status: 403,
    body: { code: "VENUE_SCOPE_REQUIRED", venues: [{ id: "261", name: "Brewhouse" }, { id: 262 }] },
  }
  assert.deepEqual(scopeRequiredVenuesFromError(err), [
    { id: 261, name: "Brewhouse" },
    { id: 262, name: "" },
  ])
})

test("403 fallback: not that error (wrong status / code / shape) → null", () => {
  assert.equal(scopeRequiredVenuesFromError({ status: 403, body: { code: "OTHER" } }), null)
  assert.equal(scopeRequiredVenuesFromError({ status: 404, body: { code: "VENUE_SCOPE_REQUIRED" } }), null)
  assert.equal(scopeRequiredVenuesFromError({ status: 403 }), null)
  assert.equal(scopeRequiredVenuesFromError(null), null)
  assert.equal(scopeRequiredVenuesFromError("nope"), null)
})

test("403 fallback: VENUE_SCOPE_REQUIRED with no venues array → [] (real, empty list)", () => {
  assert.deepEqual(scopeRequiredVenuesFromError({ status: 403, body: { code: "VENUE_SCOPE_REQUIRED" } }), [])
})

// ── scoped404IsOutOfScope: the out-of-scope 404 → picker fallback ────────────

test("out-of-scope 404: a scoped member's notdeployed(404) → picker; owner's → coming-soon", () => {
  assert.equal(scoped404IsOutOfScope(scopedTwo, "notdeployed"), true) // out-of-scope venue selected
  assert.equal(scoped404IsOutOfScope(owner, "notdeployed"), false) // genuine "coming soon"
  assert.equal(scoped404IsOutOfScope(undefined, "notdeployed"), false)
  // Any non-404 outcome for a scoped member is real data / error, never the picker.
  assert.equal(scoped404IsOutOfScope(scopedTwo, "ready"), false)
  assert.equal(scoped404IsOutOfScope(scopedTwo, "computing"), false)
  assert.equal(scoped404IsOutOfScope(scopedTwo, "forbidden"), false)
})

// ── venuePickIntent: the switcher-sync intent ────────────────────────────────

test("switcher-sync: picking a venue targets the GLOBAL switcher with that id and leaves the chooser", () => {
  const intent = venuePickIntent(262)
  assert.equal(intent.switcherVenueId, 262) // → setSelectedVenue(262), same as line skips
  assert.equal(intent.clearScopeForced, true) // leave the picker, render that venue
})

test("copy: the chooser prompt exists (calm, not an error)", () => {
  assert.match(PAYOUTS_VENUE_PICKER_COPY.prompt, /pick a venue/i)
})
