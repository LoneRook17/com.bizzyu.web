// Unit tests for the paid-banner 24h clock. Display-only: these pin the
// localStorage key, the first-seen stamp, and hide-after-TTL without
// touching Stripe or money flags.

import { test } from "node:test"
import assert from "node:assert/strict"
import {
  ESCROW_PAID_BANNER_TTL_MS,
  ESCROW_PAID_BANNER_STORAGE_PREFIX,
  latestSettledWithdrawal,
  escrowPaidPayoutKey,
  escrowPaidBannerStorageKey,
  resolvePaidBannerBusinessId,
  parsePaidBannerFirstSeen,
  shouldShowEscrowPaidBanner,
  shouldRenderEscrowPanel,
  type PaidBannerStorage,
} from "./escrow-paid-banner.ts"
import {
  ESCROW_DEMO_FIXTURES,
  deriveEscrowPanelState,
  type EscrowLedgerEntry,
  type EscrowPanelData,
  type EscrowSummary,
} from "./escrow.ts"

const NOW = Date.parse("2026-08-23T12:00:00.000Z")
const HOUR = 60 * 60 * 1000

function entry(overrides: Partial<EscrowLedgerEntry> = {}): EscrowLedgerEntry {
  return {
    id: 6,
    entry_type: "withdrawal",
    amount_cents: -1500,
    status: "settled",
    reference_type: "payout",
    reference_id: 501,
    created_at: "2026-08-20 09:15:02",
    event_id: null,
    event_name: null,
    stripe_transfer_id: "tr_15_example",
    ...overrides,
  }
}

function paidData(over: Partial<EscrowPanelData> = {}): EscrowPanelData {
  return {
    summary: {
      available_cents: 0,
      pending_cents: 0,
      currency: "usd",
      entries: [entry(), entry({ id: 1, entry_type: "earning", amount_cents: 1500, stripe_transfer_id: null, reference_type: "order", reference_id: 99 })],
    },
    stripeOnboarded: true,
    businessName: "The Corner Tap",
    businessId: 42,
    ...over,
  }
}

function memoryStorage(seed: Record<string, string> = {}): PaidBannerStorage & { store: Record<string, string>; writes: number } {
  const store = { ...seed }
  let writes = 0
  return {
    store,
    get writes() {
      return writes
    },
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null
    },
    setItem(key, value) {
      writes += 1
      store[key] = value
    },
  }
}

function render(data: EscrowPanelData | null, over: Partial<Parameters<typeof shouldRenderEscrowPanel>[1]> & { storage?: PaidBannerStorage } = {}) {
  const storage = over.storage ?? memoryStorage()
  return shouldRenderEscrowPanel(data, {
    nowMs: NOW,
    demo: false,
    authBusinessId: null,
    storage,
    ...over,
  })
}

// ── Payout key ──────────────────────────────────────────────────────────────

test("latestSettledWithdrawal picks the newest settled withdrawal by id", () => {
  const summary: EscrowSummary = {
    available_cents: 0,
    pending_cents: 0,
    currency: "usd",
    entries: [
      entry({ id: 6, stripe_transfer_id: "tr_old", reference_id: 500 }),
      entry({ id: 9, stripe_transfer_id: "tr_new", reference_id: 502 }),
      entry({ id: 8, status: "pending", stripe_transfer_id: "tr_pending" }),
    ],
  }
  assert.equal(latestSettledWithdrawal(summary)?.stripe_transfer_id, "tr_new")
})

test("payout key prefers the Connect transfer id", () => {
  assert.equal(escrowPaidPayoutKey(paidData().summary), "tr_15_example")
})

