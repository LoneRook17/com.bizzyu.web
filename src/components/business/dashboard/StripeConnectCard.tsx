"use client"

import { useState } from "react"
import { apiClient } from "@/lib/business/api-client"

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
      // Redirect to Stripe's hosted onboarding
      window.location.href = data.url
    } catch (err: any) {
      setError(err.message || "Failed to start Stripe onboarding")
      setLoading(false)
    }
  }

  const handleCompleteOnboarding = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiClient.post<{ onboarded: boolean }>(
        "/business/profile/stripe-onboard/complete"
      )
      if (data.onboarded) {
        onOnboardingComplete?.()
      } else {
        setError("Onboarding is not yet complete. Please finish all required steps in Stripe.")
      }
    } catch (err: any) {
      setError(err.message || "Failed to verify onboarding status")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-ink mb-3">Stripe Connect</h3>

      {onboarded ? (
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
            <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-green-700">Connected</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Your Stripe account is connected and ready to accept payments.
            </p>
            <a
              href="https://dashboard.stripe.com/express"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 text-xs text-primary font-medium hover:underline"
            >
              Open Stripe Dashboard &rarr;
            </a>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-yellow-100">
            <svg className="h-4 w-4 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-yellow-700">Not Connected</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Stripe Connect is required to create paid events. Set up your account to start accepting payments.
            </p>

            {error && (
              <p className="text-xs text-red-600 mt-2">{error}</p>
            )}

            <button
              onClick={handleStartOnboarding}
              disabled={loading}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-60"
            >
              {loading ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Setting up...
                </>
              ) : (
                "Set Up Stripe"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Stripe return banner — shown when user returns from Stripe onboarding.
 * Verifies onboarding status and shows result.
 */
export function StripeReturnBanner({ onComplete }: { onComplete: () => void }) {
  const [status, setStatus] = useState<"verifying" | "success" | "incomplete">("verifying")
  const [checked, setChecked] = useState(false)

  const verify = async () => {
    try {
      const data = await apiClient.post<{ onboarded: boolean }>(
        "/business/profile/stripe-onboard/complete"
      )
      setStatus(data.onboarded ? "success" : "incomplete")
      if (data.onboarded) {
        onComplete()
      }
    } catch {
      setStatus("incomplete")
    } finally {
      setChecked(true)
    }
  }

  // Auto-verify on mount
  if (!checked) {
    verify()
  }

  if (status === "verifying") {
    return (
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 mb-4">
        <p className="text-sm text-blue-700 flex items-center gap-2">
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Verifying your Stripe account setup...
        </p>
      </div>
    )
  }

  if (status === "success") {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-4 mb-4">
        <p className="text-sm text-green-700 font-medium">
          Stripe Connect setup complete! You can now create paid events.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 mb-4">
      <p className="text-sm text-yellow-700">
        Stripe onboarding isn&apos;t finished yet. Some steps may still be required.
      </p>
      <button
        onClick={() => { setChecked(false); setStatus("verifying") }}
        className="mt-2 text-xs text-primary font-medium hover:underline cursor-pointer"
      >
        Check again
      </button>
    </div>
  )
}
