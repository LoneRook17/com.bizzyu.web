"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowUpRight, CheckCircle2, Loader2, TriangleAlert } from "lucide-react"
import { apiClient } from "@/lib/business/api-client"
import {
  completeProfileStripeOnboardOnce,
  resetProfileStripeOnboardComplete,
} from "@/lib/business/stripe-onboard-complete"
import { Card } from "@/components/business/v2/ui/card"
import { Button } from "@/components/business/v2/ui/button"

interface StripeConnectCardProps {
  onboarded: boolean
  /** Stored Stripe account is no longer valid (deauthorized/deleted) - prompt a reconnect. */
  reconnectRequired?: boolean
  onOnboardingComplete?: () => void
  /**
   * DASH2-D. `full` (default) is the settings → Payments card, unchanged.
   * `compact` is the quiet Home nudge: one line and the CTA, no heading block,
   * and NOTHING at all once connected — Home is not a status board.
   */
  variant?: "full" | "compact"
  /** Business is pending approval — affects copy. Approved businesses see escrow copy. */
  isPending?: boolean
}

/**
 * The Stripe onboarding start. Extracted so the compact Home variant runs the
 * IDENTICAL flow as the settings card — POST for a link, then hand the browser
 * to Stripe — rather than a second implementation that could drift.
 */
function useStripeOnboarding() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleStartOnboarding = async () => {
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

  return { loading, error, handleStartOnboarding }
}

export default function StripeConnectCard({ onboarded, reconnectRequired = false, onOnboardingComplete, variant = "full", isPending = false }: StripeConnectCardProps) {
  const { loading, error, handleStartOnboarding } = useStripeOnboarding()

  if (variant === "compact") {
    // Connected businesses see nothing here.
    if (onboarded && !reconnectRequired) return null
    return (
      <Card className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
          <TriangleAlert className="size-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            {reconnectRequired
              ? "Reconnect Stripe to keep getting paid"
              : isPending
                ? "Connect Stripe to get paid automatically"
                : "Connect Stripe to receive payments instantly"}
          </p>
          <p className="mt-0.5 text-[13px] text-neutral-500 dark:text-neutral-400">
            {reconnectRequired
              ? "Your business Stripe account is no longer valid. Reconnect it to keep accepting ticket payments."
              : isPending
                ? "Ticket money pays straight into your business Stripe account. Without one, sales are held by Bizzy until you connect."
                : "You can still publish paid events without it. We hold what you earn until you connect, then we send it all right away."}
          </p>
          {error && <p className="mt-2 text-[13px] text-red-600 dark:text-red-400">{error}</p>}
        </div>
        <Button onClick={handleStartOnboarding} disabled={loading} size="sm" variant="secondary" className="shrink-0">
          {loading
            ? (<><Loader2 className="animate-spin" /> Setting up…</>)
            : reconnectRequired ? "Reconnect Stripe" : "Connect Stripe"}
        </Button>
      </Card>
    )
  }

  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Business Stripe Connect</h3>
      <p className="mt-1 text-[13px] text-neutral-500 dark:text-neutral-400">
        Ticket revenue lands here. Promoter commission (if anyone on your team also promotes events) pays to a
        separate personal Stripe, not this account.
      </p>

      {onboarded ? (
        <div className="mt-3.5 flex items-start gap-3">
          <span className="mt-0.5 flex size-6 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40">
            <CheckCircle2 className="size-4 text-green-600 dark:text-green-400" />
          </span>
          <div>
            <p className="text-sm font-medium text-green-700 dark:text-green-400">Business Stripe connected</p>
            <p className="mt-0.5 text-[13px] text-neutral-500 dark:text-neutral-400">
              Your business Stripe account is connected and ready to accept ticket payments.
            </p>
            <a
              href="https://dashboard.stripe.com/express"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-[#05EB54] hover:underline"
            >
              Open Stripe dashboard <ArrowUpRight className="size-3.5" />
            </a>
          </div>
        </div>
      ) : (
        <div className="mt-3.5 flex items-start gap-3">
          <span className="mt-0.5 flex size-6 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
            <TriangleAlert className="size-3.5 text-amber-600 dark:text-amber-400" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
              {reconnectRequired
                ? "Stripe connection needs attention"
                : isPending
                  ? "Business Stripe not connected"
                  : "Connect Stripe to receive payments instantly"}
            </p>
            <p className="mt-0.5 text-[13px] text-neutral-500 dark:text-neutral-400">
              {reconnectRequired
                ? "Your business Stripe account is no longer valid. It may have been disconnected or deleted. Reconnect to keep accepting ticket payments."
                : isPending
                  ? "Connecting your business Stripe account is required to create paid events. Ticket payments will pay into this business account."
                  : "You can still publish paid events without it. We hold what you earn until you connect, then we send it all right away."}
            </p>
            {error && <p className="mt-2 text-[13px] text-red-600 dark:text-red-400">{error}</p>}
            <Button onClick={handleStartOnboarding} disabled={loading} className="mt-3" size="sm">
              {loading
                ? (<><Loader2 className="animate-spin" /> Setting up…</>)
                : reconnectRequired ? "Reconnect Stripe" : "Connect Stripe"}
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}

/** Shown when the user returns from Stripe onboarding. Verifies status. */
export function StripeReturnBanner({ onComplete }: { onComplete: () => void }) {
  const [status, setStatus] = useState<"verifying" | "success" | "incomplete">("verifying")
  const [attempt, setAttempt] = useState(0)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    let cancelled = false
    setStatus("verifying")
    completeProfileStripeOnboardOnce()
      .then((data) => {
        if (cancelled) return
        setStatus(data.onboarded ? "success" : "incomplete")
        if (data.onboarded) onCompleteRef.current()
      })
      .catch(() => {
        if (!cancelled) setStatus("incomplete")
      })
    return () => { cancelled = true }
  }, [attempt])

  if (status === "verifying") {
    return (
      <div className="mb-4 flex items-center gap-2 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 px-4 py-3 text-sm text-blue-700 dark:text-blue-400">
        <Loader2 className="size-4 animate-spin" /> Verifying your Stripe account setup…
      </div>
    )
  }

  if (status === "success") {
    return (
      <div className="mb-4 flex items-center gap-2 rounded-xl border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/40 px-4 py-3 text-sm font-medium text-green-700 dark:text-green-400">
        <CheckCircle2 className="size-4" /> Stripe Connect setup complete. You can now create paid events.
      </div>
    )
  }

  return (
    <div className="mb-4 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
      <p>Stripe onboarding isn&apos;t finished yet. Some steps may still be required.</p>
      <button
        onClick={() => {
          resetProfileStripeOnboardComplete()
          setAttempt((n) => n + 1)
        }}
        className="mt-1.5 cursor-pointer text-[13px] font-semibold text-[#05EB54] hover:underline"
      >
        Check again
      </button>
    </div>
  )
}
