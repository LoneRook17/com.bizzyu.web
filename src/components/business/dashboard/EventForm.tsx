"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import FormInput from "@/components/business/auth/FormInput"
import AuthSubmitButton from "@/components/business/auth/AuthSubmitButton"
import ImageUpload from "./ImageUpload"
import TicketTierForm from "./TicketTierForm"
import { apiClient, ApiError } from "@/lib/business/api-client"
import { EVENT_TYPES } from "@/lib/business/constants"
import { useVenue } from "@/lib/business/venue-context"
import type { EventFormData, RecurringEventConfig, RecurringNight, TicketTier } from "@/lib/business/types"

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
] as const

interface EventFormProps {
  initialData?: Partial<EventFormData>
  eventId?: number
  stripeOnboarded?: boolean
  businessName?: string
  businessAddress?: string
}

// promotion_commission_value is stored as basis points (percent) or cents (fixed).
// The form-side state mirrors it as a string so users type "10" for 10% or
// "5.00" for $5 — kept untouched while editing, only converted on submit.
function commissionValueToInput(
  type: 'percent' | 'fixed' | undefined,
  storedValue: number | null | undefined
): string {
  if (storedValue == null) return ""
  if (type === 'percent') return (storedValue / 100).toString()
  if (type === 'fixed') return (storedValue / 100).toFixed(2)
  return ""
}

function commissionInputToStored(
  type: 'percent' | 'fixed',
  inputValue: string
): { value: number | null; error: string | null } {
  const trimmed = inputValue.trim()
  if (trimmed === "") return { value: null, error: "Enter a commission value" }
  const num = Number(trimmed)
  if (!Number.isFinite(num) || num <= 0) {
    return { value: null, error: "Commission must be a positive number" }
  }
  if (type === 'percent') {
    if (num > 50) return { value: null, error: "Commission cannot exceed 50%" }
    // Persist as basis points (1000 = 10.00%). Accept up to 2 decimals.
    return { value: Math.round(num * 100), error: null }
  }
  // fixed → cents
  return { value: Math.round(num * 100), error: null }
}

const EMPTY_TICKET: TicketTier = {
  name: "General Admission",
  price_usd: 0,
  quantity: 0,
  max_per_person: 0,
  ticket_type: "paid",
}

