"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import SectionContainer from "@/components/ui/SectionContainer"
import { saveSession } from "@/lib/premium/auth"

// Premium 2.0 Phase 3 — bizzyu.com/premium entry. Phone-OTP signup/login.
// PRD §7.2 (FR-W-5/6/7), §6.4, §12.8. After verify, lands on /premium/plans.

interface University {
  id: number
  name: string
}

type Step = "phone" | "otp" | "profile" | "done"

const LARAVEL_API = "/api/laravel"

export default function PremiumAuthPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("phone")
  const [phone, setPhone] = useState("")
  const [otp, setOtp] = useState("")
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [universityId, setUniversityId] = useState<string>("")
  const [universities, setUniversities] = useState<University[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [expiresIn, setExpiresIn] = useState(0)

  // Countdown timer for OTP expiry.
  useEffect(() => {
    if (step !== "otp" || expiresIn <= 0) return
    const id = setInterval(() => setExpiresIn(v => Math.max(0, v - 1)), 1000)
    return () => clearInterval(id)
  }, [step, expiresIn])

  // Pre-fetch universities list once we know the user is new.
  useEffect(() => {
    if (step !== "profile" || universities.length > 0) return
    fetch(`${LARAVEL_API}/university-list`, { method: "POST" })
      .then(r => r.json())
      .then(j => {
        if (j?.data && Array.isArray(j.data)) {
          setUniversities(j.data.map((u: { id: number; name: string }) => ({ id: u.id, name: u.name })))
        }
      })
      .catch(() => setError("Could not load universities. Refresh to retry."))
  }, [step, universities.length])

  function formatPhone(raw: string): string {
    const digits = raw.replace(/\D/g, "").slice(0, 10)
    if (digits.length <= 3) return digits
    if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    const digits = phone.replace(/\D/g, "")
    if (digits.length !== 10) {
      setError("Enter a valid 10-digit US phone number.")
      return
    }
    setBusy(true)
    try {
      const res = await fetch(`${LARAVEL_API}/web/auth/otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: `+1${digits}` }),
      })
      const json = await res.json()
      if (!res.ok || !json?.sent) {
        setError(json?.error || "Could not send code. Try again.")
        return
      }
      setExpiresIn(json.expires_in || 300)
      setStep("otp")
    } catch {
      setError("Network error. Try again.")
    } finally {
      setBusy(false)
    }
  }

  async function submitVerify(extra: Record<string, string | number> = {}) {
    setError("")
    setBusy(true)
    try {
      const digits = phone.replace(/\D/g, "")
      const body = {
        phone_number: `+1${digits}`,
        otp,
        ...extra,
      }
      const res = await fetch(`${LARAVEL_API}/web/auth/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json?.error || "Verification failed.")
        return null
      }
      return json
    } catch {
      setError("Network error. Try again.")
      return null
    } finally {
      setBusy(false)
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    if (otp.length !== 6) {
      setError("Enter the 6-digit code.")
      return
    }
    const json = await submitVerify()
    if (!json) return

    // New user without profile yet → collect profile then re-verify.
    if (json.needs_profile) {
      setStep("profile")
      return
    }

    if (json.token && json.user) {
      saveSession(json.token, json.user)
      setStep("done")
      router.push("/premium/plans")
    }
  }

  async function handleSubmitProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName || !email || !universityId) {
      setError("Fill in all fields.")
      return
    }
    const json = await submitVerify({
      full_name: fullName,
      email,
      university_id: parseInt(universityId, 10),
    })
    if (!json) return
    if (json.token && json.user) {
      saveSession(json.token, json.user)
      setStep("done")
      router.push("/premium/plans")
    }
  }

  return (
    <main className="min-h-[calc(100vh-200px)] py-16">
      <SectionContainer>
        <div className="max-w-md mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold mb-2">Bizzy Premium</h1>
            <p className="text-muted">
              {step === "phone" && "Sign in with your phone to continue."}
              {step === "otp" && `We sent a 6-digit code to ${phone}.`}
              {step === "profile" && "Tell us a little about yourself."}
              {step === "done" && "Signed in. Loading plans…"}
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-400 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {step === "phone" && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="phone">
                  Phone number
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-600 text-sm">
                    +1
                  </span>
                  <input
                    id="phone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    value={phone}
                    onChange={e => setPhone(formatPhone(e.target.value))}
                    placeholder="555-123-4567"
                    className="flex-1 px-4 py-3 rounded-r-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
              </div>
              <SubmitButton busy={busy}>Send code</SubmitButton>
              <p className="text-xs text-muted text-center">
                We&apos;ll text you a one-time code. No password needed.
              </p>
            </form>
          )}

          {step === "otp" && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="otp">
                  6-digit code
                </label>
                <input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary text-center text-2xl tracking-widest"
                  required
                  autoFocus
                />
              </div>
              <SubmitButton busy={busy}>Verify</SubmitButton>
              <div className="flex justify-between text-xs text-muted">
                <button
                  type="button"
                  className="underline cursor-pointer"
                  onClick={() => {
                    setStep("phone")
                    setOtp("")
                    setError("")
                  }}
                >
                  Change number
                </button>
                <span>
                  {expiresIn > 0
                    ? `Expires in ${Math.floor(expiresIn / 60)}:${String(expiresIn % 60).padStart(2, "0")}`
                    : "Code expired"}
                </span>
              </div>
            </form>
          )}

          {step === "profile" && (
            <form onSubmit={handleSubmitProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="full_name">
                  Full name
                </label>
                <input
                  id="full_name"
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="university">
                  University
                </label>
                <select
                  id="university"
                  value={universityId}
                  onChange={e => setUniversityId(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                  required
                >
                  <option value="">Select your school</option>
                  {universities.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
              <SubmitButton busy={busy}>Continue</SubmitButton>
            </form>
          )}

          {step === "done" && (
            <div className="text-center py-8">
              <p className="text-muted">Redirecting…</p>
            </div>
          )}
        </div>
      </SectionContainer>
    </main>
  )
}

function SubmitButton({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="w-full inline-flex items-center justify-center font-semibold rounded-full px-7 py-3 bg-gradient-to-br from-[#2ECB4E] to-[#05EB54] text-white shadow-lg shadow-primary/25 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
    >
      {busy ? "Please wait…" : children}
    </button>
  )
}
