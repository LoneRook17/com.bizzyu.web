// Payout reconciliation — the TYPED CLIENT for the P-B1 (services) contract.
// This is the ONE FILE to touch if P-B1 shifts the endpoint path or response
// shape (the DI-B3w pattern): request paths live in fetchPayouts/exportPayoutsCsvUrl,
// the wire shapes in the interfaces below, and every consumer imports the
// normalized types + pure helpers from here — never a raw fetch.
//
// DRAFT contract (PAYOUTS_TAB_RECON.md §D, pinned 2026-07-20; NOT final — P-B1
// implements it with deviations reported, so treat every field as best-effort
// and normalize defensively):
//
//   GET /business/payouts?venue_id&since=YYYY-MM-DD&until=YYYY-MM-DD&status=paid|in_transit|all
//     -> { currency, range:{since,until}, in_transit:{ host_net_cents, ticket_count, rows:[SaleRow] },
//          payouts:[ Payout ], summary:{ payout_count, all_foot } }
//   GET /business/payouts/export.csv?venue_id&since&until&status&payout_id
//     -> text/csv (server-side projection of the same rows)
//
// Degrade rule (DI-B3w standard): the endpoints 404 until P-B1 deploys. A 404 is
// NOT an error here — it means "reconciliation isn't live yet", so fetchPayouts
// returns null and the UI shows a graceful zero/degrade state, never an error
// wall. Any OTHER failure propagates so the UI can render its error state.
//
// apiClient is imported lazily inside the fetcher (not top-level) on purpose:
// everything else in this file is pure, so the Node built-in test runner
// (`npm test`) can unit-test the contract types + footing/CSV math from this
// same file without resolving the extensionless api-client import chain.

// ── Wire shapes (draft contract) ────────────────────────────────────────────

/** Stripe payout lifecycle. `pending` folds into the "not yet deposited" bucket;
 *  `failed` gets banner treatment (money the host expected and didn't get). */
export type PayoutStatus = "paid" | "in_transit" | "pending" | "failed"

/** Which resolver rung produced the row (surfaced for support/debugging). */
export type ResolvedVia =
  | "db_host_transfer"
  | "transfer_group"
  | "pi_charge"
  | "adjustment"
  | "unresolved"

/** One row per Stripe balance transaction (mirrors the sample CSV grain). Line
 *  skips are already aggregated to one row per PI upstream (the ×N dedupe is
 *  structural in the resolver — see recon §C); this client never re-sums fees. */
export interface SaleRow {
  sale_date: string
  /** door | web | apple_pay | line skip (...) | refund (<orig>) | adjustment:* */
  sale_channel: string
  event: string | null
  event_date: string | null
  event_id: number | null
  ticket_tier: string | null
  quantity: number
  /** Door cover has no buyer — null is honest, never fabricated. */
  buyer: string | null
  order_id: number | null
  gross_charged_cents: number
  /** Bizzy application fee — the FOOTING column (gross − platform_fee − commission = host_net). */
  platform_fee_cents: number
  /** INFORMATIONAL Stripe processing fee (recon §C option b). Actual-preferred,
   *  estimator fallback; NEVER feeds host_net / footing. Optional in the contract. */
  stripe_processing_fee_cents?: number | null
  stripe_processing_fee_is_actual?: boolean
  promoter_commission_cents: number
  /** = balance_transaction.net — authoritative, already net of fee + commission. */
  host_net_cents: number
  payment_intent_id: string | null
  resolved_via: ResolvedVia
}

export interface TierSubtotal {
  tier: string
  qty: number
  host_net_cents: number
}

export interface EventSubtotal {
  event: string | null
  event_id: number | null
  by_tier: TierSubtotal[]
  host_net_cents: number
}

export interface Payout {
  stripe_payout_id: string
  /** arrival_date, US/Eastern (YYYY-MM-DD). */
  payout_date: string | null
  status: PayoutStatus
  payout_total_cents: number
  ticket_count: number
  /** Server-computed: Σ rows.host_net_cents == payout_total_cents. */
  foots: boolean
  /** Honest fee-coverage caption, e.g. "(incl. est. for 2 of 6 orders)". */
  fee_coverage: string
  subtotals_by_event: EventSubtotal[]
  rows: SaleRow[]
}

export interface InTransit {
  host_net_cents: number
  ticket_count: number
  rows: SaleRow[]
}

export interface PayoutsRange {
  since: string
  until: string
}

export interface PayoutsResponse {
  currency: string
  range: PayoutsRange
  in_transit: InTransit
  payouts: Payout[]
  summary: { payout_count: number; all_foot: boolean }
}

/** Status filter passed to the list endpoint. */
export type PayoutStatusFilter = "all" | "paid" | "in_transit"

// ── Normalization (defensive: coerce numerics, tolerate missing arrays) ──────

