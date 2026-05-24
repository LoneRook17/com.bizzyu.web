"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import SectionContainer from "@/components/ui/SectionContainer"
import { clearSession, getUser, type PremiumWebUser } from "@/lib/premium/auth"

// Premium 2.0 Phase 4 — /account SKELETON (DECISIONS.md OD-19).
// Phase 6 wires the real subscription read API (`/api/premium/subscription`) +
// billing history (`/api/premium/billing-history`) + Stripe Portal session
// (`/api/premium/portal-session`). For Phase 4, this page only:
//   - gates on the bearer-token session from Phase 3,
//   - displays the signed-in user info,
//   - shows a placeholder "Manage in Stripe" button that's disabled until Phase 6.

export default function AccountPage() {
  const router = useRouter()
  const [user, setUser] = useState<PremiumWebUser | null>(null)

  useEffect(() => {
    const u = getUser()
    if (!u) {
      router.replace("/premium")
      return
    }
    setUser(u)
  }, [router])

  if (!user) {
    return (
      <main className="min-h-[calc(100vh-200px)] flex items-center justify-center">
        <p className="text-muted">Loading…</p>
      </main>
    )
  }

  return (
    <main className="min-h-[calc(100vh-200px)] py-12">
      <SectionContainer>
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Your account</h1>
          <p className="text-muted mb-8">
            Signed in as <span className="font-semibold">{user.full_name}</span>{" "}
            ({user.phone_number}).
          </p>

          <section className="rounded-2xl border border-gray-200 bg-white p-6 mb-6">
            <h2 className="text-lg font-semibold mb-3">Subscription</h2>
            <p className="text-sm text-muted mb-4">
              Live subscription details and billing history land here in the next release.
              For now, manage your subscription directly through Stripe.
            </p>
            <button
              type="button"
              disabled
              className="inline-flex items-center justify-center font-semibold rounded-full px-6 py-3 bg-gray-900 text-white opacity-60 cursor-not-allowed"
              title="Coming soon — portal session endpoint ships in the next release"
            >
              Manage in Stripe →
            </button>
            <p className="mt-3 text-xs text-muted">
              Until this is wired, look for your Stripe receipt email — it includes a one-click manage link.
            </p>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-6 mb-6">
            <h2 className="text-lg font-semibold mb-3">Profile</h2>
            <dl className="grid grid-cols-3 gap-y-2 text-sm">
              <dt className="text-muted">Name</dt>
              <dd className="col-span-2">{user.full_name}</dd>
              <dt className="text-muted">Email</dt>
              <dd className="col-span-2">{user.email}</dd>
              <dt className="text-muted">Phone</dt>
              <dd className="col-span-2">{user.phone_number}</dd>
            </dl>
          </section>

          <div className="flex justify-between items-center">
            <Link href="/premium/plans" className="text-sm text-muted underline">
              Change plan
            </Link>
            <button
              type="button"
              onClick={() => {
                clearSession()
                router.replace("/premium")
              }}
              className="text-sm text-muted underline cursor-pointer"
            >
              Sign out
            </button>
          </div>
        </div>
      </SectionContainer>
    </main>
  )
}
