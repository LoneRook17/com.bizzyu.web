"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import dynamic from "next/dynamic"


import { getApiBaseUrl } from "@/lib/api-url"
import { isAppleWalletCapable } from "@/lib/apple-wallet"
import { nativeShare } from "@/lib/share"
import { parseVenueStripeBlock, type VenueStripeBlock } from "@/lib/venue-stripe-block"
import VenueSalesPausedNotice from "@/components/checkout/VenueSalesPausedNotice"
import LineSkipPaymentPanel from "@/components/checkout/LineSkipPaymentPanel"
import {
  MOCK_ENABLED,
  completePayment,
  createPaymentIntent,
  fetchPiConfig,
  pollComplete,
} from "@/lib/lineskip-pi/client"
import {
  LineSkipSoldOutError,
  type LineSkipCompleteResponse,
  type LineSkipPiBreakdown,
} from "@/lib/lineskip-pi/types"
import { nightAvailability, remainingCapacity } from "@/lib/lineskip/availability"
import { CHECKOUT_PANEL_CLASS } from "@/lib/lineskip/checkout-modal"
import { ACCESS, ACCESS_CTA, ACCESS_LIGHT, GLASS, GLASS_SOFT } from "@/lib/checkout/surfaces"
import { isLineSkipSuccessArrival } from "@/lib/lineskip/success-params"
import { fireConfetti } from "./success/confetti"

const WEB_BASE_URL = process.env.NEXT_PUBLIC_WEB_BASE_URL || "https://bizzyu.com"
const API_URL = getApiBaseUrl()
// Door access / Weekly Cover / skip — magenta, matching the app (D-P5).
// Named events stay green. Never gold.

// Dev-only scenario switch for the PI mock. MOCK_ENABLED is a build-time
// constant, so in a prod build this is `null` and the dynamic import behind it
// is never emitted.
const MockScenarioPicker =
  process.env.NEXT_PUBLIC_LINESKIP_PI_MOCK === "1"
    ? dynamic(() => import("@/components/checkout/MockScenarioPicker"), { ssr: false })
    : null

// ─── Types ───────────────────────────────────────────────────────────────────

interface Business {
  business_id: number
  name: string
  address: string
  logo_image_url: string | null
  phone: string | null
  website: string | null
}

interface VenueInfo {
  venue_id: number
  name: string
  address: string | null
  description: string | null
  photo_url: string | null
}

interface LineSkipInstance {
  id: number
  line_skip_id: number
  business_id: number
  date: string
  start_time: string
  end_time: string
  price_cents: number
  capacity: number | null
  status: string
  tickets_sold: number
  line_skip_name?: string
  line_skip_description?: string
  business_name?: string
}

interface EventItem {
  event_id: number
  name: string
  type: string
  start_date_time: string
  end_date_time: string
  flyer_image_url: string | null
  venue_name: string | null
  status: string
}

interface PromoInfo {
  id: number
  code: string
  discount_type: "percentage" | "flat"
  discount_value: number
  max_per_user: number | null
  line_skip_instance_id: number
  instance_date: string
}

interface FeeConfig {
  flat_cents: number
  percentage: number
}

interface PageData {
  business: Business
  venue: VenueInfo | null
  instances: LineSkipInstance[]
  events: EventItem[]
  fee_config: FeeConfig
}

type CheckoutStep =
  | "idle"
  | "phone"
  | "name"
  | "verify"
  | "processing"
  // ── PI-flow-only steps (never reached with pi_flow_enabled false) ─────────
  | "pay"
  | "finalizing"
  // Sold out at intent-creation (409) — nothing was ever charged.
  | "sold_out_unpaid"
  // Sold out between charge and issue — charged, then auto-refunded.
  | "sold_out_refunded"
  | "pending_fallback"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00")
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })
}

function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number)
  const ampm = h >= 12 ? "PM" : "AM"
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`
}

function formatPrice(cents: number): string {
  if (cents === 0) return "Free"
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`
}

function getDiscountedPrice(priceCents: number, promo: PromoInfo | null): number {
  if (!promo) return priceCents
  if (promo.discount_type === "percentage") {
    return Math.max(0, priceCents - Math.round(priceCents * (promo.discount_value / 100)))
  }
  return Math.max(0, priceCents - Math.round(promo.discount_value * 100))
}

function instanceDateOnly(inst: LineSkipInstance): string {
  return typeof inst.date === "string" ? inst.date.substring(0, 10) : inst.date
}

function easternParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now)
  const n = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value)
  return { year: n("year"), month: n("month"), day: n("day"), hour: n("hour") }
}

function ymd(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

/** Calendar date in America/New_York — "day of" on the checkout list. */
function calendarTodayKey(now = new Date()): string {
  const p = easternParts(now)
  return ymd(p.year, p.month, p.day)
}

/** Nightlife day rolls at 05:00 ET — still used so a 1 AM Saturday night counts. */
function nightlifeTodayKey(now = new Date()): string {
  const p = easternParts(now)
  let date = new Date(p.year, p.month - 1, p.day)
  if (p.hour < 5) {
    date = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1)
  }
  return ymd(date.getFullYear(), date.getMonth() + 1, date.getDate())
}

function isDayOf(dateStr: string): boolean {
  return dateStr === calendarTodayKey() || dateStr === nightlifeTodayKey()
}