function num(v: unknown): number {
  const n = typeof v === "string" ? Number(v) : (v as number)
  return Number.isFinite(n) ? n : 0
}

function str(v: unknown): string | null {
  if (v == null) return null
  const s = String(v)
  return s.length ? s : null
}

const RESOLVED_VIA: ResolvedVia[] = [
  "db_host_transfer",
  "transfer_group",
  "pi_charge",
  "adjustment",
  "unresolved",
]

const STATUSES: PayoutStatus[] = ["paid", "in_transit", "pending", "failed"]

export function normalizeSaleRow(raw: Partial<SaleRow>): SaleRow {
  const feeRaw = raw.stripe_processing_fee_cents
  return {
    sale_date: str(raw.sale_date) ?? "",
    sale_channel: str(raw.sale_channel) ?? "unknown",
    event: str(raw.event),
    event_date: str(raw.event_date),
    event_id: raw.event_id == null ? null : num(raw.event_id),
    ticket_tier: str(raw.ticket_tier),
    quantity: num(raw.quantity),
    buyer: str(raw.buyer),
    order_id: raw.order_id == null ? null : num(raw.order_id),
    gross_charged_cents: num(raw.gross_charged_cents),
    platform_fee_cents: num(raw.platform_fee_cents),
    stripe_processing_fee_cents: feeRaw == null ? null : num(feeRaw),
    stripe_processing_fee_is_actual: raw.stripe_processing_fee_is_actual === true,
    promoter_commission_cents: num(raw.promoter_commission_cents),
    host_net_cents: num(raw.host_net_cents),
    payment_intent_id: str(raw.payment_intent_id),
    resolved_via: RESOLVED_VIA.includes(raw.resolved_via as ResolvedVia)
      ? (raw.resolved_via as ResolvedVia)
      : "unresolved",
  }
}

export function normalizePayout(raw: Partial<Payout>): Payout {
  const rows = Array.isArray(raw.rows) ? raw.rows.map(normalizeSaleRow) : []
  const subtotals = Array.isArray(raw.subtotals_by_event)
    ? (raw.subtotals_by_event as EventSubtotal[]).map((e) => ({
        event: str(e?.event),
        event_id: e?.event_id == null ? null : num(e.event_id),
        host_net_cents: num(e?.host_net_cents),
        by_tier: Array.isArray(e?.by_tier)
          ? e.by_tier.map((t) => ({
              tier: str(t?.tier) ?? "-",
              qty: num(t?.qty),
              host_net_cents: num(t?.host_net_cents),
            }))
          : [],
      }))
    : []
  return {
    stripe_payout_id: str(raw.stripe_payout_id) ?? "",
    payout_date: str(raw.payout_date),
    status: STATUSES.includes(raw.status as PayoutStatus) ? (raw.status as PayoutStatus) : "paid",
    payout_total_cents: num(raw.payout_total_cents),
    ticket_count: num(raw.ticket_count),
    foots: raw.foots === true,
    fee_coverage: str(raw.fee_coverage) ?? "",
    subtotals_by_event: subtotals,
    rows,
  }
}

export function normalizePayoutsResponse(raw: Partial<PayoutsResponse>): PayoutsResponse {
  const itRaw = (raw.in_transit ?? {}) as Partial<InTransit>
  const inTransitRows = Array.isArray(itRaw.rows) ? itRaw.rows.map(normalizeSaleRow) : []
  const payouts = Array.isArray(raw.payouts) ? raw.payouts.map(normalizePayout) : []
  const range = (raw.range ?? {}) as Partial<PayoutsRange>
  return {
    currency: str(raw.currency) ?? "usd",
    range: { since: str(range.since) ?? "", until: str(range.until) ?? "" },
    in_transit: {
      host_net_cents: num(itRaw.host_net_cents),
      ticket_count: num(itRaw.ticket_count),
      rows: inTransitRows,
    },
    payouts,
    summary: {
      payout_count: raw.summary?.payout_count != null ? num(raw.summary.payout_count) : payouts.length,
      all_foot: raw.summary?.all_foot === true,
    },
  }
}

// ── Pure math ────────────────────────────────────────────────────────────────

export interface RowTotals {
  gross_charged_cents: number
  platform_fee_cents: number
  promoter_commission_cents: number
  stripe_processing_fee_cents: number
  host_net_cents: number
  quantity: number
}

/** Column sums across a set of sale rows (for a subtotal / footing row).
 *  Processing fee is summed only where present — it is informational and may be
 *  null for rows without an actual/estimated value; footing ignores it. */
