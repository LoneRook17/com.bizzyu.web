// Unit tests for the dashboard role-hardening gates (TF-K-WEB-HARDENING).
//
// Encodes the two UX rulings as executable assertions:
//  (1) Deal-create button — owner/manager only; staff/promoter/blank never see
//      it (mirrors the event-create gate; backstops TF-DEAL-AUTHZ-F1).
//  (2) Events analytics tab — owner/manager only (it exposes revenue). Hidden for
//      every other role. When the fetch rejects, a legit 403 (stale/scoped role)
//      degrades to the calm access state; any other failure (5xx / network) stays
//      a genuine error → error + retry.
//
// Runnable with the Node built-in test runner (no extra deps): `npm test`.

import { test } from "node:test"
import assert from "node:assert/strict"
import {
  canCreateDeal,
  canViewEventAnalytics,
  canViewRevenue,
  eventAnalyticsOutcomeFromError,
  scopedAnalyticsFetchOutcome,
  EVENT_ANALYTICS_ACCESS_COPY,
  type BusinessRole,
} from "./analytics-access.ts"
import { isVenueScopeNotFound } from "./venue-selection.ts"

// ── (1) Deal-create button: owner/manager only ───────────────────────────────

test("owner and manager see the deal-create button", () => {
  assert.equal(canCreateDeal("owner"), true)
  assert.equal(canCreateDeal("manager"), true)
})

test("staff and promoter do NOT see the deal-create button (server would 403)", () => {
  assert.equal(canCreateDeal("staff"), false, "staff must not see Create deal")
  assert.equal(canCreateDeal("promoter"), false, "promoter must not see Create deal")
})

test("a session with no role yet hides the deal-create button (safe default)", () => {
  assert.equal(canCreateDeal(null), false)
  assert.equal(canCreateDeal(undefined), false)
})

// ── (2a) Events analytics tab visibility: owner/manager only ─────────────────

test("owner and manager see the Events analytics tab", () => {
  assert.equal(canViewEventAnalytics("owner"), true)
  assert.equal(canViewEventAnalytics("manager"), true)
})

test("staff, promoter, and blank roles never see the Events tab (revenue-gated)", () => {
  const HIDDEN: (BusinessRole | null | undefined)[] = ["staff", "promoter", null, undefined]
  for (const role of HIDDEN) {
    assert.equal(canViewEventAnalytics(role), false, `${String(role)} must not see the Events tab`)
  }
})

test("an unknown/future role is excluded from the Events tab (default-deny)", () => {
  assert.equal(canViewEventAnalytics("supervisor" as unknown as BusinessRole), false)
})

// ── (2b) Events fetch outcome: 403 degrades, 5xx/network errors ──────────────

test("a 403 on the events fetch (stale/scoped role) → forbidden access state, not error", () => {
  assert.equal(eventAnalyticsOutcomeFromError({ status: 403 }), "forbidden")
})

test("a genuine 500 keeps the error wall + retry", () => {
  assert.equal(eventAnalyticsOutcomeFromError({ status: 500 }), "error")
})

test("a 404 / other non-403 status is a genuine error (not a permission state)", () => {
  assert.equal(eventAnalyticsOutcomeFromError({ status: 404 }), "error")
})

test("a network failure (no status) is a genuine error → error + retry", () => {
  assert.equal(eventAnalyticsOutcomeFromError(new Error("network down")), "error")
  assert.equal(eventAnalyticsOutcomeFromError(null), "error")
  assert.equal(eventAnalyticsOutcomeFromError(undefined), "error")
})

// ── (2c) Scoped fetch outcome: 404-reset layered over 403-forbidden (F1) ──────
//
// The composite classifier a venue-scoped analytics fetch uses, wired with the
// real isVenueScopeNotFound predicate so the whole 404/403/5xx matrix is proven.

test("F1: a 404 'Venue not found' → reset-venue (self-heal to All), NOT the error wall", () => {
  const err = { status: 404, message: "Venue not found", body: { message: "Venue not found" } }
  assert.equal(scopedAnalyticsFetchOutcome(err, isVenueScopeNotFound), "reset-venue")
})

test("F1: a 403 still → forbidden (ForbiddenState from the role hardening)", () => {
  assert.equal(scopedAnalyticsFetchOutcome({ status: 403 }, isVenueScopeNotFound), "forbidden")
})

test("F1: a genuine 500 → error (error wall + retry)", () => {
  assert.equal(scopedAnalyticsFetchOutcome({ status: 500 }, isVenueScopeNotFound), "error")
})

test("F1: a network failure (no status) → error, not a spurious venue reset", () => {
  assert.equal(scopedAnalyticsFetchOutcome(new Error("network down"), isVenueScopeNotFound), "error")
  assert.equal(scopedAnalyticsFetchOutcome(null, isVenueScopeNotFound), "error")
})

test("F1: a bare 404 with no venue marker → error (only the scope-404 self-heals)", () => {
  assert.equal(scopedAnalyticsFetchOutcome({ status: 404, message: "Not Found" }, isVenueScopeNotFound), "error")
})

// ── Access-state copy is polite, no error language ───────────────────────────

test("events access copy names the roles without any error language", () => {
  assert.equal(EVENT_ANALYTICS_ACCESS_COPY.title, "Not available for your role")
  assert.doesNotMatch(EVENT_ANALYTICS_ACCESS_COPY.title, /error|fail|forbidden|denied/i)
  assert.match(EVENT_ANALYTICS_ACCESS_COPY.description, /owners and managers/i)
})

// ── REVENUE IS OWNER-ONLY (the matrix's "View revenue & payouts: manager no") ─

test("canViewRevenue admits only the owner — managers keep analytics, not the money headline", () => {
  assert.equal(canViewRevenue("owner"), true)
  assert.equal(canViewRevenue("manager"), false)
  assert.equal(canViewRevenue("staff"), false)
  assert.equal(canViewRevenue("promoter"), false)
  assert.equal(canViewRevenue(null), false)
  assert.equal(canViewRevenue(undefined), false)
})
