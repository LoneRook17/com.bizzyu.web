"use client"

import { useState, useEffect, useCallback } from "react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
const GOLD = "#D4AF37"

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

type Tab = "lineskips" | "events"
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

// ─── Component ───────────────────────────────────────────────────────────────

export default function LineSkipCheckoutClient({
  businessId,
  initialData,
}: {
  businessId: string
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
  const [activeTab, setActiveTab] = useState<Tab>("lineskips")
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

  // Fetch data if not provided by server
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/line-skips/business/${businessId}/page-info`)
      if (!res.ok) throw new Error("Business not found")
      const data = await res.json()
      setBusiness(data.business)
      setVenue(data.venue || null)
      setInstances(data.instances || [])
      setEvents(data.events || [])
      setFeeConfig(data.fee_config || null)
    } catch {
      setError("Could not load business information")
    } finally {
      setLoading(false)
    }
  }, [businessId])

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
    // Clear promo when switching instances — promo may not apply to new instance
    if (promoApplied) {
      removePromo()
    }
  }

  // Get applicable promo for an instance
  const getPromoForInstance = (instanceId: number): PromoInfo | null => {
    if (!promoApplied) return null
    return promoApplied.find((p) => p.line_skip_instance_id === instanceId) || null
  }

  // ─── Fee Calculation (client-side) ────────────────────────────────────────

  const calcFees = () => {
    if (!selectedInstance || !feeConfig) return null
    const promo = getPromoForInstance(selectedInstance.id)
    const discountedUnitPrice = getDiscountedPrice(selectedInstance.price_cents, promo)
    const discountPerUnit = selectedInstance.price_cents - discountedUnitPrice
    const subtotal = discountedUnitPrice * quantity
    const discountTotal = discountPerUnit * quantity

    if (subtotal === 0) {
      return { subtotal: 0, discount: discountTotal, service_fee: 0, total: 0 }
    }

    const flatFee = feeConfig.flat_cents * quantity
    const percentageFee = Math.round(subtotal * (feeConfig.percentage / 100))
    const serviceFee = flatFee + percentageFee

    return {
      subtotal: selectedInstance.price_cents * quantity,
      discount: discountTotal,
      service_fee: serviceFee,
      total: subtotal + serviceFee,
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
        body: JSON.stringify({ code: promoInput.trim(), business_id: Number(businessId) }),
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
            // API validation error (missing fields etc.) — frontend bug, don't show raw error
            console.error("Promo eligibility check failed:", eligData)
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
          console.error("Promo eligibility check error:", e)
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
        // Registered user — skip name step
        setUserName(data.user_name)
        setAttendeeName(data.user_name)
        setHasAccount(true)
        setCheckoutStep("verify")
      } else {
        // New user — ask for name
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
          }),
        })
        const data = await res.json()
        if (!res.ok) {
          setCheckoutError(data.message || "Checkout failed")
          setCheckoutStep("phone")
          return
        }
        window.location.href = `/lineskip/${businessId}?free_success=1&business_name=${encodeURIComponent(data.venue_name || data.business_name || "")}&date=${encodeURIComponent(data.instance_date || "")}&start=${encodeURIComponent(data.start_time || "")}&end=${encodeURIComponent(data.end_time || "")}&count=${data.tickets?.length || qty}`
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

  // ─── Free Success State ──────────────────────────────────────────────────

  const [freeSuccess, setFreeSuccess] = useState(false)
  const [freeSuccessData, setFreeSuccessData] = useState<{
    business_name: string
    date: string
    start: string
    end: string
    count: number
  } | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    if (params.get("free_success") === "1") {
      setFreeSuccess(true)
      setFreeSuccessData({
        business_name: params.get("business_name") || "",
        date: params.get("date") || "",
        start: params.get("start") || "",
        end: params.get("end") || "",
        count: Number(params.get("count") || 1),
      })
    }
  }, [])

  // ─── Render: Loading / Error ─────────────────────────────────────────────

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

  if (error || !business) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] p-6">
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
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0a] p-6">
        <div className="w-full max-w-md">
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
              Your Line Skip{freeSuccessData.count > 1 ? "s are" : " is"} confirmed
            </p>
          </div>
          <div
            className="mb-6 overflow-hidden rounded-2xl"
            style={{ backgroundColor: `${GOLD}15`, border: `1px solid ${GOLD}40` }}
          >
            <div className="px-6 py-4" style={{ backgroundColor: GOLD }}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-black/80">LINE SKIP</span>
                <span className="rounded-full bg-black/10 px-3 py-0.5 text-xs font-bold text-black/70">
                  INCLUDES COVER
                </span>
              </div>
            </div>
            <div className="p-6">
              <h2 className="mb-4 text-lg font-bold text-white">{freeSuccessData.business_name}</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/50">Date</span>
                  <span className="text-sm font-medium text-white">{formatDate(freeSuccessData.date)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/50">Time</span>
                  <span className="text-sm font-medium text-white">
                    {formatTime(freeSuccessData.start)} - {formatTime(freeSuccessData.end)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/50">Tickets</span>
                  <span className="text-sm font-medium text-white">{freeSuccessData.count}</span>
                </div>
              </div>
              <div className="my-4 border-t border-dashed border-white/20" />
              <p className="text-center text-xs text-white/40">
                Show your QR code at the door. Cover included.
                <br />
                Check your email for ticket details.
              </p>
            </div>
          </div>
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
        </div>
      </div>
    )
  }

  // ─── Derived display values ─────────────────────────────────────────────

  const displayName = venue?.name || business.name
  const displayAddress = venue?.address || business.address
  const heroImage = venue?.photo_url || business.logo_image_url

  // ─── Render: Main Page ───────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Hero Banner — venue photo, name, address (no Bizzy logo) */}
      <div className="relative h-48 w-full overflow-hidden bg-gradient-to-b from-white/10 to-transparent">
        {heroImage && (
          <img
            src={heroImage}
            alt={displayName}
            className="h-full w-full object-cover opacity-40"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="mx-auto max-w-lg">
            <h1 className="text-2xl font-bold text-white">{displayName}</h1>
            {venue && business.name !== venue.name && (
              <p className="mt-0.5 text-sm text-white/40">{business.name}</p>
            )}
            {displayAddress && (
              <p className="mt-1 text-sm text-white/50">{displayAddress}</p>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-lg px-4 pb-12">
        {/* Tabs */}
        <div className="mt-6 flex rounded-xl bg-white/5 p-1">
          <button
            onClick={() => setActiveTab("lineskips")}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors ${
              activeTab === "lineskips"
                ? "text-black"
                : "text-white/60 hover:text-white/80"
            }`}
            style={activeTab === "lineskips" ? { backgroundColor: GOLD } : {}}
          >
            Line Skips
          </button>
          <button
            onClick={() => setActiveTab("events")}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors ${
              activeTab === "events"
                ? "bg-white text-black"
                : "text-white/60 hover:text-white/80"
            }`}
          >
            Events
          </button>
        </div>

        {/* LINE SKIPS TAB */}
        {activeTab === "lineskips" && (
          <div className="mt-6">
            {/* Includes Cover Banner */}
            <div
              className="mb-6 flex items-center gap-3 rounded-xl px-4 py-3"
              style={{ backgroundColor: `${GOLD}15`, border: `1px solid ${GOLD}40` }}
            >
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: GOLD }}
              >
                <svg className="h-4 w-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: GOLD }}>
                  Includes Cover
                </p>
                <p className="text-xs text-white/50">
                  Skip the line with cover included
                </p>
              </div>
            </div>

            {/* Select a Night */}
            <h2 className="mb-4 text-lg font-bold text-white">Select a Night</h2>

            {instances.length === 0 ? (
              <div className="rounded-xl bg-white/5 border border-white/10 p-8 text-center">
                <p className="text-white/50">No Line Skips available in the next 3 days</p>
              </div>
            ) : (
              <div className="space-y-3">
                {instances.map((inst) => {
                  const isSelected = selectedInstanceId === inst.id
                  const promo = getPromoForInstance(inst.id)
                  const discountedPrice = getDiscountedPrice(inst.price_cents, promo)
                  const remaining = inst.capacity !== null ? inst.capacity - inst.tickets_sold : null
                  const isSoldOut = inst.capacity !== null && inst.tickets_sold >= inst.capacity

                  return (
                    <div
                      key={inst.id}
                      className={`overflow-hidden rounded-xl border transition-colors ${
                        isSoldOut
                          ? "border-white/5 bg-white/[0.02] opacity-50"
                          : isSelected
                            ? "bg-white/5"
                            : "border-white/10 bg-white/5 cursor-pointer hover:bg-white/[0.07]"
                      }`}
                      style={isSelected ? { borderColor: `${GOLD}60` } : {}}
                      onClick={() => !isSoldOut && selectInstance(inst.id)}
                    >
                      <div className="p-5">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            {/* Radio indicator */}
                            <div
                              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                                isSelected ? "border-transparent" : "border-white/20"
                              }`}
                              style={isSelected ? { backgroundColor: GOLD } : {}}
                            >
                              {isSelected && (
                                <svg className="h-3 w-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <div>
                              <h3 className="text-base font-bold text-white">
                                {formatDate(typeof inst.date === "string" ? inst.date.substring(0, 10) : inst.date)}
                              </h3>
                              <p className="mt-0.5 text-sm text-white/50">
                                {formatTime(inst.start_time)} - {formatTime(inst.end_time)}
                              </p>
                              {isSoldOut ? (
                                <span className="mt-1 inline-block text-xs font-semibold text-red-400">Sold Out</span>
                              ) : (
                                <span className="mt-1 inline-block text-xs text-white/40">Available</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            {promo ? (
                              <div>
                                <span className="text-sm text-white/40 line-through">
                                  {formatPrice(inst.price_cents)}
                                </span>
                                <span className="ml-2 text-lg font-bold" style={{ color: GOLD }}>
                                  {formatPrice(discountedPrice)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-lg font-bold text-white">
                                {formatPrice(inst.price_cents)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Quantity selector (shown when selected) */}
                        {isSelected && !isSoldOut && (
                          <div className="mt-4 flex items-center gap-3">
                            <span className="text-sm text-white/60">Qty</span>
                            <div className="flex items-center rounded-lg bg-white/5 border border-white/10">
                              <button
                                onClick={(e) => { e.stopPropagation(); adjustQty(quantity - 1) }}
                                className="px-3 py-2 text-white/60 hover:text-white transition-colors"
                                disabled={quantity <= 1}
                              >
                                -
                              </button>
                              <span className="w-8 text-center text-sm font-medium text-white">
                                {quantity}
                              </span>
                              <button
                                onClick={(e) => { e.stopPropagation(); adjustQty(quantity + 1) }}
                                className="px-3 py-2 text-white/60 hover:text-white transition-colors"
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
                    className="flex items-center justify-between rounded-xl px-4 py-3"
                    style={{ backgroundColor: `${GOLD}10`, border: `1px solid ${GOLD}30` }}
                  >
                    <div>
                      <span className="text-sm font-semibold" style={{ color: GOLD }}>
                        {promoApplied[0].code}
                      </span>
                      <span className="ml-2 text-xs text-white/50">
                        {promoApplied[0].discount_type === "percentage"
                          ? `${promoApplied[0].discount_value}% off`
                          : `$${promoApplied[0].discount_value} off`}
                      </span>
                    </div>
                    <button
                      onClick={removePromo}
                      className="text-xs text-white/40 hover:text-white/60 transition-colors"
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
                      className="flex-1 rounded-lg bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-white/20"
                    />
                    <button
                      onClick={applyPromo}
                      disabled={promoLoading || !promoInput.trim()}
                      className="rounded-lg bg-white/10 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/15 disabled:opacity-50 transition-colors"
                    >
                      {promoLoading ? "..." : "Apply"}
                    </button>
                  </div>
                )}
                {promoError && (
                  <p className="mt-2 text-xs text-red-400">{promoError}</p>
                )}
              </div>
            )}

            {/* Price Breakdown */}
            {selectedInstanceId && fees && (
              <div className="mt-6 rounded-xl bg-white/5 border border-white/10 p-5">
                <h3 className="mb-3 text-sm font-semibold text-white">Order Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-white/70">
                    <span>
                      Line Skip {quantity > 1 ? `x ${quantity}` : ""}
                    </span>
                    <span>{formatPrice(fees.subtotal)}</span>
                  </div>

                  {fees.discount > 0 && (
                    <div className="flex justify-between text-green-400">
                      <span>Promo Discount</span>
                      <span>-{formatPrice(fees.discount)}</span>
                    </div>
                  )}

                  <div className="border-t border-white/10 my-1" />

                  <div className="flex justify-between text-white/70">
                    <span>Subtotal</span>
                    <span>{formatPrice(fees.subtotal - fees.discount)}</span>
                  </div>

                  <div className="flex justify-between text-white/70">
                    <span>Service Fee</span>
                    <span>{fees.service_fee === 0 ? "Free" : formatPrice(fees.service_fee)}</span>
                  </div>

                  <div className="border-t border-white/10 my-1" />

                  <div className="flex justify-between text-white font-bold text-base">
                    <span>Total</span>
                    <span>{fees.total === 0 ? "Free" : formatPrice(fees.total)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Get Line Skip CTA */}
            {selectedInstanceId && (
              <button
                onClick={startCheckout}
                className="mt-6 w-full rounded-xl py-3.5 text-base font-bold text-black transition-opacity hover:opacity-90"
                style={{ backgroundColor: GOLD }}
              >
                {fees && fees.total > 0
                  ? `Get Line Skip — ${formatPrice(fees.total)}`
                  : "Get Line Skip — Free"}
              </button>
            )}
          </div>
        )}

        {/* EVENTS TAB */}
        {activeTab === "events" && (
          <div className="mt-6">
            {events.length === 0 ? (
              <div className="rounded-xl bg-white/5 border border-white/10 p-8 text-center">
                <p className="text-white/50">No upcoming events</p>
              </div>
            ) : (
              <div className="space-y-3">
                {events.map((evt) => {
                  const eventDate = new Date(evt.start_date_time)
                  return (
                    <a
                      key={evt.event_id}
                      href={`/checkout/${evt.event_id}`}
                      className="flex gap-4 rounded-xl bg-white/5 border border-white/10 p-4 transition-colors hover:bg-white/[0.07]"
                    >
                      {evt.flyer_image_url && (
                        <img
                          src={evt.flyer_image_url}
                          alt={evt.name}
                          className="h-20 w-16 shrink-0 rounded-lg object-cover"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-bold text-white">{evt.name}</h3>
                        <p className="mt-1 text-xs text-white/50">
                          {eventDate.toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                        <p className="text-xs text-white/40">
                          {eventDate.toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <div className="flex items-center">
                        <svg className="h-4 w-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </a>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Powered by Bizzy */}
        <div className="mt-8 text-center">
          <p className="text-xs text-white/20">Powered by Bizzy</p>
        </div>
      </div>

      {/* ─── Checkout Modal ─────────────────────────────────────────────────── */}
      {checkoutStep !== "idle" && selectedInstance && (
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

            {/* Summary */}
            <div
              className="mb-5 rounded-lg px-4 py-3"
              style={{ backgroundColor: `${GOLD}10`, border: `1px solid ${GOLD}20` }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">
                    {formatDate(typeof selectedInstance.date === "string" ? selectedInstance.date.substring(0, 10) : selectedInstance.date)}
                  </p>
                  <p className="text-xs text-white/50">
                    {formatTime(selectedInstance.start_time)} - {formatTime(selectedInstance.end_time)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold" style={{ color: GOLD }}>
                    {fees ? formatPrice(fees.total) : formatPrice(selectedInstance.price_cents * quantity)}
                  </p>
                  <p className="text-xs text-white/40">
                    {quantity} ticket{quantity > 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </div>

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
                  onClick={verifyCode}
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