export function sumRows(rows: SaleRow[]): RowTotals {
  return rows.reduce<RowTotals>(
    (acc, r) => ({
      gross_charged_cents: acc.gross_charged_cents + r.gross_charged_cents,
      platform_fee_cents: acc.platform_fee_cents + r.platform_fee_cents,
      promoter_commission_cents: acc.promoter_commission_cents + r.promoter_commission_cents,
      stripe_processing_fee_cents: acc.stripe_processing_fee_cents + (r.stripe_processing_fee_cents ?? 0),
      host_net_cents: acc.host_net_cents + r.host_net_cents,
      quantity: acc.quantity + r.quantity,
    }),
    {
      gross_charged_cents: 0,
      platform_fee_cents: 0,
      promoter_commission_cents: 0,
      stripe_processing_fee_cents: 0,
      host_net_cents: 0,
      quantity: 0,
    },
  )
}

export interface PayoutFooting {
  /** Σ rows.host_net_cents — the footing basis (app-fee model). */
  hostNetSumCents: number
  payoutTotalCents: number
  /** Σ rows.host_net_cents − payout_total_cents (0 when it foots to the penny). */
  deltaCents: number
  /** True when the rows sum exactly to the deposit. */
  footsExactly: boolean
}

/** Client-side footing check for the subtotal row. Independent of the server's
 *  `foots` flag so the UI can flag a discrepancy even if the API disagrees. */
export function computePayoutFooting(payout: Payout): PayoutFooting {
  const hostNetSumCents = sumRows(payout.rows).host_net_cents
  const deltaCents = hostNetSumCents - payout.payout_total_cents
  return {
    hostNetSumCents,
    payoutTotalCents: payout.payout_total_cents,
    deltaCents,
    footsExactly: deltaCents === 0,
  }
}

/** Honest fee-coverage caption at subtotal grain (mirrors core
 *  StripeFeeActuals::coverageLabel). "" when every order has an actual Stripe
 *  fee, "(est.)" when none do, "(incl. est. for N of M orders)" when mixed. */
export function feeCoverageLabel(actualCount: number, totalCount: number): string {
  if (totalCount <= 0) return ""
  const estimated = totalCount - actualCount
  if (estimated <= 0) return ""
  if (actualCount <= 0) return "(est.)"
  return `(incl. est. for ${estimated} of ${totalCount} orders)`
}

/** Derive the coverage label for a set of rows from their per-row actual flags.
 *  Only rows that carry a processing fee count toward the denominator. */
export function feeCoverageForRows(rows: SaleRow[]): string {
  const withFee = rows.filter((r) => r.stripe_processing_fee_cents != null)
  const actual = withFee.filter((r) => r.stripe_processing_fee_is_actual === true).length
  return feeCoverageLabel(actual, withFee.length)
}

/** A refund shows as a negative host_net row, channel-prefixed "refund (...)". */
export function isRefundRow(row: SaleRow): boolean {
  return row.host_net_cents < 0 || row.sale_channel.toLowerCase().startsWith("refund")
}

/** An account adjustment (fee recovery / commission clawback). */
export function isAdjustmentRow(row: SaleRow): boolean {
  return row.sale_channel.toLowerCase().startsWith("adjustment")
}

/** Human-friendly channel label for display (keeps refund/adjustment prefixes). */
export function channelLabel(channel: string): string {
  const map: Record<string, string> = {
    web: "Web",
    apple_pay: "Apple Pay",
    door: "Door",
    tap_to_pay: "Tap to Pay",
  }
  return map[channel] ?? channel
}

// ── Date range (default 90 days — a quarter's bookkeeping) ────────────────────

export const PAYOUT_RANGE_PRESETS = [
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
  { value: 365, label: "1 year" },
] as const

export const DEFAULT_PAYOUT_RANGE_DAYS = 90

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

/** Local YYYY-MM-DD (the server interprets/echoes the range's timezone). */
export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

/** Inclusive [since,until] window of `days` ending on `now`. `now` is injected
 *  so this is pure and testable. */
export function rangeForDays(days: number, now: Date): PayoutsRange {
  const until = new Date(now)
  const since = new Date(now)
  since.setDate(since.getDate() - (days - 1))
  return { since: isoDate(since), until: isoDate(until) }
}

// ── CSV projection (the accountant's file — the original ask, rides free) ─────

const CSV_HEADERS = [
  "stripe_payout_id",
  "payout_date",
  "status",
  "sale_date",
  "sale_channel",
  "event",
  "event_date",
  "ticket_tier",
  "quantity",
  "buyer",
  "order_id",
  "gross",
  "platform_fee",
  "stripe_processing_fee",
  "stripe_fee_is_actual",
  "promoter_commission",
  "host_net",
  "payment_intent_id",
  "resolved_via",
] as const

/** Integer cents → plain dollar string (accountant-friendly, matches the sample
 *  CSV's dollar values). Negatives (refunds) render with a leading "-". */
export function centsToUsdStr(cents?: number | null): string {
  if (cents == null) return ""
  return (cents / 100).toFixed(2)
}

