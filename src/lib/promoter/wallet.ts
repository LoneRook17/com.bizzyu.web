// Promoter Wallet — pure client logic (fee math + response-contract classifier).
//
// This module is the client-side MIRROR of the com.bizzyu.services backend
// (PRD §6.4 / JULY_2026_CC_PROMPTS B4–B6). It holds ZERO React/DOM so the fee
// preview can never disagree with the server and so the withdrawal
// response-contract branching is exercised in one place. It consumes the B1–B8
// backend as-is — no API changes.
//
// Server references (com.bizzyu.services/src/services/WithdrawalService.ts):
//   instantFeeCents      = Math.max(50, Math.round(0.025 * grossCents))
//   computeWithdrawalAmounts: standard → fee 0, net = gross;
//                             instant  → fee = instantFeeCents, net = gross - fee
//   MIN_PAYOUT_CENTS()   = 2000  ($20 floor — FR-9)

export type WithdrawalMethod = "standard" | "instant"

/** $20 withdrawal floor (FR-9). Mirrors services MIN_PAYOUT_CENTS(). */
export const MIN_WITHDRAWAL_CENTS = 2000

/**
 * Instant-payout fee charged to the promoter (FR-12): `max($0.50, 2.5% × gross)`.
 * Integer cents; 2.5% rounded to the nearest cent (round-half-up, matching JS
 * Math.round which the server uses). Byte-identical to services instantFeeCents.
 * Server test vectors: 2000→50, 10000→250.
 */
export function instantFeeCents(grossCents: number): number {
  return Math.max(50, Math.round(0.025 * grossCents))
}

/**
 * Split a gross withdrawal into (fee, net) exactly as the server does. Standard
 * is always free (fee 0, net = gross); instant charges instantFeeCents. The
 * invariant `feeCents + netCents === grossCents` holds by construction.
 */
export function computeWithdrawalAmounts(
  method: WithdrawalMethod,
  grossCents: number,
): { feeCents: number; netCents: number } {
  if (method !== "instant") return { feeCents: 0, netCents: grossCents }
  const feeCents = instantFeeCents(grossCents)
  return { feeCents, netCents: grossCents - feeCents }
}

// ─── Wallet data shapes (GET /promoter/wallet) ──────────────────────────────

export type LedgerEntryType =
  | "earning"
  | "withdrawal"
  | "withdrawal_fee"
  | "reversal"
  | "adjustment"

export type LedgerStatus = "pending" | "settled" | "reversed" | "failed"

export interface LedgerEntry {
  id: number
  entry_type: LedgerEntryType
  amount_cents: number
  status: LedgerStatus
  currency: string
  reference_type: string | null
  reference_id: number | null
  available_at: string | null
  stripe_transfer_id: string | null
  stripe_payout_id: string | null
  metadata: unknown
  created_at: string | null
}

export interface WalletResponse {
  available_cents: number
  pending_cents: number
  currency: string
  ledger: LedgerEntry[]
  page: { limit: number; offset: number; total: number }
}

export interface WithdrawalRow {
  id: number
  user_id: number
  gross_cents: number
  fee_cents: number
  net_cents: number
  method: string
  status: string
  stripe_transfer_id: string | null
  stripe_payout_id: string | null
  failure_reason: string | null
  requested_at: string | null
  completed_at: string | null
}

// ─── Withdrawal response-contract classifier (POST /promoter/withdrawals) ────
//
// The four structured branches (B5/B6 + E2E findings) can arrive in ANY order —
// the gates answer in their own sequence, so the UI must be able to react to any
// of them at any point rather than assume a fixed order.

export type WithdrawOutcome =
  | { kind: "success"; withdrawal: WithdrawalRow; balances: { available_cents: number; pending_cents: number } }
  // (a) 409 onboarding_required — launch onboarding.url, re-attempt after return.
  | { kind: "onboarding_required"; url: string | null; message: string }
  // (b) instant_unavailable — offer the one-tap switch to the free standard payout.
  | { kind: "instant_unavailable"; availableCents: number | null; message: string }
  // (c) below_minimum — show the $20 floor with current Available.
  | { kind: "below_minimum"; message: string }
  // (d) 403 account_flagged — neutral "under review, contact support".
  | { kind: "flagged"; message: string }
  // Everything else (insufficient_funds, velocity_*, negative_balance, invalid_*,
  // network) surfaces the server message so nothing is swallowed.
  | { kind: "error"; message: string }

