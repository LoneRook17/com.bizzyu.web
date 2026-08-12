// Tests for the surge card's two previously-invisible states — "is my draft
// saved?" and "is surge live?" — plus the price line that answers the question
// the card is actually opened to answer.
//
// These are the properties the rework exists for; each one was a state the old
// card held but never showed:
//   1. an edited ladder announces itself (dirty chip) and a clean one cannot be
//      "saved" again into a no-op;
//   2. turning surge OFF after steps have fired confirms first, because it
//      silently changes what the next buyer is charged;
//   3. the fire-on-save dialog tells the truth when the ladder is off — the
//      shipped headline ("the price jumps right away") is false in that state.
// Runnable with the Node built-in test runner: `npm test`.
import { test } from "node:test"
import assert from "node:assert/strict"
import {
  SURGE_LABELS,
  UNSAVED_NAV_PROMPT,
  draftKey,
  fireDialogCopy,
  firedSteps,
  isDirty,
  needsOffConfirm,
  offConfirmCopy,
  priceLine,
  saveButtonState,
  shouldPromptOnLeave,
  stepsToDraft,
} from "./surge-card-state.ts"

const SAVED = [
  { threshold_sold: 10, price_cents: 1000, fired_at: null, step_index: 0 },
  { threshold_sold: 50, price_cents: 1500, fired_at: null, step_index: 1 },
]

// ── 1. the dirty chip ───────────────────────────────────────────────────────

test("a freshly loaded ladder is clean — no chip, nothing to save", () => {
  const saved = stepsToDraft(SAVED)
  assert.equal(isDirty(saved, saved), false)
  assert.deepEqual(saved, [
    { threshold: "10", price: "10.00" },
    { threshold: "50", price: "15.00" },
  ])
})

test("editing a price makes the card dirty (the chip appears)", () => {
  const saved = stepsToDraft(SAVED)
  const draft = [{ ...saved[0]!, price: "12.00" }, saved[1]!]
  assert.equal(isDirty(draft, saved), true)
})

test("editing a threshold makes the card dirty", () => {
  const saved = stepsToDraft(SAVED)
  const draft = [{ ...saved[0]!, threshold: "11" }, saved[1]!]
  assert.equal(isDirty(draft, saved), true)
})

test("adding or removing a step makes the card dirty", () => {
  const saved = stepsToDraft(SAVED)
  assert.equal(isDirty([...saved, { threshold: "", price: "" }], saved), true)
  assert.equal(isDirty([saved[0]!], saved), true)
})

test("the chip CLEARS when the edit is typed back to the saved value", () => {
  const saved = stepsToDraft(SAVED)
  const dirty = [{ ...saved[0]!, price: "12.00" }, saved[1]!]
  assert.equal(isDirty(dirty, saved), true)
  const reverted = [{ ...saved[0]!, price: "10.00" }, saved[1]!]
  assert.equal(isDirty(reverted, saved), false)
})

test("Discard reverts to the saved snapshot, which is clean by construction", () => {
  const saved = stepsToDraft(SAVED)
  const discarded = saved // what the component's discard() assigns
  assert.equal(isDirty(discarded, saved), false)
})

test("cosmetic retyping is not a change — '10' and '10.00' are the same ladder", () => {
  const saved = stepsToDraft(SAVED)
  const retyped = [{ threshold: "10", price: "10" }, { threshold: " 50 ", price: "15.000" }]
  assert.equal(isDirty(retyped, saved), false, "a no-op edit must not offer a save")
})

test("a half-typed value IS dirty — an empty box is not the saved ladder", () => {
  const saved = stepsToDraft(SAVED)
  assert.equal(isDirty([{ threshold: "10", price: "" }, saved[1]!], saved), true)
  assert.equal(isDirty([{ threshold: "10", price: "1." }, saved[1]!], saved), true)
})

test("draftKey is order-sensitive — reordering steps is a real change", () => {
  const saved = stepsToDraft(SAVED)
  assert.notEqual(draftKey([saved[1]!, saved[0]!]), draftKey(saved))
})

// ── 2. Save is disabled when clean ──────────────────────────────────────────

