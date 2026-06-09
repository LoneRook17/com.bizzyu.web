"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2, MapPin } from "lucide-react"
import { apiClient, ApiError } from "@/lib/business/api-client"
import { EVENT_TYPES } from "@/lib/business/constants"
import { useAuth } from "@/lib/business/auth-context"
import { useVenue } from "@/lib/business/venue-context"
import type { EventFormData, TicketTier } from "@/lib/business/types"
import { Button } from "@/components/business/v2/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/business/v2/ui/card"
import { Badge } from "@/components/business/v2/ui/badge"
import { Input, Textarea, Select } from "@/components/business/v2/ui/input"
import { Label } from "@/components/business/v2/ui/label"
import { cn } from "@/lib/v2/utils"
import { ImageUpload } from "./ImageUpload"
import { TicketTierForm } from "./TicketTierForm"

interface EventFormProps {
  initialData?: Partial<EventFormData>
  eventId?: number
  stripeOnboarded?: boolean
}

const NAME_MAX_LENGTH = 100

const EMPTY_TICKET: TicketTier = {
  name: "General Admission",
  price_usd: 0,
  quantity: 0,
  max_per_person: 0,
  ticket_type: "paid",
}

// promotion_commission_value is stored as basis points (percent) or cents (fixed).
function commissionValueToInput(
  type: "percent" | "fixed" | undefined,
  storedValue: number | null | undefined
): string {
  if (storedValue == null) return ""
  if (type === "percent") return (storedValue / 100).toString()
  if (type === "fixed") return (storedValue / 100).toFixed(2)
  return ""
}

function commissionInputToStored(
  type: "percent" | "fixed",
  inputValue: string
): { value: number | null; error: string | null } {
  const trimmed = inputValue.trim()
  if (trimmed === "") return { value: null, error: "Enter a commission value" }
  const num = Number(trimmed)
  if (!Number.isFinite(num) || num <= 0) {
    return { value: null, error: "Commission must be a positive number" }
  }
  if (type === "percent") {
    if (num > 50) return { value: null, error: "Commission cannot exceed 50%" }
    return { value: Math.round(num * 100), error: null }
  }
  return { value: Math.round(num * 100), error: null }
}

