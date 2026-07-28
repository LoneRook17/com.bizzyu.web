// Unit tests for the owner-only Payouts gate (TF-B-w).
//
// Encodes Luke's ruling as executable assertions:
//  (1) Only the owner sees the Payouts nav tab and reaches the screen; every
//      other role — and a session with no role yet — is denied.
//  (2) A non-owner direct visit resolves to the access state (never an error).
//  (3) An owner's reconcile fetch maps cleanly: both payloads → ready; a null
//      (P2-B1s not deployed → 404) → the "coming soon" degrade; a 403 (stale
//      owner role) → the SAME access state, never an error wall; any other
//      failure (5xx / network) → error + retry.
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

// ── (2) Owner reconcile-fetch: data outcomes ─────────────────────────────────

test("both payloads present → ready (render the reconciliation view)", () => {
  assert.equal(reconcileOutcomeFromData({ deposited_cents: 0 }, []), "ready")
})

test("either payload null (P2-B1s not deployed / 404) → notdeployed, not error", () => {
  assert.equal(reconcileOutcomeFromData(null, []), "notdeployed")
  assert.equal(reconcileOutcomeFromData({ deposited_cents: 0 }, null), "notdeployed")
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

test("access-state copy names the owner without any error language", () => {
  assert.equal(PAYOUTS_ACCESS_COPY.description, "Payouts are only available to the business owner.")
  assert.doesNotMatch(PAYOUTS_ACCESS_COPY.title, /error|fail|denied|forbidden/i)
})