/** Pull the server's error message out of the `{ error: { type, message } }` envelope. */
function errorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object") {
    const err = (body as { error?: { message?: unknown } }).error
    if (err && typeof err.message === "string" && err.message) return err.message
    const top = (body as { message?: unknown }).message
    if (typeof top === "string" && top) return top
  }
  return fallback
}

/**
 * Map a raw POST /promoter/withdrawals response (HTTP status + parsed JSON body)
 * to a discriminated outcome. Branches on the structured error `type` first
 * (order-independent — B5/B6/F2), then falls back to the message. `body` may be
 * null (e.g. a network failure with no JSON) — handled as a generic error.
 */
export function classifyWithdrawResponse(status: number, body: unknown): WithdrawOutcome {
  // 201 success.
  if (status >= 200 && status < 300) {
    const b = (body ?? {}) as { withdrawal?: WithdrawalRow; balances?: { available_cents: number; pending_cents: number } }
    if (b.withdrawal) {
      return {
        kind: "success",
        withdrawal: b.withdrawal,
        balances: b.balances ?? { available_cents: 0, pending_cents: 0 },
      }
    }
    return { kind: "error", message: "Withdrawal response was malformed." }
  }

  const b = (body ?? {}) as {
    error?: { type?: string }
    onboarding_required?: boolean
    onboarding?: { url?: string }
    fallback?: { available_cents?: number }
  }
  const type = b.error?.type

  // (a) onboarding_required — keyed on the flag OR the type (either can be set).
  if (b.onboarding_required || type === "onboarding_required") {
    return {
      kind: "onboarding_required",
      url: typeof b.onboarding?.url === "string" ? b.onboarding.url : null,
      message: errorMessage(body, "Set up your bank to withdraw — it takes about 2 minutes."),
    }
  }

  // (b) instant_unavailable — carries the fallback offer for the one-tap switch.
  if (type === "instant_unavailable") {
    return {
      kind: "instant_unavailable",
      availableCents:
        typeof b.fallback?.available_cents === "number" ? b.fallback.available_cents : null,
      message: errorMessage(body, "Instant payout isn't available for your bank."),
    }
  }

  // (c) below_minimum.
  if (type === "below_minimum") {
    return { kind: "below_minimum", message: errorMessage(body, "Below the minimum withdrawal.") }
  }

  // (d) account_flagged (403) OR pending_approval (403). The relocated promoter
  // Stripe approval kill switch (B9.1 §2 / B9.2) can answer at withdrawal-time
  // onboarding — same neutral "under review, contact support" state as a flagged
  // account (no onboarding URL to launch). Mirrors flutter's classifyWithdrawResponse.
  if (type === "account_flagged" || type === "pending_approval") {
    return {
      kind: "flagged",
      message: errorMessage(body, "Withdrawals are under review. Please contact support."),
    }
  }

  return { kind: "error", message: errorMessage(body, "Could not process the withdrawal.") }
}

// ─── Formatting + small display helpers ─────────────────────────────────────

/** Cents → localized USD (handles negatives: Available can go negative after clawbacks). */
export function fmtMoney(cents: number): string {
  return (cents / 100).toLocaleString(undefined, { style: "currency", currency: "USD" })
}

/** A wallet has no earnings yet when both balances are zero and the ledger is empty. */
export function walletIsEmpty(w: Pick<WalletResponse, "available_cents" | "pending_cents"> & { ledger: unknown[] }): boolean {
  return w.available_cents === 0 && w.pending_cents === 0 && w.ledger.length === 0
}

/** Human label for a ledger row (surfaces the automatic reversal after a failed payout). */
export function ledgerLabel(e: Pick<LedgerEntry, "entry_type" | "status">): string {
  switch (e.entry_type) {
    case "earning":
      return e.status === "pending" ? "Commission (pending)" : "Commission"
    case "withdrawal":
      return "Withdrawal"
    case "withdrawal_fee":
      return "Instant payout fee"
    case "reversal":
      // A reversal credit is the automatic return of a failed withdrawal to Available.
      return "Refund — returned to Available"
    case "adjustment":
      return "Adjustment"
    default:
      return e.entry_type
  }
}
