// MC-UI — venue Campus picker logic. Runs under the repo's built-in runner
// (`node --test`, no extra deps): see src/lib/business/email-change.test.ts.
//
// The four behaviours the build must prove are asserted here:
//   1. default (no selection) sends null           → venueCampusPayload("")
//   2. an explicit selection sends the id           → venueCampusPayload("57")
//   3. edit-prefill: NULL → "Same as business"      → campusSelectValue(null)
//   4. a 400 is surfaced cleanly                     → venueSaveErrorMessage(400, …)

import { test } from "node:test"
import assert from "node:assert/strict"
import {
  CAMPUS_FIELD_HELPER,
  CAMPUS_FIELD_LABEL,
  SAME_AS_BUSINESS_LABEL,
  SAME_AS_BUSINESS_VALUE,
  campusOptionLabel,
  campusSelectValue,
  venueCampusPayload,
  venueSaveErrorMessage,
} from "./venue-campus.ts"

// --- 1. default sends null -----------------------------------------------

test("default (Same as business) sends null — inherit the business campus", () => {
  // "" is the value of the first option; both create (server inherits) and edit
  // (server resets to NULL) treat null as "inherit".
  assert.equal(venueCampusPayload(SAME_AS_BUSINESS_VALUE), null)
  assert.equal(venueCampusPayload(""), null)
  assert.equal(venueCampusPayload("   "), null)
})

// --- 2. explicit selection sends the id ----------------------------------

test("an explicit campus selection sends its numeric id", () => {
  assert.equal(venueCampusPayload("57"), 57)
  assert.equal(venueCampusPayload(" 57 "), 57)
  assert.equal(venueCampusPayload("284"), 284)
})

test("an unparseable / non-positive value falls back to null, never a bad id", () => {
  // Options are controlled, so this is defence-in-depth: a junk value inherits
  // rather than shipping something the endpoint would only 400 on.
  assert.equal(venueCampusPayload("abc"), null)
  assert.equal(venueCampusPayload("0"), null)
  assert.equal(venueCampusPayload("-3"), null)
  assert.equal(venueCampusPayload("57.5"), null)
})

// --- 3. edit-prefill: NULL → "Same as business" --------------------------

test("edit prefill: a NULL campus maps to the Same-as-business option", () => {
  assert.equal(campusSelectValue(null), SAME_AS_BUSINESS_VALUE)
  assert.equal(campusSelectValue(undefined), SAME_AS_BUSINESS_VALUE)
})

test("edit prefill: an explicit campus maps to its own option value", () => {
  assert.equal(campusSelectValue(57), "57")
  assert.equal(campusSelectValue(284), "284")
})

test("edit prefill: a junk stored id degrades to Same-as-business", () => {
  assert.equal(campusSelectValue(0), SAME_AS_BUSINESS_VALUE)
  assert.equal(campusSelectValue(-1), SAME_AS_BUSINESS_VALUE)
  assert.equal(campusSelectValue(1.5), SAME_AS_BUSINESS_VALUE)
})

test("prefill and payload round-trip: saving an unchanged edit preserves the campus", () => {
  // Guards against every edit-save silently resetting a venue's campus: the
  // form prefills from venue.campus_id, so the value sent back is the same id.
  for (const id of [null, 57, 284]) {
    const prefilled = campusSelectValue(id as number | null)
    assert.equal(venueCampusPayload(prefilled), id === null ? null : id)
  }
})

// --- 4. a 400 is surfaced cleanly ----------------------------------------

test("400 surfaces the server's specific campus message", () => {
  assert.equal(
    venueSaveErrorMessage(400, "campus_id does not match a known university", false),
    "campus_id does not match a known university",
  )
  assert.equal(
    venueSaveErrorMessage(400, "campus_id must be a valid university id", true),
    "campus_id must be a valid university id",
  )
})

test("400 with a blank/absent message still gives a mode-correct fallback", () => {
  assert.equal(venueSaveErrorMessage(400, "   ", false), "Failed to create venue. Please try again.")
  assert.equal(venueSaveErrorMessage(400, undefined, true), "Failed to update venue. Please try again.")
})

test("non-400 failures keep the generic mode-specific retry line", () => {
  assert.equal(venueSaveErrorMessage(500, "Failed to create venue", false), "Failed to create venue. Please try again.")
  assert.equal(venueSaveErrorMessage(null, undefined, true), "Failed to update venue. Please try again.")
  assert.equal(venueSaveErrorMessage(undefined, "boom", false), "Failed to create venue. Please try again.")
})

// --- copy + option labels ------------------------------------------------

test("field copy is the plain, agreed wording", () => {
  assert.equal(CAMPUS_FIELD_LABEL, "Campus")
  assert.equal(CAMPUS_FIELD_HELPER, "Events and line skips at this venue appear on this campus's feed.")
  assert.equal(SAME_AS_BUSINESS_LABEL, "Same as business (default)")
})

test("campusOptionLabel prefers the proper name, falls back to the handle", () => {
  assert.equal(campusOptionLabel({ id: 57, name: "UGA", full_name: "University of Georgia" }), "University of Georgia")
  assert.equal(campusOptionLabel({ id: 91, name: "MSU", full_name: null }), "MSU")
  assert.equal(campusOptionLabel({ id: 91, name: "MSU", full_name: "   " }), "MSU")
  assert.equal(campusOptionLabel({ id: 91, name: "MSU" }), "MSU")
})
