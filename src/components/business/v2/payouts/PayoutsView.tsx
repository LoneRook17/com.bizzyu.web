"use client"

import { useState } from "react"
import {
  ChevronDown, Copy, Check, Download, Banknote, AlertTriangle, Truck, Info,
} from "lucide-react"
import { money, cn } from "@/lib/v2/utils"
import { Card } from "@/components/business/v2/ui/card"
import { Badge } from "@/components/business/v2/ui/badge"
import { EmptyState } from "@/components/business/v2/ui/empty-state"
import {
  type PayoutsResponse,
  type Payout,
  type SaleRow,
  type PayoutStatus,
  PAYOUT_RANGE_PRESETS,
  sumRows,
  computePayoutFooting,
  feeCoverageForRows,
  isRefundRow,
  channelLabel,
  buildPayoutsCsv,
  csvFilename,
  downloadCsv,
} from "@/lib/business/payouts"

// ── Range picker (segmented, 90d default) — mirrors DealFunnel's RangePicker ──

export function RangePicker({
  value,
  onChange,
  disabled,
}: {
  value: number
  onChange: (days: number) => void
  disabled?: boolean
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-neutral-50 p-0.5 dark:border-neutral-800 dark:bg-neutral-900">
      {PAYOUT_RANGE_PRESETS.map((p) => (
        <button
          key={p.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(p.value)}
          aria-pressed={value === p.value}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50",
            value === p.value
              ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-neutral-100"
              : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200",
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}

// ── CSV export (anchor-click download, no new deps) ──────────────────────────

export function ExportButton({ data, disabled }: { data: PayoutsResponse | null; disabled?: boolean }) {
  const rowCount =
    (data?.payouts.reduce((n, p) => n + p.rows.length, 0) ?? 0) + (data?.in_transit.rows.length ?? 0)
  const isDisabled = disabled || !data || rowCount === 0

  const onExport = () => {
    if (!data) return
    downloadCsv(csvFilename(data.range), buildPayoutsCsv(data))
  }

  return (
    <button
      type="button"
      onClick={onExport}
      disabled={isDisabled}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800/60",
      )}
    >
      <Download className="size-4" /> Export CSV
    </button>
  )
}

// ── Small pieces ─────────────────────────────────────────────────────────────

function CopyableId({ id }: { id: string }) {
  const [copied, setCopied] = useState(false)
  const short = id.length > 16 ? `${id.slice(0, 10)}…${id.slice(-4)}` : id
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

function fmtDate(iso: string | null): string {
  if (!iso) return "—"
  // Parse as a plain calendar date (the server already localized to US/Eastern).
  const [y, m, d] = iso.split("-").map(Number)
  if (!y || !m || !d) return iso
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

// ── Per-sale detail table (the reconciliation grain) ─────────────────────────

const TH = "py-2 px-2 text-left font-medium whitespace-nowrap"
const TH_R = "py-2 px-2 text-right font-medium whitespace-nowrap"
const TD = "py-2 px-2 whitespace-nowrap text-neutral-700 dark:text-neutral-300"
const TD_R = "py-2 px-2 whitespace-nowrap text-right tabular-nums text-neutral-900 dark:text-neutral-100"

function SaleRowsTable({ rows }: { rows: SaleRow[] }) {
  const totals = sumRows(rows)
  const feeLabel = feeCoverageForRows(rows)

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[880px] text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-xs text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
            <th className={TH}>Channel</th>
            <th className={TH}>Event</th>
            <th className={TH}>Tier</th>
            <th className={TH_R}>Qty</th>
            <th className={TH}>Buyer</th>
            <th className={TH_R}>Order</th>
            <th className={TH_R}>Gross</th>
            <th className={TH_R}>Platform fee</th>
            <th className={TH_R}>Commission</th>
            <th className={TH_R}>Host net</th>
            <th className={cn(TH_R, "text-neutral-400 dark:text-neutral-500")}>
              Stripe fee{feeLabel ? ` ${feeLabel}` : ""}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const refund = isRefundRow(r)
            return (
              <tr
                key={`${r.payment_intent_id ?? "row"}-${i}`}
                className={cn(
                  "border-b border-neutral-100 last:border-0 dark:border-neutral-800",
                  refund && "bg-red-50/50 dark:bg-red-950/20",
                )}
              >
                <td className={cn(TD, refund && "font-medium text-red-700 dark:text-red-400")}>
                  {channelLabel(r.sale_channel)}
                </td>
                <td className={TD}>{r.event ?? "—"}</td>
                <td className={TD}>{r.ticket_tier ?? "—"}</td>
                <td className={cn(TD_R, refund && "text-red-700 dark:text-red-400")}>{r.quantity}</td>
                <td className={TD}>{r.buyer ?? <span className="text-neutral-400 dark:text-neutral-500">—</span>}</td>
                <td className={TD_R}>{r.order_id ?? "—"}</td>
                <td className={cn(TD_R, refund && "text-red-700 dark:text-red-400")}>{money(r.gross_charged_cents)}</td>
                <td className={cn(TD_R, refund && "text-red-700 dark:text-red-400")}>{money(r.platform_fee_cents)}</td>
                <td className={TD_R}>{money(r.promoter_commission_cents)}</td>
                <td className={cn(TD_R, "font-semibold", refund && "text-red-700 dark:text-red-400")}>
                  {money(r.host_net_cents)}
                </td>
                <td className={cn(TD_R, "text-neutral-400 dark:text-neutral-500")}>
                  {r.stripe_processing_fee_cents == null ? (
                    "—"
                  ) : (
                    <span title={r.stripe_processing_fee_is_actual ? "Actual Stripe fee" : "Estimated Stripe fee"}>
                      {money(r.stripe_processing_fee_cents)}
                      {!r.stripe_processing_fee_is_actual && <span className="ml-0.5 text-[10px]">est.</span>}
                    </span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-neutral-300 font-semibold dark:border-neutral-600">
            <td className={cn(TD, "font-semibold text-neutral-900 dark:text-neutral-100")} colSpan={3}>
              Subtotal
            </td>
            <td className={TD_R}>{totals.quantity}</td>
            <td className={TD} colSpan={2} />
            <td className={TD_R}>{money(totals.gross_charged_cents)}</td>
            <td className={TD_R}>{money(totals.platform_fee_cents)}</td>
            <td className={TD_R}>{money(totals.promoter_commission_cents)}</td>
            <td className={TD_R}>{money(totals.host_net_cents)}</td>
            <td className={cn(TD_R, "text-neutral-400 dark:text-neutral-500")}>
              {money(totals.stripe_processing_fee_cents)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

// ── Payout card (collapsed row → expand to the reconciliation table) ──────────

function PayoutCard({ payout }: { payout: Payout }) {
  const [open, setOpen] = useState(false)
  const footing = computePayoutFooting(payout)
  const foots = payout.foots && footing.footsExactly

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {fmtDate(payout.payout_date)}
            </span>
            <StatusChip status={payout.status} />
            <CopyableId id={payout.stripe_payout_id} />
          </div>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            {payout.ticket_count} {payout.ticket_count === 1 ? "sale" : "sales"}
            {!foots && (
              <span className="ml-2 inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="size-3" /> doesn&apos;t foot ({money(footing.deltaCents)})
              </span>
            )}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{money(payout.payout_total_cents)}</p>
          <p className="text-[11px] text-neutral-400 dark:text-neutral-500">deposited</p>
        </div>
        <ChevronDown className={cn("size-4 shrink-0 text-neutral-400 transition-transform dark:text-neutral-500", open && "rotate-180")} />
      </button>

      {open && (
        <div className="border-t border-neutral-100 bg-neutral-50/60 p-4 dark:border-neutral-800 dark:bg-neutral-800/40">
          {payout.rows.length === 0 ? (
            <p className="py-3 text-center text-sm text-neutral-400 dark:text-neutral-500">No line items resolved for this payout.</p>
          ) : (
            <SaleRowsTable rows={payout.rows} />
          )}
        </div>
      )}
    </Card>
  )
}

// ── Sections ─────────────────────────────────────────────────────────────────

function FailedBanner({ payouts }: { payouts: Payout[] }) {
  const failed = payouts.filter((p) => p.status === "failed")
  if (failed.length === 0) return null
  return (
    <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3.5 dark:border-red-900 dark:bg-red-950/40">
      <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-600 dark:text-red-400" />
      <div className="text-sm">
        <p className="font-semibold text-red-800 dark:text-red-300">
          {failed.length} failed payout{failed.length === 1 ? "" : "s"}
        </p>
        <p className="mt-0.5 text-red-700 dark:text-red-400">
          A deposit Stripe attempted didn&apos;t reach your bank. Check your bank details in Stripe — these funds are still yours and will retry.
        </p>
      </div>
    </div>
  )
}

function InTransitSection({ data }: { data: PayoutsResponse }) {
  const { in_transit } = data
  if (in_transit.rows.length === 0 && in_transit.host_net_cents === 0) return null
  return (
    <Card className="overflow-hidden border-blue-200 dark:border-blue-900">
      <div className="flex items-center gap-3 border-b border-blue-100 bg-blue-50/60 px-4 py-3 dark:border-blue-900/60 dark:bg-blue-950/30">
        <Truck className="size-4 text-blue-600 dark:text-blue-400" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">On its way to your bank</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Sales collected but not yet deposited · {in_transit.ticket_count} {in_transit.ticket_count === 1 ? "sale" : "sales"}
          </p>
        </div>
        <p className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{money(in_transit.host_net_cents)}</p>
      </div>
      {in_transit.rows.length > 0 && (
        <div className="p-4">
          <SaleRowsTable rows={in_transit.rows} />
        </div>
      )}
    </Card>
  )
}

// ── Zero / degrade states (never an error wall) ──────────────────────────────

/** Endpoint not deployed yet (P-B1 not live) → graceful degrade, not an error. */
export function PayoutsDegraded() {
  return (
    <EmptyState
      icon={Info}
      title="Payout reconciliation is coming soon"
      description="Detailed payout breakdowns aren't available yet. Your deposits still land in your bank on Stripe's normal schedule — this tab will show exactly what each one paid for once it's live."
    />
  )
}

/** Range returned no payouts — friendly zero-state. */
export function PayoutsEmpty() {
  return (
    <EmptyState
      icon={Banknote}
      title="No payouts in this range"
      description="Once you make sales and Stripe deposits them, each payout will appear here — broken down to the exact tickets and refunds inside it. Try widening the date range."
    />
  )
}

// ── Body ─────────────────────────────────────────────────────────────────────

export default function PayoutsView({ data }: { data: PayoutsResponse }) {
  const hasAny = data.payouts.length > 0 || data.in_transit.rows.length > 0 || data.in_transit.host_net_cents > 0
  if (!hasAny) return <PayoutsEmpty />

  return (
    <div className="space-y-4">
      <FailedBanner payouts={data.payouts} />
      <InTransitSection data={data} />
      {data.payouts.length > 0 && (
        <div className="space-y-3">
          {data.payouts.map((p) => (
            <PayoutCard key={p.stripe_payout_id || `${p.payout_date}-${p.payout_total_cents}`} payout={p} />
          ))}
        </div>
      )}
      {!data.summary.all_foot && data.payouts.length > 0 && (
        <p className="px-1 text-xs text-amber-600 dark:text-amber-400">
          <AlertTriangle className="mr-1 inline size-3" />
          Some payouts don&apos;t foot to the penny. Expand them to see the discrepancy — this usually means a sale is still resolving.
        </p>
      )}
    </div>
  )
}
