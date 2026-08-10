// Unit tests for the owner-only, per-member Payouts-access toggle logic
// (PAYOUTS-PER-PERSON-ACCESS). Pure decision layer behind PayoutsAccessControl /
// TeamMemberRow / the team page — the components only render / wire what these
// functions decide. Node built-in runner (no extra deps): `npm test`.

import { test } from "node:test"
import assert from "node:assert/strict"
import {
  payoutsToggleState,
  canTogglePayoutsAccess,
  withPayoutsAccess,
  payoutsAccessPath,
  payoutsAccessPayload,
  togglePayoutsAccess,
  PAYOUTS_ACCESS_TOGGLE,
  type PayoutsAccessMember,
} from "./team-payouts-access.ts"

const staff = (over: Partial<PayoutsAccessMember> = {}): PayoutsAccessMember => ({
  id: 1, role: "staff", can_view_payouts: false, ...over,
})

// ── payoutsToggleState: visibility + state ───────────────────────────────────

test("owner viewer + granted member → 'on'; + non-granted → 'off'", () => {
  assert.equal(payoutsToggleState("owner", staff({ can_view_payouts: true })), "on")
  assert.equal(payoutsToggleState("owner", staff({ can_view_payouts: false })), "off")
  assert.equal(payoutsToggleState("owner", { id: 2, role: "manager", can_view_payouts: true }), "on")
})

test("owner viewer + the owner's OWN row → 'owner' (disabled indicator, not a toggle)", () => {
  assert.equal(payoutsToggleState("owner", { id: 9, role: "owner", can_view_payouts: false }), "owner")
  assert.equal(payoutsToggleState("owner", { id: 9, role: "owner", can_view_payouts: true }), "owner")
})

test("a NON-owner viewer NEVER sees the control → 'hidden' (every role, any field)", () => {
  for (const viewer of ["manager", "staff", "promoter", null, undefined]) {
    assert.equal(payoutsToggleState(viewer, staff({ can_view_payouts: true })), "hidden", `viewer ${viewer}`)
    assert.equal(payoutsToggleState(viewer, staff({ can_view_payouts: false })), "hidden", `viewer ${viewer}`)
  }
})

test("owner viewer but the grant field is ABSENT (legacy / non-owner server payload) → 'hidden'", () => {
  assert.equal(payoutsToggleState("owner", { id: 3, role: "staff" }), "hidden")
  assert.equal(payoutsToggleState("owner", { id: 3, role: "manager" }), "hidden")
})

test("canTogglePayoutsAccess is true ONLY for a mutable (on/off) row", () => {
  assert.equal(canTogglePayoutsAccess("owner", staff({ can_view_payouts: true })), true)
  assert.equal(canTogglePayoutsAccess("owner", staff({ can_view_payouts: false })), true)
  assert.equal(canTogglePayoutsAccess("owner", { id: 9, role: "owner", can_view_payouts: false }), false) // owner row
  assert.equal(canTogglePayoutsAccess("manager", staff({ can_view_payouts: true })), false) // non-owner viewer
  assert.equal(canTogglePayoutsAccess("owner", { id: 3, role: "staff" }), false) // absent field
})

// ── withPayoutsAccess: immutable roster update ───────────────────────────────

test("withPayoutsAccess sets only the target member and never mutates the input", () => {
  const members = [staff({ id: 1, can_view_payouts: false }), staff({ id: 2, can_view_payouts: false })]
  const next = withPayoutsAccess(members, 1, true)
  assert.equal(next.find((m) => m.id === 1)!.can_view_payouts, true)
  assert.equal(next.find((m) => m.id === 2)!.can_view_payouts, false)
  // originals untouched (immutability)
  assert.equal(members[0].can_view_payouts, false)
  assert.notEqual(next, members)
  assert.notEqual(next[0], members[0])
})

// ── endpoint contract ────────────────────────────────────────────────────────

test("payoutsAccessPath / payload match the services PATCH contract", () => {
  assert.equal(payoutsAccessPath(42), "/business/team/members/42/payouts-access")
  assert.deepEqual(payoutsAccessPayload(true), { enabled: true })
  assert.deepEqual(payoutsAccessPayload(false), { enabled: false })
})

