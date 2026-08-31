// Unit tests for the escrow banner 24h clocks. Display-only: these pin the
// paid first-seen localStorage stamp and the Home hero in-transit hide
// (latest settled withdrawal created_at + 24h) without touching Stripe
// or flipping services payout_status.

import { test } from "node:test"
import assert from "node:assert/strict"
import {
  ESCROW_PAID_BANNER_TTL_MS,
  ESCROW_PAID_BANNER_STORAGE_PREFIX,
  latestSettledWithdrawal,
  escrowPaidPayoutKey,
  escrowPaidBannerStorageKey,
  resolvePaidBannerBusinessId,
  parseEscrowLedgerCreatedAtMs,
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
const DEPOSITED = { in_transit_cents: 0, deposited_cents: 1500 }

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
    payouts: DEPOSITED,
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
  assert.equal(deriveEscrowPanelState(data.summary, true, DEPOSITED), "paid")
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
  assert.equal(deriveEscrowPanelState(data.summary, true, DEPOSITED), "paid")
  const withdrawn = data.summary.entries
    .filter((e) => e.entry_type === "withdrawal" && e.status === "settled")
    .reduce((sum, e) => sum + e.amount_cents, 0)
  assert.equal(-withdrawn, 1500)
})

// ── Home hero in-transit clock (withdrawal created_at + 24h) ────────────────
// EscrowMan / Escrow Test: ledger withdrawal 16 settled 2026-08-22 20:05:53 ET.
// Luke: hide the Home HERO 1 day after money left escrow. Compact stays honest.

const ESCROWMAN_IN_TRANSIT = { in_transit_cents: 1500, deposited_cents: 0 }
const NOW_AUG_27 = Date.parse("2026-08-27T16:00:00.000Z")
/** 2026-08-22 9:00 PM ET (EDT, UTC−4) — same calendar day as the withdrawal. */
const NOW_AUG_22_9PM_ET = Date.parse("2026-08-23T01:00:00.000Z")
const ESCROWMAN_CREATED_AT = "2026-08-22 20:05:53"

function escrowManData(): EscrowPanelData {
  return {
    summary: {
      available_cents: 0,
      pending_cents: 0,
      currency: "usd",
      entries: [
        entry({
          id: 16,
          entry_type: "withdrawal",
          amount_cents: -1500,
          status: "settled",
          reference_type: "payout",
          reference_id: 16,
          created_at: ESCROWMAN_CREATED_AT,
          stripe_transfer_id: "tr_1U7Ov6Ase0GDUFtu4rGiF4Dx",
        }),
        entry({
          id: 15,
          entry_type: "earning",
          amount_cents: 1500,
          status: "settled",
          stripe_transfer_id: null,
          reference_type: "order",
          reference_id: 99,
        }),
      ],
    },
    stripeOnboarded: true,
    businessName: "Escrow Test",
    businessId: 999914,
  }
}

test("ledger created_at is America/New_York wall time, not UTC", () => {
  // August 2026 is EDT (UTC−4): 20:05:53 ET = 00:05:53 UTC the next day.
  assert.equal(parseEscrowLedgerCreatedAtMs(ESCROWMAN_CREATED_AT), Date.parse("2026-08-23T00:05:53.000Z"))
  assert.equal(parseEscrowLedgerCreatedAtMs("not-a-date"), null)
})

test("EscrowMan-like in_transit stays in_transit (honesty; no deposited flip)", () => {
  const data = escrowManData()
  assert.equal(deriveEscrowPanelState(data.summary, true, ESCROWMAN_IN_TRANSIT), "in_transit")
  assert.equal(deriveEscrowPanelState(data.summary, true, { in_transit_cents: 0, deposited_cents: 0 }), "in_transit")
  assert.equal(deriveEscrowPanelState(data.summary, true, null), "in_transit")
})

test("EscrowMan Home hero hides on Aug 27 (settled withdrawal + 24h)", () => {
  const storage = memoryStorage()
  const data = escrowManData()
  assert.equal(
    render(data, { storage, nowMs: NOW_AUG_27, payouts: ESCROWMAN_IN_TRANSIT, variant: "hero" }),
    false,
  )
  assert.equal(Object.keys(storage.store).length, 0)
})

test("EscrowMan Home hero still shows at Aug 22 9pm ET (same day as withdrawal)", () => {
  const storage = memoryStorage()
  const data = escrowManData()
  assert.equal(
    render(data, { storage, nowMs: NOW_AUG_22_9PM_ET, payouts: ESCROWMAN_IN_TRANSIT, variant: "hero" }),
    true,
  )
  assert.equal(Object.keys(storage.store).length, 0)
})

test("EscrowMan Settings compact stays honest in_transit after the hero clock", () => {
  const storage = memoryStorage()
  const data = escrowManData()
  assert.equal(
    render(data, { storage, nowMs: NOW_AUG_27, payouts: ESCROWMAN_IN_TRANSIT, variant: "compact" }),
    true,
  )
  assert.equal(Object.keys(storage.store).length, 0)
})

test("in-transit hero hide is withdrawal created_at, not first-seen localStorage", () => {
  const data = escrowManData()
  const createdAtMs = parseEscrowLedgerCreatedAtMs(ESCROWMAN_CREATED_AT)
  assert.ok(createdAtMs != null)
  assert.equal(
    render(data, { nowMs: createdAtMs + ESCROW_PAID_BANNER_TTL_MS - 1, payouts: ESCROWMAN_IN_TRANSIT }),
    true,
  )
  assert.equal(
    render(data, { nowMs: createdAtMs + ESCROW_PAID_BANNER_TTL_MS, payouts: ESCROWMAN_IN_TRANSIT }),
    false,
  )
})

test("processing hero hides after a settled withdrawal is 24h old; pending-only still shows", () => {
  const settledProcessing: EscrowPanelData = {
    ...escrowManData(),
    summary: {
      available_cents: 0,
      pending_cents: 0,
      currency: "usd",
      entries: [
        entry({
          id: 17,
          entry_type: "withdrawal",
          amount_cents: -500,
          status: "pending",
          created_at: "2026-08-27 10:00:00",
          stripe_transfer_id: "tr_pending_new",
        }),
        ...escrowManData().summary.entries,
      ],
    },
  }
  assert.equal(deriveEscrowPanelState(settledProcessing.summary, true, ESCROWMAN_IN_TRANSIT), "processing")
  assert.equal(render(settledProcessing, { nowMs: NOW_AUG_27, payouts: ESCROWMAN_IN_TRANSIT }), false)
  assert.equal(render(ESCROW_DEMO_FIXTURES.processing, { nowMs: NOW_AUG_27 }), true)
})

test("demo in_transit skips the withdrawal clock so QA screenshots stay up", () => {
  const storage = memoryStorage()
  assert.equal(
    render(escrowManData(), {
      storage,
      demo: true,
      nowMs: NOW_AUG_27,
      payouts: ESCROWMAN_IN_TRANSIT,
      variant: "hero",
    }),
    true,
  )
  assert.equal(Object.keys(storage.store).length, 0)
})
