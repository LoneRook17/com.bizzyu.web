// Paid / Escrow paid out banner: keep it on Home and Payments for 24 hours
// after the host first sees the dashboard while status is paid, then hide it.
//
// Display-only. No Stripe transfers, no money/onboarded/escrow flag writes.
// Services do not expose paid_at here, so the clock is a localStorage
// timestamp keyed by business_id + payout/transfer id. Refresh does not
// reset the 24h. A later payout (new transfer or payout id) starts a new
// window. Demo fixtures skip the clock so QA screenshots stay stable.

import {
  deriveEscrowPanelState,
  type EscrowLedgerEntry,
  type EscrowPanelData,
  type EscrowSummary,
} from "./escrow.ts"

export const ESCROW_PAID_BANNER_TTL_MS = 24 * 60 * 60 * 1000
export const ESCROW_PAID_BANNER_STORAGE_PREFIX = "bizzy.escrow.paidBanner.firstSeen"

export interface PaidBannerStorage {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
}

/** Newest settled withdrawal. Ledger ids are monotonic, so larger id wins. */
export function latestSettledWithdrawal(summary: EscrowSummary): EscrowLedgerEntry | null {
  let best: EscrowLedgerEntry | null = null
  for (const entry of summary.entries) {
    if (entry.entry_type !== "withdrawal" || entry.status !== "settled") continue
    if (!best || entry.id > best.id) best = entry
  }
  return best
}

/**
 * Stable id for this payout: Connect transfer id, else payout reference id,
 * else the ledger row id. Null only when there is no settled withdrawal.
 */
export function escrowPaidPayoutKey(summary: EscrowSummary): string | null {
  const row = latestSettledWithdrawal(summary)
  if (!row) return null
  const transfer = row.stripe_transfer_id?.trim()
  if (transfer) return transfer
  if (row.reference_id != null) return `payout:${row.reference_id}`
  if (row.id) return `entry:${row.id}`
  return null
}

export function escrowPaidBannerStorageKey(businessId: number, payoutKey: string): string {
  return `${ESCROW_PAID_BANNER_STORAGE_PREFIX}:${businessId}:${payoutKey}`
}

export function resolvePaidBannerBusinessId(
  fromPanel: number | null | undefined,
  fromAuth: number | null | undefined,
): number | null {
  for (const value of [fromPanel, fromAuth]) {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) return value
  }
  return null
}

export function parsePaidBannerFirstSeen(raw: string | null | undefined): number | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as { firstSeenAtMs?: unknown }
    const n = parsed?.firstSeenAtMs
    if (typeof n === "number" && Number.isFinite(n) && n > 0) return n
    return null
  } catch {
    const n = Number(raw)
    return Number.isFinite(n) && n > 0 ? n : null
  }
}

/** Show until a first-seen stamp exists and is at least 24h old. */
export function shouldShowEscrowPaidBanner(firstSeenAtMs: number | null, nowMs: number): boolean {
  if (firstSeenAtMs == null) return true
  const age = nowMs - firstSeenAtMs
  if (age < 0) return true
  return age < ESCROW_PAID_BANNER_TTL_MS
}

function stampFirstSeen(storage: PaidBannerStorage, key: string, nowMs: number): number {
  const existing = parsePaidBannerFirstSeen(storage.getItem(key))
  if (existing != null) return existing
  try {
    storage.setItem(key, JSON.stringify({ firstSeenAtMs: nowMs }))
  } catch {
    // Quota / private mode: still treat this view as the start of the window.
  }
  return nowMs
}

export interface EscrowPanelRenderOpts {
  nowMs: number
  /** QA `?escrow_demo=` fixtures skip the 24h hide. */
  demo?: boolean
  authBusinessId?: number | null
  storage: PaidBannerStorage
}

/**
 * Whether Home / Payments should mount the escrow card. Empty stays hidden.
 * Paid stays visible through the first view and the following 24h, then hides.
 * Other states are unchanged.
 */
export function shouldRenderEscrowPanel(
  data: EscrowPanelData | null,
  opts: EscrowPanelRenderOpts,
): boolean {
  if (!data) return false
  const state = deriveEscrowPanelState(data.summary, data.stripeOnboarded)
  if (state === "empty") return false
  if (state !== "paid") return true
  if (opts.demo) return true

  const businessId = resolvePaidBannerBusinessId(data.businessId, opts.authBusinessId)
  const payoutKey = escrowPaidPayoutKey(data.summary)
  if (businessId == null || payoutKey == null) return true

  const key = escrowPaidBannerStorageKey(businessId, payoutKey)
  const firstSeenAtMs = stampFirstSeen(opts.storage, key, opts.nowMs)
  return shouldShowEscrowPaidBanner(firstSeenAtMs, opts.nowMs)
}

/** localStorage adapter. Never throws; missing window degrades to no-ops. */
export function localStoragePaidBannerAdapter(): PaidBannerStorage {
  return {
    getItem(key) {
      try {
        if (typeof localStorage === "undefined") return null
        return localStorage.getItem(key)
      } catch {
        return null
      }
    },
    setItem(key, value) {
      try {
        if (typeof localStorage === "undefined") return
        localStorage.setItem(key, value)
      } catch {
        // ignore
      }
    },
  }
}
