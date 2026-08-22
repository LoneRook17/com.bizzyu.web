"use client"

// BE-D — the business escrow panel (BE_LEDGER_CONTRACT.md §7 + A4).
//
// Two placements, one component (BE-D2):
//   hero     dashboard home — first and largest thing on the page; money
//            Bizzy is holding outranks every other card
//   compact  settings → Payments, next to StripeConnectCard — same numbers,
//            same states, sized to the settings card rhythm
//
// Renders NOTHING until the business has escrow history: the data seam
// (lib/business/escrow.ts) is stubbed to the zero fixture until the real read
// lands, so this panel is invisible on every real dashboard today. States:
//
//   claimable   money is waiting and Stripe isn't connected — hero number +
//               the existing Stripe onboarding CTA (same POST the settings
//               StripeConnectCard uses)
//   ready       onboarded, balance held, no withdrawal/transfer yet. Honest
//               hold-until-sent copy. Never "on the way to your bank".
//   processing  a pending withdrawal or in-flight Transfer ("Payment processing")
//   paid        everything claimed. Quiet confirmation + shared EscrowHistory.
//
// ONE NUMBER (amendment A4): escrow credits settle immediately, so there is
// no available/pending split anywhere in this component.

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { ArrowUpRight, CheckCircle2, Clock, Landmark, Loader2, Send } from "lucide-react"
import { apiClient } from "@/lib/business/api-client"
import {
  fetchEscrowPanelData,
  deriveEscrowPanelState,
  escrowHeroCents,
  centsUsd,
  isEscrowDemoScenario,
  type EscrowPanelData,
  type EscrowPanelState,
} from "@/lib/business/escrow"
import { completeProfileStripeOnboardOnce } from "@/lib/business/stripe-onboard-complete"
import { cn } from "@/lib/v2/utils"
import { Card } from "@/components/business/v2/ui/card"
import { Button } from "@/components/business/v2/ui/button"
import { Badge } from "@/components/business/v2/ui/badge"
import EscrowHistory from "@/components/business/v2/EscrowHistory"

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

export type EscrowPanelVariant = "hero" | "compact"

/** Size-only differences between the two placements — the numbers, states,
 *  copy, and ledger are identical. */
const VARIANT_SIZING: Record<EscrowPanelVariant, { pad: string; iconBox: string; icon: string; heroNum: string; heroSuffix: string }> = {
  hero: {
    pad: "px-5 py-5 sm:px-6 sm:py-6",
    iconBox: "size-9",
    icon: "size-5",
    heroNum: "text-4xl sm:text-5xl",
    heroSuffix: "text-base sm:text-lg",
  },
  compact: {
    pad: "px-5 py-4",
    iconBox: "size-8",
    icon: "size-4.5",
    heroNum: "text-2xl",
    heroSuffix: "text-sm",
  },
}

/** Hero placement only: money waiting/moving tints the card border so the
 *  panel visually leads the page. Paid stays quiet; compact stays neutral. */
const HERO_STATE_BORDER: Record<Exclude<EscrowPanelState, "empty">, string> = {
  claimable: "border-green-200 dark:border-green-900/70",
  ready: "border-green-200 dark:border-green-900/70",
  processing: "border-blue-200 dark:border-blue-900/70",
  paid: "",
}

