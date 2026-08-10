// Unit tests for the Payouts gate (TF-B-w + PAYOUTS-PER-PERSON-ACCESS).
//
// Encodes the ruling as executable assertions:
//  (1) The owner OR an owner-granted member (/me → can_view_payouts=true) sees
//      the Payouts nav tab and reaches the screen; every other user — and a
//      session with no role/grant yet — is denied. A pre-contract /me (no grant
//      field) still lets owners in via the role fallback.
//  (2) A no-access direct visit resolves to the access state (never an error).
//  (3) A granted user's reconcile fetch maps cleanly: both payloads → ready; a
//      null (P2-B1s not deployed → 404) → the "coming soon" degrade; a 403 (a
//      just-revoked grant / stale role) → the SAME access state, never an error
//      wall; any other failure (5xx / network) → error + retry.
//
// Runnable with the Node built-in test runner (no extra deps): `npm test`.

import { test } from "node:test"
import assert from "node:assert/strict"
import {
  canAccessPayouts,
  payoutsRouteGate,
  reconcileOutcomeFromData,
  reconcileOutcomeFromError,
  PAYOUTS_ACCESS_COPY,
  type BusinessRole,
} from "./payouts-access.ts"

const NON_OWNER_ROLES: BusinessRole[] = ["manager", "staff", "promoter"]

// ── (1) Nav visibility + route gate: owner only ──────────────────────────────

test("owner can access Payouts — nav tab shows, route renders the screen", () => {
  assert.equal(canAccessPayouts("owner"), true)
  assert.equal(payoutsRouteGate("owner"), "owner")
})

test("every non-owner role is denied — no tab, access state on direct route", () => {
  for (const role of NON_OWNER_ROLES) {
    assert.equal(canAccessPayouts(role), false, `${role} must not access payouts`)
    assert.equal(payoutsRouteGate(role), "denied", `${role} direct route → access state`)
  }
})

test("a session with no role yet is denied (safe default, no flash of access)", () => {
  assert.equal(canAccessPayouts(null), false)
  assert.equal(canAccessPayouts(undefined), false)
  assert.equal(payoutsRouteGate(null), "denied")
})

// ── PAYOUTS-PER-PERSON-ACCESS: the grant widens access beyond the owner ───────

test("an owner-GRANTED member (can_view_payouts=true) can access — tab + screen", () => {
  for (const role of NON_OWNER_ROLES) {
    assert.equal(canAccessPayouts(role, true), true, `granted ${role} must access payouts`)
    assert.equal(payoutsRouteGate(role, true), "owner", `granted ${role} route → access container`)
  }
})

test("a NON-granted non-owner (can_view_payouts=false) is still denied", () => {
  for (const role of NON_OWNER_ROLES) {
    assert.equal(canAccessPayouts(role, false), false, `non-granted ${role} denied`)
    assert.equal(payoutsRouteGate(role, false), "denied")
  }
})

test("the owner is allowed whatever the grant field says (inherent access)", () => {
  assert.equal(canAccessPayouts("owner", true), true)
  assert.equal(canAccessPayouts("owner", false), true) // e.g. a stale/odd payload
  assert.equal(canAccessPayouts("owner", undefined), true) // pre-contract /me fallback
})

test("legacy /me (no grant field) keeps owners in and members out — grandfather", () => {
  assert.equal(canAccessPayouts("owner", undefined), true)
  assert.equal(canAccessPayouts("manager", undefined), false)
  assert.equal(canAccessPayouts("staff", undefined), false)
})

test("a null grant is treated as no grant (denied for non-owners)", () => {
  assert.equal(canAccessPayouts("staff", null), false)
  assert.equal(canAccessPayouts(null, null), false)
})

// ── (2) Owner reconcile-fetch: data outcomes ─────────────────────────────────
// The typed client returns discriminated results ({kind:'ready'|'computing'})
// since the :125 cached-serve contract; null still means 404 / not deployed.

const READY = { kind: "ready" } as const
const COMPUTING = { kind: "computing" } as const

test("both results ready → ready (render the reconciliation view)", () => {
  assert.equal(reconcileOutcomeFromData(READY, READY), "ready")
})

test("either result computing → computing (poll, never $0.00 tiles)", () => {
  assert.equal(reconcileOutcomeFromData(COMPUTING, READY), "computing")
  assert.equal(reconcileOutcomeFromData(READY, COMPUTING), "computing")
  assert.equal(reconcileOutcomeFromData(COMPUTING, COMPUTING), "computing")
})

test("computing is checked BEFORE the null→notdeployed mapping (mixed deploy)", () => {
  assert.equal(reconcileOutcomeFromData(COMPUTING, null), "computing")
  assert.equal(reconcileOutcomeFromData(null, COMPUTING), "computing")
})

test("either result null (contract not deployed / 404) → notdeployed, not error", () => {
  assert.equal(reconcileOutcomeFromData(null, READY), "notdeployed")
  assert.equal(reconcileOutcomeFromData(READY, null), "notdeployed")
  assert.equal(reconcileOutcomeFromData(null, null), "notdeployed")
})

// ── (3) Owner reconcile-fetch: error outcomes ────────────────────────────────

test("403 despite an owner session (stale role) → access state, never an error wall", () => {
  assert.equal(reconcileOutcomeFromError({ status: 403 }), "forbidden")
})

test("a genuine 500 keeps the owner's error + retry", () => {
  assert.equal(reconcileOutcomeFromError({ status: 500 }), "error")
})

test("a network failure (no status) is a genuine error → error + retry", () => {
  assert.equal(reconcileOutcomeFromError(new Error("network down")), "error")
  assert.equal(reconcileOutcomeFromError(null), "error")
})

// ── Access-state copy is the polite, no-error message ────────────────────────

test("access-state copy reflects the grant model without any error language", () => {
  assert.match(PAYOUTS_ACCESS_COPY.description, /owner/i)
  assert.match(PAYOUTS_ACCESS_COPY.description, /grant/i) // names the grant path, not "owner only"
  assert.doesNotMatch(PAYOUTS_ACCESS_COPY.title, /error|fail|denied|forbidden/i)
})
