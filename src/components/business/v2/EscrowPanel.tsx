"use client"

// BE-D — the business escrow panel (BE_LEDGER_CONTRACT.md §7 + A4).
//
// Renders NOTHING until the business has escrow history: the data seam
// (lib/business/escrow.ts) is stubbed to the zero fixture until the real read
// lands, so this panel is invisible on every real dashboard today. States:
//
//   claimable   money is waiting and Stripe isn't connected — hero number +
//               the existing Stripe onboarding CTA (same POST the settings
//               StripeConnectCard uses)
//   processing  a claim is on its way to the bank ("Payment processing")
//   paid        everything claimed — quiet confirmation + history
//
// ONE NUMBER (amendment A4): escrow credits settle immediately, so there is
// no available/pending split anywhere in this component.

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { ArrowUpRight, CheckCircle2, Clock, Landmark, Loader2 } from "lucide-react"
import { apiClient } from "@/lib/business/api-client"
import {
  fetchEscrowPanelData,
  deriveEscrowPanelState,
  escrowHeroCents,
  centsUsd,
  signedCentsUsd,
  fmtEntryTimestamp,
  entryLabel,
  entryStatusBadge,
  visibleEscrowEntries,
  type EscrowPanelData,
  type EscrowPanelState,
  type EscrowLedgerEntry,
} from "@/lib/business/escrow"
import { cn } from "@/lib/v2/utils"
import { Card } from "@/components/business/v2/ui/card"
import { Button } from "@/components/business/v2/ui/button"
import { Badge } from "@/components/business/v2/ui/badge"

/** The existing onboarding CTA — byte-identical flow to the settings
 *  StripeConnectCard: POST the onboard link, then hand the browser to Stripe. */
