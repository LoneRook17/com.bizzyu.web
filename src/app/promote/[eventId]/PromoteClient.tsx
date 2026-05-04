"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { getApiBaseUrl } from "@/lib/api-url"

const API_URL = getApiBaseUrl()
const TOKEN_STORAGE_KEY = "bz_auth_token"

interface PromoterProfile {
  user_id: number
  phone_verified: boolean
  stripe_connect_id: string | null
  stripe_connect_onboarded: boolean
  terms_accepted_at: string | null
  pending_balance_cents: number
  paid_balance_cents: number
}

interface Props {
  eventId: number
  eventName: string
  venueName: string | null
  startDateTime: string | null
  flyerImageUrl: string | null
  commissionType: "percent" | "fixed" | null
  commissionValue: number | null
}

type Step = "phone-send" | "phone-verify" | "stripe" | "terms" | "done"

function commissionLabel(type: "percent" | "fixed" | null, value: number | null): string {
  if (!type || value == null) return "Earn a commission on every ticket"
  if (type === "percent") return `Earn ${(value / 100).toFixed(value % 100 === 0 ? 0 : 2)}% on every ticket sold`
  return `Earn $${(value / 100).toFixed(2)} on every ticket sold`
}

export default function PromoteClient(props: Props) {
  const [token, setToken] = useState<string | null>(null)
  const [tokenInput, setTokenInput] = useState("")
  const [profile, setProfile] = useState<PromoterProfile | null>(null)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [step, setStep] = useState<Step>("phone-send")

  const [phone, setPhone] = useState("")
  const [code, setCode] = useState("")
  const [termsChecked, setTermsChecked] = useState(false)

  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const stripePollRef = useRef<number | null>(null)

  const apiCall = useCallback(
    async (path: string, init: RequestInit = {}) => {
      const headers = new Headers(init.headers)
      headers.set("Content-Type", "application/json")
      if (token) headers.set("Authorization", `Bearer ${token}`)
      return fetch(`${API_URL}${path}`, { ...init, headers })
    },
    [token],
  )

  // Hydrate token from localStorage and bootstrap profile
  useEffect(() => {
    const stored = window.localStorage.getItem(TOKEN_STORAGE_KEY)
    if (stored) setToken(stored)
  }, [])

  useEffect(() => {
    if (!token) {
      setProfileLoaded(true)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const res = await apiCall("/promoter/me")
        if (cancelled) return
        if (res.status === 401) {
          window.localStorage.removeItem(TOKEN_STORAGE_KEY)
          setToken(null)
          setProfileLoaded(true)
          return
        }
        const body = await res.json()
        const p = body.profile as PromoterProfile | null
        setProfile(p)
        setProfileLoaded(true)
        if (p?.terms_accepted_at) setStep("done")
        else if (p?.stripe_connect_onboarded) setStep("terms")
        else if (p?.phone_verified) setStep("stripe")
        else setStep("phone-send")
      } catch {
        if (!cancelled) setProfileLoaded(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, apiCall])

  // Stripe polling — fires after the user clicks "Open Stripe" so we can
  // detect onboarding completion via the webhook and advance the wizard.
  const pollStripe = useCallback(() => {
    if (stripePollRef.current != null) return
    stripePollRef.current = window.setInterval(async () => {
      const res = await apiCall("/promoter/me")
      if (!res.ok) return
      const body = await res.json()
      const p = body.profile as PromoterProfile | null
      if (p) setProfile(p)
      if (p?.stripe_connect_onboarded) {
        if (stripePollRef.current != null) {
          window.clearInterval(stripePollRef.current)
          stripePollRef.current = null
        }
        setStep(p.terms_accepted_at ? "done" : "terms")
      }
    }, 4000)
  }, [apiCall])

  useEffect(() => {
    return () => {
      if (stripePollRef.current != null) {
        window.clearInterval(stripePollRef.current)
        stripePollRef.current = null
      }
    }
  }, [])

  const saveToken = (t: string) => {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, t)
    setToken(t)
  }

  // ─── Step handlers ────────────────────────────────────────────────────────

  const handleSendCode = async () => {
    setBusy(true)
    setErr(null)
    try {
      const digits = phone.replace(/\D/g, "")
      const res = await apiCall("/promoter/onboard/phone-verify", {
        method: "POST",
        body: JSON.stringify({ phone: digits }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setErr(body.message || "Could not send code")
        return
      }
      setStep("phone-verify")
    } finally {
      setBusy(false)
    }
  }

  const handleVerifyCode = async () => {
    setBusy(true)
    setErr(null)
    try {
      const digits = phone.replace(/\D/g, "")
      const res = await apiCall("/promoter/onboard/phone-verify", {
        method: "POST",
        body: JSON.stringify({ phone: digits, code: code.trim() }),
      })
      const body = await res.json()
      if (!res.ok) {
        setErr(body.message || "Invalid code")
        return
      }
      const p = body.profile as PromoterProfile | null
      if (p) setProfile(p)
      setStep("stripe")
    } finally {
      setBusy(false)
    }
  }

  const handleStripe = async () => {
    setBusy(true)
    setErr(null)
    try {
      const res = await apiCall("/promoter/onboard/stripe", { method: "POST" })
      const body = await res.json()
      if (!res.ok || !body.url) {
        setErr(body.message || "Could not start Stripe onboarding")
        return
      }
      window.open(body.url, "_blank", "noopener")
      pollStripe()
    } finally {
      setBusy(false)
    }
  }

  const handleAcceptTerms = async () => {
    if (!termsChecked) return
    setBusy(true)
    setErr(null)
    try {
      const res = await apiCall("/promoter/onboard/terms", { method: "POST" })
      const body = await res.json()
      if (!res.ok) {
        setErr(body.message || "Could not accept terms")
        return
      }
      const p = body.profile as PromoterProfile | null
      if (p) setProfile(p)
      setStep("done")
    } finally {
      setBusy(false)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  if (!profileLoaded) {
    return (
      <main className="min-h-screen bg-white text-ink flex items-center justify-center">
        <div className="text-sm text-gray-500">Loading…</div>
      </main>
    )
  }

  if (!token) {
    return (
      <main className="min-h-screen bg-white text-ink">
        <div className="max-w-lg mx-auto px-4 py-10">
          <h1 className="text-2xl font-bold mb-2">Promote {props.eventName}</h1>
          <p className="text-gray-600 mb-6">
            {commissionLabel(props.commissionType, props.commissionValue)}.
          </p>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
            <p className="text-sm text-gray-700 mb-3">
              The promoter program is signed in through your Bizzy mobile app.
              Open the app and tap &ldquo;Get paid to promote this event&rdquo; on
              the event page.
            </p>
            <p className="text-xs text-gray-500 mb-3">
              Or paste a Bizzy auth token to continue here:
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Paste token"
                className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
              />
              <button
                onClick={() => tokenInput && saveToken(tokenInput.trim())}
                className="rounded bg-ink text-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
                disabled={!tokenInput.trim()}
              >
                Continue
              </button>
            </div>
          </div>
          <div className="mt-6 text-center">
            <Link href={`/event/${props.eventId}`} className="text-sm text-primary hover:underline">
              Back to event
            </Link>
          </div>
        </div>
      </main>
    )
  }

  const isReturning = profile?.terms_accepted_at != null

  return (
    <main className="min-h-screen bg-white text-ink">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <Link href={`/event/${props.eventId}`} className="text-sm text-gray-500 hover:underline">
          &larr; Back to event
        </Link>
        <h1 className="text-3xl font-bold mt-3 mb-1">{props.eventName}</h1>
        {props.venueName && (
          <p className="text-sm text-gray-600 mb-4">at {props.venueName}</p>
        )}
        <p className="text-base text-gray-800 mb-8">
          {commissionLabel(props.commissionType, props.commissionValue)}.
        </p>

        {isReturning ? (
          <DashboardStub profile={profile!} />
        ) : (
          <Wizard
            step={step}
            phone={phone}
            setPhone={setPhone}
            code={code}
            setCode={setCode}
            termsChecked={termsChecked}
            setTermsChecked={setTermsChecked}
            busy={busy}
            err={err}
            profile={profile}
            onSendCode={handleSendCode}
            onVerifyCode={handleVerifyCode}
            onStripe={handleStripe}
            onAcceptTerms={handleAcceptTerms}
          />
        )}
      </div>
    </main>
  )
}

interface WizardProps {
  step: Step
  phone: string
  setPhone: (v: string) => void
  code: string
  setCode: (v: string) => void
  termsChecked: boolean
  setTermsChecked: (v: boolean) => void
  busy: boolean
  err: string | null
  profile: PromoterProfile | null
  onSendCode: () => void
  onVerifyCode: () => void
  onStripe: () => void
  onAcceptTerms: () => void
}

function Wizard(p: WizardProps) {
  const stepIndex = (() => {
    switch (p.step) {
      case "phone-send":
      case "phone-verify":
        return 0
      case "stripe":
        return 1
      case "terms":
        return 2
      case "done":
        return 3
    }
  })()

  return (
    <div>
      <ol className="flex items-center gap-2 mb-8">
        {["Phone", "Stripe", "Terms"].map((label, i) => {
          const state = i < stepIndex ? "done" : i === stepIndex ? "active" : "pending"
          return (
            <li key={label} className="flex items-center gap-2">
              <span
                className={
                  "rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold " +
                  (state === "done"
                    ? "bg-primary text-white"
                    : state === "active"
                      ? "bg-ink text-white"
                      : "bg-gray-200 text-gray-500")
                }
              >
                {i + 1}
              </span>
              <span className={state === "pending" ? "text-gray-400" : "text-ink"}>{label}</span>
              {i < 2 && <span className="w-8 h-px bg-gray-300 mx-2" />}
            </li>
          )
        })}
      </ol>

      {(p.step === "phone-send" || p.step === "phone-verify") && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Verify your phone</h2>
          <input
            type="tel"
            value={p.phone}
            onChange={(e) => p.setPhone(e.target.value)}
            placeholder="(555) 555-5555"
            className="w-full rounded border border-gray-300 px-3 py-2"
            disabled={p.step === "phone-verify"}
          />
          {p.step === "phone-verify" && (
            <input
              type="text"
              inputMode="numeric"
              value={p.code}
              onChange={(e) => p.setCode(e.target.value)}
              placeholder="6-digit code"
              className="w-full rounded border border-gray-300 px-3 py-2"
            />
          )}
          {p.err && <p className="text-sm text-red-600">{p.err}</p>}
          {p.step === "phone-send" ? (
            <button
              onClick={p.onSendCode}
              disabled={p.busy || p.phone.replace(/\D/g, "").length < 10}
              className="rounded-xl bg-primary text-white font-semibold px-6 py-2 disabled:opacity-50"
            >
              {p.busy ? "Sending…" : "Send code"}
            </button>
          ) : (
            <button
              onClick={p.onVerifyCode}
              disabled={p.busy || p.code.trim().length < 4}
              className="rounded-xl bg-primary text-white font-semibold px-6 py-2 disabled:opacity-50"
            >
              {p.busy ? "Verifying…" : "Verify"}
            </button>
          )}
        </section>
      )}

      {p.step === "stripe" && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Connect your Stripe account</h2>
          <p className="text-sm text-gray-600">
            Stripe Connect Express handles your payouts. We never see your bank details.
          </p>
          {p.err && <p className="text-sm text-red-600">{p.err}</p>}
          <button
            onClick={p.onStripe}
            disabled={p.busy}
            className="rounded-xl bg-primary text-white font-semibold px-6 py-2 disabled:opacity-50"
          >
            {p.busy ? "Opening…" : p.profile?.stripe_connect_id ? "Resume Stripe onboarding" : "Open Stripe"}
          </button>
          <p className="text-xs text-gray-500">
            Keep this tab open after you finish on Stripe — we&rsquo;ll detect when you&rsquo;re
            done and advance the next step automatically.
          </p>
        </section>
      )}

      {p.step === "terms" && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Accept the promoter terms</h2>
          <p className="text-sm text-gray-700">
            Stripe payout fees come out of your earnings. By continuing, you agree to the
            Bizzy Promoter Terms.
          </p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={p.termsChecked}
              onChange={(e) => p.setTermsChecked(e.target.checked)}
            />
            I agree to the Promoter Terms.
          </label>
          {p.err && <p className="text-sm text-red-600">{p.err}</p>}
          <button
            onClick={p.onAcceptTerms}
            disabled={p.busy || !p.termsChecked}
            className="rounded-xl bg-primary text-white font-semibold px-6 py-2 disabled:opacity-50"
          >
            {p.busy ? "Saving…" : "I agree"}
          </button>
        </section>
      )}

      {p.step === "done" && p.profile && <DashboardStub profile={p.profile} />}
    </div>
  )
}

function DashboardStub({ profile }: { profile: PromoterProfile }) {
  const pending = profile.pending_balance_cents / 100
  const paid = profile.paid_balance_cents / 100
  return (
    <section className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-primary/40 bg-primary/10 p-4">
          <div className="text-xs text-gray-600">Pending balance</div>
          <div className="text-2xl font-bold text-primary">${pending.toFixed(2)}</div>
        </div>
        <div className="rounded-xl border border-gray-300 bg-gray-50 p-4">
          <div className="text-xs text-gray-600">Paid out</div>
          <div className="text-2xl font-bold text-ink">${paid.toFixed(2)}</div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 p-4 flex items-center gap-3 text-sm">
        <span
          className={
            "inline-block w-2 h-2 rounded-full " +
            (profile.stripe_connect_onboarded ? "bg-primary" : "bg-orange-500")
          }
        />
        <span>
          {profile.stripe_connect_onboarded
            ? "Stripe Connect ready — you can receive payouts."
            : "Stripe Connect not finished — finish onboarding to receive payouts."}
        </span>
      </div>

      <button
        onClick={() => alert("Coming soon — link generation lands in Session 4.2.")}
        className="w-full rounded-xl bg-primary text-white font-semibold py-3 hover:brightness-110 transition"
      >
        Get my promoter link
      </button>

      <p className="text-xs text-gray-500">
        A full dashboard with attribution, sales, and payout history is launching soon.
      </p>
    </section>
  )
}
