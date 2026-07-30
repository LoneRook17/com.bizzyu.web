// Unit tests for the venue-scoped DEPOSIT LIST rendering (payouts-venue-scoping
// contract §1, notes/payouts-venue-scoping-contract.md in com.bizzyu.services).
// Runs under the Node built-in test runner (`npm test`), no extra deps.
//
// Proves, against mock /deposits responses, the render decisions the component
// (ReconcileView DepositRow + list body) consumes verbatim:
//  (1) normalizeDeposit surfaces the additive venue_* fields when present, and
//      NEVER leaks them on an unscoped payload,
//  (2) the venue slice (venue_amount_cents) is the headline and amount_cents is
//      the quiet context — with the pre-contract-server fallback and all-venues
//      both intact,
//  (3) $0-venue rows are hidden; a POSITIVE slice is a "share", a NEGATIVE slice
//      is a REFUND — kept and shown as money returned for the venue (typographic-
//      minus headline + "refund" qualifier + money-returned copy), NOT a bare
//      negative "share",
//  (4) all rows hidden → the venue empty state fires (deposits still exist),
//  (5) the all-venues path is byte-unchanged (hard regression gate),
//  (6) the CSV export path carries venue_id, and
//  (7) the drill-down's venue_subtotal_cents pins to the list's venue_amount_cents
//      (contract §3 footing).

import { test } from "node:test"
import assert from "node:assert/strict"
import {
  normalizeDeposit,
  normalizeDeposits,
  normalizeReconciliation,
  depositRowMode,
  depositRowView,
  visibleDeposits,
  allVenueRowsHidden,
  venueShareLabel,
  venueRefundLabel,
  VENUE_REFUND_QUALIFIER,
  signedMoneyStr,
  depositContextLabel,
  venueEmptyDepositsCopy,
  type DepositListItem,
} from "./payouts-reconcile.ts"
import { payoutsQuery } from "./payouts.ts"

// ── Fixtures ─────────────────────────────────────────────────────────────────
// A venue-scoped /deposits payload: three deposits — a positive slice, a $0
// slice (hide), and a negative (refund-heavy) slice (keep). amount_cents is the
// FULL bank deposit in every case (Stripe pays the account, not the venue).

function scopedRaw(): Partial<DepositListItem>[] {
  return [
    { payout_id: "po_A", arrival_date: "2026-07-28", amount_cents: 868850, sales_count: 214, status: "paid", venue_amount_cents: 6350, venue_sales_count: 4 },
    { payout_id: "po_B", arrival_date: "2026-07-25", amount_cents: 512300, sales_count: 130, status: "paid", venue_amount_cents: 0, venue_sales_count: 0 },
    { payout_id: "po_C", arrival_date: "2026-07-21", amount_cents: 220000, sales_count: 60, status: "paid", venue_amount_cents: -1875, venue_sales_count: 0 },
  ]
}

// The same three deposits as an UNSCOPED (all-venues) payload — no venue_* keys.
function unscopedRaw(): Partial<DepositListItem>[] {
  return [
    { payout_id: "po_A", arrival_date: "2026-07-28", amount_cents: 868850, sales_count: 214, status: "paid" },
    { payout_id: "po_B", arrival_date: "2026-07-25", amount_cents: 512300, sales_count: 130, status: "paid" },
    { payout_id: "po_C", arrival_date: "2026-07-21", amount_cents: 220000, sales_count: 60, status: "paid" },
  ]
}

// ── (1) normalization: additive when present, no leak when absent ────────────

test("normalizeDeposit surfaces additive venue_amount_cents + venue_sales_count when present", () => {
  const d = normalizeDeposit(scopedRaw()[0])
  assert.equal(d.amount_cents, 868850) // full deposit unchanged
  assert.equal(d.venue_amount_cents, 6350)
  assert.equal(d.venue_sales_count, 4)
})

test("normalizeDeposit coerces string venue_amount_cents and keeps a 0 slice as 0 (not null)", () => {
  const d = normalizeDeposit({ payout_id: "po_X", amount_cents: 1000, sales_count: 2, status: "paid", venue_amount_cents: "0" as unknown as number, venue_sales_count: "0" as unknown as number })
  assert.equal(d.venue_amount_cents, 0)
  assert.equal(d.venue_sales_count, 0)
})

test("normalizeDeposit leaks NO venue_* field on an unscoped payload (both null)", () => {
  const d = normalizeDeposit(unscopedRaw()[0])
  assert.equal(d.venue_amount_cents, null)
  assert.equal(d.venue_sales_count, null)
})

// ── (2) venue slice is the headline; amount_cents is the context ─────────────

