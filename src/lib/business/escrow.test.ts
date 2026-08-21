// Unit tests for the escrow typed client (BE_LEDGER_CONTRACT.md §7 + A4).
// Runnable with the Node built-in test runner: `npm test`.
//
// Guards: (1) defensive normalization (stringified numbers, missing arrays),
// (2) the panel state machine — every screenshot state plus the edges around
// it, (3) the A4 one-number rule via escrowHeroCents, (4) pure formatting
// (signed cents, ET timestamps parsed WITHOUT Date()), and (5) fixture
// integrity — every demo fixture must satisfy the §3 identity
// available_cents = Σ settled amount_cents, so the stub can never teach the
// UI a balance the ledger doesn't support.

import { test } from "node:test"
import assert from "node:assert/strict"
import {
  normalizeEscrowEntry,
  normalizeEscrowSummary,
  deriveEscrowPanelState,
  escrowHeroCents,
  centsUsd,
  signedCentsUsd,
  fmtEntryTimestamp,
  entryLabel,
  entryStatusBadge,
  visibleEscrowEntries,
  isEscrowDemoScenario,
  fetchEscrowPanelData,
  ESCROW_DEMO_FIXTURES,
  ESCROW_ENTRIES_COLLAPSED,
  type EscrowLedgerEntry,
  type EscrowSummary,
} from "./escrow.ts"

function entry(overrides: Partial<EscrowLedgerEntry>): EscrowLedgerEntry {
  return {
    id: 1,
    entry_type: "earning",
    amount_cents: 1750,
    status: "settled",
    reference_type: "order",
    reference_id: 9931,
    created_at: "2026-08-20 19:04:11",
    ...overrides,
  }
}

function summary(overrides: Partial<EscrowSummary>): EscrowSummary {
  return { available_cents: 0, pending_cents: 0, currency: "usd", entries: [], ...overrides }
}

// ── Normalization ───────────────────────────────────────────────────────────

test("normalizeEscrowSummary coerces stringified numbers and tolerates a missing entries array", () => {
  const raw = {
    available_cents: "42350",
    pending_cents: "0",
    currency: "usd",
  } as unknown as Partial<EscrowSummary>
  const s = normalizeEscrowSummary(raw)
  assert.equal(s.available_cents, 42350)
  assert.equal(s.pending_cents, 0)
  assert.deepEqual(s.entries, [])
})

test("normalizeEscrowSummary of null yields the safe zero shape", () => {
  const s = normalizeEscrowSummary(null)
  assert.equal(s.available_cents, 0)
  assert.equal(s.currency, "usd")
  assert.deepEqual(s.entries, [])
})

test("normalizeEscrowEntry coerces amounts and preserves signs", () => {
  const e = normalizeEscrowEntry({
    id: "7",
    amount_cents: "-1750",
    entry_type: "reversal",
    status: "settled",
    reference_id: "9942",
    created_at: "2026-08-16 10:12:55",
  } as unknown as Partial<EscrowLedgerEntry>)
  assert.equal(e.id, 7)
  assert.equal(e.amount_cents, -1750)
  assert.equal(e.reference_id, 9942)
})

// ── State machine ───────────────────────────────────────────────────────────

test("zero balance with no history is empty (panel hidden)", () => {
  assert.equal(deriveEscrowPanelState(summary({}), false), "empty")
})

test("a balance with no Stripe account is claimable", () => {
  const s = summary({ available_cents: 42350, entries: [entry({})] })
  assert.equal(deriveEscrowPanelState(s, false), "claimable")
})

test("a pending withdrawal means a claim is in flight — processing", () => {
  const s = summary({
    available_cents: 42350,
    entries: [entry({ id: 6, entry_type: "withdrawal", amount_cents: -42350, status: "pending", reference_type: "payout", reference_id: 501 }), entry({})],
  })
  assert.equal(deriveEscrowPanelState(s, true), "processing")
})

