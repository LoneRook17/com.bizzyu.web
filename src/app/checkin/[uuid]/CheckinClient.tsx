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

interface RedeemResult {
  status: string
  ticket_type: string | null
  ticket: {
    uuid: string
    ticket_name: string
    event_name: string
    owner_name: string
    redeemed_at: string | null
  }
}

interface AuthUser {
  id: number
  email: string
  full_name: string
  business_id: number
  role: string
}

type PageState = "loading" | "ticket_info" | "login" | "ready" | "checking_in" | "result" | "error"

export default function CheckinClient({ uuid }: { uuid: string }) {
  const [state, setState] = useState<PageState>("loading")
  const [ticket, setTicket] = useState<TicketInfo | null>(null)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [result, setResult] = useState<RedeemResult | null>(null)
  const [error, setError] = useState("")
  const [loginError, setLoginError] = useState("")
  const [loginLoading, setLoginLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

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
    } catch {
      setError("Could not load ticket information")
      setState("error")
    }
  }, [uuid])

  // Check if user is already authenticated
  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/business/auth/me`, {
        credentials: "include",
      })
      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
        return true
      }
    } catch {}
    return false
  }, [])

  // Initialize page
  useEffect(() => {
    async function init() {
      await fetchTicket()
      const isAuthed = await checkAuth()
      setState(isAuthed ? "ready" : "ticket_info")
    }
    init()
  }, [fetchTicket, checkAuth])

  // Handle login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginLoading(true)
    setLoginError("")
    try {
      const res = await fetch(`${API_URL}/business/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message || data.error || "Login failed")
      }
      const data = await res.json()
      setUser(data.user)
      setState("ready")
    } catch (err: any) {
      setLoginError(err.message || "Login failed")
    } finally {
      setLoginLoading(false)
    }
  }

  // Handle check-in
  const handleCheckin = async () => {
    setState("checking_in")
    try {
      const res = await fetch(`${API_URL}/checkin/${uuid}/redeem`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      })
      const data = await res.json()

      if (!res.ok) {
        // Permission or other error
        if (res.status === 403) {
          setError(data.error || "Not authorized to check in tickets for this event")
          setState("error")
          return
        }
        // Return as a "result" with the status so we can show RED
        setResult({
          status: data.status || "invalid",
          ticket_type: null,
          ticket: {
            uuid,
            ticket_name: ticket?.ticket_name || "",
            event_name: ticket?.event_name || "",
            owner_name: ticket?.attendee_name || "Guest",
            redeemed_at: null,
          },
        })
        setState("result")
        return
      }

      setResult(data)
      setState("result")

      // Auto-dismiss after 3 seconds
      setTimeout(() => {
        // Refresh ticket info and go back to ready
        fetchTicket().then(() => setState("ready"))
      }, 3000)
    } catch {
      setError("Check-in failed. Please try again.")
      setState("error")
    }
  }

  // Result overlay colors
  const getResultColor = () => {
    if (!result) return ""
    if (result.status === "redeemed_now") {
      return "from-[#0d7a3e] to-[#05EB54]" // GREEN
    }
    return "from-[#8B1A2B] to-[#c41e3a]" // RED
  }

  const getResultLabel = () => {
    if (!result) return ""
    if (result.status === "redeemed_now") {
      return "ENTRY"
    }
    const labels: Record<string, string> = {
      already_redeemed: "ALREADY SCANNED",
      invalid: "INVALID TICKET",
      refunded: "REFUNDED",
      event_cancelled: "EVENT CANCELLED",
      ticket_belongs_to_another_event: "WRONG EVENT",
      event_not_active: "EVENT NOT ACTIVE",
    }
    return labels[result.status] || "ERROR"
  }

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

  // Result overlay (full-screen)
  if (state === "result" && result) {
    return (
      <div
        className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br ${getResultColor()} p-8`}
      >
        <div className="text-center">
          {result.status === "redeemed_now" ? (
            <svg className="mx-auto mb-4 h-24 w-24 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="mx-auto mb-4 h-24 w-24 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          <h1 className="mb-2 text-5xl font-black text-white tracking-tight">{getResultLabel()}</h1>
          <p className="text-2xl font-semibold text-white/90">{result.ticket.owner_name}</p>
          <p className="mt-1 text-lg text-white/70">{result.ticket.ticket_name}</p>
        </div>
      </div>
    )
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

  // Main ticket view
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

        {/* Unauthenticated — show login prompt */}
        {state === "ticket_info" && (
          <div className="space-y-4">
            <button
              onClick={() => setState("login")}
              className="w-full rounded-xl bg-gradient-to-br from-[#2ECB4E] to-[#05EB54] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:brightness-110"
            >
              Log in to Check In
            </button>
            <p className="text-center text-xs text-white/40">
              Staff login required to check in tickets
            </p>
          </div>
        )}

        {/* Login form */}
        {state === "login" && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
              <h2 className="mb-4 text-lg font-semibold text-white">Staff Login</h2>
              <div className="mb-4">
                <label className="mb-1 block text-sm text-white/60">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="you@business.com"
                />
              </div>
              <div className="mb-4">
                <label className="mb-1 block text-sm text-white/60">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="Password"
                />
              </div>
              {loginError && (
                <p className="mb-3 text-sm text-red-400">{loginError}</p>
              )}
              <button
                type="submit"
                disabled={loginLoading}
                className="w-full rounded-lg bg-gradient-to-br from-[#2ECB4E] to-[#05EB54] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/25 transition-all hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loginLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Logging in...
                  </span>
                ) : (
                  "Log In"
                )}
              </button>
            </div>
            <button
              type="button"
              onClick={() => setState("ticket_info")}
              className="w-full text-center text-sm text-white/40 hover:text-white/60 transition-colors"
            >
              Cancel
            </button>
          </form>
        )}

        {/* Authenticated — show check-in button */}
        {(state === "ready" || state === "checking_in") && (
          <div className="space-y-4">
            {user && (
              <p className="text-center text-xs text-white/40">
                Logged in as {user.full_name}
              </p>
            )}
            {ticket && !ticket.is_redeemed && !ticket.is_refunded ? (
              <button
                onClick={handleCheckin}
                disabled={state === "checking_in"}
                className="w-full rounded-xl bg-gradient-to-br from-[#2ECB4E] to-[#05EB54] px-4 py-4 text-lg font-bold text-white shadow-lg shadow-primary/25 transition-all hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {state === "checking_in" ? (
                  <span className="inline-flex items-center gap-2">
                    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Checking In...
                  </span>
                ) : (
                  "Check In"
                )}
              </button>
            ) : ticket?.is_redeemed ? (
              <p className="text-center text-sm text-white/40">This ticket has already been checked in.</p>
            ) : ticket?.is_refunded ? (
              <p className="text-center text-sm text-white/40">This ticket has been refunded.</p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