export default function EventForm({ initialData, eventId, stripeOnboarded = true, businessName, businessAddress }: EventFormProps) {
  const router = useRouter()
  const isEditing = !!eventId
  const { venues, selectedVenue, isAllVenues, setSelectedVenue } = useVenue()

  const [form, setForm] = useState<EventFormData>({
    name: initialData?.name || "",
    description: initialData?.description || "",
    venue_name: initialData?.venue_name || "",
    venue_address: initialData?.venue_address || "",
    latitude: initialData?.latitude ?? null,
    longitude: initialData?.longitude ?? null,
    start_date_time: initialData?.start_date_time || "",
    end_date_time: initialData?.end_date_time || "",
    type: initialData?.type || "Ticketed",
    is_21_plus: initialData?.is_21_plus || false,
    is_recurring: initialData?.is_recurring || false,
    recurring_event: initialData?.recurring_event || undefined,
    flyer_image_url: initialData?.flyer_image_url || "",
    tickets: initialData?.tickets || [{ ...EMPTY_TICKET }],
    promotion_enabled: !!initialData?.promotion_enabled,
    promotion_commission_type: initialData?.promotion_commission_type || "percent",
    promotion_commission_value: initialData?.promotion_commission_value ?? null,
  })

  const [promotionValueInput, setPromotionValueInput] = useState<string>(
    commissionValueToInput(
      initialData?.promotion_commission_type || "percent",
      initialData?.promotion_commission_value
    )
  )

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState("")
  const [loading, setLoading] = useState(false)
  const [moderationNotice, setModerationNotice] = useState("")
  const [stripeConnecting, setStripeConnecting] = useState(false)

  const handleConnectStripe = async () => {
    setStripeConnecting(true)
    try {
      const data = await apiClient.post<{ url: string; stripe_connect_id: string }>(
        "/business/profile/stripe-onboard?platform=web"
      )
      window.location.href = data.url
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Failed to start Stripe onboarding")
      setStripeConnecting(false)
    }
  }
  const [showAddNight, setShowAddNight] = useState(false)
  const [newNight, setNewNight] = useState<RecurringNight>({ day_of_week: 0, start_time: "21:00", end_time: "02:00" })
  const [endDateMode, setEndDateMode] = useState<"never" | "on_date">(
    initialData?.recurring_event?.end_date ? "on_date" : "never"
  )
  const [addressPredictions, setAddressPredictions] = useState<{ description: string; place_id: string }[]>([])
  const [showPredictions, setShowPredictions] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const addressWrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (addressWrapperRef.current && !addressWrapperRef.current.contains(e.target as Node)) {
        setShowPredictions(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Sync venue name/address from selected venue (not editable when venue is selected)
  useEffect(() => {
    if (!isEditing && selectedVenue) {
      setForm((prev) => ({
        ...prev,
        venue_name: selectedVenue.name,
        venue_address: selectedVenue.address || "",
      }))
    }
  }, [selectedVenue, isEditing])

  const onVenueAddressChange = (value: string) => {
    setForm((prev) => ({ ...prev, venue_address: value }))
    setErrors((prev) => ({ ...prev, venue_address: "" }))
    setServerError("")

    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (value.trim().length < 3) {
      setAddressPredictions([])
      setShowPredictions(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/places-autocomplete?input=${encodeURIComponent(value)}`)
        const data = await res.json()
        setAddressPredictions(data.predictions ?? [])
        setShowPredictions((data.predictions ?? []).length > 0)
      } catch {
        setAddressPredictions([])
      }
    }, 400)
  }

  const NAME_MAX_LENGTH = 100

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    const finalValue = name === "name" ? value.slice(0, NAME_MAX_LENGTH) : value
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : finalValue,
    }))
    setErrors((prev) => ({ ...prev, [name]: "" }))
    setServerError("")
  }

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = "Event name is required"
    else if (form.name.length > 100) errs.name = "Event name must be 100 characters or less"
    if (!isEditing && !selectedVenue) errs.venue_name = "Please select a venue before creating an event"
    else if (!form.venue_name.trim()) errs.venue_name = "Location name is required"
    if (!form.is_recurring) {
      if (!form.start_date_time) errs.start_date_time = "Start date is required"
      else if (!isEditing && new Date(form.start_date_time) < new Date()) {
        errs.start_date_time = "Start date must be in the future"
      }
      if (!form.end_date_time) errs.end_date_time = "End date is required"
      if (form.start_date_time && form.end_date_time && form.start_date_time >= form.end_date_time) {
        errs.end_date_time = "End date must be after start date"
      }
    }
    /* DISABLED: Recurring events temporarily removed to avoid confusion with line skips
    if (form.is_recurring && (!form.recurring_event?.nights || form.recurring_event.nights.length === 0)) {
      errs.recurring_nights = "Add at least one night for your recurring event"
    }
    */
    if (form.type === "Ticketed" && form.tickets.length === 0) {
      errs.tickets = "At least one ticket tier is required"
    }
    if (form.type === "Ticketed") {
      for (const tier of form.tickets) {
        if (!tier.name.trim()) {
          errs.tickets = "All ticket tiers must have a name"
          break
        }
      }
    }
    if (form.promotion_enabled) {
      const type = form.promotion_commission_type || "percent"
      const { error } = commissionInputToStored(type, promotionValueInput)
      if (error) {
        errs.promotion_commission_value = error
      } else if (type === "fixed") {
        const cheapestPaidUsd = form.tickets
          .filter((t) => (t.price_usd ?? 0) > 0)
          .reduce<number>(
            (min, t) => (t.price_usd < min ? t.price_usd : min),
            Number.POSITIVE_INFINITY
          )
        if (Number.isFinite(cheapestPaidUsd)) {
          const cap = cheapestPaidUsd / 2
          if (Number(promotionValueInput) > cap) {
            errs.promotion_commission_value =
              `Fixed commission can't exceed 50% of the cheapest paid ticket ($${cap.toFixed(2)})`
          }
        }
      }
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    setServerError("")
    setModerationNotice("")

    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        description: form.description,
        venue_id: selectedVenue?.id,
        venue_name: form.venue_name,
        venue_address: form.venue_address,
        latitude: form.latitude,
        longitude: form.longitude,
        start_date_time: form.start_date_time,
        end_date_time: form.end_date_time,
        type: form.type,
        is_21_plus: form.is_21_plus,
        is_recurring: false,
        flyer_image_url: form.flyer_image_url || undefined,
      }

      /* DISABLED: Recurring events temporarily removed to avoid confusion with line skips
      if (form.is_recurring && form.recurring_event?.nights?.length) {
        payload.recurringNights = form.recurring_event.nights.map((night) => ({
          frequency: "Weekly",
          start_date: form.start_date_time,
          end_date: form.recurring_event!.end_date || undefined,
          day_of_week: night.day_of_week,
          start_time: night.start_time,
          end_time: night.end_time,
        }))
      }
      */

      if (form.type === "Ticketed") {
        payload.tickets = form.tickets.map((t) => ({
          ...(t.ticket_id ? { ticket_id: t.ticket_id } : {}),
          name: t.name,
          description: t.description,
          price_usd: t.price_usd,
          quantity: t.quantity || null,
          max_per_person: t.max_per_person || undefined,
          ticket_type: t.ticket_type,
        }))
      }

      // Promoter Program — only send fields when promotion is enabled.
      // When toggled off, send promotion_enabled: false so the server clears
      // any prior commission_type/value.
      if (form.promotion_enabled) {
        const type = form.promotion_commission_type || "percent"
        const { value } = commissionInputToStored(type, promotionValueInput)
        payload.promotion_enabled = true
        payload.promotion_commission_type = type
        payload.promotion_commission_value = value
      } else {
        payload.promotion_enabled = false
      }

      if (isEditing) {
        await apiClient.put(`/business/events/${eventId}`, payload)
        router.push(`/business/events/${eventId}`)
      } else {
        const data = await apiClient.post<{ event_id: number; moderation_status: string | null }>(
          "/business/events",
          payload
        )
        if (data.moderation_status === "pending_review") {
          setModerationNotice("Your event has been created but is under review due to content moderation.")
          setTimeout(() => router.push("/business/events"), 3000)
        } else {
          router.push("/business/events")
        }
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.message)
      } else {
        setServerError("Something went wrong. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl">
      <div className="mb-6">
        <Link href="/business/events" className="text-xs text-gray-500 hover:text-primary">
          &larr; Back to Events
        </Link>
        <h1 className="text-xl font-bold text-ink mt-2">
          {isEditing ? "Edit Event" : "Create Event"}
        </h1>
      </div>

      {moderationNotice && (
        <div className="mb-6 rounded-lg bg-orange-50 border border-orange-200 p-4 text-sm text-orange-800">
          {moderationNotice}
        </div>
      )}

      {/* Basic Info */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 mb-4">
        <h2 className="text-sm font-semibold text-ink mb-4">Basic Info</h2>
        <FormInput
          label="Event Name"
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="e.g. Spring Bash 2026"
          required
          maxLength={100}
          error={errors.name}
        />
        <div className="mb-4">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={4}
            placeholder="Tell people about your event..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white text-ink resize-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="mb-4">
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
              Event Type<span className="text-red-500 ml-0.5">*</span>
            </label>
            <select
              id="type"
              name="type"
              value={form.type}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white text-ink"
            >
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t} disabled={t === "Ticketed" && !stripeOnboarded}>
                  {t}{t === "Ticketed" && !stripeOnboarded ? " (Stripe required)" : ""}
                </option>
              ))}
            </select>
            {!stripeOnboarded && (
              <div className="mt-1">
                <p className="text-xs text-yellow-600">Stripe Connect required for paid events.</p>
                <button
                  type="button"
                  onClick={handleConnectStripe}
                  disabled={stripeConnecting}
                  className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer disabled:opacity-60"
                >
                  {stripeConnecting ? "Connecting…" : "Connect Stripe →"}
                </button>
              </div>
            )}
          </div>
          <div className="mb-4 flex items-end pb-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="is_21_plus"
                checked={form.is_21_plus}
                onChange={handleChange}
                className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
              />
              <span className="text-sm text-gray-700">21+ Only</span>
            </label>
          </div>
        </div>
      </div>

      {/* DISABLED: Recurring events temporarily removed to avoid confusion with line skips */}

      {/* Date & Time */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 mb-4">
        <h2 className="text-sm font-semibold text-ink mb-4">Date & Time</h2>
        <div className="grid grid-cols-2 gap-4">
          <FormInput
            label="Start"
            name="start_date_time"
            type="datetime-local"
            value={form.start_date_time}
            onChange={handleChange}
            required
            error={errors.start_date_time}
          />
          <FormInput
            label="End"
            name="end_date_time"
            type="datetime-local"
            value={form.end_date_time}
            onChange={handleChange}
            required
            error={errors.end_date_time}
          />
        </div>
      </div>

      {/* Event Location */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 mb-4">
        <h2 className="text-sm font-semibold text-ink mb-4">Event Location</h2>
        {!isEditing && venues.length > 0 && (
          <div className="mb-4">
            <label htmlFor="venue_select" className="block text-sm font-medium text-gray-700 mb-1">
              Venue<span className="text-red-500 ml-0.5">*</span>
            </label>
            <select
              id="venue_select"
              value={selectedVenue?.id ?? ""}
              onChange={(e) => {
                const venueId = Number(e.target.value)
                if (venueId) {
                  setSelectedVenue(venueId)
                }
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white text-ink"
            >
              <option value="" disabled>Select a venue</option>
              {venues.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
            {errors.venue_name && !selectedVenue && (
              <p className="mt-1 text-xs text-red-500">{errors.venue_name}</p>
            )}
          </div>
        )}
        <FormInput
          label="Location Name"
          name="venue_name"
          value={form.venue_name}
          onChange={handleChange}
          placeholder="e.g. The Main Stage"
          required
          disabled={!isEditing && !!selectedVenue}
          error={selectedVenue ? undefined : errors.venue_name}
        />
        <div className="mb-4 relative" ref={addressWrapperRef}>
          <label htmlFor="venue_address" className="block text-sm font-medium text-gray-700 mb-1">
            Location Address
          </label>
          <input
            id="venue_address"
            name="venue_address"
            type="text"
            value={form.venue_address}
            onChange={(e) => onVenueAddressChange(e.target.value)}
            onFocus={() => !selectedVenue && addressPredictions.length > 0 && setShowPredictions(true)}
            placeholder="Start typing an address..."
            autoComplete="off"
            disabled={!isEditing && !!selectedVenue}
            className={`w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm transition-colors outline-none ${
              !isEditing && selectedVenue
                ? "bg-gray-50 text-gray-400 cursor-not-allowed"
                : "bg-white text-ink focus:border-primary focus:ring-1 focus:ring-primary"
            }`}
          />
          {showPredictions && addressPredictions.length > 0 && (
            <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {addressPredictions.map((p) => (
                <li
                  key={p.place_id}
                  className="px-3 py-2.5 text-sm cursor-pointer hover:bg-gray-50 flex items-center gap-2"
                  onMouseDown={() => {
                    setForm((prev) => ({ ...prev, venue_address: p.description }))
                    setAddressPredictions([])
                    setShowPredictions(false)
                    fetch(`/api/place-details?place_id=${encodeURIComponent(p.place_id)}`)
                      .then((res) => res.json())
                      .then((data: { lat: number | null; lng: number | null }) => {
                        if (data.lat != null && data.lng != null) {
                          setForm((prev) => ({ ...prev, latitude: data.lat, longitude: data.lng }))
                        }
                      })
                      .catch(() => {})
                  }}
                >
                  <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="truncate">{p.description}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Flyer */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 mb-4">
        <h2 className="text-sm font-semibold text-ink mb-4">Flyer Image</h2>
        <ImageUpload
          value={form.flyer_image_url}
          onChange={(url) => setForm((prev) => ({ ...prev, flyer_image_url: url }))}
          label="Event Flyer"
        />
      </div>

      {/* Ticket Tiers */}
      {form.type === "Ticketed" && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 mb-4">
          <h2 className="text-sm font-semibold text-ink mb-4">Tickets</h2>
          <TicketTierForm
            tiers={form.tickets}
            onChange={(tiers) => setForm((prev) => ({ ...prev, tickets: tiers }))}
          />
          {errors.tickets && <p className="mt-2 text-xs text-red-500">{errors.tickets}</p>}
        </div>
      )}

      {/* Promoter Program */}
      {form.type === "Ticketed" && (() => {
        const hasPaidTicket = form.tickets.some((t) => (t.price_usd ?? 0) > 0)
        const toggleDisabled = !hasPaidTicket || !stripeOnboarded
        const disabledReason = !hasPaidTicket
          ? "Add a paid ticket to enable Promoter Program."
          : !stripeOnboarded
            ? "Connect Stripe to enable Promoter Program."
            : ""
        const commissionType = form.promotion_commission_type || "percent"
        return (
          <div className="rounded-xl border border-gray-200 bg-white p-5 mb-4">
            <h2 className="text-sm font-semibold text-ink mb-1">Promoter Program</h2>
            <p className="text-xs text-gray-500 mb-4">
              Promoters share your event link and earn this on each sale.
            </p>
            <label
              className={`flex items-center gap-2 ${toggleDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
              title={toggleDisabled ? disabledReason : undefined}
            >
              <input
                type="checkbox"
                checked={!!form.promotion_enabled}
                disabled={toggleDisabled}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, promotion_enabled: e.target.checked }))
                  setErrors((prev) => ({ ...prev, promotion_commission_value: "" }))
                }}
                className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
              />
              <span className="text-sm text-gray-700">Enable Promoter Program</span>
            </label>
            {toggleDisabled && (
              <p className="mt-1 text-xs text-yellow-600">{disabledReason}</p>
            )}
            {form.promotion_enabled && !toggleDisabled && (
              <div className="mt-4 space-y-3">
                <div>
                  <p className="block text-sm font-medium text-gray-700 mb-1">Commission Type</p>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="promotion_commission_type"
                        value="percent"
                        checked={commissionType === "percent"}
                        onChange={() => {
                          setForm((prev) => ({ ...prev, promotion_commission_type: "percent" }))
                          setPromotionValueInput("")
                          setErrors((prev) => ({ ...prev, promotion_commission_value: "" }))
                        }}
                        className="text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-gray-700">Percent of ticket price</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="promotion_commission_type"
                        value="fixed"
                        checked={commissionType === "fixed"}
                        onChange={() => {
                          setForm((prev) => ({ ...prev, promotion_commission_type: "fixed" }))
                          setPromotionValueInput("")
                          setErrors((prev) => ({ ...prev, promotion_commission_value: "" }))
                        }}
                        className="text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-gray-700">Fixed amount per ticket</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label htmlFor="promotion_commission_value" className="block text-sm font-medium text-gray-700 mb-1">
                    Commission {commissionType === "percent" ? "(%)" : "($)"}
                  </label>
                  <input
                    id="promotion_commission_value"
                    name="promotion_commission_value"
                    type="number"
                    inputMode="decimal"
                    step={commissionType === "percent" ? "0.01" : "0.01"}
                    min="0"
                    placeholder={commissionType === "percent" ? "e.g. 10" : "e.g. 5.00"}
                    value={promotionValueInput}
                    onChange={(e) => {
                      setPromotionValueInput(e.target.value)
                      setErrors((prev) => ({ ...prev, promotion_commission_value: "" }))
                    }}
                    className="w-40 rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white text-ink"
                  />
                  {errors.promotion_commission_value && (
                    <p className="mt-1 text-xs text-red-500">{errors.promotion_commission_value}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })()}

      {/* Submit */}
      {serverError && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          <p>{serverError}</p>
          {/Stripe Connect/i.test(serverError) && (
            <button
              type="button"
              onClick={handleConnectStripe}
              disabled={stripeConnecting}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-[#2ECB4E] to-[#05EB54] px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-primary/25 hover:brightness-110 transition-all cursor-pointer disabled:opacity-60"
            >
              {stripeConnecting ? (
                <>
                  <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Connecting...
                </>
              ) : (
                <>Connect Stripe &rarr;</>
              )}
            </button>
          )}
        </div>
      )}
      <AuthSubmitButton loading={loading}>
        {isEditing ? "Save Changes" : "Create Event"}
      </AuthSubmitButton>
    </form>
  )
}
