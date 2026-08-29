import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import {
  LEFTOVER_PROMOTER_PAYOUT_FALLBACK,
  surfaceEventFormServerError,
  applySaveAsDraftFlag,
  isLeftoverPromoterPayoutPathError,
  isPromotionEnabled,
  promoterExtrasVisible,
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

test("isPromotionEnabled is only explicit on values", () => {
  assert.equal(isPromotionEnabled(true), true)
  assert.equal(isPromotionEnabled(1), true)
  assert.equal(isPromotionEnabled("1"), true)
  assert.equal(isPromotionEnabled(false), false)
  assert.equal(isPromotionEnabled(0), false)
  assert.equal(isPromotionEnabled("0"), false)
  assert.equal(isPromotionEnabled("false"), false)
  assert.equal(isPromotionEnabled(""), false)
  assert.equal(isPromotionEnabled(null), false)
  assert.equal(isPromotionEnabled(undefined), false)
})

test("promoter extras hide when the toggle is off or disabled", () => {
  assert.equal(promoterExtrasVisible(true, false), true)
  assert.equal(promoterExtrasVisible(1, false), true)
  assert.equal(promoterExtrasVisible(false, false), false)
  assert.equal(promoterExtrasVisible(0, false), false)
  assert.equal(promoterExtrasVisible("false", false), false)
  assert.equal(promoterExtrasVisible(true, true), false)
  assert.equal(promoterExtrasVisible(1, true), false)
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

test("EventForm never paints the leftover promoter-payout Connect demand", () => {
  // HE-2 removed the gate server-side; against a stale deploy the form swaps
  // the copy for an honest fallback that does not demand Connect.
  const raw =
    "Connect Stripe before enabling the Promoter Program. Your event needs a payout path before promoters can sell it."
  assert.equal(surfaceEventFormServerError(raw), LEFTOVER_PROMOTER_PAYOUT_FALLBACK)
  assert.ok(!LEFTOVER_PROMOTER_PAYOUT_FALLBACK.includes("Connect Stripe before"))
  assert.ok(!shouldOfferStripeConnectForError(surfaceEventFormServerError(raw)))
  assert.equal(surfaceEventFormServerError("Missing required event fields: name"), "Missing required event fields: name")

  const form = readFileSync(
    fileURLToPath(new URL("../../components/business/v2/events/EventForm.tsx", import.meta.url)),
    "utf8",
  )
  assert.ok(form.includes("surfaceEventFormServerError"), "the submit catch routes through the swap")
})
