"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import SectionContainer from "@/components/ui/SectionContainer"
import { authHeader, clearSession, getUser, type PremiumWebUser } from "@/lib/premium/auth"

// Premium 2.0 — plan picker + promo code + Stripe Checkout handoff.
// Phase 6.5: 2-plan model — Monthly $4.99/mo + Yearly $24.99/yr (both recurring).
// Yearly is pre-selected, "Best value", and carries a 7-day free trial.

type PlanId = "monthly" | "yearly"

interface Plan {
  id: PlanId
  label: string
  priceCents: number
  priceLabel: string
  periodLabel: string
  perMonthLabel: string
  badge?: string
  blurb: string
  hasTrial: boolean
}

const PLANS: Plan[] = [
  {
    id: "monthly",
    label: "Monthly",
    priceCents: 499,
    priceLabel: "$4.99",
    periodLabel: "/ month",
    perMonthLabel: "$4.99 / mo",
    blurb: "Cancel anytime.",
    hasTrial: false,
  },
  {
    id: "yearly",
    label: "Yearly",
    priceCents: 2499,
    priceLabel: "$24.99",
    periodLabel: "/ year",
    perMonthLabel: "Just $2.08 / mo",
    badge: "7 days free",
    blurb: "Save 58% vs monthly. Cancel anytime.",
    hasTrial: true,
  },
]

interface PromoOk {
  valid: true
  code: string
  percent_off: number
  duration_type: string | null
  duration_periods: number | null
  original_price_cents: number
  discounted_price_cents: number
  stripe_coupon_id: string
  apple_offer_id: string
}

interface PromoErr {
  valid: false
  error_code: string
  message: string
}

type PromoState = { status: "idle" } | { status: "validating" } | { status: "ok"; data: PromoOk } | { status: "error"; message: string }

const LARAVEL_API = "/api/laravel"

