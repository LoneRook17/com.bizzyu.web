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
import { resolveInitialVenueSelection } from "./venue-selection.ts"

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