test("clean → disabled 'Saved ✓', never an armed button with no effect", () => {
  assert.deepEqual(saveButtonState({ dirty: false }), { label: SURGE_LABELS.saved, disabled: true })
  assert.equal(SURGE_LABELS.saved, "Saved ✓")
})

test("clean stays 'Saved ✓' even mid-request or with a stale validation error", () => {
  assert.deepEqual(saveButtonState({ dirty: false, busy: true }), { label: "Saved ✓", disabled: true })
  assert.deepEqual(saveButtonState({ dirty: false, validationError: "boom" }), { label: "Saved ✓", disabled: true })
})

test("dirty → enabled 'Save changes'", () => {
  assert.deepEqual(saveButtonState({ dirty: true }), { label: SURGE_LABELS.save, disabled: false })
  assert.equal(SURGE_LABELS.save, "Save changes")
})

test("dirty but invalid, or dirty while saving → still 'Save changes', disabled", () => {
  assert.deepEqual(saveButtonState({ dirty: true, validationError: "Step 1: price must be…" }), {
    label: "Save changes", disabled: true,
  })
  assert.deepEqual(saveButtonState({ dirty: true, busy: true }), { label: "Save changes", disabled: true })
})

test("leaving prompts only with an unsaved draft in edit mode", () => {
  assert.equal(shouldPromptOnLeave(true, true), true)
  assert.equal(shouldPromptOnLeave(false, true), false)
  assert.equal(shouldPromptOnLeave(true, false), false)
  assert.match(UNSAVED_NAV_PROMPT, /unsaved/i)
})

// ── 3. the On/Off switch confirm ────────────────────────────────────────────

test("switching OFF with a fired step confirms first", () => {
  const withFired = [
    { threshold_sold: 10, price_cents: 1000, fired_at: "2026-08-10 21:55:13", step_index: 0 },
    { threshold_sold: 50, price_cents: 1500, fired_at: null, step_index: 1 },
  ]
  assert.equal(needsOffConfirm(false, withFired), true)
})

test("switching OFF with nothing fired flips straight away — no dialog to click through", () => {
  assert.equal(needsOffConfirm(false, SAVED), false)
  assert.equal(needsOffConfirm(false, []), false)
  assert.equal(needsOffConfirm(false, null), false)
})

test("switching ON never confirms — an off ladder charges base, so on can only reveal configured prices", () => {
  const withFired = [{ threshold_sold: 10, price_cents: 1000, fired_at: "2026-08-10 21:55:13", step_index: 0 }]
  assert.equal(needsOffConfirm(true, withFired), false)
  assert.equal(needsOffConfirm(true, SAVED), false)
})

test("the off confirm names the price customers go back to, and keeps fire history", () => {
  const copy = offConfirmCopy(500)
  assert.equal(copy.title, "Turn off surge?")
  assert.equal(copy.body, "Customers go back to $5.00. Fire history is kept.")
})

test("the switch states the STATE, not the action — the old Enable/Disable read backwards", () => {
  assert.equal(SURGE_LABELS.switchOn, "Surge: On")
  assert.equal(SURGE_LABELS.switchOff, "Surge: Off")
})

// ── 4. the fire dialog's off-state wording ──────────────────────────────────

test("ladder OFF: the dialog says customers keep paying base until surge is on", () => {
  const copy = fireDialogCopy(false, 500)
  assert.equal(copy.title, "Fire these steps now?")
  assert.ok(copy.offNote, "the off case must carry the extra note")
  assert.match(copy.offNote!, /surge is off/i)
  assert.match(copy.offNote!, /\$5\.00/, "names the price actually charged")
  assert.match(copy.offNote!, /until you turn surge on/i)
})

test("ladder OFF: the headline drops the false 'price jumps right away' claim", () => {
  const copy = fireDialogCopy(false, 500)
  assert.doesNotMatch(copy.body, /jumps right away/)
  assert.match(copy.body, /at or below the current sold count/)
})

test("ladder ON: the shipped wording is unchanged and carries no off note", () => {
  const copy = fireDialogCopy(true, 500)
  assert.equal(copy.offNote, null)
  assert.equal(
    copy.body,
    "These step(s) are already at or below the current sold count and will fire immediately on save — the price jumps right away for the next buyer.",
  )
})

