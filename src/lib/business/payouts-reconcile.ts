// Payout RECONCILIATION — the TYPED CLIENT for the P2-B1s (services) contract.
// This is the ONE FILE to touch if P2-B1s shifts an endpoint path or response
// shape: request paths live in the fetch* functions, wire shapes in the
// interfaces below, and every consumer imports the normalized types + pure
// helpers from here — never a raw fetch.
//
// CONTRACT (pinned from the P2-B1w prompt; P2-B1s implements it in parallel —
// treat every field as best-effort and normalize defensively until the services
// half reports):
//
//   GET /business/payouts/summary?days=N            (or ?since=YYYY-MM-DD&until=YYYY-MM-DD)
//     -> { deposited_cents, in_transit_cents, refunded_cents }
//     TF-PAYOUTS-SUMMARY-F1: venue-scoped (&venue_id=) responses ALSO carry
//     -> { venue_scoped: true,
//          venue_deposited_cents, venue_in_transit_cents, venue_refunded_cents,
//          account_dedicated, shared_with_venues:[{venue_id,name}] }
//     The account-level trio keeps its meaning (the Stripe CONNECTED ACCOUNT's
//     totals — a SUPERSET that can include other venues' money); the venue_* trio
//     is THIS venue's attributed share. All-venues responses omit the block
//     entirely and are byte-identical to pre-fix.
//   GET /business/payouts/deposits?days=N           (or ?since&until)
//     -> reverse-chron [{ payout_id, arrival_date, amount_cents, sales_count, status }]
//   GET /business/payouts/deposits/:payoutId/reconciliation
//     -> { payout_id, arrival_date, amount_cents, computed_total_cents, ties,
//          events:[{ event_id, name, date, subtotal_cents,
//                    tiers:[{ tier_name, qty, amount_cents }] }],
//          door_covers_cents, refunds_cents,
//          net:{ ticket_sales_cents, door_covers_cents, refunds_cents, deposited_cents } }
//   GET .../reconciliation?details=1
//     -> same + orders:[{ order_id, sale_date, event, ticket_tier, quantity,
//                         amount_cents, is_door_sale, payout_status, payout_date,
//                         stripe_payout_id, stripe_payment_intent_id,
//                         promoter_commission_cents? }]
//     (promoter_commission_cents present ONLY for events with promoter commission
//      enabled — the column is hidden entirely when no row carries it.)
//
// Degrade rule (DI-B3w standard, shared with payouts.ts): the endpoints 404 until
// P2-B1s deploys. A 404 is NOT an error — it means "the reconciliation contract
// isn't live yet", so each fetcher returns null and the caller degrades (owner /
// global manager falls back to today's scoped Payouts view; no error wall). Any
// OTHER failure propagates so the UI can render its error state.
//
// NO buyer PII anywhere on this screen — not even behind the details toggle
// (P2-B1w addendum). The details=1 `orders` array is operational only (ticket +
// payout tracing fields); it is fetched lazily (toggle on) purely to keep the
// default payload small and the default view clean, never because it holds PII.
//
// The fetchers import apiClient lazily (not top-level) so everything else here is
// pure and unit-testable under the Node built-in test runner (`npm test`) without
// resolving the extensionless api-client import chain.
//
// CACHED-SERVE contract (services :125, notes/payouts-listexport-cache-contract.md):
// all four payouts endpoints (/summary, /deposits, the / list, /export.csv) serve
// from ONE background-computed cache keyed (business | venue-or-all |
// since-eastern-day | until) — the reconciliation walk never runs on the request
// path. Once one endpoint warms the key, all four are warm. Freshness signals:
//
//   /summary     — body-only. COLD: 200 {state:'computing', computed_at:null,
//                  refreshing:true}. READY: the summary payload + computed_at
//                  (ISO instant) + refreshing (bool). The computing body MUST be
//                  detected BEFORE normalizeSummary() — normalization would
//                  coerce it into an all-zeros summary ($0.00 tiles).
//   /deposits    — body STAYS a bare array; freshness rides in headers
//                  X-Payouts-State (ready|computing) / X-Payouts-Computed-At /
//                  X-Payouts-Refreshing (1|0). computing = [] body + header.
//                  MISSING headers → ready (back-compat with older servers).
//   / (list)     — COLD: 200 {state:'computing'} (the summary shape). READY: the
//                  familiar list body + computed_at + refreshing (body AND headers).
//   /export.csv  — COLD: 202 + X-Payouts-State: computing + Retry-After: 5, JSON
//                  body, NO Content-Disposition. READY: 200 CSV with
//                  Content-Disposition. Fetch-then-blob: on 202 wait Retry-After
//                  and retry; NEVER blob the JSON computing body.
//
// A stale-but-computed key is served as-is immediately with refreshing:true while
// exactly one background recompute runs — so "ready + refreshing" renders data
// normally with a subtle indicator, never a spinner wall.
//
// ⚠ ?payout_id is WINDOW-BOUND on the cached list/export: the cache is window-
// keyed, so a payout outside the current since/until returns an EMPTY payouts
// list (200), not the payout. For a range-free single-payout lookup use the
// per-deposit route (fetchReconciliation → /deposits/:payoutId/reconciliation),
// never ?payout_id.

import {
  type PayoutStatus,
  type PayoutsResponse,
  type PayoutsRange,
  type PayoutStatusFilter,
  centsToUsdStr,
  csvFilename,
  downloadCsv,
  isNotDeployed,
  normalizePayoutsResponse,
  payoutsQuery,
  PAYOUT_RANGE_PRESETS,
  DEFAULT_PAYOUT_RANGE_DAYS,
} from "./payouts.ts"

export {
  type PayoutStatus,
  centsToUsdStr,
  downloadCsv,
  PAYOUT_RANGE_PRESETS,
  DEFAULT_PAYOUT_RANGE_DAYS,
}

// ── Wire shapes (P2-B1s contract) ────────────────────────────────────────────

/** A sibling venue whose deposits commingle into the same Stripe connected
 *  account as the selected venue (TF-PAYOUTS-SUMMARY-F1). */
export interface SharedVenueRef {
  venue_id: number
  name: string
}

/** One venue's attributed slice of the connected account's totals
 *  (TF-PAYOUTS-RECONCILE). The server emits one row per venue in the scanned
 *  account set (selected + siblings), zero-slice venues INCLUDED, sorted by
 *  venue_id, and guarantees Σ(slices) + unallocated == account total per
 *  metric. Rendered verbatim — never re-ordered or filtered client-side. */
export interface VenueBreakdownRow {
  venue_id: number
  name: string
  deposited_cents: number
  in_transit_cents: number
  refunded_cents: number
}

/** Period totals for the summary strip. The account-level trio is the Stripe
 *  CONNECTED ACCOUNT's money — when venue-scoped it is a SUPERSET that may
 *  include other venues' deposits, so it must never be presented as "this
 *  venue's deposits". The venue_* trio is the honest per-venue figure. */
