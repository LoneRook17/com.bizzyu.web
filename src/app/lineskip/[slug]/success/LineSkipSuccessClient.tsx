"use client"

import { useState, useEffect, useCallback } from "react"

import { getApiBaseUrl } from "@/lib/api-url"
import { isAppleWalletCapable } from "@/lib/apple-wallet"
import { nativeShare } from "@/lib/share"

const WEB_BASE_URL = process.env.NEXT_PUBLIC_WEB_BASE_URL || "https://bizzyu.com"

const API_URL = getApiBaseUrl()
const GOLD = "#D4AF37"
const GOLD_LIGHT = "#F0CD6E"

interface TicketInfo {
  id: number
  uuid: string
  business_name?: string
  instance_date?: string
  start_time?: string
  end_time?: string
}

export default function LineSkipSuccessClient({
  slugId,
  sessionId,
}: {
  slugId: string
  sessionId: string
}) {
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying")
  const [tickets, setTickets] = useState<TicketInfo[]>([])
  const [businessName, setBusinessName] = useState("")
  const [venueName, setVenueName] = useState("")
  const [venueId, setVenueId] = useState<string>(slugId)
  const [instanceDate, setInstanceDate] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [error, setError] = useState("")

  const verifyPayment = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/line-skips/checkout/verify-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || "Payment verification failed")
        setStatus("error")
        return
      }
      setTickets(data.tickets || [])
      setBusinessName(data.business_name || "")
      setVenueName(data.venue_name || "")
      if (data.venue_id) setVenueId(String(data.venue_id))
      setInstanceDate(data.instance_date || "")
      setStartTime(data.start_time || "")
      setEndTime(data.end_time || "")
      setStatus("success")
    } catch {
      setError("Could not verify payment. Please contact support.")
      setStatus("error")
    }
  }, [sessionId])

  useEffect(() => {
    verifyPayment()
  }, [verifyPayment])

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ""
    const d = new Date(dateStr + "T00:00:00")
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    })
  }

  const formatTime = (t: string) => {
    if (!t) return ""
    const [h, m] = t.split(":").map(Number)
    const ampm = h >= 12 ? "PM" : "AM"
    const h12 = h % 12 || 12
    return `${h12}:${String(m).padStart(2, "0")} ${ampm}`
  }

  if (status === "verifying") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f] font-[family-name:var(--font-fira)]">
        <div className="text-center">
          <div
            className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-white/20"
            style={{ borderTopColor: GOLD }}
          />
          <p className="text-white/60">Confirming your purchase...</p>
        </div>
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f] p-6 font-[family-name:var(--font-fira)]">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
            <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-bold text-white">{error}</h2>
          <a
            href={`/lineskip/${slugId}`}
            className="mt-4 inline-block rounded-lg bg-white/10 px-6 py-2 text-sm font-medium text-white hover:bg-white/20 transition-colors"
          >
            Back to Line Skips
          </a>
        </div>
      </div>
    )
  }

  const displayName = venueName || businessName

  // Mirrors the Laravel event checkout-success layout: success header →
  // "get it in the app" card (big store button + small Wallet pill + email
  // hint, NO inline QR codes) → details card → buy-more.
  return (
    <div className="min-h-screen bg-[#0a0a0f] font-[family-name:var(--font-fira)] text-gray-100">
      <div className="mx-auto max-w-2xl px-4 py-10">
        {/* Success header */}
        <div className="mb-8 text-center">
          <div
            className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full"
            style={{ backgroundColor: `${GOLD}1f`, border: `1px solid ${GOLD}33` }}
          >
            <svg className="h-10 w-10" style={{ color: GOLD }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-extrabold text-white">You&apos;re all set!</h1>
          <p className="mt-1 text-white/60">
            Your Line Skip{tickets.length > 1 ? "s are" : " is"} confirmed for {displayName}
          </p>
        </div>

        {/* Get your line skips in the app */}
        <div className="mb-6 rounded-2xl border border-[#1e1e2e] bg-[#141420] p-6 text-center">
          <h2 className="mb-2 text-2xl font-extrabold text-white">Get your Line Skips in the app</h2>
          <p className="mb-6 text-sm text-gray-400">
            Sign up with the <span className="font-semibold text-white">same phone number</span> you used at checkout.
          </p>

          <a
            href="https://apps.apple.com/app/id6683306360"
            target="_blank"
            rel="noreferrer"
            className="flex w-full items-center justify-center gap-2.5 rounded-2xl px-6 py-4 text-lg font-extrabold text-black transition hover:brightness-110 active:scale-[0.98]"
            style={{ background: `linear-gradient(135deg, ${GOLD_LIGHT}, ${GOLD})`, boxShadow: `0 16px 40px -12px ${GOLD}80` }}
          >
            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
            </svg>
            Download the Bizzy App
          </a>

          <AppleWalletLineSkipButton tickets={tickets} sessionId={sessionId} />

          <p className="mt-4 text-xs text-gray-500">
            Prefer email? Your QR codes are in your confirmation email.
          </p>
        </div>

        {/* Details card */}
        <div className="mb-6 overflow-hidden rounded-2xl border" style={{ borderColor: `${GOLD}40`, backgroundColor: `${GOLD}0d` }}>
          <div className="flex items-center justify-between px-5 py-3" style={{ backgroundColor: GOLD }}>
            <span className="text-sm font-extrabold text-black/80">LINE SKIP</span>
            <span className="rounded-full bg-black/10 px-3 py-0.5 text-xs font-bold text-black/70">INCLUDES COVER</span>
          </div>
          <div className="p-5">
            <h3 className="mb-4 text-lg font-extrabold text-white">{displayName}</h3>
            <div className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-white/50">Date</span>
                <span className="font-semibold text-white">{formatDate(instanceDate)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/50">Time</span>
                <span className="font-semibold text-white">
                  {formatTime(startTime)} - {formatTime(endTime)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/50">Line Skips</span>
                <span className="font-semibold text-white">{tickets.length}</span>
              </div>
            </div>
            <div className="my-4 border-t border-dashed border-white/15" />
            <p className="text-center text-xs text-white/40">
              Show your QR code at the door — cover included.
            </p>
          </div>
        </div>

        {/* Share */}
        <ShareVenueButton title={displayName} venueId={venueId} />

        {/* Buy more */}
        <a
          href={`/lineskip/${venueId}`}
          className="flex w-full items-center justify-center gap-2.5 rounded-2xl border border-[#1e1e2e] bg-[#141420] px-6 py-4 text-lg font-extrabold text-white transition hover:bg-[#1e1e2e] active:scale-[0.98]"
        >
          <svg className="h-5 w-5" style={{ color: GOLD }} fill="currentColor" viewBox="0 0 24 24">
            <path d="M13 2L4.094 12.688c-.391.469-.063 1.187.547 1.187H10l-1 8.125 8.906-10.688c.391-.469.063-1.187-.547-1.187H14l-1-8.125z" />
          </svg>
          Buy more Line Skips
        </a>

        {/* Footer */}
        <div className="mt-8 border-t border-white/5 pt-6 text-center">
          <p className="text-sm text-gray-600">
            Powered by <span className="font-semibold text-gray-400">Bizzy</span>
          </p>
        </div>
      </div>
    </div>
  )
}

function AppleWalletLineSkipButton({
  tickets,
  sessionId,
}: {
  tickets: TicketInfo[]
  sessionId: string
}) {
  // UA detection runs client-side only; render nothing until we know.
  const [show, setShow] = useState(false)
  useEffect(() => {
    setShow(isAppleWalletCapable())
  }, [])

  if (!show || tickets.length === 0) return null

  // Single anchor points at the `.pkpasses` bundle so iOS Safari surfaces one
  // PassKit sheet with every ticket stacked — mirrors the Flutter app's
  // `apple_passkit.addPasses()` flow used by `installLineSkipTicketPasses`.
  const label = `Add ${tickets.length > 1 ? `${tickets.length} ` : ""}to Apple Wallet`
  return (
    <a
      href={`${API_URL}/public/wallet/by-session/${encodeURIComponent(sessionId)}/line-skip-tickets-bundle`}
      className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl bg-black px-4 py-2 text-sm font-semibold text-gray-300 ring-1 ring-white/10 transition hover:bg-gray-900"
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
      </svg>
      {label}
    </a>
  )
}

function ShareVenueButton({ title, venueId }: { title: string; venueId: string }) {
  const [copied, setCopied] = useState(false)
  const shareUrl = `${WEB_BASE_URL}/venue/${venueId}?utm_source=web_share`
  const onClick = async () => {
    const outcome = await nativeShare({ title: title || "Bizzy", url: shareUrl })
    if (outcome === "copied") {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }
  return (
    <div className="mb-3">
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
        {copied ? "Link Copied!" : "Share"}
      </button>
    </div>
  )
}
