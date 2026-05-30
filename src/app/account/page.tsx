"use client"

import { useEffect, useState, useCallback, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import SectionContainer from "@/components/ui/SectionContainer"
import { authHeader, clearSession, getUser, type PremiumWebUser } from "@/lib/premium/auth"

// Premium 2.0 — /account: live subscription management + billing history +
// a clear cancel path. Cancellation is handled through the Stripe Customer
// Portal (OD-15): the "Manage or cancel" button opens a portal session where
// the user can cancel at period end, update payment method, and see invoices.
// iOS/Android subs can't be cancelled from the web (store rule) — we say so.

const LARAVEL_API = "/api/laravel"

interface Subscription {
  id: number
  plan: string
  plan_label: string | null
  status: string
  platform_origin: string
  current_period_end: string | null
  started_at: string | null
  ends_at: string | null
  promo_code: string | null
  payment_method: { brand: string | null; last4: string | null } | null
  original_price_cents: number | null
  discounted_price_cents: number | null
}

interface Transaction {
  id: number
  transaction_type: string
  amount_cents: number
  currency: string
  status: string
  occurred_at: string | null
  payment_method_brand: string | null
  payment_method_last4: string | null
}

type SubState =
  | { status: "loading" }
  | { status: "none" }
  | { status: "active"; sub: Subscription }

export default function AccountPage() {
  return (
    <Suspense fallback={null}>
      <AccountPageInner />
    </Suspense>
  )
}

function AccountPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const justSubscribed = searchParams.get("subscribed") === "1"
  const alreadyPremium = searchParams.get("already_premium") === "1"

  const [user, setUser] = useState<PremiumWebUser | null>(null)
  const [subState, setSubState] = useState<SubState>({ status: "loading" })
  const [history, setHistory] = useState<Transaction[]>([])
  const [openingPortal, setOpeningPortal] = useState(false)
  const [portalError, setPortalError] = useState("")

  const loadSubscription = useCallback(async () => {
    try {
      const res = await fetch(`${LARAVEL_API}/premium/subscription`, { headers: { ...authHeader() } })
      if (res.status === 401) {
        clearSession()
        router.replace("/premium")
        return
      }
      const body = (await res.json()) as { has_subscription?: boolean; subscription?: Subscription }
      if (body?.has_subscription && body.subscription) {
        setSubState({ status: "active", sub: body.subscription })
      } else {
        setSubState({ status: "none" })
      }
    } catch {
      setSubState({ status: "none" })
    }
  }, [router])

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch(`${LARAVEL_API}/premium/subscription/billing-history?per_page=10`, {
        headers: { ...authHeader() },
      })
      if (!res.ok) return
      const body = (await res.json()) as { data?: Transaction[] }
      setHistory(Array.isArray(body?.data) ? body.data : [])
    } catch {
      /* non-critical */
    }
  }, [])

  useEffect(() => {
    const u = getUser()
    if (!u) {
      router.replace("/premium")
      return
    }
    setUser(u)
    void loadSubscription()
    void loadHistory()
  }, [router, loadSubscription, loadHistory])

  async function openPortal() {
    setOpeningPortal(true)
    setPortalError("")
    try {
      const res = await fetch(`${LARAVEL_API}/premium/subscription/stripe-portal-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ return_url: `${window.location.origin}/account` }),
      })
      const json = await res.json()
      const url = json?.url || json?.portal_url
      if (!res.ok || !url) {
        setPortalError(json?.message || "Couldn't open the billing portal. Try again.")
        return
      }
      window.location.href = url
    } catch {
      setPortalError("Network error. Try again.")
    } finally {
      setOpeningPortal(false)
    }
  }

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
            Signed in as <span className="font-semibold">{user.full_name}</span> ({user.phone_number}).
          </p>

          {justSubscribed && (
            <div className="mb-6 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800">
              🎉 You&apos;re Premium! A confirmation email is on its way. Manage your plan anytime below.
            </div>
          )}
          {alreadyPremium && (
            <div className="mb-6 rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
              You already have Premium — here&apos;s your subscription.
            </div>
          )}

          <SubscriptionCard
            subState={subState}
            history={history}
            openingPortal={openingPortal}
            portalError={portalError}
            onManage={openPortal}
          />

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

          <div className="flex justify-end">
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

function SubscriptionCard({
  subState,
  history,
  openingPortal,
  portalError,
  onManage,
}: {
  subState: SubState
  history: Transaction[]
  openingPortal: boolean
  portalError: string
  onManage: () => void
}) {
  if (subState.status === "loading") {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-6 mb-6">
        <p className="text-sm text-muted">Loading your subscription…</p>
      </section>
    )
  }

  if (subState.status === "none") {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-6 mb-6">
        <h2 className="text-lg font-semibold mb-2">Subscription</h2>
        <p className="text-sm text-muted mb-4">You don&apos;t have an active Premium subscription.</p>
        <Link
          href="/premium/plans"
          className="inline-flex items-center justify-center font-semibold rounded-full px-6 py-3 bg-gradient-to-br from-[#2ECB4E] to-[#05EB54] text-white shadow-lg hover:brightness-110 transition-all"
        >
          Get Bizzy Premium →
        </Link>
      </section>
    )
  }

  const { sub } = subState
  const isWeb = sub.platform_origin === "web"
  const isCancelling = sub.status === "cancelling"
  const isTrialing = sub.status === "trialing"
  const planLabel = sub.plan_label || sub.plan || "Premium"
  const periodEnd = fmtDate(sub.current_period_end)

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 mb-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Bizzy Premium · {planLabel}</h2>
          <StatusLine status={sub.status} periodEnd={periodEnd} isTrialing={isTrialing} isCancelling={isCancelling} />
        </div>
        <StatusBadge status={sub.status} />
      </div>

      {sub.payment_method?.last4 && (
        <p className="text-sm text-muted mb-4">
          {sub.payment_method.brand ? cap(sub.payment_method.brand) : "Card"} ending in {sub.payment_method.last4}
        </p>
      )}

      {/* Manage / cancel */}
      {isWeb ? (
        <>
          <button
            type="button"
            onClick={onManage}
            disabled={openingPortal}
            className="inline-flex items-center justify-center font-semibold rounded-full px-6 py-3 bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all"
          >
            {openingPortal ? "Opening…" : isCancelling ? "Manage subscription" : "Manage or cancel subscription"}
          </button>
          <p className="mt-2 text-xs text-muted">
            {isCancelling
              ? "Your subscription is set to cancel at the end of the current period. You can resume it in the billing portal."
              : "Opens Stripe's secure billing portal where you can cancel, change your payment method, or download invoices."}
          </p>
          {portalError && <p className="mt-2 text-sm text-red-700">{portalError}</p>}
        </>
      ) : (
        <p className="text-sm text-muted">
          This subscription was purchased on {sub.platform_origin === "ios" ? "the App Store" : "Google Play"}. Manage or
          cancel it from your {sub.platform_origin === "ios" ? "Apple ID subscription settings" : "Play Store account"}.
        </p>
      )}

      {history.length > 0 && (
        <div className="mt-6 border-t border-gray-100 pt-4">
          <h3 className="text-sm font-semibold mb-2">Billing history</h3>
          <ul className="divide-y divide-gray-100">
            {history.map(tx => (
              <li key={tx.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <span className="font-medium">{txLabel(tx.transaction_type)}</span>
                  <span className="text-muted"> · {fmtDate(tx.occurred_at)}</span>
                </div>
                <span className={tx.status === "succeeded" ? "" : "text-red-600"}>
                  {tx.amount_cents > 0 ? fmtMoney(tx.amount_cents, tx.currency) : "—"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

function StatusLine({
  status,
  periodEnd,
  isTrialing,
  isCancelling,
}: {
  status: string
  periodEnd: string | null
  isTrialing: boolean
  isCancelling: boolean
}) {
  if (isTrialing) {
    return <p className="text-sm text-muted mt-1">Free trial — billing starts {periodEnd ?? "soon"}.</p>
  }
  if (isCancelling) {
    return <p className="text-sm text-amber-700 mt-1">Premium until {periodEnd ?? "the end of the period"} — won&apos;t renew.</p>
  }
  if (status === "past_due") {
    return <p className="text-sm text-red-700 mt-1">Payment past due — update your card to keep Premium.</p>
  }
  return <p className="text-sm text-muted mt-1">Renews {periodEnd ?? "automatically"}.</p>
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    active: { label: "Active", cls: "bg-emerald-100 text-emerald-800" },
    trialing: { label: "Trial", cls: "bg-blue-100 text-blue-800" },
    cancelling: { label: "Cancelling", cls: "bg-amber-100 text-amber-800" },
    past_due: { label: "Past due", cls: "bg-red-100 text-red-800" },
    canceled: { label: "Canceled", cls: "bg-gray-100 text-gray-700" },
  }
  const s = map[status] || { label: cap(status), cls: "bg-gray-100 text-gray-700" }
  return <span className={`px-3 py-1 rounded-full text-xs font-semibold ${s.cls}`}>{s.label}</span>
}

function fmtDate(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function fmtMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: (currency || "USD").toUpperCase() }).format(
    cents / 100,
  )
}

function txLabel(type: string): string {
  const map: Record<string, string> = {
    initial_purchase: "Subscription started",
    renewal: "Renewal",
    prepaid_purchase: "Purchase",
    cancellation: "Cancellation",
    failed_payment: "Failed payment",
    refund: "Refund",
    reactivation: "Reactivated",
  }
  return map[type] || cap(type.replace(/_/g, " "))
}

function cap(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}
