"use client"

// P2-B1w — the accountant reconciliation view. Reconciliation-first layout:
// summary strip → slim in-transit banner → the deposits list (backbone) → a
// per-deposit reconciliation panel that ties each Stripe deposit to the tickets
// and refunds inside it. Owner / global-manager surface only; venue-scoped
// members get the existing scoped view (see payouts/page.tsx).
//
// Data comes from the P2-B1s contract via the typed client (payouts-reconcile.ts).
// The panel lazy-loads each deposit's reconciliation on expand; ticket-level
// details (the only rows carrying buyer PII) are fetched ONLY when the details
// toggle is switched on — so the default view can never leak PII.

import { useCallback, useEffect, useState } from "react"
import {
  ChevronDown, Copy, Check, Download, FileText, ArrowDownToLine,
  Truck, RotateCcw, Banknote, AlertTriangle, Loader2,
} from "lucide-react"
import { money, cn } from "@/lib/v2/utils"
import { Card } from "@/components/business/v2/ui/card"
import { Badge } from "@/components/business/v2/ui/badge"
import { EmptyState } from "@/components/business/v2/ui/empty-state"
import {
  type PayoutStatus,
  type PayoutsSummary,
  type DepositListItem,
  type Reconciliation,
  type ReconOrderRow,
  fetchReconciliation,
  tiesCheck,
  netLineParts,
  visibleOrderRows,
  shortPayoutId,
  channelLabel,
  buildDepositCsv,
  depositExportFilename,
  downloadCsv,
  exportDepositPdf,
} from "@/lib/business/payouts-reconcile"

// ── Small shared pieces ──────────────────────────────────────────────────────

function fmtDate(iso: string | null): string {
  if (!iso) return "—"
  // Plain calendar date — the server already localized to US/Eastern.
  const [y, m, d] = iso.split("-").map(Number)
  if (!y || !m || !d) return iso
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

const STATUS_BADGE: Record<PayoutStatus, { variant: "success" | "info" | "warning" | "danger"; label: string }> = {
  paid: { variant: "success", label: "Paid" },
  in_transit: { variant: "info", label: "In transit" },
  pending: { variant: "warning", label: "Pending" },
  failed: { variant: "danger", label: "Failed" },
}

function StatusChip({ status }: { status: PayoutStatus }) {
  const b = STATUS_BADGE[status] ?? STATUS_BADGE.paid
  return <Badge variant={b.variant} size="sm">{b.label}</Badge>
}

function CopyableId({ id }: { id: string }) {
  const [copied, setCopied] = useState(false)
  const short = shortPayoutId(id)
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(id)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      window.prompt("Copy this payout id:", id)
    }
  }
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onCopy()
      }}
      title={`Copy ${id}`}
      className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-1.5 py-0.5 font-mono text-[11px] text-neutral-600 transition-colors hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700"
    >
      {short}
      {copied ? <Check className="size-3 text-green-600 dark:text-green-400" /> : <Copy className="size-3" />}
    </button>
  )
}

// ── 2. Summary strip ─────────────────────────────────────────────────────────

function SummaryTile({
  icon: Icon,
  label,
  cents,
  tone,
}: {
  icon: React.ElementType
  label: string
  cents: number
  tone: "green" | "blue" | "red"
}) {
  const toneCls = {
    green: "text-green-600 dark:text-green-400",
    blue: "text-blue-600 dark:text-blue-400",
    red: "text-red-600 dark:text-red-400",
  }[tone]
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
        <Icon className={cn("size-4", toneCls)} />
        {label}
      </div>
      <p className="mt-1.5 text-2xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
        {money(cents)}
      </p>
    </Card>
  )
}

export function SummaryStrip({ summary }: { summary: PayoutsSummary }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <SummaryTile icon={ArrowDownToLine} label="Deposited" cents={summary.deposited_cents} tone="green" />
      <SummaryTile icon={Truck} label="In transit" cents={summary.in_transit_cents} tone="blue" />
      <SummaryTile icon={RotateCcw} label="Refunded" cents={summary.refunded_cents} tone="red" />
    </div>
  )
}

// ── 3. In-transit slim banner (secondary; click-to-expand) ───────────────────