export interface PayoutsSummary {
  deposited_cents: number
  in_transit_cents: number
  refunded_cents: number
  /** true ONLY on a venue-scoped response; gates every field below. */
  venue_scoped: boolean
  /** THIS venue's attributed share (null when unscoped). */
  venue_deposited_cents: number | null
  venue_in_transit_cents: number | null
  venue_refunded_cents: number | null
  /** Scoped only: true when no sibling venue routes into this Stripe account.
   *  null when unscoped (the question doesn't apply). */
  account_dedicated: boolean | null
  /** Scoped only: the OTHER venues whose deposits commingle into the account
   *  total. Always [] when unscoped or dedicated. */
  shared_with_venues: SharedVenueRef[]
  /** Scoped only (TF-PAYOUTS-RECONCILE, services :198): per-venue slices of the
   *  account trio. [] when unscoped OR when the server predates the field —
   *  `hasBreakdown` distinguishes the two via the unallocated trio. */
  breakdown: VenueBreakdownRow[]
  /** Scoped only: account total − Σ(slices) per metric — untagged/legacy rows
   *  and non-tying payout deltas. CAN BE NEGATIVE (e.g. a −$0.47 fee-recovery
   *  adjustment); rendering must never clamp it or the table stops footing.
   *  null when unscoped or the server doesn't send the breakdown contract. */
  unallocated_deposited_cents: number | null
  unallocated_in_transit_cents: number | null
  unallocated_refunded_cents: number | null
}

/** One deposit in the reverse-chron list (the backbone rows). */
export interface DepositListItem {
  payout_id: string
  /** Stripe arrival_date, US/Eastern (YYYY-MM-DD). */
  arrival_date: string | null
  amount_cents: number
  sales_count: number
  status: PayoutStatus
}

/** One ticket tier inside an event group. */
export interface ReconTier {
  tier_name: string
  qty: number
  amount_cents: number
}

/** An event group inside a deposit (line items grouped event → tier). */
export interface ReconEvent {
  event_id: number | null
  name: string | null
  date: string | null
  subtotal_cents: number
  tiers: ReconTier[]
}

/** The exact net line: ticket_sales + door_covers − refunds = deposited. */
export interface ReconNet {
  ticket_sales_cents: number
  door_covers_cents: number
  refunds_cents: number
  deposited_cents: number
}

/** Per-order operational row — present ONLY when details=1. Ticket + payout
 *  tracing fields; NO buyer PII (P2-B1w addendum). These are the EXACT fields the
 *  details view / CSV / PDF render, and nothing more. */
export interface ReconOrderRow {
  order_id: number | string | null
  sale_date: string | null
  event: string | null
  ticket_tier: string | null
  quantity: number
  amount_cents: number
  is_door_sale: boolean
  payout_status: PayoutStatus
  payout_date: string | null
  stripe_payout_id: string | null
  stripe_payment_intent_id: string | null
  /** Present ONLY for events with promoter commission enabled; null → the
   *  promoter-commission column is hidden entirely. */
  promoter_commission_cents: number | null
}

export interface Reconciliation {
  payout_id: string
  arrival_date: string | null
  amount_cents: number
  /** Server's Σ of the line items — compared to amount_cents for the ties check. */
  computed_total_cents: number
  ties: boolean
  events: ReconEvent[]
  door_covers_cents: number
  refunds_cents: number
  net: ReconNet
  /** null until details=1 was requested AND the server returned rows. */
  orders: ReconOrderRow[] | null
  /** TF-B-s attribution add-ons — present ONLY when the request carried a venue_id
   *  (owner venue switcher). The money figures (amount_cents / computed_total_cents /
   *  ties / net) stay FULL-DEPOSIT truth; only events[]/tiers[]/orders are filtered
   *  to the venue. `venue_scoped` gates the "this venue's share" UI; when false the
   *  view renders exactly as All-venues. */
  venue_scoped: boolean
  /** The selected venue's net slice of this deposit (host_net summed over the
   *  venue's rows). null when the request wasn't venue-scoped. */
  venue_subtotal_cents: number | null
}

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

const STATUSES: PayoutStatus[] = ["paid", "in_transit", "pending", "failed"]

function normStatus(v: unknown): PayoutStatus {
  return STATUSES.includes(v as PayoutStatus) ? (v as PayoutStatus) : "paid"
}

function normalizeSharedVenue(raw: Partial<SharedVenueRef>): SharedVenueRef {
  return { venue_id: num(raw.venue_id), name: str(raw.name) ?? "—" }
}

function normalizeBreakdownRow(raw: Partial<VenueBreakdownRow>): VenueBreakdownRow {
  return {
    venue_id: num(raw.venue_id),
    name: str(raw.name) ?? "—",
    deposited_cents: num(raw.deposited_cents),
    in_transit_cents: num(raw.in_transit_cents),
    refunded_cents: num(raw.refunded_cents),
  }
}

export function normalizeSummary(raw: Partial<PayoutsSummary> | null | undefined): PayoutsSummary {
  const r = raw ?? {}
  // The venue block exists ONLY on a venue-scoped response (`venue_scoped: true`).
  // Anything else — including stray venue_* fields on an unscoped payload — is
  // dropped, so the all-venues render can never pick up venue-scope UI.
  const scoped = r.venue_scoped === true
  return {
    deposited_cents: num(r.deposited_cents),
    in_transit_cents: num(r.in_transit_cents),
    refunded_cents: num(r.refunded_cents),
    venue_scoped: scoped,
    venue_deposited_cents: scoped && r.venue_deposited_cents != null ? num(r.venue_deposited_cents) : null,
    venue_in_transit_cents: scoped && r.venue_in_transit_cents != null ? num(r.venue_in_transit_cents) : null,
    venue_refunded_cents: scoped && r.venue_refunded_cents != null ? num(r.venue_refunded_cents) : null,
    account_dedicated: scoped ? r.account_dedicated === true : null,
    shared_with_venues:
      scoped && Array.isArray(r.shared_with_venues)
        ? r.shared_with_venues.map((v) => normalizeSharedVenue((v ?? {}) as Partial<SharedVenueRef>))
        : [],
    breakdown:
      scoped && Array.isArray(r.breakdown)
        ? r.breakdown.map((v) => normalizeBreakdownRow((v ?? {}) as Partial<VenueBreakdownRow>))
        : [],
    // Keep null unless the server actually sent the field (unlike the slice
    // rows, 0 and "absent" mean different things here — absent = the breakdown
    // contract isn't live, so the UI falls back to the caveat line).
    unallocated_deposited_cents: scoped && r.unallocated_deposited_cents != null ? num(r.unallocated_deposited_cents) : null,
    unallocated_in_transit_cents: scoped && r.unallocated_in_transit_cents != null ? num(r.unallocated_in_transit_cents) : null,
    unallocated_refunded_cents: scoped && r.unallocated_refunded_cents != null ? num(r.unallocated_refunded_cents) : null,
  }
}

