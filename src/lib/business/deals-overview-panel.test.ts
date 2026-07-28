// Unit tests for the expanded-deal-panel composition model (TF-ANALYTICS-W-F1).
//
// Guards the funnel-placement contract in Analytics -> Deals:
//  (1) The engagement funnel is wired with the deal's OWN id (deal.deal_id),
//      so each expanded row funnels the right deal.
//  (2) The funnel is present regardless of the claims-detail fetch state
//      (loading / loaded / error) - it self-fetches and must never be gated
//      behind the "/business/insights/deals/:id" detail load.
//  (3) The claims sub-section state still tracks the lazy detail fetch.
//
// Runnable with the Node built-in test runner (no extra deps): `npm test`.

import { test } from "node:test"
import assert from "node:assert/strict"
import { dealPanelModel } from "./deals-overview-panel.ts"

// ── (1) funnel wired with the deal's own id ─────────────────────────────────

test("funnel is wired with the deal's own deal_id", () => {
  assert.equal(
    dealPanelModel({ dealId: 4242, detailLoading: false, detail: { total_claims: 3 } }).funnelDealId,
    4242,
  )
})

test("a different deal id flows straight through (no cross-wiring)", () => {
  assert.equal(
    dealPanelModel({ dealId: 7, detailLoading: true, detail: null }).funnelDealId,
    7,
  )
})

// ── (2) funnel independent of the claims-detail fetch state ─────────────────

test("funnel id is present while claims detail is still loading", () => {
  const m = dealPanelModel({ dealId: 100, detailLoading: true, detail: null })
  assert.equal(m.funnelDealId, 100)
  assert.equal(m.claims, "loading")
})

test("funnel id is present when the claims detail fails to load (not gated by it)", () => {
  const m = dealPanelModel({ dealId: 100, detailLoading: false, detail: null })
  assert.equal(m.funnelDealId, 100) // funnel still renders even though claims errored
  assert.equal(m.claims, "error")
})

test("funnel id is present when the claims detail has loaded", () => {
  const m = dealPanelModel({ dealId: 100, detailLoading: false, detail: { total_claims: 9 } })
  assert.equal(m.funnelDealId, 100)
  assert.equal(m.claims, "loaded")
})

// ── (3) claims sub-section state tracks the lazy fetch ──────────────────────

test("loading takes precedence over a stale detail object", () => {
  // detailLoading true while a previous detail lingers -> still 'loading'
  const m = dealPanelModel({ dealId: 1, detailLoading: true, detail: { total_claims: 1 } })
  assert.equal(m.claims, "loading")
})
