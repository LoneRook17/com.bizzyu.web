"use client"

import { useState, useEffect, useCallback } from "react"

import { getApiBaseUrl } from "@/lib/api-url"

const API_URL = getApiBaseUrl()

interface TicketInfo {
  id: number
  uuid: string
  attendee_name: string
  business_name: string
  venue_name: string | null
  line_skip_name: string
  instance_date: string
  instance_start_time: string
  instance_end_time: string
  instance_status: string
  is_redeemed: number
  redeemed_at: string | null
  price_paid_cents: number
}

interface RedeemResponse {
  status: "redeemed_now" | "already_redeemed" | "cancelled" | "not_active"
  ticket_info: TicketInfo
  business_name: string
}

type PageState = "loading" | "ticket_info" | "error"
type OverlayState = null | "confirming" | "redeemed_now" | "already_redeemed" | "cancelled" | "not_active"

export default function LineSkipScanClient({ uuid }: { uuid: string }) {
  const [state, setState] = useState<PageState>("loading")
  const [ticket, setTicket] = useState<TicketInfo | null>(null)
  const [error, setError] = useState("")
  const [overlay, setOverlay] = useState<OverlayState>(null)
  const [redeeming, setRedeeming] = useState(false)
  const [redeemResult, setRedeemResult] = useState<RedeemResponse | null>(null)

  const fetchTicket = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/ls/${uuid}`)
      if (!res.ok) {
        if (res.status === 404) {
          setError("Ticket not found")
          setState("error")
          return
        }
        throw new Error("Failed to fetch ticket")
      }
      const data = await res.json()
      setTicket(data.ticket)
      setState("ticket_info")
    } catch {
      setError("Could not load ticket information")
      setState("error")
    }
  }, [uuid])

  useEffect(() => {
    fetchTicket()
  }, [fetchTicket])

  const handleRedeem = async () => {
    setRedeeming(true)
    try {
      const res = await fetch(`${API_URL}/ls/${uuid}/redeem`, { method: "POST" })
      const data: RedeemResponse = await res.json()
      setRedeemResult(data)

      if (data.status === "redeemed_now") {
        setOverlay("redeemed_now")
        // Auto-dismiss after 5 seconds, refresh ticket info
        setTimeout(() => {
          setOverlay(null)
          setTicket(data.ticket_info)
        }, 5000)
      } else {
        setOverlay(data.status)
        // Update ticket info from response
        setTicket(data.ticket_info)
      }
    } catch {
      setError("Network error — please try again")
      setOverlay(null)
    } finally {
      setRedeeming(false)
    }
  }

  // --- Helpers ---

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00")
    return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
  }

  const formatTime = (timeStr: string) => {
    const [h, m] = timeStr.split(":")
    const hour = parseInt(h)
    const ampm = hour >= 12 ? "PM" : "AM"
    const h12 = hour % 12 || 12
    return `${h12}:${m} ${ampm}`
  }

  const formatDateTime = (dtStr: string) => {
    const d = new Date(dtStr)
    return d.toLocaleString("en-US", {
      month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
    })
  }

  const getTicketStatus = (): "valid" | "redeemed" | "cancelled" | "not_yet" | "ended" => {
    if (!ticket) return "valid"
    if (ticket.instance_status === "cancelled") return "cancelled"
    if (ticket.is_redeemed) return "redeemed"

    // Check redemption window
    const dateStr = typeof ticket.instance_date === "string"
      ? ticket.instance_date.substring(0, 10)
      : new Date(ticket.instance_date).toISOString().substring(0, 10)
    const start = new Date(`${dateStr}T${ticket.instance_start_time}`)
    const end = new Date(`${dateStr}T${ticket.instance_end_time}`)
    if (end <= start) end.setDate(end.getDate() + 1)
    const windowStart = new Date(start.getTime() - 3 * 60 * 60 * 1000)

    const now = new Date()
    // Approximate Eastern time comparison
    const eastern = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }))

    if (eastern < windowStart) return "not_yet"
    if (eastern > end) return "ended"
    return "valid"
  }

  // --- Full-screen overlays ---

  if (overlay === "confirming") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0a0f] p-6">
        <div className="w-full max-w-md text-center">
          <div className="mb-6 text-6xl">?</div>
          <h1 className="mb-2 text-2xl font-bold text-white">Confirm Entry</h1>
          <p className="mb-8 text-lg text-white/70">
            Redeem line skip for <span className="font-bold text-white">{ticket?.attendee_name}</span>?
          </p>
          <button
            onClick={handleRedeem}
            disabled={redeeming}
            className="mb-4 w-full rounded-2xl bg-[#D4AF37] py-5 text-xl font-bold text-white active:bg-[#b8962f] disabled:opacity-50 transition-colors"
          >
            {redeeming ? "Redeeming..." : "Yes, Redeem"}
          </button>
          <button
            onClick={() => setOverlay(null)}
            className="w-full rounded-2xl bg-white/10 py-4 text-lg font-semibold text-white/80 active:bg-white/20 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  if (overlay === "redeemed_now") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#D4AF37] p-6">
        <div className="w-full max-w-md text-center">
          <svg className="mx-auto mb-6 h-28 w-28 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h1 className="mb-3 text-4xl font-black text-white tracking-tight">ENTRY GRANTED</h1>
          <p className="mb-2 text-2xl font-bold text-white/90">{redeemResult?.ticket_info?.attendee_name}</p>
          <p className="text-lg text-white/80">{redeemResult?.ticket_info?.venue_name || redeemResult?.business_name}</p>
          <div className="mt-8 inline-block rounded-full bg-white/20 px-5 py-2">
            <span className="text-sm font-semibold text-white">Includes Cover</span>
          </div>
        </div>
      </div>
    )
  }

  if (overlay === "already_redeemed") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#dc2626] p-6">
        <div className="w-full max-w-md text-center">
          <svg className="mx-auto mb-6 h-28 w-28 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h1 className="mb-3 text-4xl font-black text-white tracking-tight">ALREADY REDEEMED</h1>
          {redeemResult?.ticket_info?.redeemed_at && (
            <p className="text-lg text-white/80">Redeemed at {formatDateTime(redeemResult.ticket_info.redeemed_at)}</p>
          )}
          <button
            onClick={() => setOverlay(null)}
            className="mt-8 w-full rounded-2xl bg-white/20 py-4 text-lg font-semibold text-white active:bg-white/30 transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    )
  }

  if (overlay === "cancelled") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#dc2626] p-6">
        <div className="w-full max-w-md text-center">
          <svg className="mx-auto mb-6 h-28 w-28 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
          <h1 className="mb-3 text-4xl font-black text-white tracking-tight">CANCELLED</h1>
          <p className="text-lg text-white/80">This line skip night has been cancelled</p>
          <button
            onClick={() => setOverlay(null)}
            className="mt-8 w-full rounded-2xl bg-white/20 py-4 text-lg font-semibold text-white active:bg-white/30 transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    )
  }

  if (overlay === "not_active") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#ea580c] p-6">
        <div className="w-full max-w-md text-center">
          <svg className="mx-auto mb-6 h-28 w-28 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h1 className="mb-3 text-4xl font-black text-white tracking-tight">NOT ACTIVE</h1>
          <p className="text-lg text-white/80">This line skip is outside the redemption window</p>
          <button
            onClick={() => setOverlay(null)}
            className="mt-8 w-full rounded-2xl bg-white/20 py-4 text-lg font-semibold text-white active:bg-white/30 transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    )
  }

  // --- Loading ---

  if (state === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          <p className="text-white/60">Loading ticket...</p>
        </div>
      </div>
    )
  }

  // --- Error ---

  if (state === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <svg className="mx-auto mb-4 h-16 w-16 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h2 className="mb-2 text-xl font-bold text-white">{error}</h2>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-white/10 px-6 py-2 text-sm font-medium text-white hover:bg-white/20 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  // --- Main ticket view ---

  const status = getTicketStatus()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-5 text-center">
          <span className="inline-block rounded-full bg-[#D4AF37]/20 px-4 py-1.5 text-sm font-bold text-[#D4AF37] tracking-wide">
            LINE SKIP
          </span>
        </div>

        {ticket && (
          <>
            {/* Ticket card */}
            <div className="mb-5 rounded-2xl bg-white/5 border border-white/10 p-5">
              {/* Venue name - large */}
              <h1 className="mb-1 text-2xl font-black text-white">{ticket.venue_name || ticket.business_name}</h1>

              {/* Attendee name */}
              <p className="mb-4 text-lg font-semibold text-[#D4AF37]">{ticket.attendee_name}</p>

              {/* Details */}
              <div className="mb-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/50">Date</span>
                  <span className="text-sm font-medium text-white">{formatDate(ticket.instance_date)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/50">Time</span>
                  <span className="text-sm font-medium text-white">
                    {formatTime(ticket.instance_start_time)} &ndash; {formatTime(ticket.instance_end_time)}
                  </span>
                </div>
              </div>

              {/* Guaranteed Entry badge */}
              <div className="inline-block rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 px-3.5 py-1">
                <span className="text-xs font-bold text-[#D4AF37] tracking-wide">INCLUDES COVER</span>
              </div>
            </div>

            {/* Status-dependent section */}
            {status === "redeemed" && (
              <div className="rounded-2xl bg-red-500/10 border border-red-500/30 p-5 text-center">
                <svg className="mx-auto mb-2 h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-lg font-bold text-red-400">Already Redeemed</p>
                {ticket.redeemed_at && (
                  <p className="mt-1 text-sm text-red-400/70">{formatDateTime(ticket.redeemed_at)}</p>
                )}
              </div>
            )}

            {status === "cancelled" && (
              <div className="rounded-2xl bg-red-500/10 border border-red-500/30 p-5 text-center">
                <svg className="mx-auto mb-2 h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
                <p className="text-lg font-bold text-red-400">This line skip night has been cancelled</p>
              </div>
            )}

            {status === "not_yet" && (
              <div className="rounded-2xl bg-orange-500/10 border border-orange-500/30 p-5 text-center">
                <svg className="mx-auto mb-2 h-12 w-12 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-lg font-bold text-orange-400">This line skip is not active yet</p>
                <p className="mt-1 text-sm text-orange-400/70">
                  Redemption opens at {formatTime(ticket.instance_start_time)} (3 hours before doors)
                </p>
              </div>
            )}

            {status === "ended" && (
              <div className="rounded-2xl bg-orange-500/10 border border-orange-500/30 p-5 text-center">
                <svg className="mx-auto mb-2 h-12 w-12 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-lg font-bold text-orange-400">This line skip has ended</p>
                <p className="mt-1 text-sm text-orange-400/70">
                  Window closed at {formatTime(ticket.instance_end_time)}
                </p>
              </div>
            )}

            {status === "valid" && (
              <button
                onClick={() => setOverlay("confirming")}
                className="w-full rounded-2xl bg-[#D4AF37] py-[18px] text-[22px] font-bold text-white shadow-lg shadow-[#D4AF37]/25 active:bg-[#b8962f] active:scale-[0.98] transition-all"
                style={{ minHeight: "70px" }}
              >
                Redeem for: {ticket.venue_name || ticket.business_name}
              </button>
            )}
          </>
        )}

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-white/30">
          Powered by Bizzy
        </p>
      </div>
    </div>
  )
}
