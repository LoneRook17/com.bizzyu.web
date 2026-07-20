// TI-3w. Every state the invite-time directory lookup can land on, plus the
// legacy-degrade arm that must stay byte-identical to the pre-TI-3 form. The
// repo has no component-test toolchain (node --test, pure modules only — see
// package.json "test"), so every decision the dialog makes lives in lookup.ts
// and is asserted here: the parse of an untrusted body, and the view it drives.

import { test } from "node:test"
import assert from "node:assert/strict"

import { parseLookup, resolveLookupView, type InviteLookup } from "./lookup.ts"

// ── parseLookup: tolerant read of an arbitrary 200 body ────────────────────

test("parseLookup: `one` keeps the server's masked name (nested under `candidate`, TI-3s shape)", () => {
  const r = parseLookup({ match: "one", candidate: { masked_name: "J••• D••" } })
  assert.deepEqual(r, { match: "one", masked_name: "J••• D••" })
})

test("parseLookup: `one` with no usable masked name degrades to a generic label — never blank, never a real name", () => {
  // covers: no candidate, empty candidate, blank name, and the OLD top-level
  // shape (which no longer carries a name — must not leak, must not blank).
  for (const body of [
    { match: "one" },
    { match: "one", candidate: {} },
    { match: "one", candidate: { masked_name: "" } },
    { match: "one", candidate: { masked_name: "   " } },
    { match: "one", masked_name: "should-be-ignored-top-level" },
  ]) {
    const r = parseLookup(body)
    assert.equal(r.match, "one")
    assert.ok(r.match === "one" && r.masked_name.trim().length > 0)
    assert.ok(r.match === "one" && !r.masked_name.includes("top-level"))
  }
})

test("parseLookup: `multiple` with 2+ masked candidates passes through", () => {
  const candidates = [
    { id: 1, masked_name: "A•", masked_contact: "(•••) •••-1720" },
    { id: 2, masked_name: "B•", masked_contact: "(•••) •••-1720" },
  ]
  const r = parseLookup({ match: "multiple", candidates })
  assert.equal(r.match, "multiple")
  assert.equal(r.match === "multiple" && r.candidates.length, 2)
})

test("parseLookup: `multiple` with <2 real candidates collapses to `none` — no empty picker", () => {
  // one candidate, and malformed rows filtered out to zero
  assert.equal(parseLookup({ match: "multiple", candidates: [{ id: 1, masked_name: "A", masked_contact: "x" }] }).match, "none")
  assert.equal(parseLookup({ match: "multiple", candidates: [{ nope: true }, 7, null] }).match, "none")
  assert.equal(parseLookup({ match: "multiple", candidates: [] }).match, "none")
  assert.equal(parseLookup({ match: "multiple" }).match, "none")
})

test("parseLookup: `none` is `none`", () => {
  assert.deepEqual(parseLookup({ match: "none" }), { match: "none" })
})

test("parseLookup: unknown/garbage/empty bodies default to `none` — the safe arm that claims nothing", () => {
  for (const body of [{}, null, undefined, { match: "wat" }, { match: 42 }, "nope", []]) {
    assert.equal(parseLookup(body).match, "none", `body ${JSON.stringify(body)}`)
  }
})

test("parseLookup never synthesises `legacy` — that is the transport's call on a 404", () => {
  for (const body of [{ match: "none" }, { match: "one", candidate: { masked_name: "x" } }, {}, null]) {
    assert.notEqual(parseLookup(body).match, "legacy")
  }
})

// ── resolveLookupView: the affordances each state drives ────────────────────

test("view `one`: success banner names the masked person, hides the name field, submit = Invite them", () => {
  const v = resolveLookupView({ match: "one", masked_name: "J••• D••" })
  assert.equal(v.kind, "one")
  assert.equal(v.showNameField, false)
  assert.equal(v.nameRequired, false)
  assert.equal(v.banner?.tone, "success")
  assert.match(v.banner!.text, /J••• D••/)
  assert.match(v.banner!.text, /on Bizzy/)
  assert.equal(v.candidates, null)
  assert.equal(v.submitLabel, "Invite them")
})

test("view `multiple`: carries the candidates for the pre-invoked picker, hides the name field, submit = Choose person", () => {
  const candidates = [
    { id: 1, masked_name: "A•", masked_contact: "(•••) •••-1720" },
    { id: 2, masked_name: "B•", masked_contact: "(•••) •••-1720" },
  ]
  const v = resolveLookupView({ match: "multiple", candidates })
  assert.equal(v.kind, "multiple")
  assert.equal(v.showNameField, false)
  assert.equal(v.candidates, candidates)
  assert.equal(v.banner?.tone, "info")
  assert.equal(v.submitLabel, "Choose person")
})

test("view `none`: shows a REQUIRED name field (so the row is never blank), info banner, submit = Create invite", () => {
  const v = resolveLookupView({ match: "none" })
  assert.equal(v.kind, "none")
  assert.equal(v.showNameField, true)
  assert.equal(v.nameRequired, true)
  assert.equal(v.banner?.tone, "info")
  assert.match(v.banner!.text, /New to Bizzy/)
  assert.equal(v.submitLabel, "Create invite")
})

test("view `legacy`: byte-identical to the pre-TI-3 form — no banner, OPTIONAL name, unchanged submit", () => {
  const v = resolveLookupView({ match: "legacy" })
  assert.equal(v.kind, "legacy")
  assert.equal(v.showNameField, true)
  assert.equal(v.nameRequired, false) // stays optional, as it always was
  assert.equal(v.banner, null) // the whole status block vanishes
  assert.equal(v.candidates, null)
  assert.equal(v.submitLabel, "Create invite")
})

test("resolveLookupView is total over the union — every match resolves and only `none` demands a name", () => {
  const all: InviteLookup[] = [
    { match: "none" },
    { match: "one", masked_name: "x" },
    { match: "multiple", candidates: [
      { id: 1, masked_name: "A", masked_contact: "x" },
      { id: 2, masked_name: "B", masked_contact: "y" },
    ] },
    { match: "legacy" },
  ]
  for (const l of all) {
    const v = resolveLookupView(l)
    assert.ok(v.submitLabel.length > 0)
    // A required name is asked for exactly when the invitee is new: the `none`
    // path. Every other arm can create without one.
    assert.equal(v.nameRequired, l.match === "none")
  }
})