test("payout key falls back to payout reference id, then ledger row id", () => {
  const byRef = paidData({
    summary: {
      available_cents: 0,
      pending_cents: 0,
      currency: "usd",
      entries: [entry({ stripe_transfer_id: null, reference_id: 777 })],
    },
  })
  assert.equal(escrowPaidPayoutKey(byRef.summary), "payout:777")

  const byEntry = paidData({
    summary: {
      available_cents: 0,
      pending_cents: 0,
      currency: "usd",
      entries: [entry({ id: 12, stripe_transfer_id: "  ", reference_id: null })],
    },
  })
  assert.equal(escrowPaidPayoutKey(byEntry.summary), "entry:12")
})

test("storage key is per business and per payout/transfer", () => {
  const key = escrowPaidBannerStorageKey(42, "tr_15_example")
  assert.equal(key, `${ESCROW_PAID_BANNER_STORAGE_PREFIX}:42:tr_15_example`)
  assert.notEqual(escrowPaidBannerStorageKey(43, "tr_15_example"), key)
  assert.notEqual(escrowPaidBannerStorageKey(42, "tr_other"), key)
})

test("resolvePaidBannerBusinessId prefers the panel id, then auth", () => {
  assert.equal(resolvePaidBannerBusinessId(42, 99), 42)
  assert.equal(resolvePaidBannerBusinessId(null, 99), 99)
  assert.equal(resolvePaidBannerBusinessId(0, -1), null)
  assert.equal(resolvePaidBannerBusinessId(undefined, undefined), null)
})

// ── Stamp parse + 24h window ────────────────────────────────────────────────

test("parsePaidBannerFirstSeen accepts JSON and a bare millisecond number", () => {
  assert.equal(parsePaidBannerFirstSeen(JSON.stringify({ firstSeenAtMs: NOW })), NOW)
  assert.equal(parsePaidBannerFirstSeen(String(NOW)), NOW)
  assert.equal(parsePaidBannerFirstSeen("nope"), null)
  assert.equal(parsePaidBannerFirstSeen(null), null)
  assert.equal(parsePaidBannerFirstSeen(JSON.stringify({ firstSeenAtMs: 0 })), null)
})

test("shouldShowEscrowPaidBanner: missing stamp and the first 24h show; 24h hides", () => {
  assert.equal(shouldShowEscrowPaidBanner(null, NOW), true)
  assert.equal(shouldShowEscrowPaidBanner(NOW, NOW), true)
  assert.equal(shouldShowEscrowPaidBanner(NOW - (24 * HOUR - 1), NOW), true)
  assert.equal(shouldShowEscrowPaidBanner(NOW - ESCROW_PAID_BANNER_TTL_MS, NOW), false)
  assert.equal(shouldShowEscrowPaidBanner(NOW - 25 * HOUR, NOW), false)
})

test("a first-seen stamp in the future still shows (clock skew)", () => {
  assert.equal(shouldShowEscrowPaidBanner(NOW + HOUR, NOW), true)
})

// ── Panel render rule ───────────────────────────────────────────────────────

test("null data and the empty ledger do not render", () => {
  assert.equal(render(null), false)
  assert.equal(render(ESCROW_DEMO_FIXTURES.zero), false)
})

test("claimable, ready, and processing always render and never write a paid stamp", () => {
  const storage = memoryStorage()
  assert.equal(render(ESCROW_DEMO_FIXTURES.claimable, { storage }), true)
  assert.equal(render(ESCROW_DEMO_FIXTURES.processing, { storage }), true)

  const ready = paidData({
    summary: {
      available_cents: 1500,
      pending_cents: 0,
      currency: "usd",
      entries: [entry({ entry_type: "earning", amount_cents: 1500, stripe_transfer_id: null })],
    },
  })
  assert.equal(deriveEscrowPanelState(ready.summary, true), "ready")
  assert.equal(render(ready, { storage }), true)
  assert.equal(Object.keys(storage.store).length, 0)
})