const STATE_HEADER: Record<Exclude<EscrowPanelState, "empty">, { icon: React.ElementType; tint: string; label: string; badge?: { variant: "info" | "success"; text: string } }> = {
  claimable: {
    icon: Landmark,
    tint: "bg-green-50 text-green-600 dark:bg-green-950/40 dark:text-green-400",
    label: "Held for you by Bizzy",
  },
  ready: {
    icon: Send,
    tint: "bg-green-50 text-green-600 dark:bg-green-950/40 dark:text-green-400",
    label: "Ready to send",
    badge: { variant: "info", text: "Held" },
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

function EscrowPanelInner({
  variant,
  className,
  refreshToken = 0,
}: {
  variant: EscrowPanelVariant
  className?: string
  refreshToken?: number
}) {
  const searchParams = useSearchParams()
  const demoScenario = searchParams.get("escrow_demo")
  const [data, setData] = useState<EscrowPanelData | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const first = await fetchEscrowPanelData({ demoScenario })
      if (cancelled) return
      setData(first)

      // Payments compact only: if Stripe is already onboarded, POST complete
      // so services can run the escrow claim. Home hero does not kick this.
      // Demo fixtures never touch the network.
      const shouldClaim =
        variant === "compact" &&
        !isEscrowDemoScenario(demoScenario) &&
        first?.stripeOnboarded === true
      if (!shouldClaim) return
      try {
        await completeProfileStripeOnboardOnce()
      } catch {
        return
      }
      if (cancelled) return
      const second = await fetchEscrowPanelData({ demoScenario })
      if (!cancelled) setData(second)
    })()
    return () => { cancelled = true }
  }, [demoScenario, variant, refreshToken])

  if (!data) return null
  const state = deriveEscrowPanelState(data.summary, data.stripeOnboarded)
  if (state === "empty") return null

  const header = STATE_HEADER[state]
  const hero = centsUsd(escrowHeroCents(data.summary, state))
  const HeaderIcon = header.icon
  const sizing = VARIANT_SIZING[variant]

  return (
    <Card className={cn("overflow-hidden", variant === "hero" && HERO_STATE_BORDER[state], className)}>
      <div className={sizing.pad}>
        <div className="flex items-center gap-2.5">
          <span className={cn("flex items-center justify-center rounded-lg", sizing.iconBox, header.tint)}>
            <HeaderIcon className={sizing.icon} />
          </span>
          <h2 className="min-w-0 flex-1 text-sm font-semibold text-neutral-600 dark:text-neutral-400">{header.label}</h2>
          {header.badge && <Badge variant={header.badge.variant}>{header.badge.text}</Badge>}
        </div>

        <p className={cn("mt-3 font-semibold tracking-tight text-neutral-900 dark:text-neutral-100", sizing.heroNum)}>
          {hero}
          {state === "claimable" && (
            <span className={cn("ml-2 font-medium text-neutral-500 dark:text-neutral-400", sizing.heroSuffix)}>waiting for you</span>
          )}
          {state === "ready" && (
            <span className={cn("ml-2 font-medium text-neutral-500 dark:text-neutral-400", sizing.heroSuffix)}>ready to send</span>
          )}
        </p>

        {state === "claimable" && (
          <>
            <p className="mt-2 max-w-prose break-words text-sm text-neutral-600 dark:text-neutral-400">
              Ticket money{data.businessName ? (<> for <span className="font-medium text-neutral-900 dark:text-neutral-100">{data.businessName}</span></>) : null} is
              being held by Bizzy because there&apos;s no Stripe account connected yet. Claiming it
              requires finishing Stripe onboarding. Once your business Stripe account is set up,
              this balance is paid out to it.
            </p>
            <div className="mt-4"><ConnectStripeButton /></div>
          </>
        )}

        {state === "ready" && (
          <p className="mt-2 max-w-prose text-sm text-neutral-600 dark:text-neutral-400">
            Stripe is connected. This balance is held until it is sent. It is not on the way
            to your bank yet.
          </p>
        )}

        {state === "processing" && (
          <p className="mt-2 max-w-prose text-sm text-neutral-600 dark:text-neutral-400">
            Stripe is connected and this payout is on its way to your bank. No action needed.
            It typically arrives within a few business days.
          </p>
        )}

        {state === "paid" && (
          <p className="mt-2 max-w-prose text-sm text-neutral-600 dark:text-neutral-400">
            Everything Bizzy held for you has been paid out to your business Stripe account.
            New ticket sales pay out directly. Nothing waits in escrow anymore.
          </p>
        )}
      </div>

      <EscrowHistory entries={data.summary.entries} />
    </Card>
  )
}

/** Escrow state for the dashboard home (hero) and settings → Payments
 *  (compact). Self-contained: fetches via the escrow seam and renders nothing
 *  — no wrapper, no margins — when there is no escrow history, so pages that
 *  mount it are unchanged for businesses without escrow. `className` rides on
 *  the card root and disappears with it. */
export default function EscrowPanel({
  variant = "hero",
  className,
  refreshToken,
}: {
  variant?: EscrowPanelVariant
  className?: string
  /** Settings increment this after onboard/complete so the panel re-reads the ledger. */
  refreshToken?: number
}) {
  return (
    <Suspense fallback={null}>
      <EscrowPanelInner variant={variant} className={className} refreshToken={refreshToken} />
    </Suspense>
  )
}
