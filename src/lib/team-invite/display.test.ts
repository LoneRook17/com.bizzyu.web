// TI-3w / TI-F1. The never-blank guarantee, asserted rather than eyeballed: a
// team row ALWAYS shows something and always has an avatar letter, whatever the
// invite's shape. Pure module (node --test, no render toolchain — see
// package.json "test").

import { test } from "node:test"
import assert from "node:assert/strict"

import { memberDisplay, memberInitial } from "./display.ts"
import type { TeamMember } from "@/lib/business/types"

/** Minimal TeamMember; overrides fill in whatever the case needs. */
function member(over: Partial<TeamMember>): TeamMember {
  return {
    id: 1,
    user_id: null,
    role: "staff",
    email: "",
    is_active: true,
    invite_accepted_at: null,
    invite_expires_at: null,
    created_at: "2026-07-20T00:00:00Z",
    venue_id: null,
    venue_name: null,
    ...over,
  }
}

test("display_name after accept: the real name, NOT provisional", () => {
  const d = memberDisplay(member({ display_name: "Jane Doe", invite_accepted_at: "2026-07-20T01:00:00Z" }))
  assert.deepEqual(d, { name: "Jane Doe", isProvisional: false })
})

test("display_name before accept: the owner's provisional name, marked provisional", () => {
  const d = memberDisplay(member({ display_name: "Jane (bar back)", invite_accepted_at: null }))
  assert.equal(d.name, "Jane (bar back)")
  assert.equal(d.isProvisional, true)
})

test("legacy email-keyed row: shows the email exactly as before (accepted → not provisional)", () => {
  const d = memberDisplay(member({ email: "staff@bizzytest.com", invite_accepted_at: "2026-07-20T01:00:00Z" }))
  assert.deepEqual(d, { name: "staff@bizzytest.com", isProvisional: false })
})

test("email-keyed pending row: email shown, provisional until accept", () => {
  const d = memberDisplay(member({ email: "pending@bizzytest.com", invite_accepted_at: null }))
  assert.equal(d.name, "pending@bizzytest.com")
  assert.equal(d.isProvisional, true)
})

test("phone-only provisional row (no name, no email): masked contact + provisional — the TI-F1 blank-row fix", () => {
  const d = memberDisplay(member({ email: "", masked_phone: "(•••) •••-1720" }))
  assert.deepEqual(d, { name: "(•••) •••-1720", isProvisional: true })
})

test("nothing to show: floors to a non-empty label — a row is NEVER blank", () => {
  const d = memberDisplay(member({ email: "", display_name: null, masked_phone: null }))
  assert.ok(d.name.trim().length > 0)
  assert.equal(d.isProvisional, true)
})

test("owner with no accepted_at is never provisional (owner rows are grandfathered)", () => {
  const d = memberDisplay(member({ role: "owner", email: "owner@bizzytest.com", invite_accepted_at: null }))
  assert.equal(d.isProvisional, false)
})

test("whitespace-only fields fall through instead of showing blanks", () => {
  const d = memberDisplay(member({ display_name: "   ", email: "  ", masked_phone: "(•••) •••-9999" }))
  assert.equal(d.name, "(•••) •••-9999")
})

test("memberInitial: always a single upper letter or '?', never empty — across every fallback tier", () => {
  const cases: Partial<TeamMember>[] = [
    { display_name: "jane" },
    { email: "staff@x.com" },
    { email: "", masked_phone: "(•••) •••-1720" }, // digit initial
    { email: "", display_name: null, masked_phone: null }, // floor
  ]
  for (const c of cases) {
    const i = memberInitial(member(c))
    assert.equal(i.length, 1)
    assert.match(i, /[A-Z0-9?]/)
  }
})
