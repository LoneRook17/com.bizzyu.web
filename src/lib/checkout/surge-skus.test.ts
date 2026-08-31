import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  foldLeftoverSurgeSkus,
  isLeftoverSurgeSku,
} from "./surge-skus.ts"

test("leftover -surge-N and cover_surge_* keys are extras", () => {
  assert.equal(isLeftoverSurgeSku({ tier_key: "cover-surge-1", name: "Cover" }), true)
  assert.equal(isLeftoverSurgeSku({ template_tier_key: "cover_surge_2300", name: "Cover" }), true)
  assert.equal(isLeftoverSurgeSku({ tier_key: "cover", name: "Cover" }), false)
  assert.equal(isLeftoverSurgeSku({ name: "Cover", price_usd: 10 }), false)
})

test("guest list keeps one Cover at live price_usd and Skip the Line", () => {
  assert.deepEqual(
    foldLeftoverSurgeSkus([
      { ticket_id: 1, name: "Cover", price_usd: 10, tier_key: "cover" },
      { ticket_id: 2, name: "Cover", price_usd: 15, tier_key: "cover-surge-1" },
      { ticket_id: 3, name: "Skip the Line", price_usd: 20, tier_key: "skip" },
    ]),
    [
      { ticket_id: 1, name: "Cover", price_usd: 10, tier_key: "cover" },
      { ticket_id: 3, name: "Skip the Line", price_usd: 20, tier_key: "skip" },
    ],
  )
})

test("cover_surge_* extra without a key on checkout still folds by Cover name", () => {
  assert.deepEqual(
    foldLeftoverSurgeSkus([
      { ticket_id: 10, name: "Cover", price_usd: 8 },
      { ticket_id: 11, name: "Cover", price_usd: 12 },
    ]),
    [{ ticket_id: 10, name: "Cover", price_usd: 8 }],
  )
})

test("an orphan extra is kept so checkout is not blanked", () => {
  assert.deepEqual(
    foldLeftoverSurgeSkus([{ ticket_id: 9, name: "Cover", price_usd: 15, tier_key: "cover_surge_2300" }]),
    [{ ticket_id: 9, name: "Cover", price_usd: 15, tier_key: "cover_surge_2300" }],
  )
})

test("guest tier surfaces still fold leftover SKUs (checkout itself is a Laravel redirect)", () => {
  // HOST LOCK (2026-08-30): the Next checkout UI is gone — /checkout/:id
  // 302s to Laravel. The fold still guards the guest tier lists this host
  // DOES render (venue cards / event page tiers via venuePublic).
  const lib = readFileSync(join(process.cwd(), "src/lib/venuePublic.ts"), "utf8")
  assert.ok(lib.includes("foldLeftoverSurgeSkus"), "guest tier lists must fold leftover surge extras")
  const page = readFileSync(join(process.cwd(), "src/app/checkout/[id]/page.tsx"), "utf8")
  assert.ok(page.includes("laravelCheckoutBaseUrl"), "checkout path bounces to Laravel, renders no tiers")
})