test("venue_slice mode: venue_amount_cents is the headline, amount_cents is the context, venue_sales_count is the count", () => {
  const d = normalizeDeposit(scopedRaw()[0])
  const v = depositRowView(d, true)
  assert.equal(v.mode, "venue_slice")
  assert.equal(v.headlineCents, 6350) // the venue's slice is PRIMARY
  assert.equal(v.depositCents, 868850) // the full bank deposit is CONTEXT
  assert.equal(v.salesCount, 4) // venue count, not the account's 214
  assert.equal(v.hidden, false)
  assert.equal(v.isVenueRefund, false) // a positive slice is a "share", not a refund
})

test("venue-slice copy: share label names the venue, context names the full deposit", () => {
  assert.equal(venueShareLabel("Nauti Parrot"), "Nauti Parrot's share")
  assert.equal(venueShareLabel(undefined), "This venue's share")
  assert.equal(depositContextLabel(868850), "of a $8,688.50 deposit")
})

test("venue_whole mode: a scoped request against a pre-contract server keeps whole-deposit rendering (no regression)", () => {
  const d = normalizeDeposit(unscopedRaw()[0]) // scoped request, but server sent no slice
  const v = depositRowView(d, true)
  assert.equal(v.mode, "venue_whole")
  assert.equal(v.headlineCents, 868850) // the whole deposit — we can't compute a slice
  assert.equal(v.salesCount, 214)
  assert.equal(v.hidden, false)
  assert.equal(v.isVenueRefund, false) // no slice to be negative → never a refund
  assert.equal(depositRowMode(d, true), "venue_whole")
})

// ── (3) $0-venue rows hidden; negative + positive kept ───────────────────────

test("$0-venue slice is hidden; a negative (refund-heavy) slice is kept", () => {
  const [a, b, c] = normalizeDeposits(scopedRaw())
  assert.equal(depositRowView(a, true).hidden, false) // +$63.50
  assert.equal(depositRowView(b, true).hidden, true) // $0 → hide
  assert.equal(depositRowView(c, true).hidden, false) // −$18.75 → keep (real movement)
})

// ── (3b) negative venue slice → refund presentation (not a bare negative share) ─

test("negative venue slice → isVenueRefund, kept (not hidden), still a venue_slice", () => {
  const c = normalizeDeposit(scopedRaw()[2]) // po_C, venue_amount_cents −1875
  const v = depositRowView(c, true)
  assert.equal(v.mode, "venue_slice")
  assert.equal(v.isVenueRefund, true) // the slice is money RETURNED for this venue
  assert.equal(v.hidden, false) // a real movement — kept so the list still foots
  assert.equal(v.headlineCents, -1875) // the negative slice IS the headline
})

test("refund headline renders a typographic minus (−$18.75), not a bare '$-18.75'", () => {
  const c = normalizeDeposit(scopedRaw()[2])
  const v = depositRowView(c, true)
  const headline = signedMoneyStr(v.headlineCents)
  assert.equal(headline, "−$18.75") // U+2212 minus BEFORE the $ — reads as a refund
  assert.doesNotMatch(headline, /\$-/) // never "$-18.75"
})

test("refund copy reads as money returned for the venue — never a 'share'", () => {
  assert.equal(VENUE_REFUND_QUALIFIER, "refund") // the small at-a-glance qualifier
  assert.equal(venueRefundLabel("Nauti Parrot"), "returned for Nauti Parrot")
  assert.equal(venueRefundLabel(undefined), "returned for this venue")
  assert.doesNotMatch(venueRefundLabel("Nauti Parrot"), /share/) // NOT the share wording
  // The share label stays exclusively for positive slices.
  assert.match(venueShareLabel("Nauti Parrot"), /share/)
})

test("a positive slice is a share (isVenueRefund false); a zero slice is hidden and not a refund", () => {
  const pos = normalizeDeposit(scopedRaw()[0]) // +$63.50
  const zero = normalizeDeposit(scopedRaw()[1]) // $0
  assert.equal(depositRowView(pos, true).isVenueRefund, false)
  assert.equal(depositRowView(zero, true).isVenueRefund, false)
  assert.equal(depositRowView(zero, true).hidden, true) // zero still hidden, unchanged
})

test("visibleDeposits drops exactly the $0-venue rows when scoped", () => {
  const deposits = normalizeDeposits(scopedRaw())
  const shown = visibleDeposits(deposits, true)
  assert.deepEqual(shown.map((d) => d.payout_id), ["po_A", "po_C"])
})

// ── (4) all rows hidden → venue empty state ──────────────────────────────────

