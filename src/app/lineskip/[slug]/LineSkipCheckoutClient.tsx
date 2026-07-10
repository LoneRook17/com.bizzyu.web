"use client"

import { useState, useEffect, useCallback, useRef } from "react"


import { getApiBaseUrl } from "@/lib/api-url"
import { isAppleWalletCapable } from "@/lib/apple-wallet"
import { nativeShare } from "@/lib/share"
import { parseVenueStripeBlock, type VenueStripeBlock } from "@/lib/venue-stripe-block"
import VenueSalesPausedNotice from "@/components/checkout/VenueSalesPausedNotice"

const WEB_BASE_URL = process.env.NEXT_PUBLIC_WEB_BASE_URL || "https://bizzyu.com"
const API_URL = getApiBaseUrl()
// Line skips are the "VIP" product - gold accents instead of Bizzy green to
// differentiate them from events/deals across the whole flow.
const GOLD = "#D4AF37"
const GOLD_LIGHT = "#F0CD6E"

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

type CheckoutStep = "idle" | "phone" | "name" | "verify" | "processing"

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

/** Weekday/day calendar chip for night cards. */
function NightChip({ dateStr }: { dateStr: string }) {
  const d = new Date(dateStr + "T00:00:00")
  const dow = d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase()
  const day = d.getDate()
  return (
    <div className="w-14 shrink-0 overflow-hidden rounded-xl bg-black/40 text-center ring-1 ring-white/10">
      <p className="py-0.5 text-[10px] font-extrabold tracking-widest text-black" style={{ backgroundColor: GOLD }}>
        {dow}
      </p>
      <p className="py-1.5 text-xl font-extrabold leading-none text-white">{day}</p>
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

  // Quantity helpers
  const adjustQty = (val: number) => {
    const remaining = selectedInstance?.capacity !== null && selectedInstance
      ? selectedInstance.capacity! - selectedInstance.tickets_sold
      : 10
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
    if (params.get("free_success") === "1") {
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

  // ─── Render: Loading / Error ─────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f] font-[family-name:var(--font-fira)]">
        <div className="text-center">
          <div
            className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-white/20"
            style={{ borderTopColor: GOLD }}
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
              style={{ backgroundColor: `${GOLD}1f`, border: `1px solid ${GOLD}33` }}
            >
              <svg className="h-10 w-10" style={{ color: GOLD }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-extrabold text-white">You&apos;re all set!</h1>
            <p className="mt-1 text-white/60">
              Your Line Skip{freeSuccessData.count > 1 ? "s are" : " is"} confirmed for{" "}
              {freeSuccessData.venue_name || freeSuccessData.business_name}
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
          <div className="mb-6 overflow-hidden rounded-2xl border" style={{ borderColor: `${GOLD}40`, backgroundColor: `${GOLD}0d` }}>
            <div className="flex items-center justify-between px-5 py-3" style={{ backgroundColor: GOLD }}>
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
                  <span className="text-white/50">Line Skips</span>
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

  // ─── Render: Main Page ───────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white font-[family-name:var(--font-fira)]">
      {/* Page-scoped animations (globals.css is intentionally untouched) */}
      <style>{`
        @keyframes lsRise { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes lsHeroZoom { from { transform: scale(1); } to { transform: scale(1.08); } }
        @keyframes lsFloat { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(30px, -25px); } }
        .ls-rise { animation: lsRise 0.6s cubic-bezier(0.21, 0.65, 0.36, 1) both; }
        .ls-hero-img { animation: lsHeroZoom 24s ease-in-out infinite alternate; }
        .ls-blob { animation: lsFloat 14s ease-in-out infinite; }
        .ls-kb-shift { transition: transform 0.2s ease-out; will-change: transform; }
        @media (prefers-reduced-motion: reduce) {
          .ls-rise, .ls-hero-img, .ls-blob { animation: none; }
          .ls-kb-shift { transition: none; }
        }
      `}</style>

      {/* Sticky header */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#0a0a0f]/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-5 py-3">
          <a href="https://bizzyu.com" className="flex shrink-0 items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/bizzy-logo.png" alt="Bizzy" className="h-10 w-auto" />
          </a>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold leading-tight text-white">{displayName}</p>
            {displayAddress && <p className="truncate text-xs text-gray-400">{displayAddress}</p>}
          </div>
          {availableCount > 0 && (
            <a
              href="#nights"
              className="hidden shrink-0 rounded-full px-4 py-2 text-sm font-extrabold text-black shadow-lg transition hover:brightness-110 active:scale-[0.97] sm:inline-block"
              style={{ background: `linear-gradient(135deg, ${GOLD_LIGHT}, ${GOLD})`, boxShadow: `0 8px 24px -8px ${GOLD}80` }}
            >
              Skip the line
            </a>
          )}
        </div>
      </header>

      {/* Hero */}
      <div className="relative w-full overflow-hidden">
        {heroImage ? (
          <div className="relative h-[280px] w-full sm:h-[360px]">
            <img src={heroImage} alt={displayName} className="ls-hero-img h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/55 to-black/20" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f]/60 via-transparent to-transparent" />
          </div>
        ) : (
          <div className="relative h-56 w-full overflow-hidden bg-[#0d0d14] sm:h-72">
            <div className="ls-blob absolute -left-20 top-0 h-72 w-72 rounded-full blur-3xl" style={{ backgroundColor: `${GOLD}26` }} />
            <div className="ls-blob absolute right-0 top-10 h-80 w-80 rounded-full blur-3xl" style={{ backgroundColor: `${GOLD}1a`, animationDelay: "-7s" }} />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] to-transparent" />
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 px-5 pb-7">
          <div className="ls-rise mx-auto max-w-3xl">
            <p className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-[0.2em]" style={{ color: GOLD }}>
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M13 2L4.094 12.688c-.391.469-.063 1.187.547 1.187H10l-1 8.125 8.906-10.688c.391-.469.063-1.187-.547-1.187H14l-1-8.125z" />
              </svg>
              Skip the line
            </p>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white drop-shadow-lg sm:text-5xl">
              {displayName}
            </h1>
            {venue && business.name !== venue.name && (
              <p className="mt-1 text-sm font-medium text-white/60">{business.name}</p>
            )}
            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex max-w-full items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-sm font-medium text-gray-200 ring-1 ring-white/15 backdrop-blur-sm transition hover:bg-white/15 hover:text-white"
              >
                <svg className="h-4 w-4 shrink-0" style={{ color: GOLD }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="truncate">{displayAddress}</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-3xl px-5 pb-24">
        {/* Includes Cover banner */}
        <div
          className="ls-rise mt-7 flex items-center gap-4 rounded-2xl px-5 py-4"
          style={{ backgroundColor: `${GOLD}12`, border: `1px solid ${GOLD}40`, animationDelay: "0.1s" }}
        >
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-black"
            style={{ background: `linear-gradient(135deg, ${GOLD_LIGHT}, ${GOLD})` }}
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M13 2L4.094 12.688c-.391.469-.063 1.187.547 1.187H10l-1 8.125 8.906-10.688c.391-.469.063-1.187-.547-1.187H14l-1-8.125z" />
            </svg>
          </div>
          <div>
            <p className="text-base font-extrabold" style={{ color: GOLD }}>
              Cover included
            </p>
            <p className="text-sm text-white/50">Walk straight past the line, your cover charge is part of the price.</p>
          </div>
        </div>

        {/* Select a Night */}
        <section id="nights" className="ls-rise mt-10 scroll-mt-20" style={{ animationDelay: "0.18s" }}>
          <div className="mb-5 flex items-center gap-3">
            <span className="h-6 w-1.5 rounded-full" style={{ background: `linear-gradient(180deg, ${GOLD_LIGHT}, ${GOLD})` }} />
            <h2 className="text-2xl font-extrabold tracking-tight text-white">Pick your night</h2>
            {availableCount > 0 && (
              <span className="rounded-full px-2.5 py-0.5 text-sm font-bold" style={{ backgroundColor: `${GOLD}1f`, color: GOLD }}>
                {availableCount}
              </span>
            )}
          </div>

          {instances.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-3xl border border-dashed border-[#1e1e2e] bg-[#141420]/60 px-6 py-14 text-center">
              <svg className="h-8 w-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="font-bold text-white">No Line Skips in the next 7 days</p>
              <p className="text-sm text-gray-400">Check back soon, nights are added throughout the week.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {instances.map((inst) => {
                const isSelected = selectedInstanceId === inst.id
                const promo = getPromoForInstance(inst.id)
                const discountedPrice = getDiscountedPrice(inst.price_cents, promo)
                const remaining = inst.capacity !== null ? inst.capacity - inst.tickets_sold : null
                const isSoldOut = inst.capacity !== null && inst.tickets_sold >= inst.capacity
                const pctSold = inst.capacity ? Math.min(100, Math.round((inst.tickets_sold / inst.capacity) * 100)) : 0
                const dateOnly = typeof inst.date === "string" ? inst.date.substring(0, 10) : inst.date

                return (
                  <div
                    key={inst.id}
                    className={`overflow-hidden rounded-2xl border bg-[#141420] transition-all duration-300 ${
                      isSoldOut
                        ? "border-[#1e1e2e] opacity-50"
                        : isSelected
                          ? ""
                          : "cursor-pointer border-[#1e1e2e] hover:-translate-y-0.5"
                    }`}
                    style={
                      isSelected
                        ? { borderColor: GOLD, boxShadow: `0 0 0 2px ${GOLD}40, 0 24px 60px -20px ${GOLD}40` }
                        : undefined
                    }
                    onClick={() => !isSoldOut && selectInstance(inst.id)}
                  >
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-4">
                          <NightChip dateStr={dateOnly} />
                          <div>
                            <h3 className="text-lg font-extrabold text-white">{formatDate(dateOnly)}</h3>
                            <p className="mt-0.5 text-sm font-semibold" style={{ color: GOLD }}>
                              {formatTime(inst.start_time)} &ndash; {formatTime(inst.end_time)}
                            </p>
                            {isSoldOut ? (
                              <span className="mt-1.5 inline-block rounded-full bg-white/5 px-2.5 py-0.5 text-xs font-bold text-gray-400">
                                Sold out
                              </span>
                            ) : remaining !== null ? (
                              <span className="mt-1.5 inline-block text-xs font-semibold text-white/40">
                                {remaining} left{pctSold >= 75 ? ", going fast" : ""}
                              </span>
                            ) : (
                              <span className="mt-1.5 inline-block text-xs font-semibold text-white/40">Available</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          {promo ? (
                            <div>
                              <span className="text-sm text-white/40 line-through">{formatPrice(inst.price_cents)}</span>
                              <p className="text-2xl font-extrabold" style={{ color: GOLD }}>
                                {formatPrice(discountedPrice)}
                              </p>
                            </div>
                          ) : (
                            <p className="text-2xl font-extrabold text-white">{formatPrice(inst.price_cents)}</p>
                          )}
                          {/* Selection indicator */}
                          <div className="mt-2 flex justify-end">
                            <div
                              className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors ${
                                isSelected ? "border-transparent" : "border-white/20"
                              }`}
                              style={isSelected ? { backgroundColor: GOLD } : undefined}
                            >
                              {isSelected && (
                                <svg className="h-3.5 w-3.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Capacity bar */}
                      {inst.capacity !== null && !isSoldOut && (
                        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pctSold}%`, background: `linear-gradient(90deg, ${GOLD_LIGHT}, ${GOLD})` }}
                          />
                        </div>
                      )}

                      {/* Quantity selector (shown when selected) */}
                      {isSelected && !isSoldOut && (
                        <div className="mt-4 flex items-center justify-between rounded-xl border border-[#1e1e2e] bg-[#0a0a0f]/60 px-4 py-3">
                          <span className="text-sm font-semibold text-white/70">How many?</span>
                          <div className="flex items-center gap-1 rounded-lg bg-white/5 ring-1 ring-white/10">
                            <button
                              onClick={(e) => { e.stopPropagation(); adjustQty(quantity - 1) }}
                              className="px-3.5 py-2 text-lg font-bold text-white/60 transition-colors hover:text-white disabled:opacity-40"
                              disabled={quantity <= 1}
                            >
                              −
                            </button>
                            <span className="w-8 text-center text-base font-extrabold text-white">{quantity}</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); adjustQty(quantity + 1) }}
                              className="px-3.5 py-2 text-lg font-bold text-white/60 transition-colors hover:text-white disabled:opacity-40"
                              disabled={remaining !== null && quantity >= remaining}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Promo Code Input */}
          {selectedInstanceId && (
            <div className="mt-6">
              {promoApplied ? (
                <div
                  className="flex items-center justify-between rounded-2xl px-5 py-3.5"
                  style={{ backgroundColor: `${GOLD}10`, border: `1px solid ${GOLD}30` }}
                >
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4" style={{ color: GOLD }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    <span className="text-sm font-extrabold" style={{ color: GOLD }}>
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
                    className="flex-1 rounded-xl border border-[#1e1e2e] bg-[#141420] px-4 py-3 text-sm font-semibold text-white placeholder-white/30 outline-none transition-colors focus:border-[#D4AF37]/60"
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
            <div className="mt-6 rounded-2xl border border-[#1e1e2e] bg-[#141420] p-6">
              <h3 className="mb-4 text-sm font-extrabold uppercase tracking-wider text-white/60">Order summary</h3>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between text-white/70">
                  <span>Line Skip {quantity > 1 ? `× ${quantity}` : ""}</span>
                  <span>{formatPrice(fees.subtotal)}</span>
                </div>

                {fees.discount > 0 && (
                  <div className="flex justify-between font-semibold" style={{ color: GOLD }}>
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
                  <span style={{ color: GOLD }}>{fees.total === 0 ? "Free" : formatPrice(fees.total)}</span>
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
                style={{ background: `linear-gradient(135deg, ${GOLD_LIGHT}, ${GOLD})`, boxShadow: `0 16px 40px -12px ${GOLD}80` }}
              >
                {fees && fees.total > 0
                  ? `Get Line Skip: ${formatPrice(fees.total)}`
                  : "Get Line Skip: Free"}
              </button>
              <p className="mt-3 text-center text-[11px] leading-relaxed text-white/30">
                By purchasing, you agree that all sales are final. No refunds or exchanges.
                If the night is cancelled by the venue, you will receive a full refund.
              </p>
            </>
          )}
        </section>

        {/* Footer */}
        <div className="mt-16 border-t border-white/5 pt-8 text-center">
          <p className="text-sm text-gray-600">
            Powered by{" "}
            <a href="https://bizzyu.com" className="font-semibold text-gray-400 transition hover:text-white">
              Bizzy
            </a>
          </p>
        </div>
      </div>

      {/* ─── Checkout Modal ─────────────────────────────────────────────────── */}
      {checkoutStep !== "idle" && selectedInstance && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center">
          {/* Keyboard-offset wrapper - owns the dynamic translateY so it never fights
              the panel's ls-rise entrance transform. Do NOT move this transform onto
              the ls-rise panel; a running CSS animation overrides an inline transform
              and reintroduces the keyboard jank. */}
          <div
            className="ls-kb-shift w-full max-w-md sm:m-4"
            style={{ transform: `translateY(-${kbOffset}px)` }}
          >
            <div className="ls-rise w-full rounded-t-3xl border border-[#1e1e2e] bg-[#141420] p-6 sm:rounded-3xl">
            {/* Modal header */}
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

            {/* Summary */}
            <div
              className="mb-5 rounded-xl px-4 py-3"
              style={{ backgroundColor: `${GOLD}10`, border: `1px solid ${GOLD}25` }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white">
                    {formatDate(typeof selectedInstance.date === "string" ? selectedInstance.date.substring(0, 10) : selectedInstance.date)}
                  </p>
                  <p className="text-xs text-white/50">
                    {formatTime(selectedInstance.start_time)} - {formatTime(selectedInstance.end_time)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-base font-extrabold" style={{ color: GOLD }}>
                    {fees ? formatPrice(fees.total) : formatPrice(selectedInstance.price_cents * quantity)}
                  </p>
                  <p className="text-xs text-white/40">
                    {quantity} ticket{quantity > 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </div>

            {/* Phone step - phone number only */}
            {checkoutStep === "phone" && (
              <div>
                <label className="mb-2 block text-sm font-semibold text-white/60">Phone Number</label>
                <div className="flex items-center gap-2 rounded-xl border border-[#1e1e2e] bg-[#0a0a0f]/60 px-4 py-3 transition-colors focus-within:border-[#D4AF37]/60">
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
                    style={{ accentColor: GOLD }}
                  />
                  <span className="text-xs text-white/50 leading-snug">
                    Keep me posted by text. I agree to receive SMS marketing messages about this venue&apos;s events &amp; deals. Msg &amp; data rates may apply; reply STOP to opt out anytime. Unchecking won&apos;t affect your purchase.
                  </span>
                </label>

                <button
                  onClick={sendCode}
                  disabled={checkoutLoading || phone.length < 10}
                  className="mt-4 w-full rounded-xl py-3 text-sm font-extrabold text-black transition hover:brightness-110 disabled:opacity-50"
                  style={{ background: `linear-gradient(135deg, ${GOLD_LIGHT}, ${GOLD})` }}
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
                  className="w-full rounded-xl border border-[#1e1e2e] bg-[#0a0a0f]/60 px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-[#D4AF37]/60"
                />

                {checkoutError && (
                  <p className="mt-3 text-xs text-red-400">{checkoutError}</p>
                )}

                <button
                  onClick={submitName}
                  disabled={!attendeeName.trim()}
                  className="mt-4 w-full rounded-xl py-3 text-sm font-extrabold text-black transition hover:brightness-110 disabled:opacity-50"
                  style={{ background: `linear-gradient(135deg, ${GOLD_LIGHT}, ${GOLD})` }}
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
                  className="w-full rounded-xl border border-[#1e1e2e] bg-[#0a0a0f]/60 px-4 py-3 text-center text-2xl font-mono tracking-[0.5em] text-white placeholder-white/20 outline-none transition-colors focus:border-[#D4AF37]/60"
                />

                {checkoutError && (
                  <p className="mt-3 text-xs text-red-400">{checkoutError}</p>
                )}

                <button
                  onClick={verifyCode}
                  disabled={checkoutLoading || otpCode.length < 6}
                  className="mt-4 w-full rounded-xl py-3 text-sm font-extrabold text-black transition hover:brightness-110 disabled:opacity-50"
                  style={{ background: `linear-gradient(135deg, ${GOLD_LIGHT}, ${GOLD})` }}
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
                  style={{ borderTopColor: GOLD }}
                />
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