export function normalizeDeposit(raw: Partial<DepositListItem>): DepositListItem {
  return {
    payout_id: str(raw.payout_id) ?? "",
    arrival_date: str(raw.arrival_date),
    amount_cents: num(raw.amount_cents),
    sales_count: num(raw.sales_count),
    status: normStatus(raw.status),
  }
}

/** The list endpoint returns a bare array; tolerate `{deposits:[...]}` too. */
export function normalizeDeposits(raw: unknown): DepositListItem[] {
  const arr = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as { deposits?: unknown })?.deposits)
      ? (raw as { deposits: unknown[] }).deposits
      : []
  return arr.map((d) => normalizeDeposit((d ?? {}) as Partial<DepositListItem>))
}

function normalizeTier(raw: Partial<ReconTier>): ReconTier {
  return {
    tier_name: str(raw.tier_name) ?? "—",
    qty: num(raw.qty),
    amount_cents: num(raw.amount_cents),
  }
}

function normalizeEvent(raw: Partial<ReconEvent>): ReconEvent {
  return {
    event_id: raw.event_id == null ? null : num(raw.event_id),
    name: str(raw.name),
    date: str(raw.date),
    subtotal_cents: num(raw.subtotal_cents),
    tiers: Array.isArray(raw.tiers) ? raw.tiers.map((t) => normalizeTier((t ?? {}) as Partial<ReconTier>)) : [],
  }
}

function normalizeOrderRow(raw: Partial<ReconOrderRow>): ReconOrderRow {
  return {
    order_id: raw.order_id == null ? null : (typeof raw.order_id === "number" ? raw.order_id : str(raw.order_id)),
    sale_date: str(raw.sale_date),
    event: str(raw.event),
    ticket_tier: str(raw.ticket_tier),
    quantity: num(raw.quantity),
    amount_cents: num(raw.amount_cents),
    is_door_sale: raw.is_door_sale === true,
    payout_status: normStatus(raw.payout_status),
    payout_date: str(raw.payout_date),
    stripe_payout_id: str(raw.stripe_payout_id),
    stripe_payment_intent_id: str(raw.stripe_payment_intent_id),
    // Keep null unless the server actually sent a commission → drives column visibility.
    promoter_commission_cents: raw.promoter_commission_cents == null ? null : num(raw.promoter_commission_cents),
  }
}

export function normalizeReconciliation(raw: Partial<Reconciliation>): Reconciliation {
  const netRaw = (raw.net ?? {}) as Partial<ReconNet>
  return {
    payout_id: str(raw.payout_id) ?? "",
    arrival_date: str(raw.arrival_date),
    amount_cents: num(raw.amount_cents),
    computed_total_cents: num(raw.computed_total_cents),
    ties: raw.ties === true,
    events: Array.isArray(raw.events) ? raw.events.map((e) => normalizeEvent((e ?? {}) as Partial<ReconEvent>)) : [],
    door_covers_cents: num(raw.door_covers_cents),
    refunds_cents: num(raw.refunds_cents),
    net: {
      ticket_sales_cents: num(netRaw.ticket_sales_cents),
      door_covers_cents: num(netRaw.door_covers_cents),
      refunds_cents: num(netRaw.refunds_cents),
      deposited_cents: num(netRaw.deposited_cents),
    },
    orders: Array.isArray(raw.orders)
      ? raw.orders.map((o) => normalizeOrderRow((o ?? {}) as Partial<ReconOrderRow>))
      : null,
    // TF-B-s attribution: `venue_scoped` is present (=== true) only on a venue-scoped
    // request; treat anything else as unscoped. venue_subtotal_cents is meaningful
    // only when scoped, so keep it null unless the server actually sent one.
    venue_scoped: raw.venue_scoped === true,
    venue_subtotal_cents:
      raw.venue_scoped === true && raw.venue_subtotal_cents != null ? num(raw.venue_subtotal_cents) : null,
  }
}

// ── Summary render state (TF-PAYOUTS-SUMMARY-F1) ─────────────────────────────
//
// The strip has exactly THREE states, chosen here (pure, test-pinned) so the
// component can't drift from the ruling:
//   all_venues       → unchanged pre-fix account-level strip (hard regression gate)
//   shared_venue     → LEAD with the venue share; the account total is a SUPERSET
//                      (it includes other venues' money) and must be de-emphasized
//                      and caveated with the commingled venues' names
//   dedicated_venue  → account == venue; show once, with explicit reassurance

export type SummaryRenderState = "all_venues" | "shared_venue" | "dedicated_venue"

export function summaryRenderState(s: Pick<PayoutsSummary, "venue_scoped" | "account_dedicated">): SummaryRenderState {
  if (s.venue_scoped !== true) return "all_venues"
  return s.account_dedicated === true ? "dedicated_venue" : "shared_venue"
}

/** Lead-tile labels for the shared-venue state — the venue_* trio is the honest
 *  per-venue figure and gets the large treatment. */
export const VENUE_TILE_LABELS = {
  deposited: "This venue's deposits",
  in_transit: "This venue's in transit",
  refunded: "This venue's refunded",
} as const

/** Label over the de-emphasized account-level line in the shared state. */
export const COMBINED_ACCOUNT_LABEL = "Combined Stripe account"

/** Names the commingled venues EXACTLY as the API returned them (comma-joined,
 *  no re-ordering) — the caveat that stops the account total from reading as
 *  this venue's money. */
export function sharedAccountCaveat(shared: SharedVenueRef[]): string {
  return `Also includes deposits for: ${shared.map((v) => v.name).join(", ")}`
}

export const DEDICATED_BADGE_LABEL = "✓ Dedicated Stripe account"

/** The dedicated-state reassurance sentence, naming the selected venue. */
export function dedicatedReassurance(venueName?: string | null): string {
  return `These deposits are for ${venueName || "this venue"} only — not shared with any other venue.`
}

/** Which trio the strip's tiles show per state. SHARED leads with the venue's
 *  attributed share (the honest per-venue figure). DEDICATED shows the ACCOUNT
 *  trio: a dedicated account's deposits are all this venue's by definition, and
 *  the account figures are what tie to the deposit rows below — the attributed
 *  venue_* trio can read 0 when the venue's events are tagged elsewhere
 *  (attribution keys off events.venue_id, TF-B-s), which would contradict the
 *  reassurance sentence. ALL-VENUES is the account trio, unchanged. */
export function summaryTilesFor(s: PayoutsSummary): {
  deposited_cents: number
  in_transit_cents: number
  refunded_cents: number
} {
  if (summaryRenderState(s) === "shared_venue") {
    return {
      deposited_cents: s.venue_deposited_cents ?? 0,
      in_transit_cents: s.venue_in_transit_cents ?? 0,
      refunded_cents: s.venue_refunded_cents ?? 0,
    }
  }
  return { deposited_cents: s.deposited_cents, in_transit_cents: s.in_transit_cents, refunded_cents: s.refunded_cents }
}

