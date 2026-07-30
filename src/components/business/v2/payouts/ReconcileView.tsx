"use client"

// P2-B1w — the accountant reconciliation view. Reconciliation-first layout:
// summary strip → slim in-transit banner → the deposits list (backbone) → a
// per-deposit reconciliation panel that ties each Stripe deposit to the tickets
// and refunds inside it. Owner-only surface (TF-B ruling — see payouts/page.tsx);
// every other role is gated out before this view ever renders.
//
// Data comes from the P2-B1s contract via the typed client (payouts-reconcile.ts).
// The panel lazy-loads each deposit's reconciliation on expand; ticket-level
// details (the only rows carrying buyer PII) are fetched ONLY when the details
// toggle is switched on — so the default view can never leak PII.

import { useCallback, useEffect, useState } from "react"
import {
  ChevronDown, Copy, Check, Download, FileText, ArrowDownToLine,
  Truck, RotateCcw, Banknote, AlertTriangle, Loader2, MapPin,
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
  type PayoutsWindow,
  PAYOUT_RANGE_PRESETS,
  fetchReconciliation,
  tiesCheck,
  netLineParts,
  visibleOrderRows,
  showCommissionColumn,
  shortPayoutId,
  buildDepositCsv,
  depositExportFilename,
  downloadCsv,
  exportDepositPdf,
  summaryRenderState,
  summaryTilesFor,
  sharedAccountCaveat,
  dedicatedReassurance,
  depositRowView,
  visibleDeposits,
  allVenueRowsHidden,
  venueShareLabel,
  depositContextLabel,
  venueEmptyDepositsCopy,
  customWindow,
  buildBreakdownTable,
  showBreakdownTable,
  signedMoneyStr,
  freshnessLabel,
  REFRESHING_LABEL,
  type BreakdownTable,
  VENUE_TILE_LABELS,
  COMBINED_ACCOUNT_LABEL,
  DEDICATED_BADGE_LABEL,
  IN_TRANSIT_PAST_UNTIL_NOTE,
  BREAKDOWN_METRIC_LABELS,
  THIS_VENUE_BADGE_LABEL,
  NEGATIVE_UNALLOCATED_NOTE,
  BREAKDOWN_MISMATCH_WARNING,
} from "@/lib/business/payouts-reconcile"

// ── Range picker (segmented, 90d default) — mirrors DealFunnel's RangePicker ──
// Relocated here from the removed PayoutsView; the owner reconcile container is
// its only consumer now. TF-PAYOUTS-SUMMARY-F1 adds a "Custom" mode: selecting
// it reveals start/end date inputs; Apply emits a since/until window (the /list
// convention) that the summary, deposits, and CSV export all honor. Preset
// behavior is unchanged when Custom isn't selected.

const SEGMENT_BTN = "rounded-md px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50"
const SEGMENT_ON = "bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-neutral-100"
const SEGMENT_OFF = "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
const DATE_INPUT =
  "rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:[color-scheme:dark]"

export function RangePicker({
  value,
  onChange,
  disabled,
}: {
  value: PayoutsWindow
  onChange: (window: PayoutsWindow) => void
  disabled?: boolean
}) {
  const isCustom = value.kind === "custom"
  // Custom mode can be OPEN (inputs showing) before a valid range is APPLIED —
  // the active window stays the last preset until Apply, so nothing refetches
  // on a half-typed range.
  const [customOpen, setCustomOpen] = useState(isCustom)
  const [since, setSince] = useState(isCustom ? value.since : "")
  const [until, setUntil] = useState(isCustom ? value.until : "")
  const draft = customWindow(since, until)
  const applied = isCustom && value.since === since && value.until === until

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-neutral-50 p-0.5 dark:border-neutral-800 dark:bg-neutral-900">
        {PAYOUT_RANGE_PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            disabled={disabled}
            onClick={() => {
              setCustomOpen(false)
              onChange({ kind: "days", days: p.value })
            }}
            aria-pressed={!customOpen && value.kind === "days" && value.days === p.value}
            className={cn(
              SEGMENT_BTN,
              !customOpen && value.kind === "days" && value.days === p.value ? SEGMENT_ON : SEGMENT_OFF,
            )}
          >
            {p.label}
          </button>
        ))}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setCustomOpen(true)}
          aria-pressed={customOpen || isCustom}
          className={cn(SEGMENT_BTN, customOpen || isCustom ? SEGMENT_ON : SEGMENT_OFF)}
        >
          Custom
        </button>
      </div>
      {customOpen && (
        <div className="flex flex-wrap items-center gap-1.5">
          <input
            type="date"
            aria-label="Start date"
            value={since}
            max={until || undefined}
            disabled={disabled}
            onChange={(e) => setSince(e.target.value)}
            className={DATE_INPUT}
          />
          <span className="text-xs text-neutral-400 dark:text-neutral-500">to</span>
          <input
            type="date"
            aria-label="End date"
            value={until}
            min={since || undefined}
            disabled={disabled}
            onChange={(e) => setUntil(e.target.value)}
            className={DATE_INPUT}
          />
          <button
            type="button"
            disabled={disabled || !draft || applied}
            onClick={() => draft && onChange(draft)}
            className="rounded-md bg-[#05EB54] px-2.5 py-1 text-xs font-semibold text-neutral-900 transition-colors hover:brightness-95 disabled:opacity-50"
          >
            {applied ? "Applied" : "Apply"}
          </button>
        </div>
      )}
    </div>
  )
}

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
  note,
}: {
  icon: React.ElementType
  label: string
  cents: number
  tone: "green" | "blue" | "red"
  /** Small clarity subtext under the figure (e.g. the past-until in-transit note). */
  note?: string
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
      {note && <p className="mt-1 text-[11px] leading-snug text-neutral-400 dark:text-neutral-500">{note}</p>}
    </Card>
  )
}