test("first view while paid shows the banner and stamps now, refresh does not reset", () => {
  const storage = memoryStorage()
  const data = paidData()
  assert.equal(deriveEscrowPanelState(data.summary, true), "paid")
  assert.equal(render(data, { storage, nowMs: NOW }), true)

  const key = escrowPaidBannerStorageKey(42, "tr_15_example")
  assert.equal(parsePaidBannerFirstSeen(storage.store[key]), NOW)
  assert.equal(storage.writes, 1)

  assert.equal(render(data, { storage, nowMs: NOW + 3 * HOUR }), true)
  assert.equal(parsePaidBannerFirstSeen(storage.store[key]), NOW)
  assert.equal(storage.writes, 1)
})

test("after 24 hours from first view the paid banner hides", () => {
  const key = escrowPaidBannerStorageKey(42, "tr_15_example")
  const storage = memoryStorage({
    [key]: JSON.stringify({ firstSeenAtMs: NOW }),
  })
  assert.equal(render(paidData(), { storage, nowMs: NOW + ESCROW_PAID_BANNER_TTL_MS }), false)
  assert.equal(storage.writes, 0)
})

test("Home and Payments share the same business + transfer clock", () => {
  const storage = memoryStorage()
  const data = paidData()
  assert.equal(render(data, { storage, nowMs: NOW }), true)
  assert.equal(render(data, { storage, nowMs: NOW + 23 * HOUR }), true)
  assert.equal(render(data, { storage, nowMs: NOW + 24 * HOUR }), false)
})

test("a different business or a later payout starts its own 24h window", () => {
  const storage = memoryStorage()
  const first = paidData()
  assert.equal(render(first, { storage, nowMs: NOW }), true)

  const otherBiz = paidData({ businessId: 99 })
  assert.equal(render(otherBiz, { storage, nowMs: NOW + 24 * HOUR }), true)

  const laterPayout = paidData({
    summary: {
      available_cents: 0,
      pending_cents: 0,
      currency: "usd",
      entries: [entry({ id: 20, stripe_transfer_id: "tr_second_payout" })],
    },
  })
  assert.equal(render(laterPayout, { storage, nowMs: NOW + 24 * HOUR }), true)
})

test("auth business_id is used when the panel payload has none", () => {
  const storage = memoryStorage()
  const data = paidData({ businessId: null })
  assert.equal(render(data, { storage, authBusinessId: 42, nowMs: NOW }), true)
  const key = escrowPaidBannerStorageKey(42, "tr_15_example")
  assert.equal(parsePaidBannerFirstSeen(storage.store[key]), NOW)
})

test("without a durable key the paid banner stays visible (clock has not started)", () => {
  const storage = memoryStorage()
  assert.equal(render(paidData({ businessId: null }), { storage, authBusinessId: null }), true)
  assert.equal(Object.keys(storage.store).length, 0)
})

test("demo paid skips storage and stays visible after 24h", () => {
  const storage = memoryStorage()
  const data = ESCROW_DEMO_FIXTURES.paid
  assert.equal(render(data, { storage, demo: true, nowMs: NOW }), true)
  assert.equal(render(data, { storage, demo: true, nowMs: NOW + 48 * HOUR }), true)
  assert.equal(Object.keys(storage.store).length, 0)
})

test("corrupt storage is treated as a first view: show and re-stamp", () => {
  const key = escrowPaidBannerStorageKey(42, "tr_15_example")
  const storage = memoryStorage({ [key]: "not-json" })
  assert.equal(render(paidData(), { storage, nowMs: NOW }), true)
  assert.equal(parsePaidBannerFirstSeen(storage.store[key]), NOW)
})

test("the $15 paid fixture is the existing paid state, not a new money write", () => {
  const data = paidData()
  assert.equal(deriveEscrowPanelState(data.summary, true), "paid")
  const withdrawn = data.summary.entries
    .filter((e) => e.entry_type === "withdrawal" && e.status === "settled")
    .reduce((sum, e) => sum + e.amount_cents, 0)
  assert.equal(-withdrawn, 1500)
})
