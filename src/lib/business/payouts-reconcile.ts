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
//   GET /business/payouts/summary?days=N
//     -> { deposited_cents, in_transit_cents, refunded_cents }
//   GET /business/payouts/deposits?days=N
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

import {
  type PayoutStatus,
  centsToUsdStr,
  downloadCsv,
  isNotDeployed,
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

/** Period totals for the summary strip. */
export interface PayoutsSummary {
  deposited_cents: number
  in_transit_cents: number
  refunded_cents: number
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

export function normalizeSummary(raw: Partial<PayoutsSummary> | null | undefined): PayoutsSummary {
  const r = raw ?? {}
  return {
    deposited_cents: num(r.deposited_cents),
    in_transit_cents: num(r.in_transit_cents),
    refunded_cents: num(r.refunded_cents),
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
  }
}

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

// ── Fetch (degrade to null on 404 — endpoint not deployed yet) ───────────────

/** Days → the query the three endpoints share (`?days=N` + venue scope). */
export function reconcileQuery(days: number, venueParam = ""): string {
  return `?days=${encodeURIComponent(days)}${venueParam}`
}

export async function fetchPayoutsSummary(params: {
  days: number
  venueParam?: string
}): Promise<PayoutsSummary | null> {
  const { apiClient } = await import("./api-client")
  try {
    const raw = await apiClient.get<Partial<PayoutsSummary>>(
      `/business/payouts/summary${reconcileQuery(params.days, params.venueParam)}`,
    )
    return normalizeSummary(raw)
  } catch (err) {
    if (isNotDeployed(err)) return null
    throw err
  }
}

export async function fetchDeposits(params: {
  days: number
  venueParam?: string
}): Promise<DepositListItem[] | null> {
  const { apiClient } = await import("./api-client")
  try {
    const raw = await apiClient.get<unknown>(
      `/business/payouts/deposits${reconcileQuery(params.days, params.venueParam)}`,
    )
    return normalizeDeposits(raw)
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
