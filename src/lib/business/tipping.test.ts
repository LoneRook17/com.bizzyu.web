// Tipping Slice 1 — Settings → Tipping form logic. `node --test` convention
// (see src/lib/business/email-change.test.ts).

import { test } from "node:test"
import assert from "node:assert/strict"
import {
  DEFAULT_TIPPING_CONFIG,
  canEditTipping,
  draftFromConfig,
  formatPresetInput,
  isTippingDirty,
  presetsOnModeSwitch,
  tippingErrorMessage,
  validateTippingDraft,
  type TippingDraft,
} from "./tipping.ts"

const flat = (presets: string[], extra: Partial<TippingDraft> = {}): TippingDraft => ({
  enabled: true,
  preset_mode: "flat",
  presets,
  allow_custom: true,
  ...extra,
})
const pct = (presets: string[], extra: Partial<TippingDraft> = {}): TippingDraft =>
  flat(presets, { preset_mode: "percent", ...extra })

// --- role gate ------------------------------------------------------------

test("canEditTipping: owner + manager only — same gate as other settings", () => {
  assert.equal(canEditTipping("owner"), true)
  assert.equal(canEditTipping("manager"), true)
  assert.equal(canEditTipping("staff"), false)
  assert.equal(canEditTipping("promoter"), false)
  assert.equal(canEditTipping(null), false)
  assert.equal(canEditTipping(undefined), false)
})

// --- defaults / draft round-trip -----------------------------------------

test("defaults match the server: off, flat, [1,2,5], custom allowed", () => {
  assert.deepEqual(DEFAULT_TIPPING_CONFIG, { enabled: false, preset_mode: "flat", presets: [1, 2, 5], allow_custom: true })
})

test("draftFromConfig formats presets for inputs and validate() round-trips exactly", () => {
  const cfg = { enabled: true, preset_mode: "flat" as const, presets: [1, 2.5, 5, 10], allow_custom: false }
  const draft = draftFromConfig(cfg)
  assert.deepEqual(draft.presets, ["1", "2.50", "5", "10"])
  assert.deepEqual(validateTippingDraft(draft).config, cfg)
  assert.equal(isTippingDirty(cfg, draft), false)
})

test("formatPresetInput: flat integers stay bare, cents get 2dp, percent is plain", () => {
  assert.equal(formatPresetInput("flat", 2), "2")
  assert.equal(formatPresetInput("flat", 2.5), "2.50")
  assert.equal(formatPresetInput("percent", 18), "18")
})

// --- validation: mirrors services validateTippingConfigInput --------------

test("validate: 3–4 presets required", () => {
  assert.match(validateTippingDraft(flat(["1", "2"])).listError!, /3 to 4/)
  assert.match(validateTippingDraft(flat(["1", "2", "3", "4", "5"])).listError!, /3 to 4/)
  assert.equal(validateTippingDraft(flat(["1", "2", "3"])).config !== null, true)
  assert.equal(validateTippingDraft(flat(["1", "2", "3", "4"])).config !== null, true)
})

test("validate flat: > $0, ≤ $100, at most 2dp", () => {
  assert.equal(validateTippingDraft(flat(["0", "1", "2"])).presetErrors[0], "Must be more than $0")
  assert.equal(validateTippingDraft(flat(["-1", "1", "2"])).presetErrors[0], "Must be more than $0")
  assert.equal(validateTippingDraft(flat(["1", "2", "100.01"])).presetErrors[2], "Max $100")
  assert.equal(validateTippingDraft(flat(["1.005", "2", "3"])).presetErrors[0], "Cents only (2 decimals)")
  const ok = validateTippingDraft(flat(["0.5", "2.25", "100"]))
  assert.deepEqual(ok.presetErrors, [null, null, null])
  assert.deepEqual(ok.config?.presets, [0.5, 2.25, 100])
})

test("validate percent: whole numbers 1–100", () => {
  assert.equal(validateTippingDraft(pct(["0", "10", "20"])).presetErrors[0], "1-100%")
  assert.equal(validateTippingDraft(pct(["10", "20", "101"])).presetErrors[2], "1-100%")
  assert.equal(validateTippingDraft(pct(["10", "12.5", "20"])).presetErrors[1], "Whole numbers only")
  assert.deepEqual(validateTippingDraft(pct(["1", "50", "100"])).config?.presets, [1, 50, 100])
})

test("validate: empty / non-numeric fields are flagged per index, config stays null", () => {
  const v = validateTippingDraft(flat(["", "abc", "3"]))
  assert.equal(v.presetErrors[0], "Required")
  assert.equal(v.presetErrors[1], "Numbers only")
  assert.equal(v.presetErrors[2], null)
  assert.equal(v.config, null)
  // "$5" and "5%" are not accepted — the unit is shown by the input adornment.
  assert.equal(validateTippingDraft(flat(["$5", "1", "2"])).presetErrors[0], "Numbers only")
  assert.equal(validateTippingDraft(pct(["5%", "10", "20"])).presetErrors[0], "Numbers only")
})