test("all $0-venue slices → allVenueRowsHidden true (deposits still exist on the account)", () => {
  const raw = scopedRaw().map((d) => ({ ...d, venue_amount_cents: 0, venue_sales_count: 0 }))
  const deposits = normalizeDeposits(raw)
  assert.equal(deposits.length, 3)
  assert.equal(visibleDeposits(deposits, true).length, 0)
  assert.equal(allVenueRowsHidden(deposits, true), true)
})

test("allVenueRowsHidden is false when at least one slice is non-zero, and false when unscoped", () => {
  const deposits = normalizeDeposits(scopedRaw())
  assert.equal(allVenueRowsHidden(deposits, true), false) // po_A / po_C survive
  assert.equal(allVenueRowsHidden(deposits, false), false) // unscoped never hides
  assert.equal(allVenueRowsHidden([], true), false) // no deposits at all → generic empty, not this one
})

test("venue empty-state copy names the venue and reads as this venue's portion", () => {
  const copy = venueEmptyDepositsCopy("Nauti Parrot")
  assert.equal(copy.title, "No Nauti Parrot money in these deposits for this range")
  assert.match(copy.description, /Nauti Parrot/)
  assert.doesNotMatch(copy.title, /whole deposit/)
  // Fallback when no venue name is known.
  assert.equal(venueEmptyDepositsCopy(undefined).title, "No this venue money in these deposits for this range")
})

// ── (5) all-venues path byte-unchanged (hard regression gate) ────────────────

test("all-venues: visibleDeposits returns the SAME array (identity) — nothing hidden", () => {
  const deposits = normalizeDeposits(unscopedRaw())
  const shown = visibleDeposits(deposits, false)
  assert.equal(shown, deposits) // same reference — zero filtering work
  assert.equal(shown.length, 3)
})

test("all-venues: each row renders amount_cents as headline, 'deposited' semantics, account sales_count", () => {
  for (const d of normalizeDeposits(unscopedRaw())) {
    const v = depositRowView(d, false)
    assert.equal(v.mode, "all_venues")
    assert.equal(v.headlineCents, d.amount_cents)
    assert.equal(v.salesCount, d.sales_count)
    assert.equal(v.hidden, false)
    assert.equal(v.isVenueRefund, false) // refund presentation is venue-slice only
  }
})

// ── (6) CSV export path carries venue_id ─────────────────────────────────────

test("export query carries the selected venue_id (server-side venue filtering)", () => {
  const range = { since: "2026-05-01", until: "2026-07-30" }
  const q = payoutsQuery({ range, status: "all", venueParam: "&venue_id=267" })
  assert.match(q, /&venue_id=267/)
  assert.match(q, /since=2026-05-01/)
  assert.match(q, /until=2026-07-30/)
  // Unscoped export carries no venue_id.
  assert.doesNotMatch(payoutsQuery({ range, status: "all", venueParam: "" }), /venue_id/)
})

// ── (7) drill-down venue_subtotal_cents pins to the list's venue_amount_cents ─

test("drill-down: venue-scoped reconciliation exposes venue_subtotal_cents equal to the list row's venue_amount_cents (contract §3)", () => {
  const listRow = normalizeDeposit(scopedRaw()[0]) // po_A, venue_amount_cents 6350
  const recon = normalizeReconciliation({
    payout_id: "po_A",
    arrival_date: "2026-07-28",
    amount_cents: 868850, // full deposit — stays whole-deposit truth
    computed_total_cents: 868850,
    ties: true,
    venue_scoped: true,
    venue_subtotal_cents: 6350, // the venue's slice inside the deposit
    events: [{ event_id: 9, name: "Foam Party", date: "2026-07-27", subtotal_cents: 6350, tiers: [{ tier_name: "GA", qty: 4, amount_cents: 6350 }] }],
  })
  assert.equal(recon.venue_scoped, true)
  assert.equal(recon.venue_subtotal_cents, listRow.venue_amount_cents) // 6350 == 6350
  assert.equal(recon.amount_cents, 868850) // deposit total unchanged
  // Line items are the venue's rows (server-filtered) — the drill-down renders them.
  assert.equal(recon.events.length, 1)
  assert.equal(recon.events[0].tiers[0].qty, 4)
})

test("drill-down: an unscoped reconciliation keeps venue_subtotal_cents null (no venue callout)", () => {
  const recon = normalizeReconciliation({ payout_id: "po_A", amount_cents: 868850, computed_total_cents: 868850, ties: true, events: [] })
  assert.equal(recon.venue_scoped, false)
  assert.equal(recon.venue_subtotal_cents, null)
})