function NightCard({
  inst,
  tonight,
  isSelected,
  promo,
  quantity,
  onSelect,
  onAdjustQty,
}: {
  inst: LineSkipInstance
  tonight: boolean
  isSelected: boolean
  promo: PromoInfo | null
  quantity: number
  onSelect: () => void
  onAdjustQty: (val: number) => void
}) {
  const [descOpen, setDescOpen] = useState(false)
  const discountedPrice = getDiscountedPrice(inst.price_cents, promo)
  const isSoldOut = nightAvailability(inst) === "sold_out"
  const remaining = remainingCapacity(inst)
  const dateOnly = instanceDateOnly(inst)
  const description =
    inst.line_skip_description?.trim() ||
    `Walk past the line from ${formatTime(inst.start_time)} to ${formatTime(inst.end_time)}.`
  const descLong = description.length > 72
  const descShown = descOpen || !descLong ? description : `${description.slice(0, 72).trimEnd()}…`

  return (
    <div className={tonight ? "" : "space-y-1.5"}>
      {!tonight && (
        <p className="px-0.5 text-xs font-extrabold tracking-tight text-white/50">
          {formatDate(dateOnly)}
        </p>
      )}

      <div
        className={`${GLASS} overflow-hidden transition-all duration-300 ${
          tonight ? "ls-tonight" : ""
        } ${
          isSoldOut
            ? "opacity-50"
            : isSelected
              ? ""
              : "cursor-pointer hover:-translate-y-0.5"
        }`}
        style={
          isSelected
            ? { borderColor: `${ACCESS}99`, boxShadow: `0 0 0 1px ${ACCESS}55, 0 24px 60px -20px ${ACCESS}40` }
            : tonight
              ? { borderColor: `${ACCESS}88`, boxShadow: `0 0 0 1px ${ACCESS}44, 0 22px 48px -12px ${ACCESS}70` }
              : undefined
        }
        onClick={() => !isSoldOut && onSelect()}
      >
        <div className={tonight ? "px-4 py-3" : "px-3.5 py-2.5"}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <h3 className={`font-extrabold leading-none text-white ${tonight ? "text-lg" : "text-[15px]"}`}>
                  Skip the Line Pass
                </h3>
                <span
                  className="inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.5px]"
                  style={{ backgroundColor: `${ACCESS}1f`, color: ACCESS }}
                >
                  Cover included
                </span>
              </div>
              <p className={`mt-1.5 leading-snug text-white/50 ${tonight ? "text-sm" : "text-xs"}`}>
                {descShown}
                {descLong && (
                  <>
                    {" "}
                    <button
                      type="button"
                      className="font-bold underline-offset-2 hover:underline"
                      style={{ color: ACCESS }}
                      onClick={(e) => {
                        e.stopPropagation()
                        setDescOpen((open) => !open)
                      }}
                    >
                      {descOpen ? "See less" : "See more"}
                    </button>
                  </>
                )}
              </p>
              {isSoldOut && (
                <span className="mt-1 inline-block text-[10px] font-bold text-white/40">Sold out</span>
              )}
            </div>
            <p
              className={`shrink-0 font-extrabold leading-none ${tonight ? "text-xl" : "text-lg"}`}
              style={{ color: promo ? ACCESS : "white" }}
            >
              {promo && (
                <span className="mr-1.5 text-xs font-semibold text-white/40 line-through">
                  {formatPrice(inst.price_cents)}
                </span>
              )}
              {formatPrice(promo ? discountedPrice : inst.price_cents)}
            </p>
          </div>

          {isSelected && !isSoldOut && (
            <div className="mt-2 flex items-center justify-between rounded-lg border border-white/15 bg-white/[0.04] px-3 py-1.5">
              <span className="text-xs font-semibold text-white/70">How many?</span>
              <div className="flex items-center gap-1 rounded-md bg-white/5 ring-1 ring-white/10">
                <button
                  onClick={(e) => { e.stopPropagation(); onAdjustQty(quantity - 1) }}
                  className="px-2.5 py-1 text-base font-bold text-white/60 transition-colors hover:text-white disabled:opacity-40"
                  disabled={quantity <= 1}
                >
                  −
                </button>
                <span className="w-6 text-center text-sm font-extrabold text-white">{quantity}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); onAdjustQty(quantity + 1) }}
                  className="px-2.5 py-1 text-base font-bold text-white/60 transition-colors hover:text-white disabled:opacity-40"
                  disabled={remaining !== null && quantity >= remaining}
                >
                  +
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function LineSkipCheckoutClient({
  venueId,
  initialData,
}: {
  venueId: string
  initialData: PageData | null
}) {
  // Page data
  const [business, setBusiness] = useState<Business | null>(initialData?.business ?? null)
  const [venue, setVenue] = useState<VenueInfo | null>(initialData?.venue ?? null)
  const [instances, setInstances] = useState<LineSkipInstance[]>(initialData?.instances ?? [])
  const [events, setEvents] = useState<EventItem[]>(initialData?.events ?? [])
  const [feeConfig, setFeeConfig] = useState<FeeConfig | null>(initialData?.fee_config ?? null)
  const [loading, setLoading] = useState(!initialData)
  const [error, setError] = useState("")

  // UI state
  const [selectedInstanceId, setSelectedInstanceId] = useState<number | null>(null)
  const [quantity, setQuantity] = useState(1)

  // Promo state
  const [promoInput, setPromoInput] = useState("")
  const [promoApplied, setPromoApplied] = useState<PromoInfo[] | null>(null)
  const [promoError, setPromoError] = useState("")
  const [promoLoading, setPromoLoading] = useState(false)

  // Checkout modal state
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>("idle")
  const [phone, setPhone] = useState("")
  const [otpCode, setOtpCode] = useState("")
  const [attendeeName, setAttendeeName] = useState("")
  const [userName, setUserName] = useState<string | null>(null)
  const [hasAccount, setHasAccount] = useState(false)
  const [checkoutError, setCheckoutError] = useState("")
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  // Venue payout account not ready (#9): line-skip sales at this venue are
  // paused. Rendered as a full pause notice in place of the purchase CTA.
  const [venueBlock, setVenueBlock] = useState<VenueStripeBlock | null>(null)
  // SMS marketing opt-in (default-checked, optional). Sent with the purchase so
  // the backend sets business_followers.sms_enabled. Unchecking doesn't block.
  const [smsOptIn, setSmsOptIn] = useState(true)
  // ── PI (Elements) flow state ───────────────────────────────────────────────
  // All of this stays null/false when the server reports pi_flow_enabled false,
  // which is what keeps the session redirect below untouched.
  const [piEnabled, setPiEnabled] = useState(false)
  const [piPublishableKey, setPiPublishableKey] = useState<string | null>(null)
  const [piClientSecret, setPiClientSecret] = useState<string | null>(null)
  const [piId, setPiId] = useState<string | null>(null)
  const [piBreakdown, setPiBreakdown] = useState<LineSkipPiBreakdown | null>(null)

  // Keyboard overlap (px) reported by visualViewport; 0 on desktop / unsupported.
  // Applied as a translateY on the modal's offset WRAPPER (never the ls-rise panel).
  const [kbOffset, setKbOffset] = useState(0)
  // The active step's primary input - focused manually after the entrance settles
  // (instead of autoFocus, which opened the keyboard mid-animation = the jank).
  const focusInputRef = useRef<HTMLInputElement | null>(null)

  // ─── Keyboard-aware sheet offset (iOS Safari) ──────────────────────────────
  // position:fixed is relative to the LAYOUT viewport on iOS, which does NOT
  // shrink when the keyboard opens - only the VISUAL viewport does. We measure
  // the overlap and lift the bottom-anchored sheet by exactly that much so the
  // input stays just above the keyboard. Desktop / unsupported browsers report
  // 0 and behave exactly as before.
  useEffect(() => {
    if (checkoutStep === "idle" || checkoutStep === "processing") {
      setKbOffset(0)
      return
    }
    if (typeof window === "undefined" || !window.visualViewport) return

    const vv = window.visualViewport
    let raf = 0
    const update = () => {
      // Coalesce the burst of resize/scroll events iOS fires during the keyboard
      // slide into one write per frame.
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const overlap = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
        // Skip sub-pixel churn - only re-render on a meaningful change.
        setKbOffset((prev) => (Math.abs(prev - overlap) > 1 ? Math.round(overlap) : prev))
      })
    }

    vv.addEventListener("resize", update)
    vv.addEventListener("scroll", update)
    update() // initial measure

    return () => {
      cancelAnimationFrame(raf)
      vv.removeEventListener("resize", update)
      vv.removeEventListener("scroll", update)
    }
  }, [checkoutStep])

  // Focus the active step's input AFTER the modal has visually settled, so iOS
  // doesn't open the keyboard while the 0.6s ls-rise entrance is still running.
  // The phone step (rendered on open) waits out the entrance; later steps reuse
  // the already-mounted panel, so they focus almost immediately.
  useEffect(() => {
    if (checkoutStep === "idle" || checkoutStep === "processing") return
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    const delay = reduce ? 50 : checkoutStep === "phone" ? 650 : 80
    const t = window.setTimeout(() => focusInputRef.current?.focus(), delay)
    return () => window.clearTimeout(t)
  }, [checkoutStep])

  // Fetch data if not provided by server
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/line-skips/venue/${venueId}/page-info`)
      if (!res.ok) throw new Error("Venue not found")
      const data = await res.json()
      setBusiness(data.business)
      setVenue(data.venue || null)
      setInstances(data.instances || [])
      setEvents(data.events || [])
      setFeeConfig(data.fee_config || null)
    } catch {
      setError("Could not load venue information")
    } finally {
      setLoading(false)
    }
  }, [venueId])

  useEffect(() => {
    if (!initialData) fetchData()
  }, [initialData, fetchData])

  // Selected instance
  const selectedInstance = instances.find((i) => i.id === selectedInstanceId) || null

  // Ask the server whether this instance takes the in-page PI flow. The answer
  // is per-instance (the flag carries an allowlist), so it is re-asked on every
  // selection. Any failure leaves piEnabled false — the buyer silently keeps
  // today's Checkout-Session flow rather than losing the ability to pay.
  useEffect(() => {
    if (!selectedInstanceId) {
      setPiEnabled(false)
      setPiPublishableKey(null)
      return
    }
    let cancelled = false
    fetchPiConfig(selectedInstanceId)
      .then((cfg) => {
        if (cancelled) return
        setPiEnabled(cfg.pi_flow_enabled && Boolean(cfg.publishable_key))
        setPiPublishableKey(cfg.publishable_key)
      })
      .catch(() => {
        if (!cancelled) {
          setPiEnabled(false)
          setPiPublishableKey(null)
        }
      })
    return () => {
      cancelled = true
    }
  }, [selectedInstanceId])

  // Quantity helpers
  const adjustQty = (val: number) => {
    // Internal clamp only — remaining is never shown to the buyer (LS-UI-2).
    const remaining = selectedInstance ? remainingCapacity(selectedInstance) ?? 10 : 10
    setQuantity(Math.max(1, Math.min(10, Math.min(remaining, val))))
  }

  const selectInstance = (id: number) => {
    if (selectedInstanceId === id) {
      setSelectedInstanceId(null)
      return
    }
    setSelectedInstanceId(id)
    setQuantity(1)
    // Clear promo when switching instances - promo may not apply to new instance
    if (promoApplied) {
      removePromo()
    }
  }

  // Get applicable promo for an instance
  const getPromoForInstance = (instanceId: number): PromoInfo | null => {
    if (!promoApplied) return null
    return promoApplied.find((p) => Number(p.line_skip_instance_id) === Number(instanceId)) || null
  }

  // ─── Fee Calculation (client-side) ────────────────────────────────────────

  const calcFees = () => {
    if (!selectedInstance) return null
    const promo = getPromoForInstance(selectedInstance.id)
    const discountedUnitPrice = getDiscountedPrice(selectedInstance.price_cents, promo)
    const discountPerUnit = selectedInstance.price_cents - discountedUnitPrice
    const discountedSubtotal = discountedUnitPrice * quantity
    const discountTotal = discountPerUnit * quantity
    const originalSubtotal = selectedInstance.price_cents * quantity

    if (discountedSubtotal === 0) {
      return { subtotal: originalSubtotal, discount: discountTotal, service_fee: 0, total: 0 }
    }

    // If feeConfig hasn't loaded yet, show subtotal without service fee
    const flatFee = feeConfig ? feeConfig.flat_cents * quantity : 0
    const percentageFee = feeConfig ? Math.round(discountedSubtotal * (feeConfig.percentage / 100)) : 0
    const serviceFee = flatFee + percentageFee

    return {
      subtotal: originalSubtotal,
      discount: discountTotal,
      service_fee: serviceFee,
      total: discountedSubtotal + serviceFee,
    }
  }

  const fees = selectedInstanceId ? calcFees() : null

  // ─── Promo Code ──────────────────────────────────────────────────────────

  const applyPromo = async () => {
    if (!promoInput.trim()) return
    setPromoLoading(true)
    setPromoError("")
    try {
      const res = await fetch(`${API_URL}/line-skips/checkout/apply-promo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoInput.trim(), business_id: business?.business_id }),
      })
      const data = await res.json()
      if (!res.ok) {
        setPromoError(data.message || "Invalid promo code")
        setPromoApplied(null)
        return
      }
      setPromoApplied(data.promos)
      setPromoError("")
    } catch {
      setPromoError("Failed to apply promo code")
    } finally {
      setPromoLoading(false)
    }
  }

  const removePromo = () => {
    setPromoApplied(null)
    setPromoInput("")
    setPromoError("")
  }

  const handlePromoInputChange = (value: string) => {
    setPromoInput(value.toUpperCase())
    if (value.trim() === "" && promoApplied) {
      removePromo()
    }
  }

  // ─── Checkout Flow ───────────────────────────────────────────────────────

  const startCheckout = () => {
    if (!selectedInstance) return
    setCheckoutStep("phone")
    setCheckoutError("")
    setPhone("")
    setOtpCode("")
    setAttendeeName("")
    setUserName(null)
    setHasAccount(false)
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
      const digits = phone.replace(/\D/g, "")
      const fullPhone = digits.startsWith("1") ? `+${digits}` : `+1${digits}`

      // Check promo eligibility BEFORE sending verification code
      const promo = selectedInstance ? getPromoForInstance(selectedInstance.id) : null
      if (promo) {
        try {
          const eligRes = await fetch(`${API_URL}/line-skips/checkout/verify-promo-eligibility`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              promo_code_id: promo.id,
              phone_number: fullPhone,
              quantity,
            }),
          })
          const eligData = await eligRes.json()
          if (!eligRes.ok) {
            // API validation error (missing fields etc.) - frontend bug, don't show raw error
            setCheckoutError("Something went wrong. Please try again.")
            setCheckoutLoading(false)
            return
          }
          if (!eligData.eligible) {
            setCheckoutError(eligData.message || "You've already used this promo code")
            setCheckoutLoading(false)
            return
          }
          if (eligData.outcome === "partial") {
            setCheckoutError(eligData.message || `This promo code can only be applied to ${eligData.remaining} more ticket(s)`)
            setCheckoutLoading(false)
            return
          }
        } catch (e) {
          setCheckoutError("Something went wrong. Please try again.")
          setCheckoutLoading(false)
          return
        }
      }

      const res = await fetch(`${API_URL}/line-skips/checkout/send-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: fullPhone }),
      })
      const data = await res.json()
      if (!res.ok) {
        setCheckoutError(data.message || "Failed to send code")
        return
      }
      if (data.has_account && data.user_name) {
        // Registered user - skip name step
        setUserName(data.user_name)
        setAttendeeName(data.user_name)
        setHasAccount(true)
        setCheckoutStep("verify")
      } else {
        // New user - ask for name
        setHasAccount(false)
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

  const verifyCode = async () => {
    if (!otpCode || otpCode.length < 6) {
      setCheckoutError("Please enter the 6-digit code")
      return
    }
    setCheckoutLoading(true)
    setCheckoutError("")
    try {
      const digits = phone.replace(/\D/g, "")
      const fullPhone = digits.startsWith("1") ? digits : `1${digits}`
      const res = await fetch(`${API_URL}/line-skips/checkout/verify-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: `+${fullPhone}`, code: otpCode }),
      })
      const data = await res.json()
      if (!res.ok) {
        setCheckoutError(data.message || "Invalid code")
        return
      }
      if (data.user_name) {
        setUserName(data.user_name)
        if (!attendeeName) setAttendeeName(data.user_name)
      }

      // Proceed to payment
      await proceedToPayment(data.user_name || "")
    } catch {
      setCheckoutError("Verification failed")
    } finally {
      setCheckoutLoading(false)
    }
  }

  const proceedToPayment = async (verifiedName: string) => {
    if (!selectedInstance) return
    setCheckoutStep("processing")

    // Guard: if promo input was cleared, ensure all promo state is wiped
    if (!promoInput.trim() && promoApplied) {
      setPromoApplied(null)
      setPromoError("")
    }

    const digits = phone.replace(/\D/g, "")
    const fullPhone = digits.startsWith("1") ? `+${digits}` : `+1${digits}`
    const qty = quantity
    const promo = promoInput.trim() ? getPromoForInstance(selectedInstance.id) : null
    const finalName = attendeeName || verifiedName || "Guest"
    const discountedPrice = getDiscountedPrice(selectedInstance.price_cents, promo)
    const totalCents = discountedPrice * qty

    try {
      if (totalCents <= 0) {
        // Free checkout
        const res = await fetch(`${API_URL}/line-skips/checkout/complete-free`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instance_id: selectedInstance.id,
            quantity: qty,
            phone_number: fullPhone,
            attendee_name: finalName,
            promo_code_id: promo?.id || null,
            sms_opt_in: smsOptIn,
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
          setCheckoutError(data.message || "Checkout failed")
          setCheckoutStep("phone")
          return
        }
        const ticketUuids = (data.tickets || []).map((t: any) => t.uuid).join(",")
        const walletToken = data.wallet_token || ""
        window.location.href = `/lineskip/${venueId}?free_success=1&venue_name=${encodeURIComponent(data.venue_name || "")}&business_name=${encodeURIComponent(data.business_name || "")}&venue_id=${data.venue_id || venueId}&date=${encodeURIComponent(data.instance_date || "")}&start=${encodeURIComponent(data.start_time || "")}&end=${encodeURIComponent(data.end_time || "")}&count=${data.tickets?.length || qty}&tickets=${encodeURIComponent(ticketUuids)}&wallet_token=${encodeURIComponent(walletToken)}`
        return
      }

      // Paid checkout, flag ON: stay in-page. Create the PaymentIntent, then
      // hand off to Elements. The session path below is left exactly as it was
      // and still runs whenever the server says the flag is off.
      if (piEnabled && piPublishableKey) {
        try {
          const localFees = calcFees()
          const pi = await createPaymentIntent(
            {
              instance_id: selectedInstance.id,
              quantity: qty,
              phone_number: fullPhone,
              promo_code: promo?.code ?? null,
              attendee_name: finalName,
              sms_opt_in: smsOptIn,
            },
            {
              base_cents: localFees?.subtotal ?? 0,
              discount_cents: localFees?.discount ?? 0,
              fee_cents: localFees?.service_fee ?? 0,
            }
          )
          setPiClientSecret(pi.pi_client_secret)
          setPiId(pi.pi_id)
          setPiBreakdown(pi.breakdown)
          setCheckoutStep("pay")
        } catch (e) {
          if (e instanceof LineSkipSoldOutError) {
            setCheckoutStep("sold_out_unpaid")
            return
          }
          setCheckoutError(e instanceof Error ? e.message : "Could not start payment")
          setCheckoutStep("phone")
        }
        return
      }

      // Paid checkout: create Stripe session
      const res = await fetch(`${API_URL}/line-skips/checkout/create-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instance_id: selectedInstance.id,
          quantity: qty,
          phone_number: fullPhone,
          attendee_name: finalName,
          promo_code_id: promo?.id || null,
          sms_opt_in: smsOptIn,
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

  // ─── PI flow: fulfilment ─────────────────────────────────────────────────

  /** Hand off to the param-driven success screen this page already renders. */
  const goToSuccess = (data: LineSkipCompleteResponse, qty: number) => {
    const inst = selectedInstance
    const rawDate = data.instance_date || (inst?.date as string) || ""
    const params = new URLSearchParams({
      purchase_success: "1",
      venue_name: data.venue_name || venue?.name || "",
      business_name: data.business_name || business?.name || "",
      venue_id: String(data.venue_id ?? venue?.venue_id ?? venueId),
      date: typeof rawDate === "string" ? rawDate.substring(0, 10) : rawDate,
      start: data.start_time || inst?.start_time || "",
      end: data.end_time || inst?.end_time || "",
      count: String(data.tickets?.length || qty),
      tickets: (data.tickets || []).map((t) => t.uuid).join(","),
      wallet_token: data.wallet_token || "",
    })
    window.location.href = `/lineskip/${venueId}?${params.toString()}`
  }

  /**
   * Stripe says the money moved. From here the buyer is charged, so there is no
   * failure state left that should read as an error: every arm below either
   * shows their passes, tells them the refund is on its way, or tells them the
   * passes are coming by text.
   */
  const finalize = async (id: string) => {
    setCheckoutStep("finalizing")
    try {
      let result = await completePayment(id)
      if (result.status === "pending") {
        result = await pollComplete(id)
      }
      if (result.status === "fulfilled") {
        goToSuccess(result, quantity)
        return
      }
      if (result.status === "refunded_sold_out") {
        setCheckoutStep("sold_out_refunded")
        return
      }
      setCheckoutStep("pending_fallback")
    } catch {
      // Charged but we can't confirm — never an error screen. The webhook is
      // the authoritative fulfiller and will text them.
      setCheckoutStep("pending_fallback")
    }
  }

  const handlePaid = () => {
    if (piId) finalize(piId)
  }

  // Return leg of an off-site confirmation (3DS challenge, bank app). Stripe
  // sends the buyer back to returnUrl with ?payment_intent=…, which is all
  // `complete` needs — so the redirect lands in exactly the same finalizer as
  // the inline path, with no page state to restore.
  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    if (params.get("pi_return") !== "1") return
    const returnedPi = params.get("payment_intent")
    if (!returnedPi) return
    setPiId(returnedPi)
    finalize(returnedPi)
    // Once only, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ─── Free Success State ──────────────────────────────────────────────────

  const [freeSuccess, setFreeSuccess] = useState(false)
  const [freeSuccessData, setFreeSuccessData] = useState<{
    venue_name: string
    business_name: string
    venue_id: string
    date: string
    start: string
    end: string
    count: number
    tickets: string[]
    wallet_token: string
  } | null>(null)
  const [showFreeWalletButton, setShowFreeWalletButton] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    // `purchase_success` is the PI flow's arrival; `free_success` is the
    // pre-existing free-checkout arrival. Same screen, same params — the only
    // difference is which flow paid for it, which this screen never mentions.
    if (isLineSkipSuccessArrival(window.location.search)) {
      setFreeSuccess(true)
      const ticketParam = params.get("tickets") || ""
      setFreeSuccessData({
        venue_name: params.get("venue_name") || "",
        business_name: params.get("business_name") || "",
        venue_id: params.get("venue_id") || venueId,
        date: params.get("date") || "",
        start: params.get("start") || "",
        end: params.get("end") || "",
        count: Number(params.get("count") || 1),
        tickets: ticketParam ? ticketParam.split(",") : [],
        wallet_token: params.get("wallet_token") || "",
      })
      setShowFreeWalletButton(isAppleWalletCapable())
    }
  }, [])

  // Celebrate a confirmed line-skip purchase with one confetti burst — the same
  // module and guarantees the /success route uses (TF-HI-W1), now on the venue
  // page where the LIVE PI/free flow actually lands (TF-DRIVE-W1). The ref makes
  // it fire exactly once per arrival — no replay on re-render or React
  // StrictMode's double-effect — and it is gated on `freeSuccess`, which is only
  // ever set from a success param, so it never fires on the plain venue page.
  // fireConfetti() itself no-ops under prefers-reduced-motion. A manual refresh
  // of a success URL remounts the component (fresh ref) and fires again, which
  // is acceptable for a success page.
  const confettiFired = useRef(false)
  useEffect(() => {
    if (freeSuccess && !confettiFired.current) {
      confettiFired.current = true
      fireConfetti()
    }
  }, [freeSuccess])

  // ─── Render: Loading / Error ─────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f] font-[family-name:var(--font-fira)]">
        <div className="text-center">
          <div
            className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-white/20"
            style={{ borderTopColor: ACCESS }}
          />
          <p className="text-white/60">Loading...</p>
        </div>
      </div>
    )
  }

  if (error || !business) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f] p-6 font-[family-name:var(--font-fira)]">
        <div className="w-full max-w-md text-center">
          <h2 className="mb-2 text-xl font-bold text-white">{error || "Business not found"}</h2>
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

  // ─── Render: Free Success ────────────────────────────────────────────────

  if (freeSuccess && freeSuccessData) {
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
              style={{ backgroundColor: `${ACCESS}1f`, border: `1px solid ${ACCESS}33` }}
            >
              <svg className="h-10 w-10" style={{ color: ACCESS }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-extrabold text-white">You&apos;re all set!</h1>
            <p className="mt-1 text-white/60">
              Your Skip the Line{freeSuccessData.count > 1 ? "s are" : " is"} confirmed for{" "}
              {freeSuccessData.venue_name || freeSuccessData.business_name}
            </p>
          </div>

          {/* Get your line skips in the app */}
          <div className="mb-6 rounded-2xl border border-[#1e1e2e] bg-[#141420] p-6 text-center">
            <h2 className="mb-2 text-2xl font-extrabold text-white">Get your Skip the Line in the app</h2>
            <p className="mb-6 text-sm text-gray-400">
              Sign up with the <span className="font-semibold text-white">same phone number</span> you used at checkout.
            </p>

            <a
              href="https://apps.apple.com/app/id6683306360"
              target="_blank"
              rel="noreferrer"
              className="flex w-full items-center justify-center gap-2.5 rounded-2xl px-6 py-4 text-lg font-extrabold text-black transition hover:brightness-110 active:scale-[0.98]"
              style={{ background: `${ACCESS_CTA}`, boxShadow: `0 16px 40px -12px ${ACCESS}80` }}
            >
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
              Download the Bizzy App
            </a>

            {/* Add to Apple Wallet - iOS-only small pill. Bundle endpoint
                serves a `.pkpasses` archive so a single tap installs every
                ticket from this free purchase, mirroring the Flutter app's
                `apple_passkit.addPasses()` flow. */}
            {showFreeWalletButton && freeSuccessData.tickets.length > 0 && freeSuccessData.wallet_token && (
              <a
                href={`${API_URL}/public/wallet/line-skip-tickets-bundle?uuids=${encodeURIComponent(freeSuccessData.tickets.join(","))}&token=${encodeURIComponent(freeSuccessData.wallet_token)}`}
                className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl bg-black px-4 py-2 text-sm font-semibold text-gray-300 ring-1 ring-white/10 transition hover:bg-gray-900"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                </svg>
                Add {freeSuccessData.tickets.length > 1 ? `${freeSuccessData.tickets.length} ` : ""}to Apple Wallet
              </a>
            )}

            <p className="mt-4 text-xs text-gray-500">
              Prefer email? Your QR codes are in your confirmation email.
            </p>
          </div>

          {/* Details card */}
          <div className="mb-6 overflow-hidden rounded-2xl border" style={{ borderColor: `${ACCESS}40`, backgroundColor: `${ACCESS}0d` }}>
            <div className="flex items-center justify-between px-5 py-3" style={{ backgroundColor: ACCESS }}>
              <span className="text-sm font-extrabold text-black/80">LINE SKIP</span>
              <span className="rounded-full bg-black/10 px-3 py-0.5 text-xs font-bold text-black/70">INCLUDES COVER</span>
            </div>
            <div className="p-5">
              <h3 className="mb-4 text-lg font-extrabold text-white">
                {freeSuccessData.venue_name || freeSuccessData.business_name}
              </h3>
              <div className="space-y-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-white/50">Date</span>
                  <span className="font-semibold text-white">{formatDate(freeSuccessData.date)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/50">Time</span>
                  <span className="font-semibold text-white">
                    {formatTime(freeSuccessData.start)} - {formatTime(freeSuccessData.end)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/50">Skip the Line</span>
                  <span className="font-semibold text-white">{freeSuccessData.count}</span>
                </div>
              </div>
              <div className="my-4 border-t border-dashed border-white/15" />
              <p className="text-center text-xs text-white/40">
                Show your QR code at the door, cover included.
              </p>
            </div>
          </div>

          {/* Share - mirrors the Flutter event-share pattern but targets
              the venue page since line-skips are venue-scoped. */}
          <ShareVenueButton
            title={freeSuccessData.venue_name || freeSuccessData.business_name || "Bizzy"}
            venueId={freeSuccessData.venue_id}
          />

          {/* Buy more */}
          <a
            href={`/lineskip/${freeSuccessData.venue_id}`}
            className="flex w-full items-center justify-center gap-2.5 rounded-2xl border border-[#1e1e2e] bg-[#141420] px-6 py-4 text-lg font-extrabold text-white transition hover:bg-[#1e1e2e] active:scale-[0.98]"
          >
            <svg className="h-5 w-5" style={{ color: ACCESS }} fill="currentColor" viewBox="0 0 24 24">
              <path d="M13 2L4.094 12.688c-.391.469-.063 1.187.547 1.187H10l-1 8.125 8.906-10.688c.391-.469.063-1.187-.547-1.187H14l-1-8.125z" />
            </svg>
            Buy more Skip the Line
          </a>

          {/* Footer */}
          <div className="mt-8 border-t border-white/5 pt-6 text-center">
            <p className="text-sm text-gray-600">
              Powered by <span className="font-semibold text-gray-400">Bizzy</span>
              {" · "}
              <a href="/terms" className="hover:text-gray-400">Terms</a>
              {" · "}
              <a href="/privacy" className="hover:text-gray-400">Privacy</a>
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ─── Derived display values ─────────────────────────────────────────────

  const displayName = venue?.name || business.name
  const displayAddress = venue?.address || business.address
  const heroImage = venue?.photo_url || business.logo_image_url
  const mapsUrl = displayAddress
    ? `https://maps.google.com/?q=${encodeURIComponent(`${displayName}, ${displayAddress}`)}`
    : null
  const availableCount = instances.filter(
    (i) => !(i.capacity !== null && i.tickets_sold >= i.capacity)
  ).length
  const tonightNights = instances.filter((i) => isDayOf(instanceDateOnly(i)))
  const laterNights = instances.filter((i) => !isDayOf(instanceDateOnly(i)))

  const isOutcomeStep =
    checkoutStep === "finalizing" ||
    checkoutStep === "sold_out_unpaid" ||
    checkoutStep === "sold_out_refunded" ||
    checkoutStep === "pending_fallback"

  // ─── Render: Main Page ───────────────────────────────────────────────────

  return (
    <div className="relative min-h-screen bg-[#0a0a0f] text-white font-[family-name:var(--font-fira)]">
      {/* Page-scoped animations (globals.css is intentionally untouched) */}
      <style>{`
        @keyframes lsRise { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes lsHeroZoom { from { transform: scale(1); } to { transform: scale(1.08); } }
        @keyframes lsFloat { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(30px, -25px); } }
        @keyframes lsTonightPulse { 0%, 100% { box-shadow: 0 0 0 0 ${ACCESS}66; } 50% { box-shadow: 0 0 0 6px ${ACCESS}00; } }
        .ls-rise { animation: lsRise 0.6s cubic-bezier(0.21, 0.65, 0.36, 1) both; }
        .ls-hero-img { animation: lsHeroZoom 24s ease-in-out infinite alternate; }
        .ls-blob { animation: lsFloat 14s ease-in-out infinite; }
        .ls-tonight-pulse { animation: lsTonightPulse 2.2s ease-in-out infinite; }
        .ls-kb-shift { transition: transform 0.2s ease-out; will-change: transform; }
        @media (prefers-reduced-motion: reduce) {
          .ls-rise, .ls-hero-img, .ls-blob, .ls-tonight-pulse { animation: none; }
          .ls-kb-shift { transition: none; }
        }
      `}</style>

      {heroImage && (
        <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
          <img
            src={heroImage}
            alt=""
            className="h-full w-full scale-[1.55] object-cover opacity-55 blur-[64px]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/35 to-[#0a0a0f]/85" />
        </div>
      )}

      <div className="relative z-10">
      {/* Sticky header — venue name + map, no street address (app event chrome). */}
      <header className="sticky top-0 z-40 bg-[#0a0a0f]/45 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-5 py-3">
          <a href="https://bizzyu.com" className="flex shrink-0 items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/bizzy-logo.png" alt="Bizzy" className="h-10 w-auto" />
          </a>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold leading-tight text-white">{displayName}</p>
          </div>
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Directions"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 01.553-.894L9 2m0 18l6-3m-6 3V2m6 15l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4" />
              </svg>
            </a>
          )}
          {availableCount > 0 && (
            <a
              href="#nights"
              className="hidden shrink-0 rounded-full px-4 py-2 text-sm font-extrabold text-black shadow-lg transition hover:brightness-110 active:scale-[0.97] sm:inline-block"
              style={{ background: `${ACCESS_CTA}`, boxShadow: `0 8px 24px -8px ${ACCESS}80` }}
            >
              Skip the Line
            </a>
          )}
        </div>
      </header>

      {/* Inset story card — same shape as the app event flyer + title wash. */}
      <div className="ls-rise mx-auto max-w-3xl px-4 pt-2">
        <div className="overflow-hidden rounded-[18px]">
          <div className="relative h-[280px] w-full sm:h-[360px]">
            {heroImage ? (
              <img src={heroImage} alt={displayName} className="ls-hero-img h-full w-full object-cover" />
            ) : (
              <div className="absolute inset-0 overflow-hidden bg-[#0d0d14]">
                <div className="ls-blob absolute -left-20 top-0 h-72 w-72 rounded-full blur-3xl" style={{ backgroundColor: `${ACCESS}26` }} />
                <div className="ls-blob absolute right-0 top-10 h-80 w-80 rounded-full blur-3xl" style={{ backgroundColor: `${ACCESS}1a`, animationDelay: "-7s" }} />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 px-5 pb-5">
              <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
                {displayName}
              </h1>
              {venue && business.name !== venue.name && (
                <p className="mt-1 text-sm font-medium italic text-white/70">at {business.name}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content. Extra mobile bottom padding whenever the sticky CTA bar is
          mounted, so the last night card / footer can scroll clear of it. */}
      <div className={`mx-auto max-w-3xl px-5 ${selectedInstance && !venueBlock ? "pb-44 sm:pb-24" : "pb-24"}`}>
        {/* Product title sits under the flyer, then the compact cover chip. */}
        <div className="ls-rise mt-6" style={{ animationDelay: "0.1s" }}>
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Skip the Line
          </h2>
          <span
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-extrabold uppercase tracking-[0.6px]"
            style={{ backgroundColor: `${ACCESS}1f`, color: ACCESS }}
          >
            Cover included
          </span>
          <p className="mt-2 text-sm text-white/50">
            Walk straight past the line. Cover is part of the price.
          </p>
        </div>

        {/* Select a Night */}
        <section id="nights" className="ls-rise mt-10 scroll-mt-20" style={{ animationDelay: "0.18s" }}>
          {instances.length === 0 ? (
            <>
              <div className="mb-5 flex items-center gap-3">
                <span className="h-6 w-1.5 rounded-full" style={{ background: `linear-gradient(180deg, ${ACCESS_LIGHT}, ${ACCESS})` }} />
                <h2 className="text-2xl font-extrabold tracking-tight text-white">Pick your night</h2>
              </div>
              <div className={`flex flex-col items-center gap-2 px-6 py-14 text-center ${GLASS_SOFT}`}>
                <svg className="h-8 w-8 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="font-bold text-white">Nothing in the next 7 days</p>
                <p className="text-sm text-white/50">Check back soon, nights are added throughout the week.</p>
              </div>
            </>
          ) : (
            <>
              {tonightNights.length > 0 && (
                <div className="mb-6">
                  <div className="mb-3 flex items-center gap-3">
                    <span className="h-6 w-1.5 rounded-full" style={{ background: `linear-gradient(180deg, ${ACCESS_LIGHT}, ${ACCESS})` }} />
                    <h2 className="text-2xl font-extrabold tracking-tight text-white">Happening Tonight</h2>
                  </div>
                  <div className="space-y-4">
                    {tonightNights.map((inst) => (
                      <NightCard
                        key={inst.id}
                        inst={inst}
                        tonight
                        isSelected={selectedInstanceId === inst.id}
                        promo={getPromoForInstance(inst.id)}
                        quantity={quantity}
                        onSelect={() => selectInstance(inst.id)}
                        onAdjustQty={adjustQty}
                      />
                    ))}
                  </div>
                </div>
              )}

              {laterNights.length > 0 && (
                <div>
                  <div className="mb-3 flex items-center gap-3">
                    <span className="h-6 w-1.5 rounded-full bg-white/30" />
                    <h2 className="text-xl font-extrabold tracking-tight text-white">
                      {tonightNights.length > 0 ? "Coming up" : "Pick your night"}
                    </h2>
                    {availableCount > 0 && tonightNights.length === 0 && (
                      <span className="rounded-full px-2.5 py-0.5 text-sm font-bold" style={{ backgroundColor: `${ACCESS}1f`, color: ACCESS }}>
                        {availableCount}
                      </span>
                    )}
                  </div>
                  <div className="space-y-4">
                    {laterNights.map((inst) => (
                      <NightCard
                        key={inst.id}
                        inst={inst}
                        tonight={false}
                        isSelected={selectedInstanceId === inst.id}
                        promo={getPromoForInstance(inst.id)}
                        quantity={quantity}
                        onSelect={() => selectInstance(inst.id)}
                        onAdjustQty={adjustQty}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Promo Code Input */}
          {selectedInstanceId && (
            <div className="mt-6">
              {promoApplied ? (
                <div className={`flex items-center justify-between px-5 py-3.5 ${GLASS_SOFT}`}>
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4" style={{ color: ACCESS }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    <span className="text-sm font-extrabold" style={{ color: ACCESS }}>
                      {promoApplied[0].code}
                    </span>
                    <span className="text-xs text-white/50">
                      {promoApplied[0].discount_type === "percentage"
                        ? `${promoApplied[0].discount_value}% off`
                        : `$${promoApplied[0].discount_value} off`}
                    </span>
                  </div>
                  <button
                    onClick={removePromo}
                    className="text-xs font-semibold text-white/40 transition-colors hover:text-white/70"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Promo code"
                    value={promoInput}
                    onChange={(e) => handlePromoInputChange(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && applyPromo()}
                    className="flex-1 rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3 text-sm font-semibold text-white placeholder-white/30 outline-none backdrop-blur-xl transition-colors focus:border-[#FF3ED1]/60"
                  />
                  <button
                    onClick={applyPromo}
                    disabled={promoLoading || !promoInput.trim()}
                    className="rounded-xl bg-white/10 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-white/15 disabled:opacity-50"
                  >
                    {promoLoading ? "..." : "Apply"}
                  </button>
                </div>
              )}
              {promoError && <p className="mt-2 text-xs text-red-400">{promoError}</p>}
            </div>
          )}

          {/* Price Breakdown */}
          {selectedInstanceId && fees && (
            <div className={`mt-6 p-6 ${GLASS}`}>
              <h3 className="mb-4 text-sm font-extrabold uppercase tracking-wider text-white/60">Order summary</h3>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between text-white/70">
                  <span>Skip the Line {quantity > 1 ? `× ${quantity}` : ""}</span>
                  <span>{formatPrice(fees.subtotal)}</span>
                </div>

                {fees.discount > 0 && (
                  <div className="flex justify-between font-semibold" style={{ color: ACCESS }}>
                    <span>Promo discount</span>
                    <span>-{formatPrice(fees.discount)}</span>
                  </div>
                )}

                <div className="my-2 border-t border-dashed border-white/15" />

                <div className="flex justify-between text-white/70">
                  <span>Subtotal</span>
                  <span>{formatPrice(fees.subtotal - fees.discount)}</span>
                </div>

                <div className="flex justify-between text-white/70">
                  <span>Service fee</span>
                  <span>{fees.service_fee === 0 ? "Free" : formatPrice(fees.service_fee)}</span>
                </div>

                <div className="my-2 border-t border-dashed border-white/15" />

                <div className="flex justify-between text-lg font-extrabold text-white">
                  <span>Total</span>
                  <span style={{ color: ACCESS }}>{fees.total === 0 ? "Free" : formatPrice(fees.total)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Venue payout account not ready (#9): the pause notice replaces
              the purchase CTA entirely — never rendered as a raw error. */}
          {venueBlock && <VenueSalesPausedNotice block={venueBlock} />}

          {/* Get Line Skip CTA */}
          {selectedInstanceId && !venueBlock && (
            <>
              <button
                onClick={startCheckout}
                className="mt-6 w-full rounded-2xl py-4 text-lg font-extrabold text-black transition hover:brightness-110 active:scale-[0.99]"
                style={{ background: `${ACCESS_CTA}`, boxShadow: `0 16px 40px -12px ${ACCESS}80` }}
              >
                {quantity > 1 ? "Buy Tickets" : "Buy Ticket"}
              </button>
              <p className="mt-3 text-center text-[11px] leading-relaxed text-white/30">
                By purchasing, you agree that all sales are final. No refunds or exchanges.
                If the night is cancelled by the venue, you will receive a full refund.
                You also agree to the{" "}
                <a href="/terms" target="_blank" rel="noreferrer" className="underline decoration-white/25 hover:text-white/55">
                  Terms
                </a>{" "}
                and{" "}
                <a href="/privacy" target="_blank" rel="noreferrer" className="underline decoration-white/25 hover:text-white/55">
                  Privacy Policy
                </a>
                .
              </p>
            </>
          )}
        </section>

        {/* Open in the Bizzy app.
            IMPORTANT (slug is NOT safe to pass through): the URL slug on this
            route is documented as "the venue id, falling back to the business
            id server-side" (services lineSkipCheckout.ts:828 uses businessId
            when an instance has no venue_id). The Flutter app parses
            bizzy://lineskip/:slug as an INTEGER VENUE ID and opens that venue
            (deep_link_service.dart:271-277 → _handleVenueDeepLink). venue_id and
            business_id are DIFFERENT id spaces, so a business-id slug would open
            the WRONG venue with no visible error. We therefore emit the REAL
            venue id from the page payload (venue.venue_id), and only render the
            button when a venue is actually present — a business-only line-skip
            page (venue === null) shows no app button rather than mis-routing.
            Tap-only, no timer/fallback. The bizzy://lineskip arm ships in the
            NEXT app build; on the current build this scheme is a no-op, so the
            App Store link stays as the fallback. */}
        {venue?.venue_id && (
          <div className={`mt-16 p-6 text-center ${GLASS}`}>
            <h2 className="mb-2 text-xl font-extrabold text-white">Get your Skip the Line in the app</h2>
            <p className="mb-5 text-sm text-gray-400">
              Manage your passes and skip the line from the Bizzy app.
            </p>
            <a
              href={`bizzy://lineskip/${venue.venue_id}`}
              className="mb-3 flex w-full items-center justify-center gap-2.5 rounded-2xl px-6 py-3.5 text-base font-extrabold text-black transition hover:brightness-110 active:scale-[0.98]"
              style={{ background: `${ACCESS_CTA}`, boxShadow: `0 16px 40px -12px ${ACCESS}80` }}
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
              Open in the Bizzy app
            </a>
            <a
              href="https://apps.apple.com/app/id6683306360"
              target="_blank"
              rel="noreferrer"
              className="block w-full rounded-2xl border border-white/15 px-6 py-3.5 text-base font-semibold text-white transition hover:bg-white/10"
            >
              Get the App
            </a>
          </div>
        )}

        {/* Footer */}
        <div className="mt-16 border-t border-white/5 pt-8 text-center">
          <p className="text-sm text-gray-600">
            Powered by{" "}
            <a href="https://bizzyu.com" className="font-semibold text-gray-400 transition hover:text-white">
              Bizzy
            </a>
            {" · "}
            <a href="/terms" className="hover:text-gray-400">Terms</a>
            {" · "}
            <a href="/privacy" className="hover:text-gray-400">Privacy</a>
          </p>
        </div>
      </div>

      {/* ─── Mobile sticky CTA bar ──────────────────────────────────────────── */}
      {/* On a phone the in-flow "Get Line Skip" button sits below the whole
          night list + promo + order summary, so after tapping a night the buyer
          still has to scroll to buy. This bar duplicates that button — same
          label, same startCheckout handler, purely presentation — pinned to the
          viewport bottom the moment a night is selected. Mobile-only
          (sm:hidden): desktop already shows the full column plus the header
          anchor CTA. z-40 keeps it under the checkout modal (z-50), whose
          backdrop dims it like the sticky header; it stays mounted there so the
          page never shifts mid-flow. safe-area padding clears the iOS home
          indicator. Hidden while the venue's payouts are paused, exactly like
          the in-flow CTA. */}
      {selectedInstance && !venueBlock && (
        <div
          className="ls-rise fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0a0a0f]/90 backdrop-blur-xl sm:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="mx-auto max-w-3xl px-5 py-3">
            <button
              onClick={startCheckout}
              className="w-full rounded-2xl py-3.5 text-base font-extrabold text-black transition hover:brightness-110 active:scale-[0.99]"
              style={{ background: `${ACCESS_CTA}`, boxShadow: `0 12px 32px -10px ${ACCESS}80` }}
            >
              {quantity > 1 ? "Buy Tickets" : "Buy Ticket"}
            </button>
          </div>
        </div>
      )}

      {/* ─── Checkout Modal ─────────────────────────────────────────────────── */}
      {/* Outcome steps survive without a selected instance: the 3DS redirect
          lands back on a freshly mounted page with nothing selected, and the
          buyer is already charged, so the outcome must still render. */}
      {checkoutStep !== "idle" && (selectedInstance || isOutcomeStep) && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center">
          {/* Keyboard-offset wrapper - owns the dynamic translateY so it never fights
              the panel's ls-rise entrance transform. Do NOT move this transform onto
              the ls-rise panel; a running CSS animation overrides an inline transform
              and reintroduces the keyboard jank. */}
          <div
            className="ls-kb-shift w-full max-w-md sm:m-4"
            style={{ transform: `translateY(-${kbOffset}px)` }}
          >
            <div className={CHECKOUT_PANEL_CLASS}>
            {/* Modal header */}
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-white">
                {checkoutStep === "phone" && "Enter your phone"}
                {checkoutStep === "name" && "Your name"}
                {checkoutStep === "verify" && "Verify your number"}
                {checkoutStep === "processing" && "Processing..."}
                {checkoutStep === "pay" && "Payment"}
                {checkoutStep === "finalizing" && "Confirming..."}
                {checkoutStep === "sold_out_unpaid" && "Just sold out"}
                {checkoutStep === "sold_out_refunded" && "Just sold out"}
                {checkoutStep === "pending_fallback" && "Payment received"}
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

            {/* Summary. Hidden on the pay step, where the server's own
                breakdown is the summary, and on outcome steps, where the money
                question is already settled. */}
            {selectedInstance && checkoutStep !== "pay" && !isOutcomeStep && (
            <div
              className="mb-5 rounded-xl px-4 py-3"
              style={{ backgroundColor: `${ACCESS}10`, border: `1px solid ${ACCESS}25` }}
            >
              {(() => {
                const dateOnly = instanceDateOnly(selectedInstance)
                const dayName = new Date(dateOnly + "T00:00:00").toLocaleDateString("en-US", { weekday: "long" })
                return (
                  <>
                    <div className="min-w-0">
                      <p className="text-sm font-extrabold text-white">Skip the Line Pass</p>
                      <p className="mt-0.5 text-xs font-semibold text-white/55">{dayName}</p>
                    </div>
                    {fees && (
                      <div className="mt-2.5 space-y-1 text-xs text-white/55">
                        <div className="flex justify-between">
                          <span>Skip the Line Pass{quantity > 1 ? ` × ${quantity}` : ""}</span>
                          <span>{formatPrice(fees.subtotal - fees.discount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Service fee</span>
                          <span>{fees.service_fee === 0 ? "Free" : formatPrice(fees.service_fee)}</span>
                        </div>
                        <div className="flex justify-between pt-1 font-extrabold text-white">
                          <span>Total</span>
                          <span style={{ color: ACCESS }}>{fees.total === 0 ? "Free" : formatPrice(fees.total)}</span>
                        </div>
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
            )}

            {/* Phone step - phone number only */}
            {checkoutStep === "phone" && (
              <div>
                <label className="mb-2 block text-sm font-semibold text-white/60">Phone Number</label>
                <div className="flex items-center gap-2 rounded-xl border border-[#1e1e2e] bg-[#0a0a0f]/60 px-4 py-3 transition-colors focus-within:border-[#FF3ED1]/60">
                  <span className="text-sm text-white/40">+1</span>
                  <input
                    ref={focusInputRef}
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, "").slice(0, 10))}
                    className="flex-1 bg-transparent text-sm text-white placeholder-white/30 outline-none"
                  />
                </div>

                {checkoutError && (
                  <p className="mt-3 text-xs text-red-400">{checkoutError}</p>
                )}

                <label className="mt-4 flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={smsOptIn}
                    onChange={(e) => setSmsOptIn(e.target.checked)}
                    className="mt-0.5 h-4 w-4 flex-shrink-0 cursor-pointer"
                    style={{ accentColor: ACCESS }}
                  />
                  <span className="text-xs text-white/50 leading-snug">
                    Keep me posted by text. I agree to receive SMS marketing messages about this venue&apos;s events &amp; deals. Msg &amp; data rates may apply; reply STOP to opt out anytime. Unchecking won&apos;t affect your purchase.
                  </span>
                </label>

                <button
                  onClick={sendCode}
                  disabled={checkoutLoading || phone.length < 10}
                  className="mt-4 w-full rounded-xl py-3 text-sm font-extrabold text-black transition hover:brightness-110 disabled:opacity-50"
                  style={{ background: `${ACCESS_CTA}` }}
                >
                  {checkoutLoading ? "Sending..." : "Continue"}
                </button>
              </div>
            )}

            {/* Name step - shown only for unregistered users */}
            {checkoutStep === "name" && (
              <div>
                <p className="mb-3 text-sm text-white/60">
                  We don&apos;t have an account for this number yet. Enter your name to continue.
                </p>
                <label className="mb-2 block text-sm font-semibold text-white/60">Your Name</label>
                <input
                  ref={focusInputRef}
                  type="text"
                  placeholder="Full name"
                  value={attendeeName}
                  onChange={(e) => setAttendeeName(e.target.value)}
                  className="w-full rounded-xl border border-[#1e1e2e] bg-[#0a0a0f]/60 px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-[#FF3ED1]/60"
                />

                {checkoutError && (
                  <p className="mt-3 text-xs text-red-400">{checkoutError}</p>
                )}

                <button
                  onClick={submitName}
                  disabled={!attendeeName.trim()}
                  className="mt-4 w-full rounded-xl py-3 text-sm font-extrabold text-black transition hover:brightness-110 disabled:opacity-50"
                  style={{ background: `${ACCESS_CTA}` }}
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

            {/* Verify step */}
            {checkoutStep === "verify" && (
              <div>
                <p className="mb-3 text-sm text-white/60">
                  Enter the 6-digit code sent to your phone
                  {userName && (
                    <span className="block mt-1 font-semibold text-white/80">
                      Welcome back, {userName}!
                    </span>
                  )}
                </p>
                <input
                  ref={focusInputRef}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="w-full rounded-xl border border-[#1e1e2e] bg-[#0a0a0f]/60 px-4 py-3 text-center text-2xl font-mono tracking-[0.5em] text-white placeholder-white/20 outline-none transition-colors focus:border-[#FF3ED1]/60"
                />

                {checkoutError && (
                  <p className="mt-3 text-xs text-red-400">{checkoutError}</p>
                )}

                <button
                  onClick={verifyCode}
                  disabled={checkoutLoading || otpCode.length < 6}
                  className="mt-4 w-full rounded-xl py-3 text-sm font-extrabold text-black transition hover:brightness-110 disabled:opacity-50"
                  style={{ background: `${ACCESS_CTA}` }}
                >
                  {checkoutLoading ? "Verifying..." : "Verify & Pay"}
                </button>

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

            {/* Processing step */}
            {checkoutStep === "processing" && (
              <div className="py-8 text-center">
                <div
                  className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-white/20"
                  style={{ borderTopColor: ACCESS }}
                />
                <p className="text-sm text-white/60">Setting up your payment...</p>
              </div>
            )}

            {/* ── PI flow steps ─────────────────────────────────────────── */}

            {checkoutStep === "pay" && piPublishableKey && piBreakdown && (
              <div>
                {MockScenarioPicker && <MockScenarioPicker />}
                <LineSkipPaymentPanel
                  publishableKey={piPublishableKey}
                  clientSecret={MOCK_ENABLED ? null : piClientSecret}
                  mock={MOCK_ENABLED}
                  breakdown={piBreakdown}
                  quantity={quantity}
                  returnUrl={`${WEB_BASE_URL}/lineskip/${venueId}?pi_return=1`}
                  onPaid={handlePaid}
                />
              </div>
            )}

            {checkoutStep === "finalizing" && (
              <div className="py-8 text-center">
                <div
                  className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-white/20"
                  style={{ borderTopColor: ACCESS }}
                />
                <p className="text-sm text-white/60">Confirming your Skip the Line...</p>
                <p className="mt-1 text-xs text-white/30">Don&apos;t close this page.</p>
              </div>
            )}

            {/* Sold out at intent creation — no money ever moved. */}
            {checkoutStep === "sold_out_unpaid" && (
              <div className="py-4 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10">
                  <svg className="h-7 w-7 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                </div>
                <h3 className="text-lg font-extrabold text-white">This night just sold out</h3>
                <p className="mt-2 text-sm text-white/60">
                  The last Skip the Line went while you were checking out.
                  <span className="mt-1 block font-semibold text-white/80">
                    You have not been charged.
                  </span>
                </p>
                <button
                  onClick={() => {
                    closeCheckout()
                    setSelectedInstanceId(null)
                    fetchData()
                  }}
                  className="mt-5 w-full rounded-xl py-3 text-sm font-extrabold text-black transition hover:brightness-110"
                  style={{ background: `${ACCESS_CTA}` }}
                >
                  Pick another night
                </button>
              </div>
            )}

            {/* Sold out between charge and issue — charged, then auto-refunded. */}
            {checkoutStep === "sold_out_refunded" && (
              <div className="py-4 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10">
                  <svg className="h-7 w-7 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h11M9 21V3m11 7l-4 4m0 0l4 4m-4-4h8" />
                  </svg>
                </div>
                <h3 className="text-lg font-extrabold text-white">This night just sold out</h3>
                <p className="mt-2 text-sm text-white/60">
                  The last Skip the Line went as your payment went through, so we couldn&apos;t
                  issue your pass.
                </p>
                <div
                  className="mt-4 rounded-xl px-4 py-3 text-sm font-semibold"
                  style={{ backgroundColor: `${ACCESS}10`, border: `1px solid ${ACCESS}30`, color: ACCESS }}
                >
                  You have not been charged — your refund is already on its way.
                </div>
                <p className="mt-3 text-xs text-white/40">
                  Refunds land back on your card in 5&ndash;10 business days.
                </p>
                <button
                  onClick={() => {
                    closeCheckout()
                    setSelectedInstanceId(null)
                    fetchData()
                  }}
                  className="mt-5 w-full rounded-xl py-3 text-sm font-extrabold text-black transition hover:brightness-110"
                  style={{ background: `${ACCESS_CTA}` }}
                >
                  Pick another night
                </button>
              </div>
            )}

            {/* Charged, fulfilment not confirmed in-page. The webhook finishes
                the job out of band, so this is a reassurance screen, not an
                error — it must never suggest the payment failed. */}
            {checkoutStep === "pending_fallback" && (
              <div className="py-4 text-center">
                <div
                  className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${ACCESS}1f`, border: `1px solid ${ACCESS}33` }}
                >
                  <svg className="h-7 w-7" style={{ color: ACCESS }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 4v-4z" />
                  </svg>
                </div>
                <h3 className="text-lg font-extrabold text-white">Your payment went through</h3>
                <p className="mt-2 text-sm text-white/60">
                  We&apos;re still finishing up your Skip the Line
                  {quantity > 1 ? "s" : ""}.
                  <span className="mt-1 block font-semibold text-white/80">
                    Check your texts &mdash; your pass{quantity > 1 ? "es" : ""} will arrive in a
                    moment.
                  </span>
                </p>
                <p className="mt-3 text-xs text-white/40">
                  Nothing else to do here. They&apos;ll also be in the Bizzy app under the phone
                  number you used.
                </p>
                <button
                  onClick={closeCheckout}
                  className="mt-5 w-full rounded-xl border border-white/15 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Done
                </button>
              </div>
            )}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}

function ShareVenueButton({ title, venueId }: { title: string; venueId: string }) {
  const [copied, setCopied] = useState(false)
  // Share the line-skip purchase page itself (mirrors how event success pages
  // share the event), not the venue profile page.
  const shareUrl = `${WEB_BASE_URL}/lineskip/${venueId}?utm_source=web_share`
  const onClick = async () => {
    const outcome = await nativeShare({ title: title ? `Skip the line at ${title}` : "Bizzy", url: shareUrl })
    if (outcome === "copied") {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }
  return (
    <div className="mt-3 mb-4">
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 py-2.5 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
        {copied ? "Link Copied!" : "Share"}
      </button>
    </div>
  )
}
