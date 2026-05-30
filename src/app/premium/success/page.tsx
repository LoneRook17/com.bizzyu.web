"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import SectionContainer from "@/components/ui/SectionContainer"

// Premium 2.0 Phase 4 — Stripe Checkout success landing.
// PRD §6.4 step 5. The DB-side state (subscription row, is_premium=true) is
// written by the StripeWebhookController on `checkout.session.completed`;
// this page is a pure UX confirmation and CANNOT confirm DB state in Phase 4
// because the `/api/premium/subscription` read endpoint ships in Phase 6.

const APP_STORE_URL = "https://apps.apple.com/us/app/bizzy-deals/id6443537537"
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.bizzy.app"

export default function PremiumSuccessPage() {
  return (
    <Suspense fallback={null}>
      <PremiumSuccessPageInner />
    </Suspense>
  )
}

function PremiumSuccessPageInner() {
  const searchParams = useSearchParams()
  const [sessionId, setSessionId] = useState<string | null>(null)

  useEffect(() => {
    setSessionId(searchParams.get("session_id"))
  }, [searchParams])

  return (
    <main className="min-h-[calc(100vh-200px)] py-16">
      <SectionContainer>
        <div className="max-w-xl mx-auto text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8 text-emerald-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-4xl font-bold mb-3">You&apos;re Premium!</h1>
          <p className="text-muted mb-8">
            Your subscription is being activated. Open the Bizzy app to start using your Premium benefits.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
            <Link
              href={APP_STORE_URL}
              className="inline-flex items-center justify-center font-semibold rounded-full px-7 py-3 bg-gray-900 text-white hover:brightness-110 transition-all"
            >
              Open in App Store
            </Link>
            <Link
              href={PLAY_STORE_URL}
              className="inline-flex items-center justify-center font-semibold rounded-full px-7 py-3 bg-gray-900 text-white hover:brightness-110 transition-all"
            >
              Open in Google Play
            </Link>
          </div>

          <div className="rounded-2xl bg-gray-50 border border-gray-200 p-5 text-left text-sm text-muted">
            <p className="font-semibold text-gray-900 mb-1">What happens next?</p>
            <ul className="list-disc list-inside space-y-1">
              <li>You&apos;ll get a receipt from Stripe in your email.</li>
              <li>Sign in to the mobile app with the same phone number to see your Premium status.</li>
              <li>Manage or cancel anytime from <Link href="/account" className="underline">your account</Link>.</li>
            </ul>
          </div>

          {sessionId && (
            <p className="mt-6 text-xs text-muted">
              Reference: <code className="font-mono">{sessionId}</code>
            </p>
          )}
        </div>
      </SectionContainer>
    </main>
  )
}
