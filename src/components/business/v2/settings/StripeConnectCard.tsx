"use client"

import { useState } from "react"
import { ArrowUpRight, CheckCircle2, Loader2, TriangleAlert } from "lucide-react"
import { apiClient } from "@/lib/business/api-client"
import { Card } from "@/components/business/v2/ui/card"
import { Button } from "@/components/business/v2/ui/button"

interface StripeConnectCardProps {
  onboarded: boolean
  onOnboardingComplete?: () => void
}

export default function StripeConnectCard({ onboarded, onOnboardingComplete }: StripeConnectCardProps) {
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

  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold text-neutral-900">Business Stripe Connect</h3>
      <p className="mt-1 text-[13px] text-neutral-500">
        Ticket revenue lands here. Promoter commission (if anyone on your team also promotes events) pays to a
        separate personal Stripe — not this account.
      </p>

      {onboarded ? (
        <div className="mt-3.5 flex items-start gap-3">
          <span className="mt-0.5 flex size-6 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="size-4 text-green-600" />
          </span>
          <div>
            <p className="text-sm font-medium text-green-700">Business Stripe connected</p>
            <p className="mt-0.5 text-[13px] text-neutral-500">
              Your business Stripe account is connected and ready to accept ticket payments.
            </p>
            <a
              href="https://dashboard.stripe.com/express"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-[#079455] hover:underline"
            >
              Open Stripe dashboard <ArrowUpRight className="size-3.5" />
            </a>
          </div>
        </div>
      ) : (
        <div className="mt-3.5 flex items-start gap-3">
          <span className="mt-0.5 flex size-6 items-center justify-center rounded-full bg-amber-100">
            <TriangleAlert className="size-3.5 text-amber-600" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-700">Business Stripe not connected</p>
            <p className="mt-0.5 text-[13px] text-neutral-500">
              Connecting your business Stripe account is required to create paid events. Ticket payments will pay
              into this business account.
            </p>
            {error && <p className="mt-2 text-[13px] text-red-600">{error}</p>}
            <Button onClick={handleStartOnboarding} disabled={loading} className="mt-3" size="sm">
              {loading ? (<><Loader2 className="animate-spin" /> Setting up…</>) : "Set up business Stripe"}
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
  const [checked, setChecked] = useState(false)

  const verify = async () => {
    try {
      const data = await apiClient.post<{ onboarded: boolean }>("/business/profile/stripe-onboard/complete")
      setStatus(data.onboarded ? "success" : "incomplete")
      if (data.onboarded) onComplete()
    } catch {
      setStatus("incomplete")
    } finally {
      setChecked(true)
    }
  }

  if (!checked) verify()

  if (status === "verifying") {
    return (
      <div className="mb-4 flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
        <Loader2 className="size-4 animate-spin" /> Verifying your Stripe account setup…
      </div>
    )
  }

  if (status === "success") {
    return (
      <div className="mb-4 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
        <CheckCircle2 className="size-4" /> Stripe Connect setup complete. You can now create paid events.
      </div>
    )
  }

  return (
    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
      <p>Stripe onboarding isn&apos;t finished yet. Some steps may still be required.</p>
      <button
        onClick={() => { setChecked(false); setStatus("verifying") }}
        className="mt-1.5 cursor-pointer text-[13px] font-semibold text-[#079455] hover:underline"
      >
        Check again
      </button>
    </div>
  )
}