test("the fire dialog's buttons keep their contract labels", () => {
  assert.equal(SURGE_LABELS.fireAndSave, "Fire & save")
  assert.equal(SURGE_LABELS.cancel, "Cancel")
})

// ── 5. the price line ───────────────────────────────────────────────────────

test("no ladder at all → base price", () => {
  assert.deepEqual(priceLine({ hasLadder: false, isActive: false, baseCents: 500 }), {
    amountCents: 500, reason: "Base price",
  })
})

test("surge off → base price, and says so (the server sends no price for an off ladder)", () => {
  const withFired = [{ threshold_sold: 1, price_cents: 850, fired_at: "2026-08-12 11:05:12", step_index: 0 }]
  assert.deepEqual(
    priceLine({ hasLadder: true, isActive: false, baseCents: 500, steps: withFired, serverPriceCents: null }),
    { amountCents: 500, reason: "Surge off — base price" },
  )
})

test("manual override wins over a fired step while surge is on", () => {
  const withFired = [{ threshold_sold: 1, price_cents: 850, fired_at: "2026-08-12 11:05:12", step_index: 0 }]
  assert.deepEqual(
    priceLine({ hasLadder: true, isActive: true, baseCents: 500, overrideCents: 1200, steps: withFired, serverPriceCents: 1200 }),
    { amountCents: 1200, reason: "Manual price override" },
  )
})

test("an override of $0.00 is an override, not an absent one", () => {
  assert.deepEqual(
    priceLine({ hasLadder: true, isActive: true, baseCents: 500, overrideCents: 0, serverPriceCents: 0, steps: [] }),
    { amountCents: 0, reason: "Manual price override" },
  )
})

test("highest fired step names its 1-based step number", () => {
  const steps = [
    { threshold_sold: 1, price_cents: 800, fired_at: "2026-08-12 11:05:12", step_index: 0 },
    { threshold_sold: 5, price_cents: 1200, fired_at: "2026-08-12 12:00:00", step_index: 1 },
    { threshold_sold: 9, price_cents: 1600, fired_at: null, step_index: 2 },
  ]
  assert.deepEqual(priceLine({ hasLadder: true, isActive: true, baseCents: 500, steps, serverPriceCents: 1200 }), {
    amountCents: 1200, reason: "Step 2 fired",
  })
})

test("on, nothing fired → base price", () => {
  assert.deepEqual(priceLine({ hasLadder: true, isActive: true, baseCents: 500, steps: SAVED, serverPriceCents: 500 }), {
    amountCents: 500, reason: "Base price",
  })
})

test("the server's current price wins on the AMOUNT when it offers one", () => {
  const steps = [{ threshold_sold: 1, price_cents: 800, fired_at: "2026-08-12 11:05:12", step_index: 0 }]
  const line = priceLine({ hasLadder: true, isActive: true, baseCents: 500, steps, serverPriceCents: 900 })
  assert.equal(line.amountCents, 900, "the oracle is authoritative for what is charged")
  assert.equal(line.reason, "Step 1 fired")
})

test("firedSteps ignores unfired rows and keeps ladder order", () => {
  const steps = [
    { threshold_sold: 1, price_cents: 800, fired_at: "2026-08-12 11:05:12", step_index: 0 },
    { threshold_sold: 5, price_cents: 1200, fired_at: null, step_index: 1 },
  ]
  assert.deepEqual(firedSteps(steps).map((f) => f.number), [1])
  assert.deepEqual(firedSteps([]), [])
})

// ── 6. the frozen label contract ────────────────────────────────────────────

test("every label the test contract pins is exactly as specified", () => {
  assert.equal(SURGE_LABELS.addStep, "Add step")
  assert.equal(SURGE_LABELS.removeStep, "Remove step")
  assert.equal(SURGE_LABELS.override, "Manual price override")
  assert.equal(SURGE_LABELS.set, "Set")
  assert.equal(SURGE_LABELS.clearOverride, "Clear override")
  assert.equal(SURGE_LABELS.fireHistory, "Fire history")
  assert.equal(SURGE_LABELS.fireAndSave, "Fire & save")
  assert.equal(SURGE_LABELS.cancel, "Cancel")
})
