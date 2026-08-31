// Escrow banner hide clocks. Display-only. No Stripe transfers, no money /
// onboarded / escrow flag writes, and no services payout_status flip to
// deposited (that would re-lie "to your bank").
//
// Two independent 24h clocks:
//   paid        first dash view while paid (localStorage, keyed by
//               business_id + payout/transfer id). Refresh does not reset.
//               A later payout starts a new window.
//   in_transit  Home hero only. Latest settled withdrawal `created_at`
//   /processing (America/New_York wall time from the ledger) + 24h. Settings
//               compact stays honest so the host can still see in-transit copy.
//
// Demo fixtures skip both clocks so QA screenshots stay stable.

import {
  deriveEscrowPanelState,
  type EscrowLedgerEntry,
  type EscrowPanelData,
  type EscrowSummary,
  type PayoutsMoneyHint,
} from "./escrow.ts"

export const ESCROW_PAID_BANNER_TTL_MS = 24 * 60 * 60 * 1000
export const ESCROW_PAID_BANNER_STORAGE_PREFIX = "bizzy.escrow.paidBanner.firstSeen"
const LEDGER_TZ = "America/New_York"

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

function isPositiveMs(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n > 0
}

export function parsePaidBannerFirstSeen(raw: string | null | undefined): number | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    // JSON.parse("1787486400000") is a number, not an object.
    if (isPositiveMs(parsed)) return parsed
    if (parsed && typeof parsed === "object") {
      const n = (parsed as { firstSeenAtMs?: unknown }).firstSeenAtMs
      if (isPositiveMs(n)) return n
    }
    return null
  } catch {
    const n = Number(raw)
    return isPositiveMs(n) ? n : null
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
  payouts?: PayoutsMoneyHint | null
  /** Home hero hides stale in-transit; Settings compact stays honest. */
  variant?: "hero" | "compact"
}

/**
 * Ledger `created_at` is naive America/New_York wall time (`YYYY-MM-DD HH:MM:SS`).
 * Do not parse as UTC or as the runtime local zone — August 2026 is EDT (UTC−4).
 */
export function parseEscrowLedgerCreatedAtMs(createdAt: string): number | null {
  const match = createdAt
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const hour = Number(match[4])
  const minute = Number(match[5])
  const second = Number(match[6])

  for (const offsetHours of [4, 5]) {
    const utcMs = Date.UTC(year, month - 1, day, hour + offsetHours, minute, second)
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: LEDGER_TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(utcMs))
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
    if (
      get("year") === year &&
      get("month") === month &&
      get("day") === day &&
      get("hour") === hour &&
      get("minute") === minute &&
      get("second") === second
    ) {
      return utcMs
    }
  }
  return null
}

function heroInTransitClockExpired(summary: EscrowSummary, nowMs: number): boolean {
  const settled = latestSettledWithdrawal(summary)
  if (!settled?.created_at) return false
  const createdAtMs = parseEscrowLedgerCreatedAtMs(settled.created_at)
  if (createdAtMs == null) return false
  return nowMs - createdAtMs >= ESCROW_PAID_BANNER_TTL_MS
}

/**
 * Whether Home / Payments should mount the escrow card. Empty stays hidden.
 * Paid stays visible through the first view and the following 24h, then hides.
 * Home hero `in_transit` / `processing` hides once the latest settled
 * withdrawal is at least 24h old. Settings compact does not use that clock.
 */
export function shouldRenderEscrowPanel(
  data: EscrowPanelData | null,
  opts: EscrowPanelRenderOpts,
): boolean {
  if (!data) return false
  const state = deriveEscrowPanelState(data.summary, data.stripeOnboarded, opts.payouts)
  if (state === "empty") return false

  const variant = opts.variant ?? "hero"
  if (
    (state === "in_transit" || state === "processing") &&
    variant === "hero" &&
    !opts.demo &&
    heroInTransitClockExpired(data.summary, opts.nowMs)
  ) {
    return false
  }

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