/** RFC-4180 cell escaping: quote when the value contains a comma, quote, or newline. */
function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function saleRowCsvCells(row: SaleRow, payoutId: string, payoutDate: string | null, status: string): string[] {
  return [
    payoutId,
    payoutDate ?? "",
    status,
    row.sale_date,
    row.sale_channel,
    row.event ?? "",
    row.event_date ?? "",
    row.ticket_tier ?? "",
    String(row.quantity),
    row.buyer ?? "",
    row.order_id == null ? "" : String(row.order_id),
    centsToUsdStr(row.gross_charged_cents),
    centsToUsdStr(row.platform_fee_cents),
    centsToUsdStr(row.stripe_processing_fee_cents),
    row.stripe_processing_fee_cents == null ? "" : row.stripe_processing_fee_is_actual ? "actual" : "est",
    centsToUsdStr(row.promoter_commission_cents),
    centsToUsdStr(row.host_net_cents),
    row.payment_intent_id ?? "",
    row.resolved_via,
  ]
}

function subtotalCsvCells(rows: SaleRow[], payoutId: string): string[] {
  const t = sumRows(rows)
  return [
    payoutId,
    "",
    "SUBTOTAL",
    "",
    "",
    "",
    "",
    "",
    String(t.quantity),
    "",
    "",
    centsToUsdStr(t.gross_charged_cents),
    centsToUsdStr(t.platform_fee_cents),
    centsToUsdStr(t.stripe_processing_fee_cents),
    "",
    centsToUsdStr(t.promoter_commission_cents),
    centsToUsdStr(t.host_net_cents),
    "",
    "",
  ]
}

/** Build the reconciliation CSV client-side from a normalized response. This is
 *  the v1 fallback if the server export.csv endpoint isn't live yet — one row
 *  per sale, a SUBTOTAL row that foots per payout, and the in_transit block
 *  (blank stripe_payout_id, matching the sample CSV). */
export function buildPayoutsCsv(resp: PayoutsResponse): string {
  const lines: string[][] = [CSV_HEADERS as unknown as string[]]

  for (const p of resp.payouts) {
    for (const row of p.rows) {
      lines.push(saleRowCsvCells(row, p.stripe_payout_id, p.payout_date, p.status))
    }
    lines.push(subtotalCsvCells(p.rows, p.stripe_payout_id))
  }

  // in_transit rows have no payout id yet (sales made, not deposited).
  for (const row of resp.in_transit.rows) {
    lines.push(saleRowCsvCells(row, "", null, "in_transit"))
  }
  if (resp.in_transit.rows.length > 0) {
    lines.push(subtotalCsvCells(resp.in_transit.rows, ""))
  }

  return lines.map((cells) => cells.map(csvCell).join(",")).join("\r\n")
}

/** Filename for the download, scoped to the range (or a single payout). */
export function csvFilename(range: PayoutsRange, payoutId?: string): string {
  if (payoutId) return `bizzy-payout-${payoutId}.csv`
  const since = range.since || "start"
  const until = range.until || "today"
  return `bizzy-payouts-${since}-to-${until}.csv`
}

/** Trigger a client-side CSV download via the anchor-click idiom (no new deps,
 *  matches settings/VenuePageSection.tsx). Browser-only. */
export function downloadCsv(filename: string, csv: string): void {
  if (typeof document === "undefined") return
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  // Revoke on the next tick so the click has committed.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

// ── Fetch (degrade to null on 404 — endpoint not deployed yet) ───────────────

/** True for the "endpoint not deployed yet" 404 — degrade to a graceful
 *  zero/degrade state, never an error wall. */
export function isNotDeployed(err: unknown): boolean {
  return (err as { status?: number } | null)?.status === 404
}

/** Build the query string for the list/export endpoints. */
export function payoutsQuery(params: {
  range: PayoutsRange
  status?: PayoutStatusFilter
  venueParam?: string
  payoutId?: string
}): string {
  const { range, status = "all", venueParam = "", payoutId } = params
  let q = `?_=1&since=${encodeURIComponent(range.since)}&until=${encodeURIComponent(range.until)}&status=${status}`
  if (payoutId) q += `&payout_id=${encodeURIComponent(payoutId)}`
  return q + venueParam
}

/** Fetch payouts + their rows for the range. Returns null when the endpoint is
 *  not deployed yet (404) → caller degrades, not an error. Other errors throw. */
export async function fetchPayouts(params: {
  range: PayoutsRange
  status?: PayoutStatusFilter
  venueParam?: string
}): Promise<PayoutsResponse | null> {
  const { apiClient } = await import("./api-client")
  try {
    const raw = await apiClient.get<PayoutsResponse>(`/business/payouts${payoutsQuery(params)}`)
    return normalizePayoutsResponse(raw)
  } catch (err) {
    if (isNotDeployed(err)) return null
    throw err
  }
}
