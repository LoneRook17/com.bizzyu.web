"use client"

import { useState, useEffect, useCallback } from "react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
const GOLD = "#D4AF37"

interface TicketInfo {
  id: number
  uuid: string
  business_name?: string
  instance_date?: string
  start_time?: string
  end_time?: string
}

export default function LineSkipSuccessClient({
  businessId,
  sessionId,
}: {
  businessId: string
  sessionId: string
}) {
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying")
  const [tickets, setTickets] = useState<TicketInfo[]>([])
  const [businessName, setBusinessName] = useState("")
  const [venueName, setVenueName] = useState("")
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
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          <p className="text-white/60">Confirming your purchase...</p>
        </div>
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] p-6">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
            <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-bold text-white">{error}</h2>
          <a
            href={`/lineskip/${businessId}`}
            className="mt-4 inline-block rounded-lg bg-white/10 px-6 py-2 text-sm font-medium text-white hover:bg-white/20 transition-colors"
          >
            Back to Line Skips
          </a>
        </div>
      </div>
    )
  }

  const displayName = venueName || businessName

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0a] p-6">
      <div className="w-full max-w-md">
        {/* Success animation */}
        <div className="mb-6 text-center">
          <div
            className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full"
            style={{ backgroundColor: `${GOLD}20` }}
          >
            <svg className="h-10 w-10" style={{ color: GOLD }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="mb-2 text-2xl font-bold text-white">You&apos;re all set!</h1>
          <p className="text-white/60">
            Your Line Skip{tickets.length > 1 ? "s are" : " is"} confirmed
          </p>
        </div>

        {/* Gold ticket preview */}
        <div
          className="mb-6 overflow-hidden rounded-2xl"
          style={{ backgroundColor: `${GOLD}15`, border: `1px solid ${GOLD}40` }}
        >
          {/* Header */}
          <div className="px-6 py-4" style={{ backgroundColor: GOLD }}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-black/80">LINE SKIP</span>
              <span className="rounded-full bg-black/10 px-3 py-0.5 text-xs font-bold text-black/70">
                INCLUDES COVER
              </span>
            </div>
          </div>

          {/* Body */}
          <div className="p-6">
            <h2 className="mb-4 text-lg font-bold text-white">{displayName}</h2>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/50">Date</span>
                <span className="text-sm font-medium text-white">{formatDate(instanceDate)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/50">Time</span>
                <span className="text-sm font-medium text-white">
                  {formatTime(startTime)} - {formatTime(endTime)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/50">Tickets</span>
                <span className="text-sm font-medium text-white">{tickets.length}</span>
              </div>
            </div>

            {/* Dashed separator */}
            <div className="my-4 border-t border-dashed border-white/20" />

            <p className="text-center text-xs text-white/40">
              Show your QR code at the door. Cover included.
              <br />
              Check your email for ticket details.
            </p>
          </div>
        </div>

        {/* Download app CTA */}
        <div className="rounded-xl bg-white/5 border border-white/10 p-5">
          <div className="flex items-center gap-4">
            <img
              src="/images/appicon.png"
              alt="Bizzy"
              className="h-14 w-14 rounded-xl"
            />
            <div className="flex-1">
              <h3 className="text-sm font-bold text-white">Get the Bizzy App</h3>
              <p className="mt-0.5 text-xs text-white/50">Manage your tickets anytime, anywhere</p>
            </div>
          </div>
          <a
            href="https://apps.apple.com/app/id6683306360"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-black transition-colors"
            style={{ backgroundColor: GOLD }}
          >
            <svg className="h-4 w-4" viewBox="0 0 384 512" fill="currentColor">
              <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
            </svg>
            Download on App Store
          </a>
        </div>

        <div className="mt-6 text-center">
          <a
            href={`/lineskip/${businessId}`}
            className="text-sm text-white/40 hover:text-white/60 transition-colors"
          >
            Buy more Line Skips
          </a>
        </div>
      </div>
    </div>
  )
}