export function InTransitBanner({ cents }: { cents: number }) {
  const [open, setOpen] = useState(false)
  if (cents <= 0) return null
  return (
    <Card className="overflow-hidden border-blue-100 dark:border-blue-950">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-blue-50/40 dark:hover:bg-blue-950/20"
      >
        <Truck className="size-4 shrink-0 text-blue-500 dark:text-blue-400" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-neutral-700 dark:text-neutral-300">
            <span className="font-medium text-neutral-900 dark:text-neutral-100">On its way to your bank</span>
            <span className="hidden text-neutral-500 dark:text-neutral-400 sm:inline"> — collected, not yet deposited</span>
          </p>
        </div>
        <span className="shrink-0 text-sm font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">{money(cents)}</span>
        <ChevronDown className={cn("size-4 shrink-0 text-neutral-400 transition-transform dark:text-neutral-500", open && "rotate-180")} />
      </button>
      {open && (
        <div className="border-t border-blue-100 bg-blue-50/40 px-4 py-3 text-xs leading-relaxed text-neutral-600 dark:border-blue-950 dark:bg-blue-950/20 dark:text-neutral-400">
          This is money already collected from buyers that Stripe hasn&apos;t deposited into your bank yet. It moves on
          Stripe&apos;s normal payout schedule (typically 2 business days) and will appear as a new deposit below once it
          lands — at which point you&apos;ll be able to reconcile it here to the exact tickets inside it.
        </div>
      )}
    </Card>
  )
}

// ── 5. Reconciliation panel (grouped line items + net line + actions) ─────────

const TH = "py-2 px-2 text-left font-medium whitespace-nowrap"
const TH_R = "py-2 px-2 text-right font-medium whitespace-nowrap"
const TD = "py-2 px-2 whitespace-nowrap text-neutral-700 dark:text-neutral-300"
const TD_R = "py-2 px-2 whitespace-nowrap text-right tabular-nums text-neutral-900 dark:text-neutral-100"

function TiesBanner({ recon }: { recon: Reconciliation }) {
  const t = tiesCheck(recon)
  if (t.ties) {
    return (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm dark:border-green-900 dark:bg-green-950/40">
        <Check className="size-4 shrink-0 text-green-600 dark:text-green-400" />
        <span className="font-semibold text-green-800 dark:text-green-300">Ties to Stripe deposit</span>
        <CopyableId id={recon.payout_id} />
        <span className="text-green-700/80 dark:text-green-400/80">· arrived {fmtDate(recon.arrival_date)}</span>
      </div>
    )
  }
  return (
    <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm dark:border-red-900 dark:bg-red-950/40">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-600 dark:text-red-400" />
      <div>
        <p className="font-semibold text-red-800 dark:text-red-300">
          Doesn&apos;t tie to the Stripe deposit — off by {money(Math.abs(t.deltaCents))}
        </p>
        <p className="mt-0.5 text-red-700 dark:text-red-400">
          The tickets and refunds we resolved sum to {money(recon.computed_total_cents)}, but Stripe deposited{" "}
          {money(recon.amount_cents)}. This usually means a sale is still settling — don&apos;t book against this figure
          until it resolves.
        </p>
      </div>
    </div>
  )
}