function ConnectStripeButton() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const start = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiClient.post<{ url: string; stripe_connect_id: string }>(
        "/business/profile/stripe-onboard?platform=web"
      )
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start Stripe onboarding")
      setLoading(false)
    }
  }

  return (
    <div>
      <Button onClick={start} disabled={loading}>
        {loading
          ? (<><Loader2 className="animate-spin" /> Setting up…</>)
          : (<>Connect Stripe to claim it <ArrowUpRight /></>)}
      </Button>
      {error && <p className="mt-2 text-[13px] text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}

function LedgerRow({ entry, withBorder }: { entry: EscrowLedgerEntry; withBorder: boolean }) {
  const label = entryLabel(entry)
  const badge = entryStatusBadge(entry)
  return (
    <div className={cn("flex items-center gap-3 px-5 py-3", withBorder && "border-t border-neutral-100 dark:border-neutral-800")}>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{label.title}</span>
          {badge && <Badge variant={badge.variant} size="sm">{badge.label}</Badge>}
        </span>
        <span className="block truncate text-[13px] text-neutral-500 dark:text-neutral-400">
          {label.reference ? `${label.reference} · ` : ""}{fmtEntryTimestamp(entry.created_at)}
        </span>
      </span>
      <span className={cn(
        "shrink-0 text-sm font-semibold tabular-nums",
        entry.amount_cents > 0 ? "text-green-600 dark:text-green-400" : "text-neutral-900 dark:text-neutral-100",
      )}>
        {signedCentsUsd(entry.amount_cents)}
      </span>
    </div>
  )
}

function Ledger({ entries }: { entries: EscrowLedgerEntry[] }) {
  const [expanded, setExpanded] = useState(false)
  if (entries.length === 0) return null
  const { rows, hiddenCount } = visibleEscrowEntries(entries, expanded)
  return (
    <div className="border-t border-neutral-100 dark:border-neutral-800">
      <p className="px-5 pt-3.5 text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
        History
      </p>
      {rows.map((e, i) => <LedgerRow key={e.id} entry={e} withBorder={i > 0} />)}
      {hiddenCount > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="w-full cursor-pointer border-t border-neutral-100 px-5 py-3 text-left text-[13px] font-semibold text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-neutral-900 dark:border-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800/60 dark:hover:text-neutral-100"
        >
          Show all {entries.length} entries
        </button>
      )}
    </div>
  )
}

const STATE_HEADER: Record<Exclude<EscrowPanelState, "empty">, { icon: React.ElementType; tint: string; label: string; badge?: { variant: "info" | "success"; text: string } }> = {
  claimable: {
    icon: Landmark,
    tint: "bg-green-50 text-green-600 dark:bg-green-950/40 dark:text-green-400",
    label: "Held for you by Bizzy",
  },
  processing: {
    icon: Clock,
    tint: "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400",
    label: "Payment processing",
    badge: { variant: "info", text: "Processing" },
  },
  paid: {
    icon: CheckCircle2,
    tint: "bg-green-50 text-green-600 dark:bg-green-950/40 dark:text-green-400",
    label: "Escrow paid out",
    badge: { variant: "success", text: "Paid" },
  },
}

function EscrowPanelInner() {
  const searchParams = useSearchParams()
  const demoScenario = searchParams.get("escrow_demo")
  const [data, setData] = useState<EscrowPanelData | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchEscrowPanelData({ demoScenario }).then((d) => {
      if (!cancelled) setData(d)
    })
    return () => { cancelled = true }
  }, [demoScenario])

  if (!data) return null
  const state = deriveEscrowPanelState(data.summary, data.stripeOnboarded)
  if (state === "empty") return null

  const header = STATE_HEADER[state]
  const hero = centsUsd(escrowHeroCents(data.summary, state))
  const HeaderIcon = header.icon

  return (
    <Card className="overflow-hidden">
      <div className="px-5 py-5">
        <div className="flex items-center gap-2.5">
          <span className={cn("flex size-8 items-center justify-center rounded-lg", header.tint)}>
            <HeaderIcon className="size-4.5" />
          </span>
          <h2 className="min-w-0 flex-1 text-sm font-semibold text-neutral-600 dark:text-neutral-400">{header.label}</h2>
          {header.badge && <Badge variant={header.badge.variant}>{header.badge.text}</Badge>}
        </div>

        <p className="mt-3 text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
          {hero}
          {state === "claimable" && (
            <span className="ml-2 text-base font-medium text-neutral-500 dark:text-neutral-400">waiting for you</span>
          )}
        </p>

        {state === "claimable" && (
          <>
            <p className="mt-2 max-w-prose break-words text-sm text-neutral-600 dark:text-neutral-400">
              Ticket money{data.businessName ? (<> for <span className="font-medium text-neutral-900 dark:text-neutral-100">{data.businessName}</span></>) : null} is
              being held by Bizzy because there&apos;s no Stripe account connected yet. Claiming it
              requires finishing Stripe onboarding — once your business Stripe account is set up,
              this balance is paid out to it.
            </p>
            <div className="mt-4"><ConnectStripeButton /></div>
          </>
        )}

        {state === "processing" && (
          <p className="mt-2 max-w-prose text-sm text-neutral-600 dark:text-neutral-400">
            Stripe is connected and this payout is on its way to your bank. No action needed —
            it typically arrives within a few business days.
          </p>
        )}

        {state === "paid" && (
          <p className="mt-2 max-w-prose text-sm text-neutral-600 dark:text-neutral-400">
            Everything Bizzy held for you has been paid out to your business Stripe account.
            New ticket sales pay out directly — nothing waits in escrow anymore.
          </p>
        )}
      </div>

      <Ledger entries={data.summary.entries} />
    </Card>
  )
}

/** Escrow state for the business dashboard home. Self-contained: fetches via
 *  the escrow seam and renders nothing when there is no escrow history. */
export default function EscrowPanel() {
  return (
    <Suspense fallback={null}>
      <EscrowPanelInner />
    </Suspense>
  )
}
