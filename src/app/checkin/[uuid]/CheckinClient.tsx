"use client"

import { useState, useEffect, useCallback } from "react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"

interface TicketInfo {
  uuid: string
  ticket_name: string
  ticket_type: string
  event_name: string
  event_id: number
  attendee_name: string
  venue_name: string | null
  start_date_time: string
  end_date_time: string
  is_redeemed: boolean
  redeemed_at: string | null
  is_refunded: boolean
  event_status: string
}

type PageState = "loading" | "ticket_info" | "error"

export default function CheckinClient({ uuid }: { uuid: string }) {
  const [state, setState] = useState<PageState>("loading")
  const [ticket, setTicket] = useState<TicketInfo | null>(null)
  const [error, setError] = useState("")

  // Fetch ticket info (public)
  const fetchTicket = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/checkin/${uuid}`)
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

  // Initialize page
  useEffect(() => {
    fetchTicket()
  }, [fetchTicket])

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  }

  // Loading
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

  // Error state
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

  // Main ticket view (info only)
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Bizzy branding */}
        <div className="mb-6 text-center">
          <img src="/images/bizzy-logo.png" alt="Bizzy" className="mx-auto h-8 opacity-80" />
        </div>

        {/* Ticket card */}
        {ticket && (
          <div className="mb-6 rounded-2xl bg-white/5 border border-white/10 p-6 backdrop-blur-sm">
            <h1 className="mb-1 text-xl font-bold text-white">{ticket.event_name}</h1>
            {ticket.venue_name && (
              <p className="mb-3 text-sm text-white/50">{ticket.venue_name}</p>
            )}

            <div className="mb-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/50">Ticket Holder</span>
                <span className="text-sm font-medium text-white">{ticket.attendee_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/50">Ticket</span>
                <span className="text-sm font-medium text-white">{ticket.ticket_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/50">Type</span>
                <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold bg-primary/20 text-primary">
                  Entry
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/50">Date</span>
                <span className="text-sm text-white/80">{formatDate(ticket.start_date_time)}</span>
              </div>
            </div>

            {/* Status indicators */}
            {ticket.is_redeemed && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-center">
                <p className="text-sm font-semibold text-red-400">Already Checked In</p>
                {ticket.redeemed_at && (
                  <p className="mt-0.5 text-xs text-red-400/70">{formatDate(ticket.redeemed_at)}</p>
                )}
              </div>
            )}
            {ticket.is_refunded && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-center">
                <p className="text-sm font-semibold text-red-400">Ticket Refunded</p>
              </div>
            )}
          </div>
        )}

        <p className="text-center text-xs text-white/40">
          Ticket check-in is handled by event staff using the Bizzy scanner.
        </p>
      </div>
    </div>
  )
}
