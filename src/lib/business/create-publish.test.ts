import test from "node:test"
import assert from "node:assert/strict"
import {
  applySaveAsDraftFlag,
  isLeftoverPromoterPayoutPathError,
  promoterToggleDisabled,
  shouldOfferStripeConnectForError,
  willDraftOnCreate,
} from "./create-publish.ts"

test("willDraft is only pending-approval, never missing Stripe", () => {
  assert.equal(willDraftOnCreate(true), true)
  assert.equal(willDraftOnCreate(false), false)
})

test("Publish omits save_as_draft; Save as draft is the only path that sends it", () => {
  const base = { name: "EscrowV2" }
  assert.deepEqual(applySaveAsDraftFlag(base, false), { name: "EscrowV2" })
  assert.equal("save_as_draft" in applySaveAsDraftFlag(base, false), false)
  assert.deepEqual(applySaveAsDraftFlag(base, true), { name: "EscrowV2", save_as_draft: true })
})

test("promoter toggle is disabled only when there is no paid tier", () => {
  assert.equal(promoterToggleDisabled(false), true)
  assert.equal(promoterToggleDisabled(true), false)
})

test("leftover promoter payout-path copy is not a dash hard block", () => {
  assert.equal(
    isLeftoverPromoterPayoutPathError(
      "Connect Stripe before enabling the Promoter Program. Your event needs a payout path before promoters can sell it.",
    ),
    true,
  )
  assert.equal(
    isLeftoverPromoterPayoutPathError(
      "Connect Stripe before enabling the promoter program. Promoters need a payout path to sell into.",
    ),
    true,
  )
  assert.equal(isLeftoverPromoterPayoutPathError("Connect Stripe to enable Promoter Program."), true)
  assert.equal(isLeftoverPromoterPayoutPathError("At least one paid ticket is required."), false)
  assert.equal(isLeftoverPromoterPayoutPathError("Request failed"), false)
})

test("Review does not upsell Connect for the leftover promoter gate", () => {
  assert.equal(
    shouldOfferStripeConnectForError(
      "Connect Stripe before enabling the Promoter Program. Your event needs a payout path before promoters can sell it.",
    ),
    false,
  )
  assert.equal(
    shouldOfferStripeConnectForError("Stripe Connect onboarding could not start."),
    true,
  )
})
