import { test } from "node:test"
import assert from "node:assert/strict"
import {
  emptyWcPromoDraft,
  readyWcPromoDrafts,
  validateWcPromoDraft,
  wcPromoCreatePath,
  wcPromoCreatePayload,
} from "./wc-create-promo.ts"

test("program-scoped promo drafts use the existing door-access promo API", () => {
  assert.equal(wcPromoCreatePath(44), "/business/door-access/44/promo-codes")
  const draft = {
    ...emptyWcPromoDraft("d1"),
    code: "cover10",
    discount_type: "percentage" as const,
    discount_value: "10",
    max_redemptions: "",
    max_per_user: "1",
  }
  assert.deepEqual(wcPromoCreatePayload(draft), {
    code: "COVER10",
    discount_type: "percentage",
    discount_value: 10,
    max_redemptions: null,
    max_per_user: 1,
    expires_at: null,
  })
})

test("half-filled promo rows stay off the wire", () => {
  const blank = emptyWcPromoDraft("blank")
  assert.equal(validateWcPromoDraft(blank), "Add a code.")
  const noValue = { ...blank, code: "SAVE" }
  assert.equal(validateWcPromoDraft(noValue), "Add a discount.")
  const ready = { ...emptyWcPromoDraft("ok"), code: "SAVE", discount_value: "15" }
  assert.equal(validateWcPromoDraft(ready), null)
  assert.deepEqual(readyWcPromoDrafts([blank, ready]).map((d) => d.localId), ["ok"])
})