export function EventForm({ initialData, eventId, stripeOnboarded = true }: EventFormProps) {
  const router = useRouter()
  const isEditing = !!eventId
  const { isPending } = useAuth()
  const { venues, selectedVenue, setSelectedVenue } = useVenue()

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
    commissionValueToInput(initialData?.promotion_commission_type || "percent", initialData?.promotion_commission_value)
  )

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState("")
  const [loading, setLoading] = useState(false)
  const [moderationNotice, setModerationNotice] = useState("")
  const [stripeConnecting, setStripeConnecting] = useState(false)

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

  // Sync venue name/address from selected venue (locked when a venue is selected on create)
  useEffect(() => {
    if (!isEditing && selectedVenue) {
      setForm((prev) => ({ ...prev, venue_name: selectedVenue.name, venue_address: selectedVenue.address || "" }))
    }
  }, [selectedVenue, isEditing])

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
          .reduce<number>((min, t) => (t.price_usd < min ? t.price_usd : min), Number.POSITIVE_INFINITY)
        if (Number.isFinite(cheapestPaidUsd)) {
          const cap = cheapestPaidUsd / 2
          if (Number(promotionValueInput) > cap) {
            errs.promotion_commission_value = `Fixed commission can't exceed 50% of the cheapest paid ticket ($${cap.toFixed(2)})`
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
        router.push(`/business/v2/events/${eventId}`)
      } else {
        const data = await apiClient.post<{ event_id: number; moderation_status: string | null }>(
          "/business/events",
          payload
        )
        if (data.moderation_status === "pending_review") {
          setModerationNotice("Your event has been created but is under review due to content moderation.")
          setTimeout(() => router.push("/business/v2/events"), 3000)
        } else {
          router.push("/business/v2/events")
        }
      }
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const hasPaidTicket = form.tickets.some((t) => (t.price_usd ?? 0) > 0)
  const promoToggleDisabled = !hasPaidTicket || !stripeOnboarded
  const promoDisabledReason = !hasPaidTicket
    ? "Add a paid ticket to enable the promoter program."
    : !stripeOnboarded
      ? "Connect Stripe to enable the promoter program."
      : ""
  const commissionType = form.promotion_commission_type || "percent"

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Link
        href="/business/v2/events"
        className="inline-flex w-fit items-center gap-1.5 text-[13px] font-medium text-neutral-500 transition-colors hover:text-neutral-900"
      >
        <ArrowLeft className="size-3.5" /> Back to events
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          {isEditing ? "Edit event" : "Create event"}
        </h1>
        <p className="mt-1 text-[15px] text-neutral-600">
          {isEditing ? "Update details, tickets, and settings." : "Set up your event, tickets, and where it happens."}
        </p>
      </div>

      {moderationNotice && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {moderationNotice}
        </div>
      )}

      {/* Basic info */}
      <Card>
        <CardHeader><CardTitle>Basics</CardTitle></CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div>
            <Label htmlFor="name" className="mb-1.5 block">Event name</Label>
            <Input id="name" name="name" value={form.name} onChange={handleChange} placeholder="e.g. Spring Bash 2026" maxLength={100} />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
          </div>
          <div>
            <Label htmlFor="description" className="mb-1.5 block">Description</Label>
            <Textarea id="description" name="description" value={form.description} onChange={handleChange} rows={4} placeholder="Tell people about your event…" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="type" className="mb-1.5 block">Event type</Label>
              <Select id="type" name="type" value={form.type} onChange={handleChange}>
                {EVENT_TYPES.map((t) => (
                  <option key={t} value={t} disabled={t === "Ticketed" && !stripeOnboarded}>
                    {t}{t === "Ticketed" && !stripeOnboarded ? " (Stripe required)" : ""}
                  </option>
                ))}
              </Select>
              {!stripeOnboarded && (
                <div className="mt-1.5">
                  <p className="text-xs text-amber-600">Stripe Connect is required for paid events.</p>
                  <button
                    type="button"
                    onClick={handleConnectStripe}
                    disabled={stripeConnecting}
                    className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#079455] hover:underline disabled:opacity-60"
                  >
                    {stripeConnecting ? "Connecting…" : "Connect Stripe →"}
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-end pb-2">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  name="is_21_plus"
                  checked={form.is_21_plus}
                  onChange={handleChange}
                  className="size-4 rounded border-neutral-300 text-[#079455] focus:ring-[#079455]"
                />
                <span className="text-sm text-neutral-700">21+ only</span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Date & time */}
      <Card>
        <CardHeader><CardTitle>Date and time</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 pt-0 sm:grid-cols-2">
          <div>
            <Label htmlFor="start_date_time" className="mb-1.5 block">Starts</Label>
            <Input id="start_date_time" name="start_date_time" type="datetime-local" value={form.start_date_time} onChange={handleChange} />
            {errors.start_date_time && <p className="mt-1 text-xs text-red-600">{errors.start_date_time}</p>}
          </div>
          <div>
            <Label htmlFor="end_date_time" className="mb-1.5 block">Ends</Label>
            <Input id="end_date_time" name="end_date_time" type="datetime-local" value={form.end_date_time} onChange={handleChange} />
            {errors.end_date_time && <p className="mt-1 text-xs text-red-600">{errors.end_date_time}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Location */}
      <Card>
        <CardHeader><CardTitle>Location</CardTitle></CardHeader>
        <CardContent className="space-y-4 pt-0">
          {!isEditing && venues.length > 0 && (
            <div>
              <Label htmlFor="venue_select" className="mb-1.5 block">Venue</Label>
              <Select
                id="venue_select"
                value={selectedVenue?.id ?? ""}
                onChange={(e) => {
                  const venueId = Number(e.target.value)
                  if (venueId) setSelectedVenue(venueId)
                }}
              >
                <option value="" disabled>Select a venue</option>
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </Select>
              {errors.venue_name && !selectedVenue && <p className="mt-1 text-xs text-red-600">{errors.venue_name}</p>}
            </div>
          )}
          <div>
            <Label htmlFor="venue_name" className="mb-1.5 block">Location name</Label>
            <Input
              id="venue_name"
              name="venue_name"
              value={form.venue_name}
              onChange={handleChange}
              placeholder="e.g. The Main Stage"
              disabled={!isEditing && !!selectedVenue}
            />
            {!selectedVenue && errors.venue_name && <p className="mt-1 text-xs text-red-600">{errors.venue_name}</p>}
          </div>
          <div className="relative" ref={addressWrapperRef}>
            <Label htmlFor="venue_address" className="mb-1.5 block">Address</Label>
            <Input
              id="venue_address"
              name="venue_address"
              type="text"
              value={form.venue_address}
              autoComplete="off"
              disabled={!isEditing && !!selectedVenue}
              onChange={(e) => onVenueAddressChange(e.target.value)}
              onFocus={() => !selectedVenue && addressPredictions.length > 0 && setShowPredictions(true)}
              placeholder="Start typing an address…"
            />
            {showPredictions && addressPredictions.length > 0 && (
              <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-neutral-200 bg-white shadow-lg">
                {addressPredictions.map((p) => (
                  <li
                    key={p.place_id}
                    className="flex cursor-pointer items-center gap-2 px-3 py-2.5 text-sm hover:bg-neutral-50"
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
                    <MapPin className="size-4 shrink-0 text-neutral-400" />
                    <span className="truncate text-neutral-700">{p.description}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Flyer */}
      <Card>
        <CardHeader><CardTitle>Flyer image</CardTitle></CardHeader>
        <CardContent className="pt-0">
          <ImageUpload value={form.flyer_image_url} onChange={(url) => setForm((prev) => ({ ...prev, flyer_image_url: url }))} />
        </CardContent>
      </Card>

      {/* Tickets */}
      {form.type === "Ticketed" && (
        <Card>
          <CardHeader><CardTitle>Tickets</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <TicketTierForm tiers={form.tickets} onChange={(tiers) => setForm((prev) => ({ ...prev, tickets: tiers }))} />
            {errors.tickets && <p className="mt-2 text-xs text-red-600">{errors.tickets}</p>}
          </CardContent>
        </Card>
      )}

      {/* Promoter program */}
      {form.type === "Ticketed" && (
        <Card>
          <CardHeader className="flex-col items-start gap-1">
            <CardTitle>Promoter program</CardTitle>
            <p className="text-[13px] text-neutral-500">Promoters share your event link and earn this on each sale.</p>
          </CardHeader>
          <CardContent className="pt-0">
            <label
              className={cn("flex items-center gap-2", promoToggleDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer")}
              title={promoToggleDisabled ? promoDisabledReason : undefined}
            >
              <input
                type="checkbox"
                checked={!!form.promotion_enabled}
                disabled={promoToggleDisabled}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, promotion_enabled: e.target.checked }))
                  setErrors((prev) => ({ ...prev, promotion_commission_value: "" }))
                }}
                className="size-4 rounded border-neutral-300 text-[#079455] focus:ring-[#079455]"
              />
              <span className="text-sm text-neutral-700">Enable promoter program</span>
            </label>
            {promoToggleDisabled && <p className="mt-1 text-xs text-amber-600">{promoDisabledReason}</p>}

            {form.promotion_enabled && !promoToggleDisabled && (
              <div className="mt-4 space-y-3">
                <div>
                  <p className="mb-1.5 text-sm font-medium text-neutral-700">Commission type</p>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="promotion_commission_type"
                        checked={commissionType === "percent"}
                        onChange={() => {
                          setForm((prev) => ({ ...prev, promotion_commission_type: "percent" }))
                          setPromotionValueInput("")
                          setErrors((prev) => ({ ...prev, promotion_commission_value: "" }))
                        }}
                        className="text-[#079455] focus:ring-[#079455]"
                      />
                      <span className="text-sm text-neutral-700">Percent of ticket price</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="promotion_commission_type"
                        checked={commissionType === "fixed"}
                        onChange={() => {
                          setForm((prev) => ({ ...prev, promotion_commission_type: "fixed" }))
                          setPromotionValueInput("")
                          setErrors((prev) => ({ ...prev, promotion_commission_value: "" }))
                        }}
                        className="text-[#079455] focus:ring-[#079455]"
                      />
                      <span className="text-sm text-neutral-700">Fixed amount per ticket</span>
                    </label>
                  </div>
                </div>
                <div>
                  <Label htmlFor="promotion_commission_value" className="mb-1.5 block">
                    Commission {commissionType === "percent" ? "(%)" : "($)"}
                  </Label>
                  <Input
                    id="promotion_commission_value"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    className="w-40"
                    placeholder={commissionType === "percent" ? "e.g. 10" : "e.g. 5.00"}
                    value={promotionValueInput}
                    onChange={(e) => {
                      setPromotionValueInput(e.target.value)
                      setErrors((prev) => ({ ...prev, promotion_commission_value: "" }))
                    }}
                  />
                  {errors.promotion_commission_value && (
                    <p className="mt-1 text-xs text-red-600">{errors.promotion_commission_value}</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Submit */}
      {serverError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <p>{serverError}</p>
          {/Stripe Connect/i.test(serverError) && (
            <Button type="button" variant="primary" size="sm" className="mt-2" disabled={stripeConnecting} onClick={handleConnectStripe}>
              {stripeConnecting ? <><Loader2 className="size-3.5 animate-spin" /> Connecting…</> : "Connect Stripe →"}
            </Button>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3">
        {isPending && (
          <Badge variant="warning">Trial — saved as a draft until you&apos;re approved</Badge>
        )}
        <Button type="submit" size="lg" disabled={loading}>
          {loading && <Loader2 className="animate-spin" />}
          {isEditing ? "Save changes" : "Create event"}
        </Button>
      </div>
    </form>
  )
}