// ── togglePayoutsAccess: optimistic set → PATCH → revert on failure ──────────
// A fake React functional-setState over a local array + a stub patch let us
// assert the full flip behavior without a DOM.

function fakeState(initial: PayoutsAccessMember[]) {
  let members = initial
  const setMembers = (updater: (prev: PayoutsAccessMember[]) => PayoutsAccessMember[]) => {
    members = updater(members)
  }
  return { setMembers, get: () => members }
}

test("success: optimistic ON, PATCH called with the right path/body, state stays ON", async () => {
  const s = fakeState([staff({ id: 1, can_view_payouts: false })])
  const calls: Array<{ path: string; body: unknown }> = []
  const result = await togglePayoutsAccess({
    memberId: 1, enabled: true, previous: false,
    patch: async (path, body) => { calls.push({ path, body }); return {} },
    setMembers: s.setMembers,
  })
  assert.deepEqual(result, { ok: true })
  assert.deepEqual(calls, [{ path: "/business/team/members/1/payouts-access", body: { enabled: true } }])
  assert.equal(s.get().find((m) => m.id === 1)!.can_view_payouts, true) // stuck ON
})

test("failure: reverts to the PREVIOUS value and reports the error (no stuck state)", async () => {
  const s = fakeState([staff({ id: 1, can_view_payouts: false })])
  const errors: number[] = []
  const result = await togglePayoutsAccess({
    memberId: 1, enabled: true, previous: false,
    patch: async () => { throw new Error("500") },
    setMembers: s.setMembers,
    onError: (id) => errors.push(id),
  })
  assert.deepEqual(result, { ok: false })
  assert.equal(s.get().find((m) => m.id === 1)!.can_view_payouts, false) // reverted to previous
  assert.deepEqual(errors, [1])
})

test("failure reverting an OFF flip restores ON (previous=true honored)", async () => {
  const s = fakeState([staff({ id: 1, can_view_payouts: true })])
  await togglePayoutsAccess({
    memberId: 1, enabled: false, previous: true,
    patch: async () => { throw new Error("network") },
    setMembers: s.setMembers,
  })
  assert.equal(s.get().find((m) => m.id === 1)!.can_view_payouts, true) // back ON
})

test("a concurrent flip of ANOTHER row is NOT clobbered by a revert (functional updates)", async () => {
  // Row 1 fails and reverts; row 2 was toggled ON in between and must survive,
  // because the revert composes on the LATEST roster via functional setState.
  const s = fakeState([staff({ id: 1, can_view_payouts: false }), staff({ id: 2, can_view_payouts: false })])
  const p1 = togglePayoutsAccess({
    memberId: 1, enabled: true, previous: false,
    patch: async () => { throw new Error("500") },
    setMembers: s.setMembers,
  })
  // meanwhile row 2 succeeds and its optimistic ON lands
  s.setMembers((prev) => withPayoutsAccess(prev, 2, true))
  await p1
  assert.equal(s.get().find((m) => m.id === 1)!.can_view_payouts, false) // row 1 reverted
  assert.equal(s.get().find((m) => m.id === 2)!.can_view_payouts, true) // row 2 preserved
})

// ── tooltip / labels: the (i) affordance copy is the contract wording ────────

test("the (i) tooltip explains grant + revoke and keeps them on the team", () => {
  const t = PAYOUTS_ACCESS_TOGGLE.tooltip
  assert.match(t, /Payouts page/i)
  assert.match(t, /export/i)
  assert.match(t, /removes that access/i)
  assert.match(t, /keeps them on your team/i)
})

test("toggle labels are present and non-error", () => {
  assert.equal(PAYOUTS_ACCESS_TOGGLE.label, "Payouts access")
  assert.equal(PAYOUTS_ACCESS_TOGGLE.ownerLabel, "Owner")
  assert.doesNotMatch(PAYOUTS_ACCESS_TOGGLE.label, /error|fail|forbidden/i)
})