test("onboarded with a balance but no claim row yet is still processing, never claimable", () => {
  const s = summary({ available_cents: 42350, entries: [entry({})] })
  assert.equal(deriveEscrowPanelState(s, true), "processing")
})

test("zero balance with a settled withdrawal is paid", () => {
  const s = summary({
    entries: [entry({ id: 6, entry_type: "withdrawal", amount_cents: -42350, status: "settled", reference_type: "payout", reference_id: 501 }), entry({})],
  })
  assert.equal(deriveEscrowPanelState(s, true), "paid")
})

test("a ledger that merely netted to zero via reversals is empty, not paid", () => {
  const s = summary({
    entries: [entry({}), entry({ id: 2, entry_type: "reversal", amount_cents: -1750 })],
  })
  assert.equal(deriveEscrowPanelState(s, false), "empty")
})

// ── Hero number (A4: one number only) ───────────────────────────────────────

test("claimable hero is available_cents — pending_cents is never consulted", () => {
  const s = summary({ available_cents: 42350, pending_cents: 99999, entries: [entry({})] })
  assert.equal(escrowHeroCents(s, "claimable"), 42350)
})

test("processing hero is the pending withdrawal amount, positively signed", () => {
  const s = summary({
    available_cents: 42350,
    entries: [entry({ id: 6, entry_type: "withdrawal", amount_cents: -42350, status: "pending" })],
  })
  assert.equal(escrowHeroCents(s, "processing"), 42350)
})

test("processing hero falls back to the balance when the claim row is not written yet", () => {
  const s = summary({ available_cents: 42350, entries: [entry({})] })
  assert.equal(escrowHeroCents(s, "processing"), 42350)
})

test("paid hero is the total of settled withdrawals", () => {
  const s = summary({
    entries: [
      entry({ id: 6, entry_type: "withdrawal", amount_cents: -42350, status: "settled" }),
      entry({ id: 7, entry_type: "withdrawal", amount_cents: -1000, status: "settled" }),
      entry({ id: 8, entry_type: "withdrawal", amount_cents: -500, status: "pending" }),
    ],
  })
  assert.equal(escrowHeroCents(s, "paid"), 43350)
})

// ── Formatting ──────────────────────────────────────────────────────────────

test("centsUsd formats cents with grouping; signedCentsUsd marks credits and debits", () => {
  assert.equal(centsUsd(42350), "$423.50")
  assert.equal(centsUsd(1284650), "$12,846.50")
  assert.equal(centsUsd(-1750), "−$17.50")
  assert.equal(signedCentsUsd(1750), "+$17.50")
  assert.equal(signedCentsUsd(-1750), "−$17.50")
  assert.equal(signedCentsUsd(0), "$0.00")
})

test("fmtEntryTimestamp renders ET wall time without Date() re-interpretation", () => {
  assert.equal(fmtEntryTimestamp("2026-08-20 19:04:11"), "Aug 20, 2026 · 7:04 PM ET")
  assert.equal(fmtEntryTimestamp("2026-01-02 00:15:00"), "Jan 2, 2026 · 12:15 AM ET")
  assert.equal(fmtEntryTimestamp("2026-06-30 12:00:00"), "Jun 30, 2026 · 12:00 PM ET")
})

test("fmtEntryTimestamp falls back to the raw string on malformed input", () => {
  assert.equal(fmtEntryTimestamp("not a date"), "not a date")
  assert.equal(fmtEntryTimestamp(""), "—")
})

test("entryLabel maps types and order references", () => {
  assert.deepEqual(entryLabel(entry({})), { title: "Ticket sale", reference: "Order #9931" })
  assert.deepEqual(entryLabel(entry({ entry_type: "reversal", amount_cents: -1750 })), { title: "Refund", reference: "Order #9931" })
  assert.deepEqual(entryLabel(entry({ entry_type: "withdrawal", reference_type: "payout", reference_id: 501 })), { title: "Payout to your bank", reference: null })
  assert.deepEqual(entryLabel(entry({ entry_type: "adjustment", reference_type: "manual", reference_id: null })), { title: "Adjustment", reference: null })
})

