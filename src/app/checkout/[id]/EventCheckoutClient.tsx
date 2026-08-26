"use client"

import { useState, useEffect, useCallback, useRef } from "react"

import { getApiBaseUrl } from "@/lib/api-url"
import { isAppleWalletCapable } from "@/lib/apple-wallet"
import { parseVenueStripeBlock, type VenueStripeBlock } from "@/lib/venue-stripe-block"
import VenueSalesPausedNotice from "@/components/checkout/VenueSalesPausedNotice"

import { isWeeklyCoverProduct } from "@/lib/business/door-access"
import { ACCESS, EVENT, EVENT_FILL } from "@/lib/checkout/surfaces"
import {
  loadVenuePublicEventIdSet,
  weeklyCoverSaleOpenForPayloads,
} from "@/lib/checkout/weekly-cover-sale"
import { foldLeftoverSurgeSkus } from "@/lib/checkout/surge-skus"
import { ticketIdFromSearch } from "@/lib/venuePublic"

const API_URL = getApiBaseUrl()

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
  timezone?: string | null
  type: string
  is_21_plus: boolean
  flyer_image_url: string | null
  promotion_enabled?: boolean | number
  access_kind?: string | null
  /** Services' explicit product stamp. Missing on older payloads. */
  product_kind?: "weekly_cover" | "event" | null
  recurring_series_id?: number | string | null
  venue_id?: number | string | null
  series_is_active?: boolean | number | string | null
}

interface TicketTier {
  ticket_id: number
  name: string
  description: string | null
  /** Leftover expander keys when the checkout payload still sends them. */
  tier_key?: string | null
  template_tier_key?: string | null
  price_usd: number
  quantity: number | null
  available_quantity: number | null
  sold_count: number
  max_per_person: number | null
  ticket_type: string
  valid_from?: string | null
  valid_until?: string | null
  // Authoritative window state from the API (evaluated in the event's tz).
  // Prefer these over local-time math: buyable until the window CLOSES.
  event_timezone?: string | null
  sales_state?: "open" | "not_open" | "closed" | string
  is_purchasable?: boolean
  // Authoritative sold-out signal from the API: force_sold_out OR a finite tier
  // that has run out. Prefer this over local available_quantity math — it also
  // covers UNLIMITED tiers the operator has force-sold-out (where
  // available_quantity is null and can't signal sold-out on its own).
  is_sold_out?: boolean
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
  saleClosed?: boolean
}

type CheckoutStep = "idle" | "phone" | "name" | "verify" | "processing"

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Stored event datetimes are naive wall-clock strings in the EVENT's timezone
// (e.g. "2026-06-15 20:00:00" = 8 PM in America/Phoenix). Parsing as local and
// formatting as local preserves the wall-clock number; we then append the
// event's zone label so it reads "8:00 PM MST" regardless of the viewer's zone.
function formatDate(dateStr: string): string {
  const d = new Date(dateStr.replace(" ", "T"))
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

// Compact date ("Jun 14") for the inline ticket scan-window label, where the
// full weekday/year of formatDate reads as clutter.
function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr.replace(" ", "T"))
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function formatTime(dateStr: string, timezone?: string | null): string {
  const d = new Date(dateStr.replace(" ", "T"))
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  const tz = tzAbbrev(dateStr, timezone)
  return tz ? `${time} ${tz}` : time
}

// Short zone label ("MST", "EDT", …) for an IANA timezone around the given date.
function tzAbbrev(dateStr: string, timezone?: string | null): string {
  if (!timezone) return ""
  try {
    const d = new Date(dateStr.replace(" ", "T"))
    const part = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "short",
    })
      .formatToParts(d)
      .find((p) => p.type === "timeZoneName")
    return part?.value ?? ""
  } catch {
    return ""
  }
}

function formatPrice(dollars: number): string {
  return `$${dollars.toFixed(2)}`
}

function formatClock(dateStr: string): string {
  const d = new Date(dateStr.replace(" ", "T"))
  if (isNaN(d.getTime())) return ""
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
}

/** 0 / null max_per_person means no per-person cap. Capacity 0/null is unlimited. */
function maxPurchasable(ticket: TicketTier): number {
  const perPerson = ticket.max_per_person && ticket.max_per_person > 0 ? ticket.max_per_person : 10
  const remaining = ticket.quantity ? ticket.available_quantity : null
  if (remaining === null || remaining === undefined) return perPerson
  return Math.max(0, Math.min(perPerson, remaining))
}