/** TF-PAYOUTS-RECONCILE — the itemized reconciliation that makes the combined
 *  account VISIBLY FOOT: one row per venue slice (server order), the unallocated
 *  remainder, then the combined total, across all three metrics. Negative
 *  unallocated cells render as-is (clamping would break the footing) with a
 *  note explaining them. */
function BreakdownTableView({ table }: { table: BreakdownTable }) {
  const CELL = "py-1.5 pl-3 text-right tabular-nums whitespace-nowrap"
  return (
    <div className="mt-2">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[380px] text-xs">
          <thead>
            <tr className="border-b border-neutral-200 text-[11px] text-neutral-400 dark:border-neutral-700 dark:text-neutral-500">
              <th className="py-1.5 pr-2 text-left font-medium">Venue</th>
              <th className={cn(CELL, "font-medium")}>{BREAKDOWN_METRIC_LABELS.deposited}</th>
              <th className={cn(CELL, "font-medium")}>{BREAKDOWN_METRIC_LABELS.in_transit}</th>
              <th className={cn(CELL, "font-medium")}>{BREAKDOWN_METRIC_LABELS.refunded}</th>
            </tr>
          </thead>
          <tbody>
            {table.rows.map((r, i) => (
              <tr
                key={r.venue_id ?? r.kind}
                data-breakdown-row={r.kind}
                data-venue-id={r.venue_id ?? undefined}
                data-this-venue={r.isThisVenue || undefined}
                className={cn(
                  "text-neutral-600 dark:text-neutral-300",
                  i > 0 && "border-t border-neutral-100 dark:border-neutral-800",
                  r.kind === "total" &&
                    "border-t border-neutral-300 font-semibold text-neutral-900 dark:border-neutral-600 dark:text-neutral-100",
                  r.isThisVenue && "font-medium text-neutral-900 dark:text-neutral-100",
                )}
              >
                <td className="py-1.5 pr-2 text-left">
                  {r.label}
                  {r.isThisVenue && (
                    <span className="ml-1.5 inline-flex items-center rounded-full border border-green-300 bg-green-50 px-1.5 py-px text-[10px] font-semibold text-green-800 dark:border-green-800 dark:bg-green-950/60 dark:text-green-300">
                      {THIS_VENUE_BADGE_LABEL}
                    </span>
                  )}
                </td>
                <td className={CELL}>{signedMoneyStr(r.deposited_cents)}</td>
                <td className={CELL}>{signedMoneyStr(r.in_transit_cents)}</td>
                <td className={CELL}>{signedMoneyStr(r.refunded_cents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {table.hasNegativeUnallocated && (
        <p className="mt-1.5 text-[11px] leading-snug text-neutral-400 dark:text-neutral-500">
          {NEGATIVE_UNALLOCATED_NOTE}
        </p>
      )}
      {!table.foots && (
        <p className="mt-1.5 flex items-start gap-1 text-[11px] leading-snug text-amber-700 dark:text-amber-400">
          <AlertTriangle className="mt-px size-3 shrink-0" />
          {BREAKDOWN_MISMATCH_WARNING}
        </p>
      )}
    </div>
  )
}

/** The de-emphasized account-level block for the SHARED state. The account trio
 *  is a SUPERSET (the Stripe connected account commingles other venues'
 *  deposits) — never "this venue's deposits". With the :198 breakdown contract
 *  it itemizes exactly where the account totals come from (each venue +
 *  unallocated = total, per metric); against an older server it degrades to the
 *  original trio line + "Also includes deposits for" caveat. */
function CombinedAccountLine({ summary, venueId }: { summary: PayoutsSummary; venueId?: number }) {
  const table = buildBreakdownTable(summary, venueId)
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900/60">
      <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{COMBINED_ACCOUNT_LABEL}</p>
      {table ? (
        <BreakdownTableView table={table} />
      ) : (
        <>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
            Deposited <span className="font-semibold tabular-nums">{money(summary.deposited_cents)}</span>
            {" · "}In transit <span className="font-semibold tabular-nums">{money(summary.in_transit_cents)}</span>
            {" · "}Refunded <span className="font-semibold tabular-nums">{money(summary.refunded_cents)}</span>
          </p>
          {summary.shared_with_venues.length > 0 && (
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              {sharedAccountCaveat(summary.shared_with_venues)}
            </p>
          )}
        </>
      )}
    </div>
  )
}

/** DEDICATED state reassurance: this venue's Stripe account holds no other
 *  venue's money, so the one set of figures above is both the account AND the
 *  venue — say so explicitly. */
function DedicatedAccountLine({ venueName }: { venueName?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 dark:border-green-900 dark:bg-green-950/40">
      <span className="inline-flex items-center rounded-full border border-green-300 bg-white px-2 py-0.5 text-xs font-semibold text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-300">
        {DEDICATED_BADGE_LABEL}
      </span>
      <p className="text-sm text-green-800 dark:text-green-300">{dedicatedReassurance(venueName)}</p>
    </div>
  )
}

export function SummaryStrip({
  summary,
  venueName,
  venueId,
  untilInPast,
}: {
  summary: PayoutsSummary
  venueName?: string
  /** The selected venue's id — marks its row in the breakdown table. */
  venueId?: number
  /** Custom window with `until` before today → in-transit clarity note. */
  untilInPast?: boolean
}) {
  const state = summaryRenderState(summary)
  const inTransitNote = untilInPast ? IN_TRANSIT_PAST_UNTIL_NOTE : undefined

  // ALL-VENUES (hard regression gate): the pre-fix account-level strip, unchanged.
  if (state === "all_venues") {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryTile icon={ArrowDownToLine} label="Deposited" cents={summary.deposited_cents} tone="green" />
        <SummaryTile icon={Truck} label="In transit" cents={summary.in_transit_cents} tone="blue" note={inTransitNote} />
        <SummaryTile icon={RotateCcw} label="Refunded" cents={summary.refunded_cents} tone="red" />
      </div>
    )
  }

  // Which trio the tiles show is the lib's call (summaryTilesFor): the venue's
  // attributed share when SHARED; the account trio when DEDICATED — a dedicated
  // account's deposits are all this venue's, and that figure ties to the deposit
  // rows below (the attributed trio can read 0 when the venue's events are
  // tagged elsewhere, which would contradict the reassurance sentence).
  const tiles = summaryTilesFor(summary)

  if (state === "dedicated_venue") {
    // The ✓ reassurance is the story here; the itemized table appears only when
    // it adds information (a sibling slice or a nonzero unallocated remainder) —
    // showBreakdownTable's call, so a trivial one-row table never renders.
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SummaryTile icon={ArrowDownToLine} label="Deposited" cents={tiles.deposited_cents} tone="green" />
          <SummaryTile icon={Truck} label="In transit" cents={tiles.in_transit_cents} tone="blue" note={inTransitNote} />
          <SummaryTile icon={RotateCcw} label="Refunded" cents={tiles.refunded_cents} tone="red" />
        </div>
        <DedicatedAccountLine venueName={venueName} />
        {showBreakdownTable(summary) && <CombinedAccountLine summary={summary} venueId={venueId} />}
      </div>
    )
  }

  // SHARED VENUE: LEAD with the venue's attributed share (the honest per-venue
  // figure); the commingled account total follows, small — itemized so it
  // visibly foots (or caveated, pre-breakdown servers).
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryTile icon={ArrowDownToLine} label={VENUE_TILE_LABELS.deposited} cents={tiles.deposited_cents} tone="green" />
        <SummaryTile
          icon={Truck}
          label={VENUE_TILE_LABELS.in_transit}
          cents={tiles.in_transit_cents}
          tone="blue"
          note={inTransitNote}
        />
        <SummaryTile icon={RotateCcw} label={VENUE_TILE_LABELS.refunded} cents={tiles.refunded_cents} tone="red" />
      </div>
      <CombinedAccountLine summary={summary} venueId={venueId} />
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

/** TF-PAYOUTS-VENUE-F1 — shown only when the deposit was reconciled for a specific
 *  venue. The deposit total CANNOT shrink (Stripe pays the connected account, not
 *  the venue), so the line items below are filtered to the venue while the totals
 *  stay whole-deposit. This callout names the venue's own slice so the three
 *  figures on screen (whole deposit · full net line · venue-filtered line items)
 *  don't read as a mismatch. Hidden entirely when unscoped ⇒ view unchanged. */
function VenueShareCallout({ cents, venueName }: { cents: number; venueName?: string }) {
  const who = venueName ? `${venueName}'s` : "This venue's"
  return (
    <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-sm dark:border-green-900 dark:bg-green-950/40">
      <MapPin className="mt-0.5 size-4 shrink-0 text-green-600 dark:text-green-400" />
      <p className="text-green-800 dark:text-green-300">
        <span className="font-semibold">{who} share of this deposit: {money(cents)}.</span>{" "}
        <span className="text-green-700/90 dark:text-green-400/90">
          The full deposit below covers your whole business; line items are filtered to this venue.
        </span>
      </p>
    </div>
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

// ── 6. Ticket-level details table (operational tracing fields; NO buyer PII) ──

const TD_MONO = "py-2 px-2 whitespace-nowrap font-mono text-xs text-neutral-500 dark:text-neutral-400"

function DetailsTable({ rows }: { rows: ReconOrderRow[] }) {
  if (rows.length === 0) {
    return <p className="py-3 text-center text-sm text-neutral-400 dark:text-neutral-500">No order-level rows for this deposit.</p>
  }
  // Promoter-commission column shows only when the deposit has commission-bearing
  // rows (event with the promoter program on); hidden entirely otherwise.
  const withCommission = showCommissionColumn(rows)
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-xs text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
            <th className={TH_R}>Order</th>
            <th className={TH}>Sale date</th>
            <th className={TH}>Event</th>
            <th className={TH}>Tier</th>
            <th className={TH_R}>Qty</th>
            <th className={TH_R}>Amount</th>
            <th className={TH}>Door</th>
            <th className={TH}>Payout</th>
            <th className={TH}>Payout date</th>
            <th className={TH}>Payout id</th>
            <th className={TH}>Payment intent</th>
            {withCommission && <th className={TH_R}>Commission</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((o, i) => (
            <tr key={`${o.order_id ?? "row"}-${i}`} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
              <td className={TD_R}>{o.order_id ?? "—"}</td>
              <td className={TD}>{o.sale_date ?? "—"}</td>
              <td className={TD}>{o.event ?? "—"}</td>
              <td className={TD}>{o.ticket_tier ?? "—"}</td>
              <td className={TD_R}>{o.quantity}</td>
              <td className={cn(TD_R, "font-semibold")}>{money(o.amount_cents)}</td>
              <td className={TD}>
                {o.is_door_sale ? (
                  <Badge variant="neutral" size="sm">Door</Badge>
                ) : (
                  <span className="text-neutral-400 dark:text-neutral-500">—</span>
                )}
              </td>
              <td className={TD}><StatusChip status={o.payout_status} /></td>
              <td className={TD}>{o.payout_date ? fmtDate(o.payout_date) : "—"}</td>
              <td className={TD_MONO}>{o.stripe_payout_id ?? "—"}</td>
              <td className={TD_MONO}>{o.stripe_payment_intent_id ?? "—"}</td>
              {withCommission && <td className={TD_R}>{money(o.promoter_commission_cents)}</td>}
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
  venueName,
}: {
  recon: Reconciliation
  /** Fetches the details=1 variant (buyer PII). Omitted → toggle just reveals
   *  whatever `recon.orders` already holds (used by the static harness). */
  loadDetails?: () => Promise<Reconciliation | null>
  initialShowDetails?: boolean
  /** The selected venue's display name (for the share callout copy). Optional —
   *  falls back to "This venue" when absent. */
  venueName?: string
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
      {current.venue_scoped && current.venue_subtotal_cents != null && (
        <VenueShareCallout cents={current.venue_subtotal_cents} venueName={venueName} />
      )}
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
function ReconciliationPanel({
  payoutId,
  venueParam,
  venueName,
}: {
  payoutId: string
  venueParam?: string
  venueName?: string
}) {
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
      venueName={venueName}
    />
  )
}

// ── 4. Deposit row (the backbone) ────────────────────────────────────────────

function DepositRow({
  deposit,
  venueParam,
  venueName,
}: {
  deposit: DepositListItem
  venueParam?: string
  venueName?: string
}) {
  const [open, setOpen] = useState(false)
  // The whole presentation decision (headline number, context, count, mode) is
  // the lib's — venue_slice leads with THIS venue's share, keeping the full bank
  // deposit as quiet context; all_venues / venue_whole render as today. $0-venue
  // rows are filtered out upstream (visibleDeposits), so `hidden` never fires here.
  const view = depositRowView(deposit, !!venueParam)
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
            {view.salesCount} {view.salesCount === 1 ? "sale" : "sales"}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-base font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">{money(view.headlineCents)}</p>
          {view.mode === "venue_slice" ? (
            <>
              <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">{venueShareLabel(venueName)}</p>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500">{depositContextLabel(view.depositCents)}</p>
            </>
          ) : (
            <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
              {view.mode === "venue_whole" ? "whole deposit" : "deposited"}
            </p>
          )}
        </div>
        <ChevronDown className={cn("size-4 shrink-0 text-neutral-400 transition-transform dark:text-neutral-500", open && "rotate-180")} />
      </button>
      {open && (
        <div className="border-t border-neutral-100 bg-neutral-50/60 p-4 dark:border-neutral-800 dark:bg-neutral-800/40">
          <ReconciliationPanel payoutId={deposit.payout_id} venueParam={venueParam} venueName={venueName} />
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

/** Freshness line for the cached-serve contract (services :125): when the
 *  payload's computed_at is known, say when the numbers were computed —
 *  "Updated h:mm a (ET)" — and, while a background recompute is in flight
 *  (refreshing:true), add a subtle spinner + "Refreshing…". Deliberately quiet:
 *  data on screen is real (the last computed walk), so this is a caption, not a
 *  loading state. Renders nothing when there's no computed_at (older servers). */
function FreshnessLine({ freshness }: { freshness: { computedAt: string | null; refreshing: boolean } }) {
  const label = freshnessLabel(freshness.computedAt)
  if (!label && !freshness.refreshing) return null
  return (
    <div className="flex items-center justify-end gap-2 px-1 text-[11px] text-neutral-400 dark:text-neutral-500">
      {label && <span>{label}</span>}
      {freshness.refreshing && (
        <span className="inline-flex items-center gap-1">
          <Loader2 className="size-3 animate-spin" />
          {REFRESHING_LABEL}
        </span>
      )}
    </div>
  )
}

export default function ReconcileView({
  summary,
  deposits,
  venueParam,
  venueName,
  venueId,
  untilInPast,
  freshness,
}: {
  summary: PayoutsSummary
  deposits: DepositListItem[]
  venueParam?: string
  venueName?: string
  /** The selected venue's id — marks its row in the summary breakdown table. */
  venueId?: number
  /** Custom window with a past `until` → in-transit clarity note in the strip. */
  untilInPast?: boolean
  /** Cached-serve freshness (computed_at + refreshing) — omitted when the
   *  server predates the contract; the view renders exactly as before. */
  freshness?: { computedAt: string | null; refreshing: boolean }
}) {
  const venueScoped = !!venueParam
  // Venue-scoped: $0-venue deposits are hidden client-side (the server keeps
  // them). All-venues: `shown` is `deposits` unchanged — the hard regression gate.
  const shown = visibleDeposits(deposits, venueScoped)
  // Deposits landed on the account, but none of them was this venue's money →
  // a clean, venue-named empty state rather than the generic "no deposits".
  const allHidden = allVenueRowsHidden(deposits, venueScoped)
  const hasAny = deposits.length > 0 || summary.deposited_cents > 0 || summary.in_transit_cents > 0
  const venueEmpty = venueEmptyDepositsCopy(venueName)

  return (
    <div className="space-y-4">
      {freshness && <FreshnessLine freshness={freshness} />}
      <SummaryStrip summary={summary} venueName={venueName} venueId={venueId} untilInPast={untilInPast} />
      <InTransitBanner cents={summary.in_transit_cents} />
      {shown.length > 0 ? (
        <div className="space-y-3">
          {shown.map((d) => (
            <DepositRow key={d.payout_id || `${d.arrival_date}-${d.amount_cents}`} deposit={d} venueParam={venueParam} venueName={venueName} />
          ))}
        </div>
      ) : allHidden ? (
        <EmptyState icon={Banknote} title={venueEmpty.title} description={venueEmpty.description} />
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