test("entryStatusBadge is quiet for settled, loud for everything else", () => {
  assert.equal(entryStatusBadge(entry({})), null)
  assert.deepEqual(entryStatusBadge(entry({ status: "pending" })), { label: "Processing", variant: "warning" })
  assert.deepEqual(entryStatusBadge(entry({ status: "failed" })), { label: "Failed", variant: "danger" })
  assert.deepEqual(entryStatusBadge(entry({ status: "reversed" })), { label: "Reversed", variant: "neutral" })
})

// ── Long-ledger collapse ────────────────────────────────────────────────────

test("visibleEscrowEntries collapses long ledgers and reports the hidden count", () => {
  const many = Array.from({ length: 28 }, (_, i) => entry({ id: i + 1 }))
  const collapsed = visibleEscrowEntries(many, false)
  assert.equal(collapsed.rows.length, ESCROW_ENTRIES_COLLAPSED)
  assert.equal(collapsed.hiddenCount, 28 - ESCROW_ENTRIES_COLLAPSED)
  const expanded = visibleEscrowEntries(many, true)
  assert.equal(expanded.rows.length, 28)
  assert.equal(expanded.hiddenCount, 0)
})

test("short ledgers never show an expander", () => {
  const few = [entry({}), entry({ id: 2 })]
  assert.deepEqual(visibleEscrowEntries(few, false), { rows: few, hiddenCount: 0 })
})

// ── Fixtures + the stub seam ────────────────────────────────────────────────

test("every fixture satisfies the §3 identity: available = Σ settled amount_cents", () => {
  for (const [name, fixture] of Object.entries(ESCROW_DEMO_FIXTURES)) {
    const settledSum = fixture.summary.entries
      .filter((e) => e.status === "settled")
      .reduce((sum, e) => sum + e.amount_cents, 0)
    assert.equal(fixture.summary.available_cents, settledSum, `fixture "${name}" violates §3`)
  }
})

test("fixtures land in their intended panel states", () => {
  const f = ESCROW_DEMO_FIXTURES
  assert.equal(deriveEscrowPanelState(f.zero.summary, f.zero.stripeOnboarded), "empty")
  assert.equal(deriveEscrowPanelState(f.claimable.summary, f.claimable.stripeOnboarded), "claimable")
  assert.equal(deriveEscrowPanelState(f.processing.summary, f.processing.stripeOnboarded), "processing")
  assert.equal(deriveEscrowPanelState(f.paid.summary, f.paid.stripeOnboarded), "paid")
  assert.equal(deriveEscrowPanelState(f.long.summary, f.long.stripeOnboarded), "claimable")
})

test("pending_cents is zero in every fixture (A4: credits settle immediately)", () => {
  for (const [name, fixture] of Object.entries(ESCROW_DEMO_FIXTURES)) {
    assert.equal(fixture.summary.pending_cents, 0, `fixture "${name}" has pending credits`)
  }
})

test("the long fixture actually stresses layout: >20 entries and a long business name", () => {
  const long = ESCROW_DEMO_FIXTURES.long
  assert.ok(long.summary.entries.length > 20)
  assert.ok((long.businessName ?? "").length > 60)
})

test("isEscrowDemoScenario accepts only known scenarios", () => {
  assert.ok(isEscrowDemoScenario("claimable"))
  assert.ok(isEscrowDemoScenario("long"))
  assert.ok(!isEscrowDemoScenario("__proto__"))
  assert.ok(!isEscrowDemoScenario(null))
  assert.ok(!isEscrowDemoScenario("PAID"))
})

test("the stub seam defaults to the hidden-panel zero state", async () => {
  const data = await fetchEscrowPanelData()
  assert.ok(data)
  assert.equal(deriveEscrowPanelState(data.summary, data.stripeOnboarded), "empty")
})

test("the stub seam ignores unknown demo scenarios", async () => {
  const data = await fetchEscrowPanelData({ demoScenario: "nonsense" })
  assert.ok(data)
  assert.equal(data.summary.available_cents, 0)
})