// ── Combined-account breakdown table (TF-PAYOUTS-RECONCILE) ──────────────────
//
// Luke's "full breakdown" ruling: the Combined Stripe account block must VISIBLY
// FOOT — every venue's slice, an unallocated line, and the combined total, for
// all three metrics. The server guarantees Σ(slices) + unallocated == account
// total per metric; this model re-checks that arithmetic client-side (same
// philosophy as tiesCheck: never render a total as if it footed without
// verifying), builds the exact rows the table renders, and pins all the copy.

export const BREAKDOWN_METRIC_LABELS = {
  deposited: "Deposited",
  in_transit: "In transit",
  refunded: "Refunded",
} as const

export const UNALLOCATED_ROW_LABEL = "Unallocated (not tied to a venue)"
export const BREAKDOWN_TOTAL_ROW_LABEL = "Combined total"
export const THIS_VENUE_BADGE_LABEL = "This venue"

/** Shown under the table whenever any unallocated cell is negative. A negative
 *  amount is REAL (e.g. a fee-recovery adjustment) and must render as-is —
 *  clamping it to zero would break the footing the table exists to show. */
export const NEGATIVE_UNALLOCATED_NOTE =
  "A negative unallocated amount reflects a fee-recovery adjustment on the account — it's part of what makes the column add up to the total."

/** Defensive only — the server asserts footing before responding, so this
 *  renders only if a response slipped through with broken arithmetic. */
export const BREAKDOWN_MISMATCH_WARNING =
  "These rows don't add up to the account total — the figures are shown as received. Contact support if this persists."

export interface BreakdownTableRow {
  kind: "venue" | "unallocated" | "total"
  /** null for the unallocated / total rows. */
  venue_id: number | null
  label: string
  /** True on exactly the row for the venue being viewed. */
  isThisVenue: boolean
  deposited_cents: number
  in_transit_cents: number
  refunded_cents: number
}

export interface BreakdownTable {
  /** Render order: every venue slice (server order), then Unallocated, then
   *  the Combined total. */
  rows: BreakdownTableRow[]
  /** Any unallocated cell < 0 → show NEGATIVE_UNALLOCATED_NOTE. */
  hasNegativeUnallocated: boolean
  /** Client-side re-check per metric: Σ(venue slices) + unallocated − total.
   *  All zeros when the table foots (the server-guaranteed invariant). */
  footing: { deposited: number; in_transit: number; refunded: number }
  foots: boolean
}

/** True when the venue-scoped response carries the full breakdown contract
 *  (services :198+). False → the UI keeps the pre-breakdown caveat line. */
export function hasBreakdown(s: PayoutsSummary): boolean {
  return (
    s.venue_scoped === true &&
    s.breakdown.length > 0 &&
    s.unallocated_deposited_cents != null &&
    s.unallocated_in_transit_cents != null &&
    s.unallocated_refunded_cents != null
  )
}

/** The itemized reconciliation the Combined Stripe account block renders.
 *  null when the response doesn't carry the breakdown contract. */
export function buildBreakdownTable(s: PayoutsSummary, selectedVenueId?: number | null): BreakdownTable | null {
  if (!hasBreakdown(s)) return null

  const venueRows: BreakdownTableRow[] = s.breakdown.map((v) => ({
    kind: "venue",
    venue_id: v.venue_id,
    label: v.name,
    isThisVenue: selectedVenueId != null && v.venue_id === selectedVenueId,
    deposited_cents: v.deposited_cents,
    in_transit_cents: v.in_transit_cents,
    refunded_cents: v.refunded_cents,
  }))
  const unallocated: BreakdownTableRow = {
    kind: "unallocated",
    venue_id: null,
    label: UNALLOCATED_ROW_LABEL,
    isThisVenue: false,
    deposited_cents: s.unallocated_deposited_cents as number,
    in_transit_cents: s.unallocated_in_transit_cents as number,
    refunded_cents: s.unallocated_refunded_cents as number,
  }
  const total: BreakdownTableRow = {
    kind: "total",
    venue_id: null,
    label: BREAKDOWN_TOTAL_ROW_LABEL,
    isThisVenue: false,
    deposited_cents: s.deposited_cents,
    in_transit_cents: s.in_transit_cents,
    refunded_cents: s.refunded_cents,
  }

  const sum = (pick: (r: BreakdownTableRow) => number) => venueRows.reduce((n, r) => n + pick(r), 0)
  const footing = {
    deposited: sum((r) => r.deposited_cents) + unallocated.deposited_cents - total.deposited_cents,
    in_transit: sum((r) => r.in_transit_cents) + unallocated.in_transit_cents - total.in_transit_cents,
    refunded: sum((r) => r.refunded_cents) + unallocated.refunded_cents - total.refunded_cents,
  }

  return {
    rows: [...venueRows, unallocated, total],
    hasNegativeUnallocated:
      unallocated.deposited_cents < 0 || unallocated.in_transit_cents < 0 || unallocated.refunded_cents < 0,
    footing,
    foots: footing.deposited === 0 && footing.in_transit === 0 && footing.refunded === 0,
  }
}

/** Whether the strip shows the itemized table at all. SHARED: always (that's
 *  the ruling — the commingled account must visibly foot). DEDICATED: only when
 *  it says something the reassurance doesn't — a sibling slice (shouldn't
 *  happen) or a nonzero unallocated remainder; a trivial one-venue table with
 *  zero unallocated would just be confusing noise under the ✓ badge. */
export function showBreakdownTable(s: PayoutsSummary): boolean {
  if (!hasBreakdown(s)) return false
  if (summaryRenderState(s) === "dedicated_venue") {
    return (
      s.breakdown.length > 1 ||
      s.unallocated_deposited_cents !== 0 ||
      s.unallocated_in_transit_cents !== 0 ||
      s.unallocated_refunded_cents !== 0
    )
  }
  return true
}

/** Money formatter for breakdown cells: negatives keep their sign (typographic
 *  minus), never clamped — "−$0.47" is a real fee-recovery adjustment and the
 *  column only foots if it renders. (The tile-level `money` helper never sees
 *  negatives; this one must.) */
export function signedMoneyStr(cents: number): string {
  return usd(cents)
}

// ── Date window (preset days=N vs custom since/until) ────────────────────────
//
// TF-PAYOUTS-SUMMARY-F1: /summary and /deposits accept since=YYYY-MM-DD &
// until=YYYY-MM-DD (the /list convention) alongside the existing days=N (90
// default). A window is EITHER a preset or a custom range — never both.

export type PayoutsWindow =
  | { kind: "days"; days: number }
  | { kind: "custom"; since: string; until: string }

/** Strict YYYY-MM-DD that is also a real calendar date. */
export function isIsoDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const [y, m, d] = s.split("-").map(Number)
  const dt = new Date(y, m - 1, d)
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d
}

