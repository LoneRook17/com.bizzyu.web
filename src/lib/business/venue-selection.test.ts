// Unit tests for the initial venue-selection resolver (P-FIX2).
//
// Guards the two member shapes and persistence-driven restore:
//  (1) GLOBAL/unrestricted members default to "all" — never a silent single
//      venue — which is the exact PD-1 contributing bug this fix closes.
//  (2) Venue-RESTRICTED members stay hard-locked to their venue no matter what
//      the URL or localStorage say.
//  (3) An explicit prior selection (URL param or valid persisted id) is honored;
//      a stale/invalid persisted id degrades to "all", not to venue[0].
//
// Runnable with the Node built-in test runner (no extra deps): `npm test`.

import { test } from "node:test"
import assert from "node:assert/strict"
import {
  resolveInitialVenueSelection,
  isVenueScopeNotFound,
  persistedVenueValue,
} from "./venue-selection.ts"

const ACTIVE = [10, 20, 30] // a Global member who can see three venues

// ── Global (unrestricted) member: userVenueId === null ──────────────────────

test("global member with no prior selection defaults to 'all' (the fix)", () => {
  assert.equal(
    resolveInitialVenueSelection({
      userVenueId: null,
      activeVenueIds: ACTIVE,
      urlVenueId: null,
      storedVenueId: null,
    }),
    "all",
  )
})

test("global member with a stale/invalid persisted venue degrades to 'all', not venue[0]", () => {
  assert.equal(
    resolveInitialVenueSelection({
      userVenueId: null,
      activeVenueIds: ACTIVE,
      urlVenueId: null,
      storedVenueId: "999", // no longer among active venues
    }),
    "all",
  )
})

// ── Persistence: an explicit prior choice survives reload ───────────────────

test("global member restores a still-valid persisted venue id", () => {
  assert.equal(
    resolveInitialVenueSelection({
      userVenueId: null,
      activeVenueIds: ACTIVE,
      urlVenueId: null,
      storedVenueId: "20",
    }),
    20,
  )
})

test("global member restores a persisted 'all' selection", () => {
  assert.equal(
    resolveInitialVenueSelection({
      userVenueId: null,
      activeVenueIds: ACTIVE,
      urlVenueId: null,
      storedVenueId: "all",
    }),
    "all",
  )
})

// ── URL param wins over localStorage (shareable links) ──────────────────────

test("url venue_id=all overrides a persisted single-venue selection", () => {
  assert.equal(
    resolveInitialVenueSelection({
      userVenueId: null,
      activeVenueIds: ACTIVE,
      urlVenueId: "all",
      storedVenueId: "20",
    }),
    "all",
  )
})

test("url venue_id=<valid id> overrides a persisted 'all'", () => {
  assert.equal(
    resolveInitialVenueSelection({
      userVenueId: null,
      activeVenueIds: ACTIVE,
      urlVenueId: "30",
      storedVenueId: "all",
    }),
    30,
  )
})

test("url venue_id pointing at a non-visible venue is ignored, falls to localStorage", () => {
  assert.equal(
    resolveInitialVenueSelection({
      userVenueId: null,
      activeVenueIds: ACTIVE,
      urlVenueId: "999",
      storedVenueId: "10",
    }),
    10,
  )
})

// ── Venue-RESTRICTED member: hard lock regardless of URL/storage ────────────

test("restricted member is locked to their venue, ignoring localStorage", () => {
  assert.equal(
    resolveInitialVenueSelection({
      userVenueId: 20,
      activeVenueIds: [20],
      urlVenueId: null,
      storedVenueId: "all",
    }),
    20,
  )
})

test("restricted member cannot be pushed to 'all' via URL", () => {
  assert.equal(
    resolveInitialVenueSelection({
      userVenueId: 20,
      activeVenueIds: [20],
      urlVenueId: "all",
      storedVenueId: "10",
    }),
    20,
  )
})

// ── TF-ANALYTICS-EVENTS-F1: clamp-on-load drops an out-of-scope persisted id ──
//
// A selection persisted while the caller had BROADER scope must not survive a
// scope narrowing: the current active set no longer contains it, so it degrades
// to "all" (self-heal) — the same guarantee the scope-404 degrade backstops at
// fetch time.

test("F1: a persisted id no longer in the caller's set drops to 'all' on load", () => {
  assert.equal(
    resolveInitialVenueSelection({
      userVenueId: null,
      activeVenueIds: [20, 30], // scope narrowed; 10 is gone
      urlVenueId: null,
      storedVenueId: "10",
    }),
    "all",
  )
})

test("F1: a persisted id still in the caller's set is preserved on load", () => {
  assert.equal(
    resolveInitialVenueSelection({
      userVenueId: null,
      activeVenueIds: [20, 30],
      urlVenueId: null,
      storedVenueId: "30",
    }),
    30,
  )
})

// ── TF-ANALYTICS-EVENTS-F1: persistedVenueValue — never re-persist a stale id ──

test("persistedVenueValue keeps a concrete venue id (an explicit pick survives reload)", () => {
  assert.equal(persistedVenueValue(30), "30")
})

test("persistedVenueValue clears the key for 'all' (stale id can't linger → removeItem)", () => {
  assert.equal(persistedVenueValue("all"), null)
})

test("persistedVenueValue clears the key for null (no selection)", () => {
  assert.equal(persistedVenueValue(null), null)
})

// ── TF-ANALYTICS-EVENTS-F1: isVenueScopeNotFound — the scope-404 degrade signal ──
//
// Matches the services intersectRequestedVenue rejection
//   Boom.notFound('Venue not found') → { statusCode:404, message:'Venue not found' }
// as surfaced by the api-client (ApiError.status/message/body), echo-tolerantly.

test("scope-404: the ApiError shape (status 404 + 'Venue not found' message) matches", () => {
  assert.equal(
    isVenueScopeNotFound({
      status: 404,
      message: "Venue not found",
      body: { statusCode: 404, error: "Not Found", message: "Venue not found" },
    }),
    true,
  )
})

test("scope-404: tolerant of the marker landing only in body.message", () => {
  assert.equal(
    isVenueScopeNotFound({ status: 404, message: "Request failed", body: { message: "Venue not found" } }),
    true,
  )
})

test("scope-404: tolerant of the plain { error: 'Venue not found' } variant", () => {
  assert.equal(isVenueScopeNotFound({ status: 404, body: { error: "Venue not found" } }), true)
})

test("scope-404: matching is case-insensitive", () => {
  assert.equal(isVenueScopeNotFound({ status: 404, message: "VENUE NOT FOUND" }), true)
})

test("scope-404: a bare 404 with no venue marker is NOT a scope reset (genuine error)", () => {
  assert.equal(isVenueScopeNotFound({ status: 404, message: "Not Found" }), false)
})

test("scope-404: a 403 / 500 / network / null is never a scope reset", () => {
  assert.equal(isVenueScopeNotFound({ status: 403, message: "Venue not found" }), false)
  assert.equal(isVenueScopeNotFound({ status: 500, message: "Venue not found" }), false)
  assert.equal(isVenueScopeNotFound(new Error("Venue not found")), false) // no status
  assert.equal(isVenueScopeNotFound(null), false)
  assert.equal(isVenueScopeNotFound(undefined), false)
})
