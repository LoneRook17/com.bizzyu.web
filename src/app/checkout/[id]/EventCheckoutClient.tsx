"use client"

import { useState, useEffect, useCallback, useRef } from "react"

import { getApiBaseUrl } from "@/lib/api-url"

const API_URL = getApiBaseUrl()
const GOLD = "#D4AF37"

// Promoter attribution cookie (PRD §7.4). Read by client JS so the order
// POST can include it; 24h TTL matches the PRD spec. Not httpOnly because
// the cookie has to round-trip through React state.
const REF_COOKIE = "bz_ref"
const REF_COOKIE_TTL_SEC = 60 * 60 * 24

function readRefCookie(): string | null {
  if (typeof document === "undefined") return null
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${REF_COOKIE}=([^;]+)`))
  return match?.[1] ? decodeURIComponent(match[1]) : null
}

function writeRefCookie(code: string) {
  if (typeof document === "undefined") return
  // SameSite=Lax keeps the cookie on the same-origin form POST that follows;
  // the link is an external 302 from the API host, so Lax is the right floor.
  const safe = encodeURIComponent(code)
  document.cookie = `${REF_COOKIE}=${safe}; Max-Age=${REF_COOKIE_TTL_SEC}; Path=/; SameSite=Lax`
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface EventInfo {
  event_id: number
  name: string
  description: string
  venue_name: string
  venue_address: string
  start_date_time: string
  end_date_time: string
  type: string
  is_21_plus: boolean
  flyer_image_url: string | null
}

interface TicketTier {
  ticket_id: number
  name: string
  description: string | null
  price_usd: number
  quantity: number | null
  available_quantity: number | null
  sold_count: number
  max_per_person: number | null
  ticket_type: string
}

interface FeePreview {
  subtotal: number
  discount: number
  discounted_subtotal: number
  service_fee: number
  total: number
  fee_breakdown: {
    flat: number
    percentage: number
    flat_rate: number
    percentage_rate: number
  }
}

interface PageData {
  event: EventInfo
  tickets: TicketTier[]
}

type CheckoutStep = "idle" | "phone" | "name" | "verify" | "processing"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
}

function formatPrice(dollars: number): string {
  if (dollars === 0) return "Free"
  return `$${dollars.toFixed(2)}`
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function EventCheckoutClient({
  eventId,
  initialData,
}: {
  eventId: string
  initialData: PageData | null
}) {
  const [event, setEvent] = useState<EventInfo | null>(initialData?.event ?? null)
  const [tickets, setTickets] = useState<TicketTier[]>(initialData?.tickets ?? [])
  const [loading, setLoading] = useState(!initialData)
  const [error, setError] = useState("")

  // Ticket quantities: { ticket_id: quantity }
  const [quantities, setQuantities] = useState<Record<number, number>>({})

  // Fee preview
  const [feePreview, setFeePreview] = useState<FeePreview | null>(null)
  const [feeLoading, setFeeLoading] = useState(false)
  const feeAbortRef = useRef<AbortController | null>(null)

  // Checkout modal
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>("idle")
  const [phone, setPhone] = useState("")
  const [otpCode, setOtpCode] = useState("")
  const [attendeeName, setAttendeeName] = useState("")
  const [userName, setUserName] = useState<string | null>(null)
  const [checkoutError, setCheckoutError] = useState("")
  const [checkoutLoading, setCheckoutLoading] = useState(false)

  // Promoter tracking code (PRD §7.4). On mount, hydrate from URL ?ref=
  // (writing the cookie) or from any prior bz_ref cookie. Survives page
  // reloads inside the 24h window so a buyer who tabs away and returns is
  // still attributed to the promoter who got them here.
  const [trackingCode, setTrackingCode] = useState<string | null>(null)
  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    const fromUrl = params.get("ref")?.trim() || null
    const valid = fromUrl && /^[A-Za-z0-9]{1,32}$/.test(fromUrl) ? fromUrl : null
    if (valid) {
      writeRefCookie(valid)
      setTrackingCode(valid)
    } else {
      setTrackingCode(readRefCookie())
    }
  }, [])

  // ─── Fetch event data if not provided by server ─────────────────────────

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/checkout/event/${eventId}`)
      if (!res.ok) throw new Error("Event not found")
      const data = await res.json()
      setEvent(data.event)
      setTickets(data.tickets || [])
    } catch {
      setError("Could not load event information")
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    if (!initialData) fetchData()
  }, [initialData, fetchData])

  // ─── Quantity helpers ───────────────────────────────────────────────────

  const getQty = (ticketId: number) => quantities[ticketId] || 0

  const setQty = (ticketId: number, val: number) => {
    const ticket = tickets.find((t) => t.ticket_id === ticketId)
    const max = ticket?.max_per_person ?? 10
    const available = ticket?.available_quantity
    const upperBound = available !== null && available !== undefined ? Math.min(max, available) : max
    setQuantities((prev) => ({ ...prev, [ticketId]: Math.max(0, Math.min(upperBound, val)) }))
  }

  // Total ticket count selected
  const totalQty = Object.values(quantities).reduce((sum, q) => sum + q, 0)

  // ─── Fee Preview ────────────────────────────────────────────────────────

  const fetchFeePreview = useCallback(async () => {
    // Build ticket array from current quantities
    const selectedTickets = Object.entries(quantities)
      .filter(([, qty]) => qty > 0)
      .map(([ticketId, qty]) => ({ ticket_id: Number(ticketId), quantity: qty }))

    if (selectedTickets.length === 0) {
      setFeePreview(null)
      return
    }

    // Check if all selected tickets are free
    const allFree = selectedTickets.every((st) => {
      const ticket = tickets.find((t) => t.ticket_id === st.ticket_id)
      return ticket && ticket.price_usd === 0
    })
    if (allFree) {
      setFeePreview({
        subtotal: 0,
        discount: 0,
        discounted_subtotal: 0,
        service_fee: 0,
        total: 0,
        fee_breakdown: { flat: 0, percentage: 0, flat_rate: 0, percentage_rate: 0 },
      })
      return
    }

    // Abort previous request
    if (feeAbortRef.current) feeAbortRef.current.abort()
    const controller = new AbortController()
    feeAbortRef.current = controller

    setFeeLoading(true)
    try {
      const res = await fetch(`${API_URL}/checkout/fee-preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: Number(eventId),
          tickets: selectedTickets,
        }),
        signal: controller.signal,
      })
      if (!res.ok) throw new Error("Failed to calculate fees")
      const data: FeePreview = await res.json()
      setFeePreview(data)

      if (process.env.NODE_ENV === "development") {
        console.log("[Fee Preview]", data)
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        // Fee preview failed silently — non-critical, user can still proceed
      }
    } finally {
      setFeeLoading(false)
    }
  }, [quantities, tickets, eventId])

  // Debounce fee preview calls
  useEffect(() => {
    const timer = setTimeout(fetchFeePreview, 200)
    return () => clearTimeout(timer)
  }, [fetchFeePreview])

  // ─── Checkout Flow ──────────────────────────────────────────────────────

  const startCheckout = () => {
    if (totalQty === 0) return
    setCheckoutStep("phone")
    setCheckoutError("")
    setPhone("")
    setOtpCode("")
    setAttendeeName("")
    setUserName(null)
  }

  const closeCheckout = () => {
    setCheckoutStep("idle")
    setCheckoutError("")
  }

  const sendCode = async () => {
    if (!phone || phone.length < 10) {
      setCheckoutError("Please enter a valid phone number")
      return
    }
    setCheckoutLoading(true)
    setCheckoutError("")
    try {
      const fullPhone = phone.startsWith("1") ? phone : `1${phone}`
      const res = await fetch(`${API_URL}/line-skips/checkout/send-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: `+${fullPhone.replace(/\D/g, "")}` }),
      })
      const data = await res.json()
      if (!res.ok) {
        setCheckoutError(data.message || "Failed to send code")
        return
      }
      if (data.has_account && data.user_name) {
        setUserName(data.user_name)
        setAttendeeName(data.user_name)
        setCheckoutStep("verify")
      } else {
        setCheckoutStep("name")
      }
    } catch {
      setCheckoutError("Failed to send verification code")
    } finally {
      setCheckoutLoading(false)
    }
  }

  const submitName = () => {
    if (!attendeeName.trim()) {
      setCheckoutError("Please enter your name")
      return
    }
    setCheckoutError("")
    setCheckoutStep("verify")
  }

  const verifyAndPurchase = async () => {
    if (!otpCode || otpCode.length < 6) {
      setCheckoutError("Please enter the 6-digit code")
      return
    }
    setCheckoutLoading(true)
    setCheckoutError("")
    try {
      const digits = phone.replace(/\D/g, "")
      const fullPhone = digits.startsWith("1") ? digits : `1${digits}`

      // Verify phone code
      const verifyRes = await fetch(`${API_URL}/line-skips/checkout/verify-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: `+${fullPhone}`, code: otpCode }),
      })
      const verifyData = await verifyRes.json()
      if (!verifyRes.ok) {
        setCheckoutError(verifyData.message || "Invalid code")
        return
      }
      if (verifyData.user_name) {
        setUserName(verifyData.user_name)
        if (!attendeeName) setAttendeeName(verifyData.user_name)
      }

      // Proceed to Stripe checkout
      setCheckoutStep("processing")
      await createStripeSession(verifyData.token || null)
    } catch {
      setCheckoutError("Verification failed")
      setCheckoutStep("verify")
    } finally {
      setCheckoutLoading(false)
    }
  }

  const createStripeSession = async (authToken: string | null) => {
    // Build selected tickets
    const selectedTickets = Object.entries(quantities)
      .filter(([, qty]) => qty > 0)
      .map(([ticketId, qty]) => ({ ticket_id: Number(ticketId), quantity: qty }))

    if (selectedTickets.length === 0) return

    // For each ticket, call the existing /ticket/:id/link endpoint
    // We need to pick the first ticket with quantity. The existing endpoint
    // handles single-ticket checkout. For multi-ticket, we'll use the first
    // ticket and pass quantity.
    // Note: the current API supports single-ticket-type checkout per session.
    // For the web checkout, we handle one ticket type at a time.
    const ticket = selectedTickets[0]

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      if (authToken) headers["Authorization"] = `Bearer ${authToken}`

      const res = await fetch(`${API_URL}/ticket/${ticket.ticket_id}/link`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          quantity: ticket.quantity,
          // {CHECKOUT_SESSION_ID} is a Stripe-side placeholder — Stripe
          // substitutes the real Checkout Session ID at redirect time. Used
          // by the Apple Wallet button on the success state to fetch the
          // correct .pkpass through the public session-id-gated route.
          successUrl: `${window.location.origin}/checkout/${eventId}?success=1&session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: window.location.href,
          ...(trackingCode ? { tracking_code: trackingCode } : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setCheckoutError(data.message || "Failed to create checkout")
        setCheckoutStep("phone")
        return
      }

      if (data.url) {
        window.location.href = data.url
      }
    } catch {
      setCheckoutError("Something went wrong. Please try again.")
      setCheckoutStep("phone")
    }
  }

  // ─── Success State ──────────────────────────────────────────────────────

  const [purchaseSuccess, setPurchaseSuccess] = useState(false)
  const [successSessionId, setSuccessSessionId] = useState<string | null>(null)
  const [showWalletButton, setShowWalletButton] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    if (params.get("success") === "1") {
      setPurchaseSuccess(true)
      setSuccessSessionId(params.get("session_id"))
    }
    // Apple Wallet only installs .pkpass via Safari/iOS or Chrome/iOS.
    // Hide the button on desktop Chrome and Android browsers per PRD §3.4.
    const ua = navigator.userAgent || ""
    const isIos = /iPhone|iPad|iPod/.test(ua) ||
      (/Macintosh/.test(ua) && typeof (navigator as { maxTouchPoints?: number }).maxTouchPoints === "number" && (navigator as { maxTouchPoints?: number }).maxTouchPoints! > 1)
    setShowWalletButton(isIos)
  }, [])

  // ─── Render: Loading ────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          <p className="text-white/60">Loading...</p>
        </div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] p-6">
        <div className="w-full max-w-md text-center">
          <h2 className="mb-2 text-xl font-bold text-white">{error || "Event not found"}</h2>
          <a
            href="/"
            className="mt-4 inline-block rounded-lg bg-white/10 px-6 py-2 text-sm font-medium text-white hover:bg-white/20 transition-colors"
          >
            Go Home
          </a>
        </div>
      </div>
    )
  }

  // ─── Render: Success ────────────────────────────────────────────────────

  if (purchaseSuccess) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0a] p-6">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <img src="/images/bizzy-logo.png" alt="Bizzy" className="mx-auto h-8 opacity-80" />
          </div>
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
            <p className="text-white/60">Your tickets for {event.name} are confirmed.</p>
          </div>
          <div
            className="mb-6 overflow-hidden rounded-2xl"
            style={{ backgroundColor: `${GOLD}15`, border: `1px solid ${GOLD}40` }}
          >
            <div className="p-6">
              <h2 className="mb-4 text-lg font-bold text-white">{event.name}</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/50">Date</span>
                  <span className="text-sm font-medium text-white">{formatDate(event.start_date_time)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/50">Time</span>
                  <span className="text-sm font-medium text-white">
                    {formatTime(event.start_date_time)} - {formatTime(event.end_date_time)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/50">Venue</span>
                  <span className="text-sm font-medium text-white">{event.venue_name}</span>
                </div>
              </div>
              <div className="my-4 border-t border-dashed border-white/20" />
              <p className="text-center text-xs text-white/40">
                Check your email for ticket details and QR code.
              </p>
            </div>
          </div>

          {/* Add to Apple Wallet — iOS Safari / Chrome only. Anchored
              directly at the .pkpass binary so iOS handles the install
              sheet without any client JS. */}
          {showWalletButton && successSessionId && (
            <a
              href={`/api/proxy/public/wallet/by-session/${encodeURIComponent(successSessionId)}/event-ticket`}
              className="mb-4 flex w-full items-center justify-center gap-2 rounded-lg bg-black py-2.5 text-sm font-semibold text-white transition-colors"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M21 7H3a1 1 0 0 0-1 1v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a1 1 0 0 0-1-1zm-3 7a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zM3 6h18a1 1 0 0 1 0 2H3a1 1 0 0 1 0-2zm1-2h16a1 1 0 0 1 0 2H4a1 1 0 0 1 0-2z" />
              </svg>
              Add to Apple Wallet
            </a>
          )}

          <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-center">
            <p className="mb-2 text-sm text-white/70">Download the Bizzy app to access your tickets</p>
            <a
              href="https://apps.apple.com/app/id6683306360"
              className="inline-block rounded-lg px-6 py-2.5 text-sm font-semibold text-black transition-colors"
              style={{ backgroundColor: GOLD }}
            >
              Get the App
            </a>
          </div>
        </div>
      </div>
    )
  }

  // ─── Render: Main Checkout ──────────────────────────────────────────────

  const paidTickets = tickets.filter((t) => t.ticket_type !== "free" && t.price_usd > 0)
  const freeTickets = tickets.filter((t) => t.ticket_type === "free" || t.price_usd === 0)

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Event Banner */}
      <div className="relative h-56 w-full overflow-hidden bg-gradient-to-b from-white/10 to-transparent">
        {event.flyer_image_url && (
          <img
            src={event.flyer_image_url}
            alt={event.name}
            className="h-full w-full object-cover opacity-40"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="mx-auto max-w-lg">
            <img src="/images/bizzy-logo.png" alt="Bizzy" className="mb-3 h-6 opacity-60" />
            <h1 className="text-2xl font-bold text-white">{event.name}</h1>
            <p className="mt-1 text-sm text-white/50">
              {formatDate(event.start_date_time)} &middot; {formatTime(event.start_date_time)}
            </p>
            <p className="text-sm text-white/40">{event.venue_name}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-lg px-4 pb-12">
        {/* Ticket Selection */}
        <div className="mt-6">
          <h2 className="mb-4 text-lg font-bold text-white">Select Tickets</h2>

          {tickets.length === 0 ? (
            <div className="rounded-xl bg-white/5 border border-white/10 p-8 text-center">
              <p className="text-white/50">No tickets available</p>
            </div>
          ) : (
            <div className="space-y-3">
              {[...paidTickets, ...freeTickets].map((ticket) => {
                const qty = getQty(ticket.ticket_id)
                const isSoldOut =
                  ticket.available_quantity !== null &&
                  ticket.available_quantity !== undefined &&
                  ticket.available_quantity <= 0
                const remaining = ticket.available_quantity

                return (
                  <div
                    key={ticket.ticket_id}
                    className="overflow-hidden rounded-xl bg-white/5 border border-white/10"
                  >
                    <div className="p-5">
                      <div className="mb-3 flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-bold text-white">{ticket.name}</h3>
                          {ticket.description && (
                            <p className="mt-0.5 text-xs text-white/40">{ticket.description}</p>
                          )}
                          {ticket.max_per_person && (
                            <p className="mt-0.5 text-xs text-white/30">
                              Max {ticket.max_per_person} per person
                            </p>
                          )}
                        </div>
                        <span className="text-lg font-bold text-white ml-4">
                          {ticket.price_usd === 0 ? "Free" : formatPrice(ticket.price_usd)}
                        </span>
                      </div>

                      {/* Availability */}
                      <div className="mb-3">
                        {isSoldOut ? (
                          <span className="text-xs font-semibold text-red-400">Sold Out</span>
                        ) : remaining !== null && remaining !== undefined ? (
                          <span className="text-xs text-white/40">{remaining} remaining</span>
                        ) : (
                          <span className="text-xs text-white/40">Available</span>
                        )}
                      </div>

                      {!isSoldOut && (
                        <div className="flex items-center gap-3">
                          <div className="flex items-center rounded-lg bg-white/5 border border-white/10">
                            <button
                              onClick={() => setQty(ticket.ticket_id, qty - 1)}
                              className="px-3 py-2 text-white/60 hover:text-white transition-colors"
                              disabled={qty <= 0}
                            >
                              -
                            </button>
                            <span className="w-8 text-center text-sm font-medium text-white">
                              {qty}
                            </span>
                            <button
                              onClick={() => setQty(ticket.ticket_id, qty + 1)}
                              className="px-3 py-2 text-white/60 hover:text-white transition-colors"
                              disabled={
                                (remaining !== null && remaining !== undefined && qty >= remaining) ||
                                (ticket.max_per_person !== null && qty >= ticket.max_per_person)
                              }
                            >
                              +
                            </button>
                          </div>
                          {qty > 0 && ticket.price_usd > 0 && (
                            <span className="text-sm text-white/50">
                              {formatPrice(ticket.price_usd * qty)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Fee Breakdown */}
        {totalQty > 0 && feePreview && (
          <div className="mt-6 rounded-xl bg-white/5 border border-white/10 p-5">
            <h3 className="mb-3 text-sm font-semibold text-white">Order Summary</h3>
            <div className="space-y-2 text-sm">
              {/* Per-ticket line items */}
              {Object.entries(quantities)
                .filter(([, qty]) => qty > 0)
                .map(([ticketId, qty]) => {
                  const ticket = tickets.find((t) => t.ticket_id === Number(ticketId))
                  if (!ticket) return null
                  return (
                    <div key={ticketId} className="flex justify-between text-white/70">
                      <span>
                        {ticket.name} {qty > 1 ? `x ${qty}` : ""}
                      </span>
                      <span>{ticket.price_usd === 0 ? "Free" : formatPrice(ticket.price_usd * qty)}</span>
                    </div>
                  )
                })}

              {/* Discount (if any) */}
              {feePreview.discount > 0 && (
                <div className="flex justify-between text-green-400">
                  <span>Promo Discount</span>
                  <span>-{formatPrice(feePreview.discount)}</span>
                </div>
              )}

              {/* Divider */}
              <div className="border-t border-white/10 my-1" />

              {/* Subtotal */}
              <div className="flex justify-between text-white/70">
                <span>Subtotal</span>
                <span>{formatPrice(feePreview.discounted_subtotal)}</span>
              </div>

              {/* Service Fee */}
              <div className="flex justify-between text-white/70">
                <span>Service Fee</span>
                <span>{feePreview.service_fee === 0 ? "Free" : formatPrice(feePreview.service_fee)}</span>
              </div>

              {/* Divider */}
              <div className="border-t border-white/10 my-1" />

              {/* Total */}
              <div className="flex justify-between text-white font-bold text-base">
                <span>Total</span>
                <span>{feePreview.total === 0 ? "Free" : formatPrice(feePreview.total)}</span>
              </div>
            </div>

            {feeLoading && (
              <p className="mt-2 text-xs text-white/30">Updating...</p>
            )}
          </div>
        )}

        {/* Get Tickets Button */}
        {totalQty > 0 && (
          <button
            onClick={startCheckout}
            disabled={feeLoading}
            className="mt-6 w-full rounded-xl py-3.5 text-base font-bold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: GOLD }}
          >
            {feePreview && feePreview.total > 0
              ? `Get Tickets - ${formatPrice(feePreview.total)}`
              : "Get Tickets - Free"}
          </button>
        )}

        {/* Refund policy */}
        {totalQty > 0 && (
          <p className="mt-3 text-center text-[10px] text-white/30 leading-relaxed">
            By purchasing, you agree that all sales are final. No refunds or exchanges.
            If the event is cancelled by the host, you will receive a full refund.
          </p>
        )}

        {/* 21+ notice */}
        {event.is_21_plus && (
          <p className="mt-4 text-center text-xs text-white/30">
            This is a 21+ event. Valid ID required at the door.
          </p>
        )}

        {/* Powered by Bizzy */}
        <div className="mt-8 text-center">
          <p className="text-xs text-white/20">Powered by Bizzy</p>
        </div>
      </div>

      {/* ─── Checkout Modal ─────────────────────────────────────────────────── */}
      {checkoutStep !== "idle" && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-md rounded-t-2xl bg-[#141414] p-6 sm:rounded-2xl sm:m-4">
            {/* Modal header */}
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">
                {checkoutStep === "phone" && "Enter your phone"}
                {checkoutStep === "name" && "Your name"}
                {checkoutStep === "verify" && "Verify your number"}
                {checkoutStep === "processing" && "Processing..."}
              </h2>
              <button
                onClick={closeCheckout}
                className="rounded-full bg-white/10 p-1.5 text-white/60 hover:text-white transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Order summary in modal */}
            {feePreview && (
              <div
                className="mb-5 rounded-lg px-4 py-3"
                style={{ backgroundColor: `${GOLD}10`, border: `1px solid ${GOLD}20` }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">{event.name}</p>
                    <p className="text-xs text-white/50">{totalQty} ticket{totalQty > 1 ? "s" : ""}</p>
                  </div>
                  <p className="text-sm font-bold" style={{ color: GOLD }}>
                    {feePreview.total === 0 ? "Free" : formatPrice(feePreview.total)}
                  </p>
                </div>
              </div>
            )}

            {/* Phone step — phone number only */}
            {checkoutStep === "phone" && (
              <div>
                <label className="mb-2 block text-sm text-white/60">Phone Number</label>
                <div className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-4 py-3">
                  <span className="text-sm text-white/40">+1</span>
                  <input
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, "").slice(0, 10))}
                    className="flex-1 bg-transparent text-sm text-white placeholder-white/30 outline-none"
                    autoFocus
                  />
                </div>

                {checkoutError && (
                  <p className="mt-3 text-xs text-red-400">{checkoutError}</p>
                )}

                <button
                  onClick={sendCode}
                  disabled={checkoutLoading || phone.length < 10}
                  className="mt-4 w-full rounded-lg py-3 text-sm font-bold text-black disabled:opacity-50 transition-opacity"
                  style={{ backgroundColor: GOLD }}
                >
                  {checkoutLoading ? "Sending..." : "Continue"}
                </button>
              </div>
            )}

            {/* Name step — shown only for unregistered users */}
            {checkoutStep === "name" && (
              <div>
                <p className="mb-3 text-sm text-white/60">
                  We don&apos;t have an account for this number yet. Enter your name to continue.
                </p>
                <label className="mb-2 block text-sm text-white/60">Your Name</label>
                <input
                  type="text"
                  placeholder="Full name"
                  value={attendeeName}
                  onChange={(e) => setAttendeeName(e.target.value)}
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-white/20"
                  autoFocus
                />

                {checkoutError && (
                  <p className="mt-3 text-xs text-red-400">{checkoutError}</p>
                )}

                <button
                  onClick={submitName}
                  disabled={!attendeeName.trim()}
                  className="mt-4 w-full rounded-lg py-3 text-sm font-bold text-black disabled:opacity-50 transition-opacity"
                  style={{ backgroundColor: GOLD }}
                >
                  Continue
                </button>

                <button
                  onClick={() => {
                    setCheckoutStep("phone")
                    setCheckoutError("")
                  }}
                  className="mt-2 w-full py-2 text-xs text-white/40 hover:text-white/60 transition-colors"
                >
                  Change phone number
                </button>
              </div>
            )}

            {/* Verify step */}
            {checkoutStep === "verify" && (
              <div>
                <p className="mb-3 text-sm text-white/60">
                  Enter the 6-digit code sent to your phone
                  {userName && (
                    <span className="block mt-1 text-white/80">
                      Welcome back, {userName}!
                    </span>
                  )}
                </p>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-center text-2xl font-mono tracking-[0.5em] text-white placeholder-white/20 outline-none focus:border-white/20"
                  autoFocus
                />

                {checkoutError && (
                  <p className="mt-3 text-xs text-red-400">{checkoutError}</p>
                )}

                <button
                  onClick={verifyAndPurchase}
                  disabled={checkoutLoading || otpCode.length < 6}
                  className="mt-4 w-full rounded-lg py-3 text-sm font-bold text-black disabled:opacity-50 transition-opacity"
                  style={{ backgroundColor: GOLD }}
                >
                  {checkoutLoading ? "Verifying..." : "Verify & Pay"}
                </button>

                <button
                  onClick={() => {
                    setCheckoutStep("phone")
                    setOtpCode("")
                    setCheckoutError("")
                  }}
                  className="mt-2 w-full py-2 text-xs text-white/40 hover:text-white/60 transition-colors"
                >
                  Change phone number
                </button>
              </div>
            )}

            {/* Processing step */}
            {checkoutStep === "processing" && (
              <div className="py-8 text-center">
                <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                <p className="text-sm text-white/60">Setting up your payment...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