/** Validate a custom range: both real dates, since ≤ until. null → not applyable. */
export function customWindow(since: string, until: string): PayoutsWindow | null {
  if (!isIsoDate(since) || !isIsoDate(until)) return null
  if (since > until) return null
  return { kind: "custom", since, until }
}

/** True when a custom `until` lands before `todayIso` (lexicographic compare is
 *  date order for ISO dates). Drives the in-transit clarity note: with a past
 *  end date, funds later swept into payouts still read as "not yet deposited"
 *  as of that date — inherited engine semantics, deliberately NOT "fixed". */
export function untilIsPast(w: PayoutsWindow, todayIso: string): boolean {
  return w.kind === "custom" && w.until < todayIso
}

/** Small info note shown near the in-transit figure when `untilIsPast`. */
export const IN_TRANSIT_PAST_UNTIL_NOTE = "In transit reflects funds not yet deposited as of your end date."

// ── Pure math / display helpers ──────────────────────────────────────────────

export interface TiesCheck {
  /** Client-side delta = computed_total_cents − amount_cents (0 = ties). */
  deltaCents: number
  /** True only when the server flags ties AND the numbers agree to the penny. */
  ties: boolean
}

/** Independent ties check. We trust the server's `ties` flag but ALSO verify the
 *  arithmetic, so a silently-wrong total surfaces even if the flag disagrees —
 *  the UI must never render a wrong total as if it footed. */
export function tiesCheck(recon: Pick<Reconciliation, "ties" | "computed_total_cents" | "amount_cents">): TiesCheck {
  const deltaCents = recon.computed_total_cents - recon.amount_cents
  return { deltaCents, ties: recon.ties === true && deltaCents === 0 }
}

export interface NetLineParts {
  ticketSalesCents: number
  doorCoversCents: number
  refundsCents: number
  depositedCents: number
  /** ticket_sales + door_covers − refunds; equals depositedCents when the net foots. */
  computedDepositedCents: number
  foots: boolean
}

/** The four figures of the mandated net sentence, plus a footing check so a
 *  bad `net` block can't render an equation that doesn't add up. */
export function netLineParts(net: ReconNet): NetLineParts {
  const computedDepositedCents = net.ticket_sales_cents + net.door_covers_cents - net.refunds_cents
  return {
    ticketSalesCents: net.ticket_sales_cents,
    doorCoversCents: net.door_covers_cents,
    refundsCents: net.refunds_cents,
    depositedCents: net.deposited_cents,
    computedDepositedCents,
    foots: computedDepositedCents === net.deposited_cents,
  }
}

/** Total quantity across every tier of every event (a deposit's ticket count). */
export function totalTicketQty(recon: Pick<Reconciliation, "events">): number {
  return recon.events.reduce((n, e) => n + e.tiers.reduce((m, t) => m + t.qty, 0), 0)
}

/** The ONLY source of per-order rows for the view. Returns rows only when details
 *  are toggled on AND the server supplied them; otherwise []. Single accessor so
 *  the operational rows are opt-in (there is no buyer PII in them either way). */
export function visibleOrderRows(recon: Pick<Reconciliation, "orders">, showDetails: boolean): ReconOrderRow[] {
  if (!showDetails) return []
  return recon.orders ?? []
}

/** Show the promoter-commission column iff at least one order row carries a
 *  commission (i.e. its event has the promoter program enabled); hidden entirely
 *  otherwise, per the addendum. */
export function showCommissionColumn(rows: ReconOrderRow[]): boolean {
  return rows.some((r) => r.promoter_commission_cents != null)
}

/** Middle-truncated Stripe payout id for the copyable chip (full value is what
 *  gets copied; this is only the label). Short ids pass through untouched. */
export function shortPayoutId(id: string): string {
  return id.length > 16 ? `${id.slice(0, 10)}…${id.slice(-4)}` : id
}

// ── Per-deposit CSV (mirrors the reconciliation rows) ────────────────────────

/** RFC-4180 cell escaping: quote when the value contains a comma, quote, or newline. */
function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

const RECON_CSV_HEADERS = ["section", "event", "event_date", "tier", "qty", "amount"] as const

/** Fixed operational detail columns (addendum). promoter_commission is appended
 *  only when the deposit has any commission-bearing row. NO buyer PII. */
const RECON_DETAIL_HEADERS = [
  "order_id",
  "sale_date",
  "event",
  "ticket_tier",
  "quantity",
  "amount",
  "is_door_sale",
  "payout_status",
  "payout_date",
  "stripe_payout_id",
  "stripe_payment_intent_id",
] as const

function detailRowCells(o: ReconOrderRow, withCommission: boolean): string[] {
  const cells = [
    o.order_id == null ? "" : String(o.order_id),
    o.sale_date ?? "",
    o.event ?? "",
    o.ticket_tier ?? "",
    String(o.quantity),
    centsToUsdStr(o.amount_cents),
    o.is_door_sale ? "yes" : "no",
    o.payout_status,
    o.payout_date ?? "",
    o.stripe_payout_id ?? "",
    o.stripe_payment_intent_id ?? "",
  ]
  if (withCommission) cells.push(centsToUsdStr(o.promoter_commission_cents))
  return cells
}

/** Build the per-deposit CSV client-side from a reconciliation. Mirrors the panel:
 *  one row per event→tier, a per-event subtotal, the door-cover and refund lines,
 *  and the net line. When `orders` is present (details loaded), appends the
 *  operational per-order rows under a DETAILS section. */
export function buildDepositCsv(recon: Reconciliation): string {
  const rows: string[][] = [
    [`Bizzy payout reconciliation — ${recon.payout_id}`],
    [`Arrival date`, recon.arrival_date ?? ""],
    [`Ties to Stripe`, tiesCheck(recon).ties ? "yes" : "no"],
    [],
    [...RECON_CSV_HEADERS],
  ]

  for (const ev of recon.events) {
    for (const t of ev.tiers) {
      rows.push(["line", ev.name ?? "—", ev.date ?? "", t.tier_name, String(t.qty), centsToUsdStr(t.amount_cents)])
    }
    rows.push(["event_subtotal", ev.name ?? "—", ev.date ?? "", "", "", centsToUsdStr(ev.subtotal_cents)])
  }

  rows.push(["door_covers", "", "", "", "", centsToUsdStr(recon.door_covers_cents)])
  rows.push(["refunds", "", "", "", "", centsToUsdStr(-Math.abs(recon.refunds_cents))])

  const n = netLineParts(recon.net)
  rows.push([])
  rows.push(["net_ticket_sales", "", "", "", "", centsToUsdStr(n.ticketSalesCents)])
  rows.push(["net_door_covers", "", "", "", "", centsToUsdStr(n.doorCoversCents)])
  rows.push(["net_refunds", "", "", "", "", centsToUsdStr(-Math.abs(n.refundsCents))])
  rows.push(["net_deposited", "", "", "", "", centsToUsdStr(n.depositedCents)])

  // TF-PAYOUTS-VENUE-F1: on a venue-scoped export, the net_deposited above is the
  // WHOLE deposit (Stripe pays the account, not the venue) while the line items are
  // filtered to the venue. Append the venue's own slice so the statement isn't
  // ambiguous. Omitted entirely when unscoped → unchanged CSV.
  if (recon.venue_scoped && recon.venue_subtotal_cents != null) {
    rows.push(["venue_share", "", "", "", "", centsToUsdStr(recon.venue_subtotal_cents)])
  }

  if (recon.orders && recon.orders.length > 0) {
    const withCommission = showCommissionColumn(recon.orders)
    rows.push([])
    rows.push(["DETAILS (ticket-level)"])
    rows.push([...RECON_DETAIL_HEADERS, ...(withCommission ? ["promoter_commission"] : [])])
    for (const o of recon.orders) {
      rows.push(detailRowCells(o, withCommission))
    }
  }

  return rows.map((cells) => cells.map(csvCell).join(",")).join("\r\n")
}

