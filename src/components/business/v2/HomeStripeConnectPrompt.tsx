"use client"

// DASH2-D — the quiet "Connect Stripe to get paid automatically" card on Home.
//
// Complements BE-D rather than competing with it. The escrow hero already
// leads Home with "$X waiting — connect Stripe" when there IS money held; this
// covers the other half of the same problem, the business whose escrow balance
// is zero (nothing sold yet, or everything already claimed) and which was
// therefore told nothing at all.
//
// The decision itself is a pure function (lib/business/home-stripe-prompt.ts)
// pinned by `npm test`. This component only gathers its three inputs.
//
// FAILS QUIET, ALWAYS. Every read here degrades to "render nothing": a broken
// escrow endpoint, a flaked profile, a staff session. A nag card is the worst
// possible thing to show on a bad fetch.

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/business/auth-context"
import { fetchEscrowPanelData, deriveEscrowPanelState } from "@/lib/business/escrow"
import {
  shouldShowStripeConnectPrompt,
  canManagePayouts,
} from "@/lib/business/home-stripe-prompt"
import StripeConnectCard from "@/components/business/v2/settings/StripeConnectCard"

export default function HomeStripeConnectPrompt() {
  const { user, isPending } = useAuth()
  const mayManage = canManagePayouts(user?.business_role)

  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!mayManage) return
    let cancelled = false

    ;(async () => {
      // Same seam the escrow panel reads, so the two can never disagree about
      // whether the hero is on screen. Never throws; null = no panel.
      const escrow = await fetchEscrowPanelData()
      const escrowPanelVisible =
        escrow != null &&
        deriveEscrowPanelState(escrow.summary, escrow.stripeOnboarded) !== "empty"

      // When the escrow read succeeded it already carries the Stripe flag, so
      // the profile is only fetched in the branch that actually needs it.
      let stripeOnboarded: boolean | null = escrow?.stripeOnboarded ?? null
      if (escrow == null) {
        try {
          const { apiClient } = await import("@/lib/business/api-client")
          const profile = await apiClient.get<{ stripe_connect_onboarded?: boolean }>(
            "/business/profile",
          )
          stripeOnboarded = profile?.stripe_connect_onboarded === true
        } catch {
          stripeOnboarded = null // unknown → stay quiet
        }
      }

      if (cancelled) return
      setShow(
        shouldShowStripeConnectPrompt({
          stripeOnboarded,
          escrowPanelVisible,
          canManagePayouts: mayManage,
        }),
      )
    })()

    return () => { cancelled = true }
  }, [mayManage])

  if (!show) return null

  // The settings card's own CTA and onboarding POST, in its compact size.
  return <StripeConnectCard onboarded={false} variant="compact" isPending={isPending} />
}
