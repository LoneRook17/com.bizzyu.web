// Venue rules for deal create/edit. Events stay gated elsewhere (RequireVenue).
// Runnable with the Node built-in test runner: `npm test`.

import { test } from "node:test"
import assert from "node:assert/strict"
import {
  dealSubmitVenueId,
  dealVenueError,
  showDealVenuePicker,
  trialFirstOfferLocked,
} from "./deal-venue.ts"

const NONE = { isEditing: false, venueIds: [] as number[], selectedVenueId: null }
const ONE = { isEditing: false, venueIds: [12], selectedVenueId: null }
const TWO = { isEditing: false, venueIds: [12, 34], selectedVenueId: null }
const TWO_PICKED = { isEditing: false, venueIds: [12, 34], selectedVenueId: 34 }

function bodyWithVenue(id: number | undefined): string {
  return JSON.stringify({
    deal_title: "BOGO coffee",
    ...(id == null ? {} : { venue_id: id }),
  })
}

test("0 venues: create omits venue_id and does not error", () => {
  const id = dealSubmitVenueId(NONE)
  assert.equal(id, undefined)
  assert.equal(bodyWithVenue(id).includes("venue_id"), false)
  assert.equal(dealVenueError(NONE), null)
  assert.equal(showDealVenuePicker(NONE), false)
})

test("1 venue: create auto-selects that venue and hides the picker", () => {
  assert.equal(dealSubmitVenueId(ONE), 12)
  assert.equal(JSON.parse(bodyWithVenue(dealSubmitVenueId(ONE))).venue_id, 12)
  assert.equal(dealVenueError(ONE), null)
  assert.equal(showDealVenuePicker(ONE), false)
})

test("1 venue: an explicit switcher selection wins over the only venue", () => {
  assert.equal(dealSubmitVenueId({ ...ONE, selectedVenueId: 12 }), 12)
})

test("2+ venues: picker stays and a selection is required on create", () => {
  assert.equal(dealSubmitVenueId(TWO), undefined)
  assert.equal(dealVenueError(TWO), "Please select a venue")
  assert.equal(showDealVenuePicker(TWO), true)

  assert.equal(dealSubmitVenueId(TWO_PICKED), 34)
  assert.equal(dealVenueError(TWO_PICKED), null)
  assert.equal(showDealVenuePicker(TWO_PICKED), true)
})

test("edit never requires a venue, and does not invent one", () => {
  for (const base of [NONE, ONE, TWO]) {
    const editing = { ...base, isEditing: true }
    assert.equal(dealVenueError(editing), null)
    assert.equal(showDealVenuePicker(editing), false)
    assert.equal(dealSubmitVenueId(editing), undefined)
  }
  assert.equal(
    dealSubmitVenueId({ ...TWO, isEditing: true, selectedVenueId: 12 }),
    12,
  )
})

test("trial home locks only an events business with zero venues", () => {
  assert.equal(trialFirstOfferLocked("deals", 0), false)
  assert.equal(trialFirstOfferLocked("hybrid", 0), false)
  assert.equal(trialFirstOfferLocked("events", 0), true)
  assert.equal(trialFirstOfferLocked("events", 1), false)
  assert.equal(trialFirstOfferLocked("deals", 2), false)
})
