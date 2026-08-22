import test from "node:test"
import assert from "node:assert/strict"
import {
  applySaveAsDraftFlag,
  promoterToggleDisabled,
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
