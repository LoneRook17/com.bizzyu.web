"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import SectionContainer from "@/components/ui/SectionContainer"
import { getUser, clearSession, type PremiumWebUser } from "@/lib/premium/auth"

// Premium 2.0 Phase 3 — placeholder plan picker. Phase 4 builds the real checkout.
// The auth handoff target so Phase 3 can be tested end-to-end.

export default function PremiumPlansPage() {
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
    <main className="min-h-[calc(100vh-200px)] py-16">
      <SectionContainer>
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-4xl font-bold mb-2">Bizzy Premium</h1>
          <p className="text-muted mb-8">
            Signed in as <span className="font-semibold">{user.full_name}</span>{" "}
            ({user.phone_number}).
          </p>

          <div className="rounded-2xl border border-gray-200 p-8 bg-white shadow-sm">
            <p className="text-sm text-muted mb-2">Coming soon</p>
            <h2 className="text-xl font-semibold mb-1">Choose your plan</h2>
            <p className="text-sm text-muted">
              The 3-plan picker (Monthly / 6mo / 12mo) ships in Phase 4.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              clearSession()
              router.replace("/premium")
            }}
            className="mt-6 text-sm text-muted underline cursor-pointer"
          >
            Sign out
          </button>
        </div>
      </SectionContainer>
    </main>
  )
}
