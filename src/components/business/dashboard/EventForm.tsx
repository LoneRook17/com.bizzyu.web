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

const EMPTY_TICKET: TicketTier = {
  name: "General Admission",
  price_usd: 0,
  quantity: 100,
  max_per_person: 0,
  ticket_type: "paid",
}

export default function EventForm({ initialData, eventId, stripeOnboarded = true, businessName, businessAddress }: EventFormProps) {
  const router = useRouter()
  const isEditing = !!eventId

  const [form, setForm] = useState<EventFormData>({
    name: initialData?.name || "",
    description: initialData?.description || "",
    venue_name: initialData?.venue_name || (!isEditing && businessName ? businessName : ""),
    venue_address: initialData?.venue_address || (!isEditing && businessAddress ? businessAddress : ""),
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
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState("")
  const [loading, setLoading] = useState(false)
  const [moderationNotice, setModerationNotice] = useState("")
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
    if (!form.venue_name.trim()) errs.venue_name = "Location name is required"
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
    if (form.is_recurring && (!form.recurring_event?.nights || form.recurring_event.nights.length === 0)) {
      errs.recurring_nights = "Add at least one night for your recurring event"
    }
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
        venue_name: form.venue_name,
        venue_address: form.venue_address,
        latitude: form.latitude,
        longitude: form.longitude,
        start_date_time: form.start_date_time,
        end_date_time: form.end_date_time,
        type: form.type,
        is_21_plus: form.is_21_plus,
        is_recurring: form.is_recurring,
        flyer_image_url: form.flyer_image_url || undefined,
      }

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

      if (form.type === "Ticketed") {
        payload.tickets = form.tickets.map((t) => ({
          ...(t.ticket_id ? { ticket_id: t.ticket_id } : {}),
          name: t.name,
          description: t.description,
          price_usd: t.price_usd,
          quantity: t.quantity,
          max_per_person: t.max_per_person || undefined,
          ticket_type: t.ticket_type,
        }))
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
              <p className="mt-1 text-xs text-yellow-600">Stripe Connect required for paid events.</p>
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

      {/* Recurring Event */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 mb-4">
        <h2 className="text-sm font-semibold text-ink mb-4">Recurring Event</h2>
        <label className="flex items-center gap-2 cursor-pointer mb-4">
          <input
            type="checkbox"
            name="is_recurring"
            checked={form.is_recurring}
            onChange={(e) => {
              const checked = e.target.checked
              setForm((prev) => ({
                ...prev,
                is_recurring: checked,
                recurring_event: checked ? { frequency: "Weekly", nights: [] } : undefined,
              }))
              if (!checked) setShowAddNight(false)
            }}
            className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
          />
          <span className="text-sm text-gray-700">This is a recurring event</span>
        </label>
        {form.is_recurring && form.recurring_event && (
          <div className="space-y-4">
            {/* Nights list */}
            {(form.recurring_event.nights ?? []).length > 0 && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Your event nights</label>
                {[...(form.recurring_event.nights ?? [])]
                  .sort((a, b) => a.day_of_week - b.day_of_week)
                  .map((night, idx) => {
                    const dayLabel = DAYS_OF_WEEK.find((d) => d.value === night.day_of_week)?.label ?? ""
                    const formatTime = (t: string) => {
                      const [h, m] = t.split(":").map(Number)
                      const ampm = h >= 12 ? "PM" : "AM"
                      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
                      return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`
                    }
                    return (
                      <div
                        key={`${night.day_of_week}-${idx}`}
                        className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"
                      >
                        <div>
                          <span className="text-sm font-medium text-ink">{dayLabel}</span>
                          <span className="text-sm text-gray-500 ml-3">
                            {formatTime(night.start_time)} – {formatTime(night.end_time)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setForm((prev) => ({
                              ...prev,
                              recurring_event: {
                                ...prev.recurring_event!,
                                nights: (prev.recurring_event!.nights ?? []).filter(
                                  (n) => n.day_of_week !== night.day_of_week
                                ),
                              },
                            }))
                          }}
                          className="text-gray-400 hover:text-red-500 transition-colors p-1"
                          aria-label={`Remove ${dayLabel}`}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    )
                  })}
              </div>
            )}

            {/* Add night inline form */}
            {showAddNight ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Day</label>
                    <select
                      value={newNight.day_of_week}
                      onChange={(e) => setNewNight((prev) => ({ ...prev, day_of_week: parseInt(e.target.value) }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white text-ink"
                    >
                      {DAYS_OF_WEEK.filter(
                        (d) => !(form.recurring_event?.nights ?? []).some((n) => n.day_of_week === d.value)
                      ).map((d) => (
                        <option key={d.value} value={d.value}>{d.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start time</label>
                    <input
                      type="time"
                      value={newNight.start_time}
                      onChange={(e) => setNewNight((prev) => ({ ...prev, start_time: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white text-ink"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End time</label>
                    <input
                      type="time"
                      value={newNight.end_time}
                      onChange={(e) => setNewNight((prev) => ({ ...prev, end_time: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white text-ink"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const nights = [...(form.recurring_event?.nights ?? []), { ...newNight }]
                      setForm((prev) => ({
                        ...prev,
                        recurring_event: { ...prev.recurring_event!, nights },
                      }))
                      setShowAddNight(false)
                      // Reset to next available day
                      const usedDays = new Set(nights.map((n) => n.day_of_week))
                      const nextDay = DAYS_OF_WEEK.find((d) => !usedDays.has(d.value))
                      setNewNight({ day_of_week: nextDay?.value ?? 0, start_time: "21:00", end_time: "02:00" })
                    }}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddNight(false)}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              (form.recurring_event.nights ?? []).length < 7 && (
                <button
                  type="button"
                  onClick={() => {
                    const usedDays = new Set((form.recurring_event?.nights ?? []).map((n) => n.day_of_week))
                    const nextDay = DAYS_OF_WEEK.find((d) => !usedDays.has(d.value))
                    if (nextDay) setNewNight((prev) => ({ ...prev, day_of_week: nextDay.value }))
                    setShowAddNight(true)
                  }}
                  className="w-full rounded-lg border-2 border-dashed border-gray-300 py-3 text-sm font-medium text-gray-500 hover:border-primary hover:text-primary transition-colors"
                >
                  + Add another night
                </button>
              )
            )}

            {errors.recurring_nights && (
              <p className="text-xs text-red-500">{errors.recurring_nights}</p>
            )}

            {/* End date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End date</label>
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => {
                    setEndDateMode("never")
                    setForm((prev) => ({
                      ...prev,
                      recurring_event: { ...prev.recurring_event!, end_date: undefined },
                    }))
                  }}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    endDateMode === "never"
                      ? "bg-primary text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Never
                </button>
                <button
                  type="button"
                  onClick={() => setEndDateMode("on_date")}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    endDateMode === "on_date"
                      ? "bg-primary text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  On date
                </button>
              </div>
              {endDateMode === "on_date" && (
                <input
                  type="date"
                  value={form.recurring_event.end_date || ""}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      recurring_event: { ...prev.recurring_event!, end_date: e.target.value || undefined },
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white text-ink"
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Date & Time — hidden when recurring is enabled (times are per-night) */}
      {!form.is_recurring && (
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
      )}

      {/* Event Location */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 mb-4">
        <h2 className="text-sm font-semibold text-ink mb-4">Event Location</h2>
        <FormInput
          label="Location Name"
          name="venue_name"
          value={form.venue_name}
          onChange={handleChange}
          placeholder="e.g. The Main Stage"
          required
          error={errors.venue_name}
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
            onFocus={() => addressPredictions.length > 0 && setShowPredictions(true)}
            placeholder="Start typing an address..."
            autoComplete="off"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm transition-colors outline-none bg-white text-ink focus:border-primary focus:ring-1 focus:ring-primary"
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

      {/* Submit */}
      {serverError && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{serverError}</div>
      )}
      <AuthSubmitButton loading={loading}>
        {isEditing ? "Save Changes" : "Create Event"}
      </AuthSubmitButton>
    </form>
  )
}
