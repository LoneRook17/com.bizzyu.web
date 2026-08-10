// Tests for the surge PLACEMENT rules (B6) — which tiers get a card, and who
// is allowed to see one. Pure, no imports beyond the module under test.
// Runnable with the Node built-in test runner: `node --test`.
//
// These cover the two properties that turn "the component exists" into "the
// component is wired safely into the real pages":
//   1. a non owner/manager must not see the configurator AT ALL (D18) — the
//      services routes all 403 them, so drawing the control would be a lie;
//   2. only a tier a ladder can actually act on gets a card.
import { test } from "node:test"
import assert from "node:assert/strict"
import { canConfigureSurge, surgeableTiers, LOUD_MULTIPLIER, stepMultiplier } from "./surge-validation.ts"

test("D18 gate matches the services routes: owner + manager, nobody else", () => {
  assert.equal(canConfigureSurge("owner"), true)
  assert.equal(canConfigureSurge("manager"), true)
  // Every other role the dashboard can hold — all 403 on /business/surge.
  for (const role of ["staff", "promoter", "", "OWNER", "admin", undefined, null]) {
    assert.equal(canConfigureSurge(role as string | null | undefined), false, `role ${String(role)} must not see the card`)
  }
})

test("only paid, visible, persisted tiers get a surge card", () => {
  const tiers = [
    { ticket_id: 1, name: "GA", ticket_type: "paid" as const },
    { ticket_id: 2, name: "VIP", ticket_type: "paid" as const, is_hidden: false },
    { ticket_id: 3, name: "Comp", ticket_type: "free" as const },
    { ticket_id: 4, name: "Guest list", ticket_type: "guest" as const },
    { ticket_id: 5, name: "Secret", ticket_type: "paid" as const, is_hidden: true },
    { name: "Unsaved", ticket_type: "paid" as const }, // no ticket_id yet
  ]
  assert.deepEqual(surgeableTiers(tiers).map((t) => t.name), ["GA", "VIP"])
})

test("an event with no priced tier yields nothing (section renders empty, not a stub)", () => {
  assert.deepEqual(surgeableTiers([{ ticket_id: 1, name: "Free", ticket_type: "free" as const }]), [])
  assert.deepEqual(surgeableTiers([]), [])
  assert.deepEqual(surgeableTiers(undefined), [])
  assert.deepEqual(surgeableTiers(null), [])
})

test("a hidden tier is excluded even though it is paid — no sale can fire its steps", () => {
  const hidden = [{ ticket_id: 9, name: "Hidden VIP", ticket_type: "paid" as const, is_hidden: true }]
  assert.deepEqual(surgeableTiers(hidden), [])
})

test("LOUD_MULTIPLIER catches the misplaced-decimal case it exists for", () => {
  // $1.00 base, "10.00" typed where "1.00" was meant → 10×, must be loud.
  assert.ok(stepMultiplier(100, 1000) >= LOUD_MULTIPLIER)
  // A normal ladder step ($10 → $12) must stay quiet, or the warning is noise
  // and gets clicked through.
  assert.ok(stepMultiplier(1000, 1200) < LOUD_MULTIPLIER)
  // The boundary itself is loud (>=, not >).
  assert.ok(stepMultiplier(1000, 3000) >= LOUD_MULTIPLIER)
})
