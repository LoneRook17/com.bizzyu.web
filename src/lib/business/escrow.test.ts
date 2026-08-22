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
  groupEscrowEntriesByEvent,
  isEscrowDemoScenario,
  fetchEscrowPanelData,
  ESCROW_DEMO_FIXTURES,
  ESCROW_ENTRIES_COLLAPSED,
  ESCROW_UNGROUPED_EVENT_NAME,
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
    event_id: null,
    event_name: null,
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
  assert.equal(e.event_id, null)
  assert.equal(e.event_name, null)
})

test("normalizeEscrowEntry keeps flat event identity and nested event objects", () => {
  const flat = normalizeEscrowEntry({
    id: 1,
    amount_cents: 500,
    event_id: "88",
    event_name: "  Rumble  ",
  } as unknown as Partial<EscrowLedgerEntry>)
  assert.equal(flat.event_id, 88)
  assert.equal(flat.event_name, "Rumble")

  const nested = normalizeEscrowEntry({
    id: 2,
    amount_cents: 500,
    event: { id: "88", name: "Rumble" },
  } as unknown as Partial<EscrowLedgerEntry> & { event: { id: string; name: string } })
  assert.equal(nested.event_id, 88)
  assert.equal(nested.event_name, "Rumble")
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
  assert.equal(fmtEntryTimestamp(""), "-")
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

test("groupEscrowEntriesByEvent groups two Rumble sales and totals the shown rows", () => {
  const rows = [
    entry({ id: 2, amount_cents: 500, reference_id: 1398, event_id: 9, event_name: "Rumble" }),
    entry({ id: 1, amount_cents: 500, reference_id: 1397, event_id: 9, event_name: "Rumble" }),
  ]
  const groups = groupEscrowEntriesByEvent(rows)
  assert.equal(groups.length, 1)
  assert.equal(groups[0].eventName, "Rumble")
  assert.equal(groups[0].eventId, 9)
  assert.equal(groups[0].totalCents, 1000)
  assert.deepEqual(groups[0].entries.map((e) => e.reference_id), [1398, 1397])
})

test("groupEscrowEntriesByEvent keeps events separate and never uses a business name", () => {
  const rows = [
    entry({ id: 3, amount_cents: 500, event_id: 9, event_name: "Rumble" }),
    entry({ id: 2, amount_cents: 750, event_id: 10, event_name: "Late Night" }),
    entry({ id: 1, entry_type: "withdrawal", amount_cents: -1250, reference_type: "payout", event_id: null, event_name: null }),
  ]
  const groups = groupEscrowEntriesByEvent(rows)
  assert.deepEqual(groups.map((g) => g.eventName), ["Rumble", "Late Night", ESCROW_UNGROUPED_EVENT_NAME])
  assert.deepEqual(groups.map((g) => g.totalCents), [500, 750, -1250])
  assert.ok(!groups.some((g) => /escrow test/i.test(g.eventName)))
})

test("groupEscrowEntriesByEvent prefers event_id over a missing name, then fills the name", () => {
  const groups = groupEscrowEntriesByEvent([
    entry({ id: 2, event_id: 9, event_name: null }),
    entry({ id: 1, event_id: 9, event_name: "Rumble" }),
  ])
  assert.equal(groups.length, 1)
  assert.equal(groups[0].eventName, "Rumble")
  assert.equal(groups[0].entries.length, 2)
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

// ── BE-D3: the real read's degrade path ────────────────────────────────────
// The panel must render NOTHING rather than break the dashboard when the
// escrow endpoint is missing, unauthorized, broken or empty. These drive
// fetchEscrowPanelData through a stubbed global fetch — the only I/O it does
// before the (lazy, never-reached-here) profile import.

async function withFetch<T>(impl: unknown, fn: () => Promise<T>): Promise<T> {
  const original = globalThis.fetch
  ;(globalThis as { fetch: unknown }).fetch = impl
  try {
    return await fn()
  } finally {
    ;(globalThis as { fetch: unknown }).fetch = original
  }
}

const jsonResponse = (body: unknown, ok = true, status = 200) => ({
  ok,
  status,
  json: async () => body,
})

test("a non-OK escrow response hides the panel instead of throwing", async () => {
  for (const status of [401, 403, 404, 500]) {
    const data = await withFetch(
      async () => jsonResponse({ message: "nope" }, false, status),
      () => fetchEscrowPanelData(),
    )
    assert.equal(data, null, `status ${status} must hide the panel`)
  }
})

test("a thrown fetch (offline, CORS, DNS) hides the panel instead of throwing", async () => {
  const data = await withFetch(
    async () => {
      throw new Error("network down")
    },
    () => fetchEscrowPanelData(),
  )
  assert.equal(data, null)
})

test("an empty ledger hides the panel without asking for the profile", async () => {
  const data = await withFetch(
    async () => jsonResponse({ available_cents: 0, pending_cents: 0, currency: "usd", entries: [] }),
    () => fetchEscrowPanelData(),
  )
  assert.equal(data, null)
})

test("a malformed body hides the panel", async () => {
  const data = await withFetch(
    async () => jsonResponse(null),
    () => fetchEscrowPanelData(),
  )
  assert.equal(data, null)
})

test("the escrow read goes to the services §7 endpoint through the dashboard's own base URL", async () => {
  let seenUrl: string | null = null
  await withFetch(
    async (url: string) => {
      seenUrl = url
      return jsonResponse({ available_cents: 0, pending_cents: 0, currency: "usd", entries: [] })
    },
    () => fetchEscrowPanelData(),
  )
  // getApiBaseUrl() is "/api/proxy" in the browser and INTERNAL_API_URL on the
  // server, so pin the route, not the host.
  assert.ok(seenUrl, "no request was made")
  assert.ok(
    (seenUrl as unknown as string).endsWith("/business/escrow"),
    `expected the services escrow route, got ${seenUrl}`,
  )
})

test("the demo scenario still overrides the real read outside production", async () => {
  const data = await withFetch(
    async () => {
      throw new Error("the demo path must not touch the network")
    },
    () => fetchEscrowPanelData({ demoScenario: "claimable" }),
  )
  assert.ok(data)
  assert.equal(deriveEscrowPanelState(data.summary, data.stripeOnboarded), "claimable")
})

test("an unknown demo scenario falls through to the real read, not a fixture", async () => {
  const data = await withFetch(
    async () => jsonResponse({ message: "no" }, false, 404),
    () => fetchEscrowPanelData({ demoScenario: "nonsense" }),
  )
  assert.equal(data, null)
})