export default function PremiumPlansPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialCode = (searchParams.get("code") || "").toUpperCase()

  const [user, setUser] = useState<PremiumWebUser | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<PlanId>("yearly")
  const [codeInput, setCodeInput] = useState(initialCode)
  const [promo, setPromo] = useState<PromoState>({ status: "idle" })
  const [checkingOut, setCheckingOut] = useState(false)
  const [checkoutError, setCheckoutError] = useState("")

  // Auth gate — Phase 3 sets the bearer session in localStorage.
  // Phase 7 prep: also check for an active subscription before showing the
  // plan picker. Catches deep-links directly to /premium/plans that bypass
  // the /premium check, protecting against duplicate purchases.
  useEffect(() => {
    const u = getUser()
    if (!u) {
      const fwd = initialCode ? `?code=${encodeURIComponent(initialCode)}` : ""
      router.replace(`/premium${fwd}`)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`${LARAVEL_API}/premium/subscription`, {
          headers: { ...authHeader() },
        })
        if (res.ok) {
          const body = (await res.json()) as { has_subscription?: boolean }
          if (body?.has_subscription === true) {
            if (!cancelled) router.replace("/account?already_premium=1")
            return
          }
        }
      } catch {
        // Network failure — fall through and show the picker.
      }
      if (!cancelled) setUser(u)
    })()
    return () => {
      cancelled = true
    }
  }, [router, initialCode])

  // Auto-validate a code passed via ?code= once the user is hydrated and the
  // selected plan changes. Skip if the user already cleared the input.
  useEffect(() => {
    if (!user || !codeInput) return
    if (promo.status === "validating") return
    void validateCode(codeInput, selectedPlan)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, selectedPlan])

  async function validateCode(code: string, plan: PlanId) {
    setPromo({ status: "validating" })
    try {
      const res = await fetch(`${LARAVEL_API}/premium/promo/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ code, plan }),
      })
      const json = await res.json()
      if (!res.ok || !json?.valid) {
        setPromo({ status: "error", message: json?.message || "Code not valid for this plan." })
        return
      }
      setPromo({ status: "ok", data: json as PromoOk })
    } catch {
      setPromo({ status: "error", message: "Couldn't reach the server. Try again." })
    }
  }

  function clearCode() {
    setCodeInput("")
    setPromo({ status: "idle" })
  }

  async function handleSubscribe() {
    if (!user) return
    setCheckingOut(true)
    setCheckoutError("")
    try {
      const body: Record<string, string> = { plan: selectedPlan }
      if (promo.status === "ok") body.code = promo.data.code

      const res = await fetch(`${LARAVEL_API}/web/premium/checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok || !json?.checkout_url) {
        setCheckoutError(json?.message || json?.error || "Couldn't start checkout. Try again.")
        return
      }
      window.location.href = json.checkout_url
    } catch {
      setCheckoutError("Network error. Try again.")
    } finally {
      setCheckingOut(false)
    }
  }

  if (!user) {
    return (
      <main className="min-h-[calc(100vh-200px)] flex items-center justify-center">
        <p className="text-muted">Loading…</p>
      </main>
    )
  }

  const currentPlan = PLANS.find(p => p.id === selectedPlan)!
  const displayCents = promo.status === "ok" ? promo.data.discounted_price_cents : currentPlan.priceCents
  const showStrikethrough = promo.status === "ok" && promo.data.discounted_price_cents < currentPlan.priceCents
  // A promo code replaces the free trial (Apple/Stripe — can't stack), so the
  // trial only applies to a promo-free yearly selection. The backend makes the
  // authoritative call; this just drives the copy.
  const isTrial = currentPlan.hasTrial && promo.status !== "ok"
  const ctaLabel = checkingOut
    ? "Starting checkout…"
    : isTrial
      ? "Start 7-Day Free Trial"
      : "Continue to checkout"
  const reassurance = isTrial
    ? "7 days free, then $24.99/year • cancel anytime"
    : `${formatCents(displayCents)} ${currentPlan.id === "yearly" ? "/ year" : "/ month"} • cancel anytime`

  return (
    <main className="min-h-[calc(100vh-200px)] py-12">
      <SectionContainer>
        <div className="max-w-3xl mx-auto">
          <div className="mb-10 text-center">
            <h1 className="text-4xl font-bold mb-2">Choose your plan</h1>
            <p className="text-muted">
              Signed in as <span className="font-semibold">{user.full_name}</span>{" "}
              ({user.phone_number}).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {PLANS.map(plan => {
              const selected = plan.id === selectedPlan
              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`relative text-left rounded-2xl border-2 p-6 bg-white shadow-sm transition-all cursor-pointer ${
                    selected ? "border-primary shadow-primary/20 shadow-md" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {plan.badge && (
                    <span className="absolute -top-3 right-4 px-3 py-1 rounded-full bg-primary text-white text-xs font-semibold">
                      {plan.badge}
                    </span>
                  )}
                  <h3 className="text-lg font-semibold mb-1">{plan.label}</h3>
                  <p className="text-3xl font-bold mb-1">
                    {plan.priceLabel}
                    <span className="text-base font-medium text-muted"> {plan.periodLabel}</span>
                  </p>
                  <p className="text-sm text-muted mb-3">{plan.perMonthLabel}</p>
                  <p className="text-xs text-muted">{plan.blurb}</p>
                  <p className="text-xs text-muted mt-1">
                    {plan.hasTrial ? "7-day free trial, then auto-renews yearly." : "Auto-renews monthly."}
                  </p>
                </button>
              )
            })}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 mb-6">
            <label htmlFor="promo" className="block text-sm font-semibold mb-2">
              Have a promo code?
            </label>
            <div className="flex gap-2">
              <input
                id="promo"
                type="text"
                value={codeInput}
                onChange={e => {
                  const v = e.target.value.toUpperCase().slice(0, 64)
                  setCodeInput(v)
                  if (promo.status !== "idle") setPromo({ status: "idle" })
                }}
                placeholder="Enter code"
                className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary uppercase tracking-wide"
              />
              {codeInput && promo.status === "ok" ? (
                <button
                  type="button"
                  onClick={clearCode}
                  className="px-4 py-3 rounded-lg border border-gray-300 text-sm font-medium hover:bg-gray-50 cursor-pointer"
                >
                  Remove
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => codeInput && validateCode(codeInput, selectedPlan)}
                  disabled={!codeInput || promo.status === "validating"}
                  className="px-4 py-3 rounded-lg bg-gray-900 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {promo.status === "validating" ? "Checking…" : "Apply"}
                </button>
              )}
            </div>
            {promo.status === "ok" && (
              <p className="mt-3 text-sm text-emerald-700">
                ✓ <span className="font-semibold">{promo.data.code}</span> applied —{" "}
                {promo.data.percent_off}% off.
              </p>
            )}
            {promo.status === "error" && (
              <p className="mt-3 text-sm text-red-700">{promo.message}</p>
            )}
          </div>

          <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-6">
            <div className="flex items-baseline justify-between mb-4">
              <div>
                <p className="text-sm text-muted">{currentPlan.label}</p>
                <p className="text-3xl font-bold text-ink flex items-baseline gap-3">
                  {showStrikethrough && (
                    <span className="text-lg text-gray-400 line-through">
                      {formatCents(currentPlan.priceCents)}
                    </span>
                  )}
                  {formatCents(displayCents)}
                </p>
              </div>
              <p className="text-sm text-muted">
                {currentPlan.id === "yearly" ? "billed yearly" : "billed monthly"}
              </p>
            </div>

            {checkoutError && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {checkoutError}
              </div>
            )}

            <button
              type="button"
              onClick={handleSubscribe}
              disabled={checkingOut}
              className="w-full inline-flex items-center justify-center font-semibold rounded-full px-7 py-3 bg-gradient-to-br from-[#2ECB4E] to-[#05EB54] text-white shadow-lg hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
            >
              {ctaLabel}
            </button>
            <p className="mt-3 text-xs text-muted text-center">
              {reassurance}. Secure checkout on Stripe.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              clearSession()
              router.replace("/premium")
            }}
            className="mt-8 mx-auto block text-sm text-muted underline cursor-pointer"
          >
            Sign out
          </button>
        </div>
      </SectionContainer>
    </main>
  )
}

function formatCents(c: number): string {
  return `$${(c / 100).toFixed(2)}`
}