test("validate: duplicates are rejected and the later copy is flagged", () => {
  const v = validateTippingDraft(flat(["2", "2.00", "3"]))
  assert.match(v.listError!, /different/)
  assert.deepEqual(v.presetErrors, [null, "Duplicate", null])
  assert.equal(v.config, null)
})

test("validate: booleans and mode pass through untouched into the PUT body", () => {
  const v = validateTippingDraft(pct(["15", "18", "20", "25"], { enabled: false, allow_custom: false }))
  assert.deepEqual(v.config, { enabled: false, preset_mode: "percent", presets: [15, 18, 20, 25], allow_custom: false })
})

// --- mode switch ----------------------------------------------------------

test("presetsOnModeSwitch: untouched defaults swap to the other mode's defaults", () => {
  assert.deepEqual(presetsOnModeSwitch(["1", "2", "5"], "flat", "percent"), ["15", "18", "20"])
  assert.deepEqual(presetsOnModeSwitch(["15", "18", "20"], "percent", "flat"), ["1", "2", "5"])
})

// REGRESSION: dollar presets used to ride across a mode switch unchanged, so
// "10, 20, 30" flat became 10%/20%/30% percent without the operator noticing —
// which then looked like "percent didn't save correctly" after reload.
test("presetsOnModeSwitch: operator-entered values are REPLACED by the target mode's defaults", () => {
  assert.deepEqual(presetsOnModeSwitch(["10", "20", "30"], "flat", "percent"), ["15", "18", "20"])
  assert.deepEqual(presetsOnModeSwitch(["1", "2.50", "5"], "flat", "percent"), ["15", "18", "20"])
  assert.deepEqual(presetsOnModeSwitch(["10", "20", "30", "40"], "flat", "percent"), ["15", "18", "20"])
  assert.deepEqual(presetsOnModeSwitch(["5", "10", "25"], "percent", "flat"), ["1", "2", "5"])
  assert.deepEqual(presetsOnModeSwitch(["", "", ""], "flat", "percent"), ["15", "18", "20"])
  // The defaults are a valid draft in the new mode — Save is never blocked by the switch itself.
  assert.deepEqual(validateTippingDraft(pct(presetsOnModeSwitch(["10", "20", "30"], "flat", "percent"))).config, {
    enabled: true,
    preset_mode: "percent",
    presets: [15, 18, 20],
    allow_custom: true,
  })
})

test("presetsOnModeSwitch: same mode is a no-op; values typed AFTER a switch are kept and saved as-is", () => {
  assert.deepEqual(presetsOnModeSwitch(["1", "2", "5"], "flat", "flat"), ["1", "2", "5"])
  assert.deepEqual(presetsOnModeSwitch(["3", "6", "9"], "percent", "percent"), ["3", "6", "9"])
  // After switching to percent the operator edits the defaults; that draft is what gets PUT.
  const afterSwitch = presetsOnModeSwitch(["10", "20", "30"], "flat", "percent")
  afterSwitch[0] = "10"
  assert.deepEqual(validateTippingDraft(pct(afterSwitch)).config?.presets, [10, 18, 20])
})

// --- dirty tracking -------------------------------------------------------

test("isTippingDirty: any field change, including preset order, is dirty", () => {
  const saved = { ...DEFAULT_TIPPING_CONFIG, presets: [1, 2, 5] }
  assert.equal(isTippingDirty(saved, draftFromConfig(saved)), false)
  assert.equal(isTippingDirty(saved, { ...draftFromConfig(saved), enabled: true }), true)
  assert.equal(isTippingDirty(saved, { ...draftFromConfig(saved), allow_custom: false }), true)
  assert.equal(isTippingDirty(saved, { ...draftFromConfig(saved), presets: ["2", "1", "5"] }), true)
  assert.equal(isTippingDirty(saved, { ...draftFromConfig(saved), presets: ["1", "2", "5", "10"] }), true)
  assert.equal(isTippingDirty(saved, { ...draftFromConfig(saved), presets: ["1", "2", "x"] }), true)
})

// --- error copy -----------------------------------------------------------

test("tippingErrorMessage: 400 shows the server's message, 403/503 fixed, else generic", () => {
  assert.equal(tippingErrorMessage(400, "presets must be unique"), "presets must be unique")
  assert.match(tippingErrorMessage(400, "  "), /can't be saved/)
  assert.match(tippingErrorMessage(403), /owners and managers/)
  assert.match(tippingErrorMessage(503), /available on this environment yet/)
  assert.match(tippingErrorMessage(500, "boom"), /Couldn't save/)
})