function weekdayFromStart(start: string): string {
  const d = new Date(start.replace(" ", "T"))
  if (isNaN(d.getTime())) return ""
  return d.toLocaleDateString("en-US", { weekday: "long" })
}

function TicketCard({
  ticket,
  qty,
  unavailable,
  isSoldOut,
  status,
  accent,
  onSelect,
  onAdjustQty,
}: {
  ticket: TicketTier
  qty: number
  unavailable: boolean
  isSoldOut: boolean
  status: string | null
  accent: string
  onSelect: () => void
  onAdjustQty: (val: number) => void
}) {
  const description = ticket.description?.trim() || ""
  const cap = maxPurchasable(ticket)
  const selected = qty > 0
  const badge = isSoldOut ? "Sold Out" : status === "Sales closed" ? "Sales Closed" : null

  if (unavailable) {
    return (
      <div className="rounded-2xl border border-[#1e1e2e]/50 bg-[#141420]/40 p-5 opacity-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 rounded-full border-2 border-gray-600" />
            <div>
              <h4 className="text-lg font-bold text-gray-500">{ticket.name}</h4>
              {description && <p className="mt-0.5 text-sm text-gray-600">{description}</p>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-gray-600">{formatPrice(ticket.price_usd)}</p>
            {badge && (
              <span className="mt-1 inline-flex items-center rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-400">
                {badge}
              </span>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="cursor-pointer rounded-2xl border bg-[#141420] p-5 transition-[border-color,box-shadow] duration-200"
      style={{
        borderColor: selected ? accent : "#1e1e2e",
        boxShadow: selected ? `0 0 20px ${accent}26` : undefined,
      }}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between">
        <div className="flex flex-1 items-center gap-3">
          <input
            type="radio"
            checked={selected}
            readOnly
            className="h-5 w-5 cursor-pointer"
            style={{ accentColor: accent }}
          />
          <div>
            <h4 className="text-lg font-bold text-white">{ticket.name}</h4>
            {description && <p className="mt-0.5 text-sm text-gray-400">{description}</p>}
          </div>
        </div>
        <div className="ml-4 text-right">
          <p className={`text-xl font-bold ${ticket.price_usd === 0 ? "text-[#33f77c]" : "text-white"}`}>
            {ticket.price_usd === 0 ? "FREE" : formatPrice(ticket.price_usd)}
          </p>
          {ticket.price_usd > 0 && <p className="text-xs text-gray-500">+ fees</p>}
        </div>
      </div>

      {selected && (
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            className="qty-btn"
            onClick={(e) => {
              e.stopPropagation()
              onAdjustQty(qty - 1)
            }}
            disabled={qty <= 0}
          >
            −
          </button>
          <span className="w-16 rounded-xl border border-[#1e1e2e] bg-[#141420] py-2 text-center text-lg font-bold text-white">
            {qty}
          </span>
          <button
            type="button"
            className="qty-btn"
            onClick={(e) => {
              e.stopPropagation()
              onAdjustQty(qty + 1)
            }}
            disabled={qty >= cap}
          >
            +
          </button>
          {(ticket.max_per_person ?? 0) > 0 && (
            <span className="ml-2 text-xs text-gray-500">Max {ticket.max_per_person}</span>
          )}
        </div>
      )}
    </div>
  )
}

function AboutBlock({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)
  const long = text.length > 200
  return (
    <div className="rounded-2xl border border-[#1e1e2e] bg-[#141420]/50 p-5">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">About</h3>
      <div
        className={`whitespace-pre-line text-sm leading-relaxed text-gray-300 ${
          expanded || !long ? "" : "line-clamp-3"
        }`}
      >
        {text}
      </div>
      {long && (
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          className="mt-2 text-sm font-medium text-[#33f77c] hover:text-[#66f99d]"
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      )}
    </div>
  )
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
  const [tickets, setTickets] = useState<TicketTier[]>(
    foldLeftoverSurgeSkus(initialData?.tickets ?? []),
  )
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
  // Matches the app: pre-selected, unchecking does not block purchase.
  const [smsOptIn, setSmsOptIn] = useState(true)
  // Venue payout account not ready (#9): sales at this venue are paused.
  // Rendered as a full pause notice in place of the purchase CTA.
  const [venueBlock, setVenueBlock] = useState<VenueStripeBlock | null>(null)
  const [saleClosed, setSaleClosed] = useState(!!initialData?.saleClosed)

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

  // Venue / share links pass ?ticket_id= so the matching tier starts selected.
  useEffect(() => {
    if (typeof window === "undefined" || tickets.length === 0) return
    const wanted = ticketIdFromSearch(window.location.search)
    if (wanted == null) return
    const ticket = tickets.find((row) => row.ticket_id === wanted)
    if (!ticket) return
    setQuantities((prev) => {
      if (Object.values(prev).some((qty) => qty > 0)) return prev
      return { [wanted]: 1 }
    })
  }, [tickets])

  // ─── Fetch event data if not provided by server ─────────────────────────

  const applyPromotionFlag = useCallback(async (base: EventInfo) => {
    if (base.promotion_enabled !== undefined) return base
    try {
      const res = await fetch(`${API_URL}/ui/events/${eventId}`)
      if (!res.ok) return base
      const ui = await res.json()
      return {
        ...base,
        promotion_enabled: ui.promotion_enabled,
        access_kind: base.access_kind ?? ui.access_kind ?? null,
        product_kind: base.product_kind ?? ui.product_kind ?? null,
        recurring_series_id: base.recurring_series_id ?? ui.recurring_series_id,
        venue_id: base.venue_id ?? ui.venue_id,
        series_is_active: base.series_is_active ?? ui.series_is_active,
      }
    } catch {
      return base
    }
  }, [eventId])

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/checkout/event/${eventId}`)
      if (!res.ok) throw new Error("Event not found")
      const data = await res.json()
      const eventRow = await applyPromotionFlag(data.event)
      setTickets(foldLeftoverSurgeSkus(data.tickets || []))
      setEvent(eventRow)
      let ui: unknown = null
      try {
        const uiRes = await fetch(`${API_URL}/ui/events/${eventId}`)
        if (uiRes.ok) ui = await uiRes.json()
      } catch {
        ui = null
      }
      const publicListIds = await loadVenuePublicEventIdSet(API_URL, eventRow.venue_id)
      setSaleClosed(
        !weeklyCoverSaleOpenForPayloads({
          checkoutPayload: { ...data, event: eventRow },
          uiPayload: ui,
          publicListIds,
        }),
      )
    } catch {
      setError("Could not load event information")
    } finally {
      setLoading(false)
    }
  }, [eventId, applyPromotionFlag])

  useEffect(() => {
    if (!initialData) {
      fetchData()
      return
    }
    // Re-check in the browser so a leftover published WC night cannot sell
    // if SSR missed catalog membership or series_is_active.
    void (async () => {
      let ui: unknown = null
      try {
        const uiRes = await fetch(`${API_URL}/ui/events/${eventId}`)
        if (uiRes.ok) ui = await uiRes.json()
      } catch {
        ui = null
      }
      const eventRow = await applyPromotionFlag(initialData.event)
      setEvent(eventRow)
      const publicListIds = await loadVenuePublicEventIdSet(API_URL, eventRow.venue_id)
      setSaleClosed(
        !weeklyCoverSaleOpenForPayloads({
          checkoutPayload: { event: eventRow, tickets: initialData.tickets },
          uiPayload: ui,
          publicListIds,
        }),
      )
    })()
  }, [initialData, fetchData, applyPromotionFlag, eventId])

  // ─── Quantity helpers ───────────────────────────────────────────────────

  const getQty = (ticketId: number) => quantities[ticketId] || 0

  const setQty = (ticketId: number, val: number) => {
    const ticket = tickets.find((t) => t.ticket_id === ticketId)
    const upperBound = ticket ? maxPurchasable(ticket) : 10
    setQuantities((prev) => ({ ...prev, [ticketId]: Math.max(0, Math.min(upperBound, val)) }))
  }

  // Total ticket count selected
  const totalQty = Object.values(quantities).reduce((sum, q) => sum + q, 0)

  // ─── Fee Preview ────────────────────────────────────────────────────────

  const fetchFeePreview = useCallback(async () => {
    if (saleClosed) return
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
        // Fee preview failed silently - non-critical, user can still proceed
      }
    } finally {
      setFeeLoading(false)
    }
  }, [quantities, tickets, eventId, saleClosed])

  // Debounce fee preview calls
  useEffect(() => {
    const timer = setTimeout(fetchFeePreview, 200)
    return () => clearTimeout(timer)
  }, [fetchFeePreview])

  // ─── Checkout Flow ──────────────────────────────────────────────────────

  const startCheckout = () => {
    if (saleClosed || totalQty === 0) return
    setCheckoutStep("phone")
    setCheckoutError("")
    setPhone("")
    setOtpCode("")
    setAttendeeName("")
    setUserName(null)
    setSmsOptIn(true)
  }

  const closeCheckout = () => {
    setCheckoutStep("idle")
    setCheckoutError("")
  }

  const sendCode = async () => {
    if (saleClosed) return
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
    if (saleClosed) return
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
    if (saleClosed) return
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
          // {CHECKOUT_SESSION_ID} is a Stripe-side placeholder - Stripe
          // substitutes the real Checkout Session ID at redirect time. Used
          // by the Apple Wallet button on the success state to fetch the
          // correct .pkpass through the public session-id-gated route.
          successUrl: `${window.location.origin}/checkout/${eventId}?success=1&session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: window.location.href,
          sms_opt_in: smsOptIn,
          ...(trackingCode ? { tracking_code: trackingCode } : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        const block = parseVenueStripeBlock(data)
        if (block) {
          setVenueBlock(block)
          setCheckoutStep("idle")
          setCheckoutError("")
          return
        }
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
    setShowWalletButton(isAppleWalletCapable())
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

  // product_kind decides when services sends it; an older payload falls back
  // to access_kind (isDoorAccessKind). The event's NAME says nothing here.
  const cover = event ? isWeeklyCoverProduct(event) : false
  const fill = cover ? ACCESS : EVENT_FILL
  const accent = cover ? ACCESS : EVENT

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

  if (saleClosed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] p-6">
        <div className="w-full max-w-md text-center">
          <h2 className="mb-2 text-xl font-bold text-white">This night is no longer on sale</h2>
          <p className="text-sm text-white/60">Cover and Skip the Line are not available for this series.</p>
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
              style={{ backgroundColor: `${accent}20` }}
            >
              <svg className="h-10 w-10" style={{ color: accent }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="mb-2 text-2xl font-bold text-white">You&apos;re all set!</h1>
            <p className="text-white/60">Your tickets for {event.name} are confirmed.</p>
          </div>
          <div
            className="mb-6 overflow-hidden rounded-2xl"
            style={{ backgroundColor: `${accent}15`, border: `1px solid ${accent}40` }}
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
                    {formatTime(event.start_date_time, event.timezone)} - {formatTime(event.end_date_time, event.timezone)}
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

          {/* Add to Apple Wallet - iOS Safari / Chrome only. Anchored
              directly at the `.pkpasses` bundle so iOS surfaces a single
              install sheet with every ticket from this order stacked
              (mirrors the Flutter app's `apple_passkit.addPasses()` flow). */}
          {showWalletButton && successSessionId && (
            <a
              href={`/api/proxy/public/wallet/by-session/${encodeURIComponent(successSessionId)}/event-tickets-bundle`}
              className="mb-4 flex w-full items-center justify-center gap-2 rounded-lg bg-black py-2.5 text-sm font-semibold text-white transition-colors"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M21 7H3a1 1 0 0 0-1 1v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a1 1 0 0 0-1-1zm-3 7a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zM3 6h18a1 1 0 0 1 0 2H3a1 1 0 0 1 0-2zm1-2h16a1 1 0 0 1 0 2H4a1 1 0 0 1 0-2z" />
              </svg>
              Add to Apple Wallet
            </a>
          )}

          <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-center">
            <p className="mb-3 text-sm text-white/70">Access your tickets in the Bizzy app</p>
            {/* PRIMARY: open straight into the app via the bizzy://event/:id
                custom scheme. Tap-only — a plain <a> with no timer/redirect
                fallback (an armed App Store timer would fire after the app takes
                over and bounce the user out). The event deep-link arm ships in
                the current TestFlight build (deep_link_service.dart:141), and
                `eventId` here is the real numeric event_id (Node /checkout/event/:id
                does Number(id) → events.getById), not a slug or encrypted id. */}
            <a
              href={`bizzy://event/${eventId}`}
              className="mb-2.5 block rounded-lg px-6 py-2.5 text-sm font-semibold text-black transition-colors"
              style={{ backgroundColor: fill }}
            >
              Open in the Bizzy app
            </a>
            {/* SECONDARY: App Store, for users who don't have the app yet. */}
            <a
              href="https://apps.apple.com/app/id6683306360"
              className="inline-block rounded-lg border border-white/20 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
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
  const heroImage = event.flyer_image_url
  const eventDayLabel = formatDate(event.start_date_time)
  const startClock = formatClock(event.start_date_time)
  const endClock = formatClock(event.end_date_time)
  const ctaLabel =
    feePreview && feePreview.total > 0
      ? `Get Tickets · ${formatPrice(feePreview.total)}`
      : totalQty > 1
        ? "Claim Free Tickets"
        : totalQty === 1 && feePreview?.total === 0
          ? "Claim Free Ticket"
          : "Get Tickets"

  return (
    <div className="relative min-h-screen bg-[#0a0a0f] font-[family-name:var(--font-fira)] text-gray-100">
      <style>{`
        .bg-blur-flyer { position: fixed; inset: 0; z-index: 0; pointer-events: none; }
        .bg-blur-flyer img { width: 100%; height: 100%; object-fit: cover; filter: blur(80px) saturate(1.5); opacity: 0.15; transform: scale(1.2); }
        .flyer-glow { box-shadow: 0 0 60px ${cover ? "rgba(255, 62, 209, 0.2)" : "rgba(5, 235, 84, 0.2)"}, 0 0 120px ${cover ? "rgba(255, 62, 209, 0.1)" : "rgba(5, 235, 84, 0.1)"}; }
        .qty-btn { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: #1e1e2e; border: 1px solid #2d2d3f; color: ${cover ? ACCESS : "#33f77c"}; font-size: 1.1rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .qty-btn:hover:not(:disabled) { background: ${fill}; border-color: ${fill}; color: ${cover ? "#000" : "white"}; }
        .qty-btn:disabled { opacity: 0.4; cursor: not-allowed; }
      `}</style>

      {heroImage && (
        <div className="bg-blur-flyer" aria-hidden>
          <img src={heroImage} alt="" />
        </div>
      )}

      <div className="relative z-10 min-h-screen">
        <header className="sticky top-0 z-40 border-b border-white/5 bg-[#0a0a0f]/70 backdrop-blur-xl">
          <div className="mx-auto max-w-6xl px-4 py-3">
            <div className="flex items-center justify-between">
              <a href="https://bizzyu.com" className="flex items-center">
                <img src="/images/bizzy-logo.png" alt="Bizzy" className="h-10 w-auto" />
              </a>
              <div className="flex items-center gap-2">
                <a
                  href={`bizzy://event/${event.event_id}`}
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-black transition hover:opacity-90"
                  style={{ backgroundColor: fill }}
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                  </svg>
                  Open in Bizzy app
                </a>
                <a
                  href="https://apps.apple.com/app/id6683306360"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15"
                >
                  Get the App
                </a>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6 lg:py-10">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-5 lg:gap-12">
            <div className="lg:col-span-2">
              <div className="lg:sticky lg:top-24">
                {heroImage ? (
                  <img src={heroImage} alt={event.name} className="flyer-glow w-full rounded-2xl object-cover" />
                ) : (
                  <div className="flex aspect-[3/4] items-center justify-center rounded-2xl border border-[#1e1e2e] bg-[#141420]">
                    <svg className="h-16 w-16 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6 lg:col-span-3">
              <div>
                <h2 className="mb-4 text-3xl font-extrabold leading-tight text-white lg:text-4xl">{event.name}</h2>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#1e1e2e] bg-[#141420]">
                      <svg className="h-5 w-5 text-[#33f77c]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-white">{event.venue_name}</p>
                      {event.venue_address && <p className="text-sm text-gray-400">{event.venue_address}</p>}
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#1e1e2e] bg-[#141420]">
                      <svg className="h-5 w-5 text-[#33f77c]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-amber-400">{eventDayLabel}</p>
                      <p className="text-sm text-gray-400">
                        {startClock}
                        {endClock ? ` - ${endClock}` : ""}
                      </p>
                    </div>
                  </div>

                  {!!event.is_21_plus && (
                    <div className="mt-1 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/20 bg-red-500/15 px-3 py-1.5 text-sm font-semibold text-red-400">
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        21+ Event
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {event.description?.trim() && (
                <AboutBlock text={event.description.trim()} />
              )}

              <div>
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Select Tickets</h3>
                {tickets.length === 0 ? (
                  <div className="rounded-2xl border border-[#1e1e2e] bg-[#141420] p-6">
                    <p className="text-gray-400">No tickets available for this event.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {[...paidTickets, ...freeTickets].map((ticket) => {
                      const qty = getQty(ticket.ticket_id)
                      const isSoldOut =
                        ticket.is_sold_out !== undefined
                          ? ticket.is_sold_out
                          : !!ticket.quantity &&
                            ticket.available_quantity !== null &&
                            ticket.available_quantity !== undefined &&
                            ticket.available_quantity <= 0
                      const now = new Date()
                      const vu = ticket.valid_until ? new Date(ticket.valid_until.replace(" ", "T")) : null
                      const salesClosed = ticket.sales_state
                        ? ticket.sales_state === "closed"
                        : vu !== null && now >= vu
                      const unavailable =
                        isSoldOut ||
                        (ticket.is_purchasable !== undefined ? !ticket.is_purchasable : salesClosed)
                      const status = salesClosed ? "Sales closed" : null

                      return (
                        <TicketCard
                          key={ticket.ticket_id}
                          ticket={ticket}
                          qty={qty}
                          unavailable={unavailable}
                          isSoldOut={isSoldOut}
                          status={status}
                          accent={fill}
                          onSelect={() => {
                            setQuantities({ [ticket.ticket_id]: qty === 0 ? 1 : qty })
                          }}
                          onAdjustQty={(val) => setQty(ticket.ticket_id, val)}
                        />
                      )
                    })}
                  </div>
                )}

                {!!event.promotion_enabled && (
                  <a
                    href={`/promote/${event.event_id}`}
                    className="mt-6 block w-full rounded-xl bg-gradient-to-r from-[#05EB54] to-[#03b840] py-4 text-center text-lg font-bold text-white transition hover:from-[#33f77c] hover:to-[#05EB54]"
                  >
                    <span className="inline-flex items-center justify-center gap-2">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Get paid to promote this event
                    </span>
                  </a>
                )}

                <div className="mt-6 rounded-2xl border border-[#1e1e2e] bg-[#141420] p-5">
                  <div className="space-y-3">
                    <div className="flex justify-between text-gray-400">
                      <span>Subtotal</span>
                      <span className="text-gray-300">{formatPrice(feePreview?.discounted_subtotal ?? 0)}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Service Fee</span>
                      <span className="text-gray-300">{formatPrice(feePreview?.service_fee ?? 0)}</span>
                    </div>
                    {feePreview && feePreview.discount > 0 && (
                      <div className="flex justify-between text-[#33f77c]">
                        <span>Discount</span>
                        <span>-{formatPrice(feePreview.discount)}</span>
                      </div>
                    )}
                    <div className="my-2 border-t border-[#1e1e2e]" />
                    <div className="flex justify-between text-lg font-bold text-white">
                      <span>Total</span>
                      <span>{formatPrice(feePreview?.total ?? 0)}</span>
                    </div>
                  </div>

                  {venueBlock ? (
                    <div className="mt-5">
                      <VenueSalesPausedNotice block={venueBlock} />
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={startCheckout}
                        disabled={totalQty === 0 || feeLoading}
                        className="mt-5 w-full rounded-xl bg-gradient-to-r from-[#05EB54] to-[#03b840] py-4 text-lg font-bold text-white transition hover:from-[#33f77c] hover:to-[#05EB54] disabled:cursor-not-allowed disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500"
                      >
                        <span className="inline-flex items-center justify-center gap-2">
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                          </svg>
                          {ctaLabel}
                        </span>
                      </button>
                      <p className="mt-3 text-center text-[11px] leading-relaxed text-white/35">
                        By purchasing, you agree that all sales are final. No refunds or exchanges.
                        If the event is cancelled by the organizer, you will receive a refund of the ticket face value.
                        You also agree to the{" "}
                        <a href="/terms" target="_blank" rel="noreferrer" className="underline decoration-white/30 hover:text-white/60">
                          Terms
                        </a>{" "}
                        and{" "}
                        <a href="/privacy" target="_blank" rel="noreferrer" className="underline decoration-white/30 hover:text-white/60">
                          Privacy Policy
                        </a>
                        .
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>

        <footer className="mt-12 border-t border-white/5">
          <div className="mx-auto max-w-6xl px-4 py-6 text-center">
            <p className="text-sm text-gray-600">
              Powered by <span className="font-semibold text-gray-400">Bizzy</span>
              {" · "}
              <a href="/terms" className="hover:text-gray-400">Terms</a>
              {" · "}
              <a href="/privacy" className="hover:text-gray-400">Privacy</a>
            </p>
          </div>
        </footer>
      </div>

      {/* ─── Checkout Modal ─────────────────────────────────────────────────── */}
      {checkoutStep !== "idle" && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-md sm:m-4">
            <div className="max-h-[90dvh] w-full overflow-y-auto overscroll-contain rounded-t-2xl border border-[#1e1e2e] bg-[#141420] p-6 sm:rounded-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-white">
                {checkoutStep === "phone" && "Enter your phone"}
                {checkoutStep === "name" && "Your name"}
                {checkoutStep === "verify" && "Verify your number"}
                {checkoutStep === "processing" && "Processing..."}
              </h2>
              <button
                onClick={closeCheckout}
                className="rounded-full bg-white/10 p-1.5 text-white/60 transition-colors hover:text-white"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {feePreview && (
              <div
                className="mb-5 rounded-xl px-4 py-3"
                style={{ backgroundColor: `${EVENT}10`, border: `1px solid ${EVENT}25` }}
              >
                <div className="min-w-0">
                  <p className="text-sm font-extrabold text-white">
                    {Object.entries(quantities)
                      .filter(([, qty]) => qty > 0)
                      .map(([ticketId]) => tickets.find((t) => t.ticket_id === Number(ticketId))?.name)
                      .filter(Boolean)
                      .join(", ") || event.name}
                  </p>
                  <p className="mt-0.5 text-xs font-semibold text-white/55">
                    {weekdayFromStart(event.start_date_time) || eventDayLabel}
                  </p>
                </div>
                <div className="mt-2.5 space-y-1 text-xs text-white/55">
                  {Object.entries(quantities)
                    .filter(([, qty]) => qty > 0)
                    .map(([ticketId, qty]) => {
                      const ticket = tickets.find((t) => t.ticket_id === Number(ticketId))
                      if (!ticket) return null
                      return (
                        <div key={ticketId} className="flex justify-between">
                          <span>
                            {ticket.name}
                            {qty > 1 ? ` × ${qty}` : ""}
                          </span>
                          <span>{ticket.price_usd === 0 ? "Free" : formatPrice(ticket.price_usd * qty)}</span>
                        </div>
                      )
                    })}
                  <div className="flex justify-between">
                    <span>Service fee</span>
                    <span>{feePreview.service_fee === 0 ? "Free" : formatPrice(feePreview.service_fee)}</span>
                  </div>
                  <div className="flex justify-between pt-1 font-extrabold text-white">
                    <span>Total</span>
                    <span style={{ color: accent }}>{feePreview.total === 0 ? "Free" : formatPrice(feePreview.total)}</span>
                  </div>
                </div>
              </div>
            )}

            {checkoutStep === "phone" && (
              <div>
                <label className="mb-2 block text-sm font-semibold text-white/60">Phone Number</label>
                <div className="flex items-center gap-2 rounded-xl border border-[#1e1e2e] bg-[#0a0a0f]/60 px-4 py-3 transition-colors focus-within:border-[#4ADE80]/60">
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

                <label className="mt-4 flex items-start gap-2.5 cursor-pointer select-none">
                  <span
                    className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-[3px] border"
                    style={{
                      backgroundColor: smsOptIn ? fill : "transparent",
                      borderColor: smsOptIn ? fill : "rgba(255,255,255,0.4)",
                    }}
                  >
                    {smsOptIn && (
                      <svg className="h-3 w-3 text-black" viewBox="0 0 12 12" fill="none" aria-hidden>
                        <path d="M2.2 6.3 4.7 8.8 9.8 3.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <input
                    type="checkbox"
                    checked={smsOptIn}
                    onChange={(e) => setSmsOptIn(e.target.checked)}
                    className="sr-only"
                  />
                  <span className="text-xs text-white/50 leading-snug">
                    Keep me posted by text. I agree to receive SMS marketing messages about this event and the organizer&apos;s future events &amp; deals. Msg &amp; data rates may apply; reply STOP to opt out. Unchecking won&apos;t affect your purchase.
                  </span>
                </label>

                <button
                  onClick={sendCode}
                  disabled={checkoutLoading || phone.length < 10}
                  className="mt-4 w-full rounded-xl py-3 text-sm font-extrabold text-black transition hover:brightness-110 disabled:opacity-50"
                  style={{ backgroundColor: fill }}
                >
                  {checkoutLoading ? "Sending..." : "Continue"}
                </button>
              </div>
            )}

            {checkoutStep === "name" && (
              <div>
                <p className="mb-3 text-sm text-white/60">
                  We don&apos;t have an account for this number yet. Enter your name to continue.
                </p>
                <label className="mb-2 block text-sm font-semibold text-white/60">Your Name</label>
                <input
                  type="text"
                  placeholder="Full name"
                  value={attendeeName}
                  onChange={(e) => setAttendeeName(e.target.value)}
                  className="w-full rounded-xl border border-[#1e1e2e] bg-[#0a0a0f]/60 px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-[#4ADE80]/60"
                  autoFocus
                />

                {checkoutError && (
                  <p className="mt-3 text-xs text-red-400">{checkoutError}</p>
                )}

                <button
                  onClick={submitName}
                  disabled={!attendeeName.trim()}
                  className="mt-4 w-full rounded-xl py-3 text-sm font-extrabold text-black transition hover:brightness-110 disabled:opacity-50"
                  style={{ backgroundColor: fill }}
                >
                  Continue
                </button>

                <button
                  onClick={() => {
                    setCheckoutStep("phone")
                    setCheckoutError("")
                  }}
                  className="mt-2 w-full py-2 text-xs text-white/40 transition-colors hover:text-white/60"
                >
                  Change phone number
                </button>
              </div>
            )}

            {checkoutStep === "verify" && (
              <div>
                <p className="mb-3 text-sm text-white/60">
                  Enter the 6-digit code sent to your phone
                  {userName && (
                    <span className="mt-1 block text-white/80">
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
                  className="w-full rounded-xl border border-[#1e1e2e] bg-[#0a0a0f]/60 px-4 py-3 text-center text-2xl font-mono tracking-[0.5em] text-white placeholder-white/20 outline-none focus:border-[#4ADE80]/60"
                  autoFocus
                />

                {checkoutError && (
                  <p className="mt-3 text-xs text-red-400">{checkoutError}</p>
                )}

                <button
                  onClick={verifyAndPurchase}
                  disabled={checkoutLoading || otpCode.length < 6}
                  className="mt-4 w-full rounded-xl py-3 text-sm font-extrabold text-black transition hover:brightness-110 disabled:opacity-50"
                  style={{ backgroundColor: fill }}
                >
                  {checkoutLoading ? "Verifying..." : "Verify & Pay"}
                </button>
                <p className="mt-3 text-center text-[11px] leading-relaxed text-white/35">
                  By continuing, you agree that all sales are final. If the event is cancelled by the organizer, you will receive a refund of the ticket face value. You also agree to the{" "}
                  <a href="/terms" target="_blank" rel="noreferrer" className="underline decoration-white/30 hover:text-white/60">
                    Terms
                  </a>{" "}
                  and{" "}
                  <a href="/privacy" target="_blank" rel="noreferrer" className="underline decoration-white/30 hover:text-white/60">
                    Privacy Policy
                  </a>
                  .
                </p>

                <button
                  onClick={() => {
                    setCheckoutStep("phone")
                    setOtpCode("")
                    setCheckoutError("")
                  }}
                  className="mt-2 w-full py-2 text-xs text-white/40 transition-colors hover:text-white/60"
                >
                  Change phone number
                </button>
              </div>
            )}

            {checkoutStep === "processing" && (
              <div className="py-8 text-center">
                <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                <p className="text-sm text-white/60">Setting up your payment...</p>
              </div>
            )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