function LineItems({ recon }: { recon: Reconciliation }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-xs text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
            <th className={TH}>Event / tier</th>
            <th className={TH_R}>Qty</th>
            <th className={TH_R}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {recon.events.map((ev, ei) => (
            <ReconEventGroup key={ev.event_id ?? `ev-${ei}`} event={ev} />
          ))}
          <tr className="border-t border-neutral-200 dark:border-neutral-700">
            <td className={cn(TD, "font-medium text-neutral-900 dark:text-neutral-100")}>Door covers</td>
            <td className={TD_R} />
            <td className={TD_R}>{money(recon.door_covers_cents)}</td>
          </tr>
          {recon.refunds_cents !== 0 && (
            <tr>
              <td className={cn(TD, "font-medium text-red-700 dark:text-red-400")}>Refunds</td>
              <td className={TD_R} />
              <td className={cn(TD_R, "text-red-700 dark:text-red-400")}>−{money(Math.abs(recon.refunds_cents))}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function ReconEventGroup({ event }: { event: Reconciliation["events"][number] }) {
  return (
    <>
      <tr className="border-t border-neutral-100 bg-neutral-50/60 dark:border-neutral-800 dark:bg-neutral-800/30">
        <td className={cn(TD, "font-semibold text-neutral-900 dark:text-neutral-100")}>
          {event.name ?? "—"}
          {event.date && <span className="ml-2 text-xs font-normal text-neutral-400 dark:text-neutral-500">{fmtDate(event.date)}</span>}
        </td>
        <td className={TD_R} />
        <td className={cn(TD_R, "font-semibold")}>{money(event.subtotal_cents)}</td>
      </tr>
      {event.tiers.map((t, ti) => (
        <tr key={`${t.tier_name}-${ti}`} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
          <td className={cn(TD, "pl-6 text-neutral-600 dark:text-neutral-400")}>{t.tier_name}</td>
          <td className={TD_R}>{t.qty}</td>
          <td className={TD_R}>{money(t.amount_cents)}</td>
        </tr>
      ))}
    </>
  )
}

function NetLine({ recon }: { recon: Reconciliation }) {
  const n = netLineParts(recon.net)
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm dark:border-neutral-800 dark:bg-neutral-800/40">
      <p className="font-medium text-neutral-700 dark:text-neutral-300">
        Ticket sales <span className="font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">{money(n.ticketSalesCents)}</span>
        {" + "}Door covers <span className="font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">{money(n.doorCoversCents)}</span>
        {" − "}Refunds <span className="font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">{money(n.refundsCents)}</span>
        {" = "}Deposited <span className="font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">{money(n.depositedCents)}</span>
      </p>
    </div>
  )
}

// ── 6. Ticket-level details table (operational; NO PII in default view) ───────

function DetailsTable({ rows }: { rows: ReconOrderRow[] }) {
  if (rows.length === 0) {
    return <p className="py-3 text-center text-sm text-neutral-400 dark:text-neutral-500">No order-level rows for this deposit.</p>
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-xs text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
            <th className={TH}>Channel</th>
            <th className={TH}>Buyer</th>
            <th className={TH_R}>Order</th>
            <th className={TH_R}>Platform fee</th>
            <th className={TH_R}>Commission</th>
            <th className={TH_R}>Host net</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((o, i) => (
            <tr key={`${o.order_id ?? "row"}-${i}`} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
              <td className={TD}>{channelLabel(o.channel)}</td>
              <td className={TD}>{o.buyer_email ?? <span className="text-neutral-400 dark:text-neutral-500">—</span>}</td>
              <td className={TD_R}>{o.order_id ?? "—"}</td>
              <td className={TD_R}>{money(o.platform_fee_cents)}</td>
              <td className={TD_R}>{money(o.commission_cents)}</td>
              <td className={cn(TD_R, "font-semibold")}>{money(o.host_net_cents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PanelAction({
  icon: Icon,
  label,
  onClick,
  pressed,
  busy,
}: {
  icon: React.ElementType
  label: string
  onClick: () => void
  pressed?: boolean
  busy?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50",
        pressed
          ? "border-[#05EB54] bg-[#05EB54]/10 text-neutral-900 dark:text-neutral-100"
          : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800/60",
      )}
    >
      {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Icon className="size-3.5" />}
      {label}
    </button>
  )
}

/** Presentational reconciliation body — ties banner, grouped line items, net
 *  line, per-deposit actions, and the PII-gated details table. Given a fully
 *  loaded `recon`; the ticket-level details (buyer PII) are revealed only when
 *  the toggle is on, and fetched lazily via `loadDetails` the first time. */
export function ReconciliationPanelView({
  recon,
  loadDetails,
  initialShowDetails = false,
}: {
  recon: Reconciliation
  /** Fetches the details=1 variant (buyer PII). Omitted → toggle just reveals
   *  whatever `recon.orders` already holds (used by the static harness). */
  loadDetails?: () => Promise<Reconciliation | null>
  initialShowDetails?: boolean
}) {
  const [current, setCurrent] = useState<Reconciliation>(recon)
  const [showDetails, setShowDetails] = useState(initialShowDetails)
  const [detailsLoading, setDetailsLoading] = useState(false)

  const toggleDetails = useCallback(async () => {
    if (showDetails) {
      setShowDetails(false)
      return
    }
    // Fetch the details variant (buyer PII) ONLY now — never for the default view.
    if (current.orders == null && loadDetails) {
      setDetailsLoading(true)
      try {
        const withDetails = await loadDetails()
        if (withDetails) setCurrent(withDetails)
      } catch {
        // Non-fatal: leave details off if it fails.
        setDetailsLoading(false)
        return
      }
      setDetailsLoading(false)
    }
    setShowDetails(true)
  }, [showDetails, current, loadDetails])

  const rows = visibleOrderRows(current, showDetails)
  const onCsv = () => downloadCsv(depositExportFilename(current, "csv"), buildDepositCsv(current))
  const onPdf = () => exportDepositPdf(current)

  return (
    <div className="space-y-3">
      <TiesBanner recon={current} />
      <LineItems recon={current} />
      <NetLine recon={current} />

      <div className="flex flex-wrap items-center gap-2">
        <PanelAction icon={Download} label="Export CSV" onClick={onCsv} />
        <PanelAction icon={FileText} label="Export PDF" onClick={onPdf} />
        <PanelAction
          icon={ChevronDown}
          label={showDetails ? "Hide ticket-level details" : "Show ticket-level details"}
          onClick={toggleDetails}
          pressed={showDetails}
          busy={detailsLoading}
        />
      </div>

      {showDetails && (
        <div className="rounded-lg border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
          <DetailsTable rows={rows} />
        </div>
      )}
    </div>
  )
}

/** Data-fetching wrapper: lazy-loads a deposit's reconciliation on mount (i.e.
 *  when the row is expanded), then hands it to the presentational view. */
function ReconciliationPanel({ payoutId, venueParam }: { payoutId: string; venueParam?: string }) {
  const [recon, setRecon] = useState<Reconciliation | null>(null)
  const [loading, setLoading] = useState(true)
  const [errored, setErrored] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setErrored(false)
    try {
      const r = await fetchReconciliation({ payoutId, venueParam })
      if (r === null) setErrored(true)
      else setRecon(r)
    } catch {
      setErrored(true)
    } finally {
      setLoading(false)
    }
  }, [payoutId, venueParam])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-6 text-sm text-neutral-400 dark:text-neutral-500">
        <Loader2 className="size-4 animate-spin" /> Reconciling this deposit…
      </div>
    )
  }
  if (errored || !recon) {
    return (
      <p className="py-4 text-center text-sm text-neutral-400 dark:text-neutral-500">
        Couldn&apos;t load the breakdown for this deposit.{" "}
        <button type="button" onClick={load} className="font-medium text-[#05EB54] hover:underline">
          Retry
        </button>
      </p>
    )
  }

  return (
    <ReconciliationPanelView
      recon={recon}
      loadDetails={() => fetchReconciliation({ payoutId, details: true, venueParam })}
    />
  )
}

// ── 4. Deposit row (the backbone) ────────────────────────────────────────────

function DepositRow({ deposit, venueParam }: { deposit: DepositListItem; venueParam?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{fmtDate(deposit.arrival_date)}</span>
            <StatusChip status={deposit.status} />
            <CopyableId id={deposit.payout_id} />
          </div>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            {deposit.sales_count} {deposit.sales_count === 1 ? "sale" : "sales"}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-base font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">{money(deposit.amount_cents)}</p>
          <p className="text-[11px] text-neutral-400 dark:text-neutral-500">deposited</p>
        </div>
        <ChevronDown className={cn("size-4 shrink-0 text-neutral-400 transition-transform dark:text-neutral-500", open && "rotate-180")} />
      </button>
      {open && (
        <div className="border-t border-neutral-100 bg-neutral-50/60 p-4 dark:border-neutral-800 dark:bg-neutral-800/40">
          <ReconciliationPanel payoutId={deposit.payout_id} venueParam={venueParam} />
        </div>
      )}
    </Card>
  )
}

// ── Body ─────────────────────────────────────────────────────────────────────

export function ReconcileEmpty() {
  return (
    <EmptyState
      icon={Banknote}
      title="No deposits in this range"
      description="Once you make sales and Stripe deposits them, each payout appears here — broken down to the exact tickets and refunds inside it. Try widening the date range."
    />
  )
}

export default function ReconcileView({
  summary,
  deposits,
  venueParam,
}: {
  summary: PayoutsSummary
  deposits: DepositListItem[]
  venueParam?: string
}) {
  const hasAny = deposits.length > 0 || summary.deposited_cents > 0 || summary.in_transit_cents > 0

  return (
    <div className="space-y-4">
      <SummaryStrip summary={summary} />
      <InTransitBanner cents={summary.in_transit_cents} />
      {deposits.length > 0 ? (
        <div className="space-y-3">
          {deposits.map((d) => (
            <DepositRow key={d.payout_id || `${d.arrival_date}-${d.amount_cents}`} deposit={d} venueParam={venueParam} />
          ))}
        </div>
      ) : hasAny ? (
        <p className="px-1 text-sm text-neutral-500 dark:text-neutral-400">
          No individual deposits landed in this range yet — check back once Stripe deposits your collected sales.
        </p>
      ) : (
        <ReconcileEmpty />
      )}
    </div>
  )
}