/** Filename for a per-deposit CSV/PDF download. */
export function depositExportFilename(recon: Pick<Reconciliation, "payout_id">, ext: "csv" | "pdf"): string {
  const id = recon.payout_id || "payout"
  return `bizzy-deposit-${id}.${ext}`
}

// ── Per-deposit PDF (lightweight, no dependency) ─────────────────────────────
//
// The repo carries NO PDF library and no export machinery, so the PDF export uses
// a dependency-free printable approach: build a self-contained HTML document and
// hand it to the browser's print pipeline (window.print → "Save as PDF"). This
// mirrors the CSV anchor-click idiom — zero new deps, works in every browser, and
// the layout tracks the on-screen panel. Reported as the chosen approach.

function esc(v: unknown): string {
  const s = v == null ? "" : String(v)
  return s.replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string
  ))
}

function usd(cents: number): string {
  const neg = cents < 0
  const s = (Math.abs(cents) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${neg ? "−" : ""}$${s}`
}

/** Build the printable reconciliation document (used by both the print window and
 *  the test harness). Pure string builder so it is unit-testable. */
export function buildDepositPdfHtml(recon: Reconciliation): string {
  const ties = tiesCheck(recon)
  const n = netLineParts(recon.net)
  const eventRows = recon.events
    .map((ev) => {
      const tiers = ev.tiers
        .map(
          (t) =>
            `<tr><td class="ind">${esc(t.tier_name)}</td><td class="r">${t.qty}</td><td class="r">${usd(t.amount_cents)}</td></tr>`,
        )
        .join("")
      return (
        `<tr class="ev"><td colspan="2">${esc(ev.name ?? "—")}${ev.date ? ` · ${esc(ev.date)}` : ""}</td><td class="r">${usd(ev.subtotal_cents)}</td></tr>` +
        tiers
      )
    })
    .join("")

  const withCommission = recon.orders ? showCommissionColumn(recon.orders) : false
  const detailRows =
    recon.orders && recon.orders.length > 0
      ? `<h2>Ticket-level details</h2><table class="det"><thead><tr><th>Order</th><th>Sale date</th><th>Event</th><th>Tier</th><th class="r">Qty</th><th class="r">Amount</th><th>Door</th><th>Payout</th><th>Payout date</th><th>Payout id</th><th>Payment intent</th>${
          withCommission ? '<th class="r">Commission</th>' : ""
        }</tr></thead><tbody>${recon.orders
          .map(
            (o) =>
              `<tr><td>${esc(o.order_id == null ? "—" : o.order_id)}</td><td>${esc(o.sale_date ?? "—")}</td><td>${esc(
                o.event ?? "—",
              )}</td><td>${esc(o.ticket_tier ?? "—")}</td><td class="r">${o.quantity}</td><td class="r">${usd(
                o.amount_cents,
              )}</td><td>${o.is_door_sale ? "Yes" : "—"}</td><td>${esc(o.payout_status)}</td><td>${esc(
                o.payout_date ?? "—",
              )}</td><td class="mono">${esc(o.stripe_payout_id ?? "—")}</td><td class="mono">${esc(
                o.stripe_payment_intent_id ?? "—",
              )}</td>${withCommission ? `<td class="r">${o.promoter_commission_cents == null ? "—" : usd(o.promoter_commission_cents)}</td>` : ""}</tr>`,
          )
          .join("")}</tbody></table>`
      : ""

  return `<!doctype html><html><head><meta charset="utf-8"><title>Payout ${esc(recon.payout_id)}</title><style>
    *{box-sizing:border-box}body{font:13px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#111;margin:32px;max-width:1040px}
    h1{font-size:18px;margin:0 0 2px}h2{font-size:14px;margin:22px 0 6px}
    .sub{color:#666;margin:0 0 14px}
    .ties{display:inline-block;padding:4px 10px;border-radius:999px;font-weight:600;font-size:12px}
    .ok{background:#ecfdf3;color:#067647;border:1px solid #abefc6}
    .warn{background:#fef3f2;color:#b42318;border:1px solid #fecdca}
    table{width:100%;border-collapse:collapse;margin:6px 0}
    th,td{padding:6px 8px;text-align:left;border-bottom:1px solid #eee}
    th.r,td.r{text-align:right;font-variant-numeric:tabular-nums}
    tr.ev td{font-weight:600;border-top:1px solid #ddd}
    td.ind{padding-left:22px;color:#444}
    .net{margin-top:16px;padding:12px 14px;background:#f9fafb;border:1px solid #eee;border-radius:8px;font-weight:600}
    .vshare{margin:8px 0 0;padding:10px 14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;color:#166534;font-size:12px}
    .det{font-size:11px}
    .det th{background:#f9fafb;font-size:11px}
    .det th,.det td{padding:5px 7px}
    .det td.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px;color:#555}
    .foot{color:#888;font-size:11px;margin-top:24px}
  </style></head><body>
    <h1>Payout reconciliation</h1>
    <p class="sub">${esc(recon.payout_id)}${recon.arrival_date ? ` · deposited ${esc(recon.arrival_date)}` : ""}</p>
    <span class="ties ${ties.ties ? "ok" : "warn"}">${ties.ties ? "✓ Ties to Stripe deposit" : `⚠ Off by ${usd(ties.deltaCents)} — does not tie`}</span>
    <h2>Line items</h2>
    <table><thead><tr><th>Event / tier</th><th class="r">Qty</th><th class="r">Amount</th></tr></thead><tbody>
      ${eventRows}
      <tr class="ev"><td colspan="2">Door covers</td><td class="r">${usd(recon.door_covers_cents)}</td></tr>
      <tr class="ev"><td colspan="2">Refunds</td><td class="r">${usd(-Math.abs(recon.refunds_cents))}</td></tr>
    </tbody></table>
    <div class="net">Ticket sales ${usd(n.ticketSalesCents)} + Door covers ${usd(n.doorCoversCents)} − Refunds ${usd(
      Math.abs(n.refundsCents),
    )} = Deposited ${usd(n.depositedCents)}</div>
    ${
      recon.venue_scoped && recon.venue_subtotal_cents != null
        ? `<p class="vshare">This venue's share of the deposit: <strong>${usd(
            recon.venue_subtotal_cents,
          )}</strong>. The deposit total above covers your whole business; line items are filtered to this venue.</p>`
        : ""
    }
    ${detailRows}
    <p class="foot">Generated by Bizzy · payout ${esc(recon.payout_id)}</p>
  </body></html>`
}

/** Open the printable reconciliation in a new window and trigger the print
 *  dialog (browser "Save as PDF"). Browser-only; no-op server-side. */
export function exportDepositPdf(recon: Reconciliation): void {
  if (typeof window === "undefined") return
  const w = window.open("", "_blank", "width=820,height=1000")
  if (!w) return
  w.document.open()
  w.document.write(buildDepositPdfHtml(recon))
  w.document.close()
  // Give the new document a tick to lay out before printing.
  w.onload = () => {
    w.focus()
    w.print()
  }
}

// ── Cached-serve freshness (services :125) ───────────────────────────────────
//
// Pure result-shaping for the four cached endpoints. The fetchers below are thin
// transport wrappers around these, so the computing/ready/back-compat decisions
// are unit-tested without a network.

/** The freshness trio every cached payouts response carries (headers on
 *  /deposits + /export.csv + the list; body-only on /summary). */
export interface PayoutsFreshness {
  state: "ready" | "computing"
  /** ISO-8601 instant the background walk finished; null while computing (or
   *  from a pre-:125 server that doesn't send it). */
  computedAt: string | null
  /** True while a background recompute for this cache key is in flight — data
   *  on screen is the last computed payload, being refreshed. */
  refreshing: boolean
}

/** The cold-cache body all JSON endpoints share:
 *  { state:'computing', computed_at:null, refreshing:true }. Detected on the RAW
 *  body — before any normalize*() call, which would coerce it into an all-zeros
 *  payload ($0.00 tiles / an empty list that looks final). */
export function isComputingBody(raw: unknown): boolean {
  return typeof raw === "object" && raw !== null && (raw as { state?: unknown }).state === "computing"
}

/** Parse the X-Payouts-* trio. MISSING X-Payouts-State → "ready": a pre-:125
 *  server sends no headers and its array body IS the final data (back-compat). */
export function parsePayoutsHeaders(headers: { get(name: string): string | null }): PayoutsFreshness {
  return {
    state: headers.get("x-payouts-state") === "computing" ? "computing" : "ready",
    computedAt: str(headers.get("x-payouts-computed-at")),
    refreshing: headers.get("x-payouts-refreshing") === "1",
  }
}

export type SummaryFetchResult =
  | { kind: "computing" }
  | { kind: "ready"; summary: PayoutsSummary; computedAt: string | null; refreshing: boolean }

/** /summary body → result. The computing check runs FIRST — normalizeSummary on
 *  the computing body would return an all-zeros summary and the strip would
 *  render $0.00 tiles as if that were the answer. */
export function summaryResultFromBody(raw: unknown): SummaryFetchResult {
  if (isComputingBody(raw)) return { kind: "computing" }
  const r = (raw ?? {}) as Partial<PayoutsSummary> & { computed_at?: unknown; refreshing?: unknown }
  return {
    kind: "ready",
    summary: normalizeSummary(r),
    computedAt: str(r.computed_at),
    refreshing: r.refreshing === true,
  }
}

export type DepositsFetchResult =
  | { kind: "computing" }
  | { kind: "ready"; deposits: DepositListItem[]; computedAt: string | null; refreshing: boolean }

/** /deposits body + headers → result. The body stays a bare array in every
 *  state; only the headers distinguish "computing (empty for now)" from "ready
 *  (genuinely empty)". No headers → ready (older server). */
export function depositsResultFromBody(
  raw: unknown,
  headers: { get(name: string): string | null },
): DepositsFetchResult {
  const f = parsePayoutsHeaders(headers)
  if (f.state === "computing") return { kind: "computing" }
  return { kind: "ready", deposits: normalizeDeposits(raw), computedAt: f.computedAt, refreshing: f.refreshing }
}

export type PayoutsListFetchResult =
  | { kind: "computing" }
  | { kind: "ready"; response: PayoutsResponse; computedAt: string | null; refreshing: boolean }

/** /business/payouts (list) body → result. Same computing-first rule as the
 *  summary: normalizePayoutsResponse on the computing body would fabricate an
 *  empty-but-final-looking list. Under ?payout_id an out-of-window deposit is a
 *  READY response with empty payouts[] (the cache is window-keyed) — that is
 *  data, not an error; range-free lookups belong to fetchReconciliation. */
export function listResultFromBody(raw: unknown): PayoutsListFetchResult {
  if (isComputingBody(raw)) return { kind: "computing" }
  const r = (raw ?? {}) as Partial<PayoutsResponse> & { computed_at?: unknown; refreshing?: unknown }
  return {
    kind: "ready",
    response: normalizePayoutsResponse(r),
    computedAt: str(r.computed_at),
    refreshing: r.refreshing === true,
  }
}

/** Summary and deposits share one cache key, so their freshness should agree;
 *  merge defensively (first computed_at wins, refreshing if either says so). */
export function combineFreshness(
  a: { computedAt: string | null; refreshing: boolean },
  b: { computedAt: string | null; refreshing: boolean },
): { computedAt: string | null; refreshing: boolean } {
  return { computedAt: a.computedAt ?? b.computedAt, refreshing: a.refreshing || b.refreshing }
}

// ── Computing-state UI rulings (pinned copy + cadence) ───────────────────────

/** Poll cadence while the key is computing (contract suggests 2–5 s). */
export const COMPUTING_POLL_MS = 4000

/** Give-up ceiling: the prod walks we've measured run 6–8 min COLD only at
 *  whale scale, but a normal business computes in seconds; past 2 minutes the
 *  page stops silently spinning and offers the existing error + Retry state. */
export const COMPUTING_GIVE_UP_MS = 120_000

/** Non-alarming first-load copy — computing is expected behavior, not a fault. */
export const COMPUTING_COPY = {
  title: "Crunching your payouts",
  description:
    "First load can take a minute — we're reconciling every deposit with Stripe. This page will update by itself.",
} as const

/** Subtle indicator text while a background recompute is in flight. */
export const REFRESHING_LABEL = "Refreshing…"

/** Export button label while the server answers 202 (key still computing). */
export const EXPORT_PREPARING_LABEL = "Preparing export…"

/** "Updated h:mm a (ET)" from the computed_at instant; null when absent or
 *  unparseable (the label simply doesn't render). Explicit America/New_York —
 *  computed_at is an ISO instant and the product's book time is Eastern. */
export function freshnessLabel(computedAtIso: string | null): string | null {
  if (!computedAtIso) return null
  const d = new Date(computedAtIso)
  if (Number.isNaN(d.getTime())) return null
  const t = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/New_York",
  })
  return `Updated ${t} (ET)`
}

// ── Export.csv fetch-then-blob (202 → wait → retry → 200 CSV) ────────────────

/** Parse Retry-After (delta-seconds). Absent/garbage → the contract's 5 s;
 *  clamped to [1, 30] so a bad header can neither hammer nor hang the loop. */
export function retryAfterSeconds(header: string | null): number {
  const n = header == null ? NaN : Number(header)
  if (!Number.isFinite(n) || n <= 0) return 5
  return Math.min(30, Math.max(1, Math.round(n)))
}

/** Extract the filename from Content-Disposition; null when absent. */
export function csvFilenameFromDisposition(header: string | null): string | null {
  if (!header) return null
  const m = /filename="([^"]+)"/.exec(header) ?? /filename=([^;]+)/.exec(header)
  return m ? m[1].trim() : null
}

/** A response is the actual CSV only when it says so: Content-Disposition
 *  present or a text/csv Content-Type. A 200 without either is treated as
 *  still-computing (defensive) — the JSON computing body must NEVER be blobbed
 *  into a .csv download. */
export function isCsvExportResponse(headers: { get(name: string): string | null }): boolean {
  if (headers.get("content-disposition")) return true
  return (headers.get("content-type") ?? "").includes("text/csv")
}

/** Minimal response surface the export loop needs (Response satisfies it;
 *  tests inject a stub). */
export interface ExportResponseLike {
  status: number
  headers: { get(name: string): string | null }
  text(): Promise<string>
}

export type ExportFetchResult = { kind: "ready"; filename: string; csv: string } | { kind: "gave_up" }

/** Fetch the server CSV export. 200 + CSV markers → the file. 202 (or a
 *  defensive non-CSV 200) → still computing: notify, wait Retry-After, retry —
 *  up to maxWaitSeconds, then give up (caller shows a retryable failure).
 *  404 → null (endpoint not deployed — caller falls back to the client-side
 *  CSV build). Other errors propagate as ApiError. */
export async function fetchPayoutsExportCsv(params: {
  range: PayoutsRange
  status?: PayoutStatusFilter
  venueParam?: string
  payoutId?: string
  /** Fires on each computing response — flips the button to "Preparing export…". */
  onComputing?: () => void
  /** Test seams; default to apiClient.getRaw + a real timer. */
  request?: (path: string) => Promise<ExportResponseLike>
  sleep?: (seconds: number) => Promise<void>
  maxWaitSeconds?: number
}): Promise<ExportFetchResult | null> {
  const {
    range,
    status = "all",
    venueParam = "",
    payoutId,
    onComputing,
    sleep = (s) => new Promise<void>((resolve) => setTimeout(resolve, s * 1000)),
    maxWaitSeconds = COMPUTING_GIVE_UP_MS / 1000,
  } = params
  const request =
    params.request ??
    (async (path: string): Promise<ExportResponseLike> => {
      const { apiClient } = await import("./api-client")
      return apiClient.getRaw(path)
    })
  const path = `/business/payouts/export.csv${payoutsQuery({ range, status, venueParam, payoutId })}`

  let waited = 0
  try {
    for (;;) {
      const res = await request(path)
      if (res.status === 200 && isCsvExportResponse(res.headers)) {
        return {
          kind: "ready",
          filename: csvFilenameFromDisposition(res.headers.get("content-disposition")) ?? csvFilename(range, payoutId),
          csv: await res.text(),
        }
      }
      // 202 — or a 200 that isn't the CSV — the key is still computing.
      onComputing?.()
      const delay = retryAfterSeconds(res.headers.get("retry-after"))
      if (waited + delay > maxWaitSeconds) return { kind: "gave_up" }
      await sleep(delay)
      waited += delay
    }
  } catch (err) {
    if (isNotDeployed(err)) return null
    throw err
  }
}

// ── Fetch (degrade to null on 404 — endpoint not deployed yet) ───────────────

/** Window → the query the summary/deposits endpoints share (+ venue scope).
 *  A bare number stays supported as `days=N` (the original signature); a custom
 *  window becomes `since=…&until=…` per the /list convention. */
export function reconcileQuery(window: number | PayoutsWindow, venueParam = ""): string {
  const w: PayoutsWindow = typeof window === "number" ? { kind: "days", days: window } : window
  const q =
    w.kind === "custom"
      ? `?since=${encodeURIComponent(w.since)}&until=${encodeURIComponent(w.until)}`
      : `?days=${encodeURIComponent(w.days)}`
  return `${q}${venueParam}`
}

export async function fetchPayoutsSummary(params: {
  window: number | PayoutsWindow
  venueParam?: string
}): Promise<SummaryFetchResult | null> {
  const { apiClient } = await import("./api-client")
  try {
    const raw = await apiClient.get<unknown>(
      `/business/payouts/summary${reconcileQuery(params.window, params.venueParam)}`,
    )
    return summaryResultFromBody(raw)
  } catch (err) {
    if (isNotDeployed(err)) return null
    throw err
  }
}

export async function fetchDeposits(params: {
  window: number | PayoutsWindow
  venueParam?: string
}): Promise<DepositsFetchResult | null> {
  const { apiClient } = await import("./api-client")
  try {
    const { body, headers } = await apiClient.getWithHeaders<unknown>(
      `/business/payouts/deposits${reconcileQuery(params.window, params.venueParam)}`,
    )
    return depositsResultFromBody(body, headers)
  } catch (err) {
    if (isNotDeployed(err)) return null
    throw err
  }
}

/** The /business/payouts list on the cached contract. Kept beside the other
 *  cached-serve fetchers; payouts.ts's fetchPayouts stays as the legacy
 *  full-response fetcher (it would coerce a computing body into an empty list —
 *  new consumers must use this one). */
export async function fetchPayoutsList(params: {
  range: PayoutsRange
  status?: PayoutStatusFilter
  venueParam?: string
  payoutId?: string
}): Promise<PayoutsListFetchResult | null> {
  const { apiClient } = await import("./api-client")
  const { range, status = "all", venueParam = "", payoutId } = params
  try {
    const raw = await apiClient.get<unknown>(`/business/payouts${payoutsQuery({ range, status, venueParam, payoutId })}`)
    return listResultFromBody(raw)
  } catch (err) {
    if (isNotDeployed(err)) return null
    throw err
  }
}

export async function fetchReconciliation(params: {
  payoutId: string
  details?: boolean
  venueParam?: string
}): Promise<Reconciliation | null> {
  const { apiClient } = await import("./api-client")
  const { payoutId, details = false, venueParam = "" } = params
  const q = `?_=1${details ? "&details=1" : ""}${venueParam}`
  try {
    const raw = await apiClient.get<Partial<Reconciliation>>(
      `/business/payouts/deposits/${encodeURIComponent(payoutId)}/reconciliation${q}`,
    )
    return normalizeReconciliation(raw)
  } catch (err) {
    if (isNotDeployed(err)) return null
    throw err
  }
}
