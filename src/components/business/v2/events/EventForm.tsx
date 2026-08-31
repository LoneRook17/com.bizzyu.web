"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2, MapPin } from "lucide-react"
import { apiClient, ApiError } from "@/lib/business/api-client"
import {
  ARTWORK_TEMPLATE_OPTIONS,
  EVENT_TYPES,
  EVENT_TYPE_HINTS,
  EVENT_TYPE_LABELS,
  type ArtworkTemplate,
} from "@/lib/business/constants"
import { useAuth } from "@/lib/business/auth-context"
import { useVenue } from "@/lib/business/venue-context"
import type { EventFormData, TicketTier } from "@/lib/business/types"
import { Button } from "@/components/business/v2/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/business/v2/ui/card"
import { Input, Textarea, Select } from "@/components/business/v2/ui/input"
import { Label } from "@/components/business/v2/ui/label"
import { cn } from "@/lib/v2/utils"
import {
  applySaveAsDraftFlag,
  isPromotionEnabled,
  promoterExtrasVisible,
  promoterToggleDisabled,
  shouldOfferStripeConnectForError,
  surfaceEventFormServerError,
  willDraftOnCreate,
} from "@/lib/business/create-publish"
import { shouldAutoPublishCreatedDraft } from "@/lib/business/live-after-approve"
import { DateField, DateTimeField } from "@/components/business/v2/ui/date-time-field"
import { ArtworkSection } from "./ArtworkSection"
import { EventStepNav, EVENT_CREATE_STEPS } from "./EventStepNav"
import { fmtDateTime, fmtTime } from "./eventStatus"
import { RecurringEventWizard } from "@/components/business/v2/recurring/RecurringEventWizard"
import { RepeatsOnDays } from "@/components/business/v2/recurring/RepeatsOnDays"
import { todayIsoDate } from "@/lib/business/recurring-event-create"
import { splitDateTimeLocal } from "@/lib/business/datetime-value"
import { artworkTemplateForSave, resolvedCreateFlyerUrl } from "@/lib/business/venue-photo-flyer"
import { StockAlertsFields } from "./StockAlertsFields"
import { TicketTierForm } from "./TicketTierForm"
import { tierSurgeToWire, tierWithSurgeDrafts, validateTierSurge } from "@/lib/business/event-tier-surge"

interface EventFormProps {
  initialData?: Partial<EventFormData>
  eventId?: number
  stripeOnboarded?: boolean
}

const NAME_MAX_LENGTH = 100

const EMPTY_TICKET: TicketTier = {
  name: "General Admission",
  description: "",
  price_usd: 0,
  quantity: 0,
  max_per_person: 0,
  ticket_type: "paid",
}

// promotion_commission_value is stored as basis points (percent) or cents (fixed).
// Exported for reuse by the recurring-series form, which carries the same fields.
export function commissionValueToInput(
  type: "percent" | "fixed" | undefined,
  storedValue: number | null | undefined
): string {
  if (storedValue == null) return ""
  if (type === "percent") return (storedValue / 100).toString()
  if (type === "fixed") return (storedValue / 100).toFixed(2)
  return ""
}

export function commissionInputToStored(
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

// lowstock_threshold_value is a plain integer: a percent (≤100) or a raw ticket count.
export function lowstockValueToInput(storedValue: number | null | undefined): string {
  if (storedValue == null) return ""
  return String(storedValue)
}

// The low-stock threshold is OPTIONAL. Blank is valid and means "no low-stock
// threshold" — the tier alerts on sold-out only (services F6). A positive whole
// number sets a real threshold; percent is capped at 100 as a client nicety
// (the server enforces it too). Only non-blank, non-positive, or non-integer
// input is a client error.
export function lowstockInputToStored(
  type: "percent" | "count",
  inputValue: string
): { value: number | null; error: string | null } {
  const trimmed = inputValue.trim()
  if (trimmed === "") return { value: null, error: null }
  const num = Number(trimmed)
  if (!Number.isInteger(num) || num <= 0) {
    return { value: null, error: "Threshold must be a positive whole number" }
  }
  if (type === "percent" && num > 100) {
    return { value: null, error: "Percent threshold can't exceed 100" }
  }
  return { value: num, error: null }
}

export function EventForm({ initialData, eventId, stripeOnboarded = true }: EventFormProps) {
  const router = useRouter()
  const isEditing = !!eventId
  const { isPending } = useAuth()
  const { venues, selectedVenue, setSelectedVenue } = useVenue()

  const [form, setForm] = useState<EventFormData>({
    name: initialData?.name || "",
    description: initialData?.description || "",
    venue_id: initialData?.venue_id ?? null,
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
    // Served rows carry surge_steps in the read shape — normalize to draft
    // rungs so the tier form can edit them.
    tickets: (initialData?.tickets || [{ ...EMPTY_TICKET }]).map(tierWithSurgeDrafts),
    promotion_enabled: isPromotionEnabled(initialData?.promotion_enabled),
    promotion_commission_type: initialData?.promotion_commission_type || "percent",
    promotion_commission_value: initialData?.promotion_commission_value ?? null,
    notify_followers_on_publish: !!initialData?.notify_followers_on_publish,
    lowstock_alerts_enabled: !!initialData?.lowstock_alerts_enabled,
    lowstock_threshold_type: initialData?.lowstock_threshold_type || "percent",
    lowstock_threshold_value: initialData?.lowstock_threshold_value ?? null,
    lowstock_notify_business_team: !!initialData?.lowstock_notify_business_team,
    artwork_template: initialData?.artwork_template ?? null,
    artwork_accent: initialData?.artwork_accent ?? null,
  })

  // 5.0 F10: creation walks Details → Tickets & access → Review. EDITING does
  // not — an operator fixing a typo should not re-walk a wizard, so edit keeps
  // the single-page form it has always been.
  const [step, setStep] = useState(0)
  const [furthestStep, setFurthestStep] = useState(0)

  const [promotionValueInput, setPromotionValueInput] = useState<string>(
    commissionValueToInput(initialData?.promotion_commission_type || "percent", initialData?.promotion_commission_value)
  )

  const [lowstockValueInput, setLowstockValueInput] = useState<string>(
    lowstockValueToInput(initialData?.lowstock_threshold_value)
  )

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState("")
  const [loading, setLoading] = useState(false)
  const [moderationNotice, setModerationNotice] = useState("")
  const [stripeConnecting, setStripeConnecting] = useState(false)
  const [repeatDays, setRepeatDays] = useState<number[]>([])
  const [seriesStarts, setSeriesStarts] = useState(() => todayIsoDate())
  const [seriesEnds, setSeriesEnds] = useState("")

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

  // The venue the form is currently pointed at. On edit this is seeded from the
  // event's own venue_id (so the dropdown shows what it was created with, not a
  // blank); on create it follows the globally-selected venue.
  const currentVenue = venues.find((v) => v.id === form.venue_id) ?? null

  // On create only, default the form's venue to the globally-selected one and
  // sync the locked location fields. Editing keeps the event's saved venue.
  useEffect(() => {
    if (!isEditing && selectedVenue && form.venue_id == null) {
      setForm((prev) => ({
        ...prev,
        venue_id: selectedVenue.id,
        venue_name: selectedVenue.name,
        venue_address: selectedVenue.address || "",
      }))
    }
  }, [selectedVenue, isEditing, form.venue_id])

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

  // Step 1 (Details) rules. Unchanged from the pre-5.0 single-page form — just
  // split out so "Continue" can gate on this step alone.
  const collectDetailErrors = (): Record<string, string> => {
    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = "Event name is required"
    else if (form.name.length > 100) errs.name = "Event name must be 100 characters or less"
    if (!isEditing && !form.venue_id) errs.venue_name = "Please select a venue before creating an event"
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
    } else if (!isEditing) {
      if (repeatDays.length === 0) errs.days_of_week = "Pick at least one night of the week"
      if (!seriesStarts) errs.date_range_start = "Start date is required"
      if (seriesEnds && seriesStarts && seriesEnds < seriesStarts) {
        errs.date_range_end = "End date must be on or after the start date"
      }
    }
    return errs
  }

  // Step 2 (Tickets & access) rules.
  const collectTicketErrors = (): Record<string, string> => {
    const errs: Record<string, string> = {}
    if (form.type === "Ticketed" && form.tickets.length === 0) {
      errs.tickets = "At least one ticket tier is required"
    }
    if (form.type === "Ticketed") {
      for (const tier of form.tickets) {
        if (!tier.name.trim()) {
          errs.tickets = "All ticket tiers must have a name"
          break
        }
        if (tier.valid_from && tier.valid_until && tier.valid_from >= tier.valid_until) {
          errs.tickets = `"${tier.name}": the scan window must end after it starts`
          break
        }
        const surgeError = validateTierSurge(tier)
        if (surgeError) {
          errs.tickets = surgeError
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
    if (form.lowstock_alerts_enabled) {
      const { error } = lowstockInputToStored(form.lowstock_threshold_type || "percent", lowstockValueInput)
      if (error) errs.lowstock_threshold_value = error
    }
    return errs
  }

  const validate = (): boolean => {
    const errs = { ...collectDetailErrors(), ...collectTicketErrors() }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  // Advance only when the CURRENT step is clean. Anything that fails lands the
  // user back on the step that owns it, so an error is never stranded behind a
  // step they have already left.
  const goToStep = (next: number) => {
    if (next > step) {
      const errs = next > 0 ? collectDetailErrors() : {}
      const withTickets = next > 1 ? { ...errs, ...collectTicketErrors() } : errs
      setErrors(withTickets)
      if (Object.keys(withTickets).length > 0) {
        setStep(Object.keys(collectDetailErrors()).length > 0 ? 0 : 1)
        return
      }
    }
    setErrors({})
    setServerError("")
    setStep(next)
    setFurthestStep((prev) => Math.max(prev, next))
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isEditing && form.is_recurring) {
      goToStep(1)
      return
    }
    await submitCreateOrEdit(false)
  }

  const submitCreateOrEdit = async (saveAsDraft: boolean) => {
    if (!validate()) {
      // Send the user back to the step that owns the failure — on the Review
      // step the offending field is otherwise off-screen entirely.
      if (!isEditing) {
        setStep(Object.keys(collectDetailErrors()).length > 0 ? 0 : 1)
        if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" })
      }
      return
    }
    setLoading(true)
    setServerError("")
    setModerationNotice("")
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        description: form.description,
        venue_id: form.venue_id ?? selectedVenue?.id,
        venue_name: form.venue_name,
        venue_address: form.venue_address,
        latitude: form.latitude,
        longitude: form.longitude,
        start_date_time: form.start_date_time,
        end_date_time: form.end_date_time,
        type: form.type,
        is_21_plus: form.is_21_plus,
        is_recurring: false,
        flyer_image_url: resolvedCreateFlyerUrl(form.flyer_image_url, currentVenue?.photo_url) || undefined,
        // V5 REDEMPTION — `redemption_mode` is NOT sent. The server derives it
        // from access_kind (services Event.createFullEvent / updateEvent), and a
        // value posted from here would be accepted and discarded anyway. Omitted
        // rather than sent-and-ignored so the payload states the actual contract.
      }

      // Uploaded flyer or the venue photo. Classic is never implied.
      const artworkTemplate = artworkTemplateForSave({
        uploadedFlyer: form.flyer_image_url,
        venuePhoto: currentVenue?.photo_url,
        explicitTemplate: form.artwork_template,
        isEditing,
      })
      if (artworkTemplate) {
        payload.artwork_template = artworkTemplate
        payload.artwork_accent = form.artwork_accent || null
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
          valid_from: t.valid_from || null,
          valid_until: t.valid_until || null,
          // Both keys always — surge off must travel as an explicit clear;
          // omission would leave a stored ladder in place.
          ...tierSurgeToWire(t),
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

      // Stock alerts (ticketed only). Always send the two flags.
      //   • Enabled + a positive threshold => send type + value (low-stock AND
      //     sold-out alerts).
      //   • Enabled + blank threshold => send an explicit null value so a
      //     previously-stored threshold is actually cleared (sold-out-only mode).
      //     Omitting it would let the old value persist server-side.
      //   • Disabled => omit type/value so the stored threshold survives for when
      //     alerts are re-enabled.
      if (form.type === "Ticketed") {
        payload.lowstock_alerts_enabled = !!form.lowstock_alerts_enabled
        payload.lowstock_notify_business_team = !!form.lowstock_notify_business_team
        if (form.lowstock_alerts_enabled) {
          const lowstockType = form.lowstock_threshold_type || "percent"
          const { value: lowstockValue } = lowstockInputToStored(lowstockType, lowstockValueInput)
          if (lowstockValue != null) {
            payload.lowstock_threshold_type = lowstockType
            payload.lowstock_threshold_value = lowstockValue
          } else {
            payload.lowstock_threshold_value = null
          }
        }
      }

      // Opt-in announcement to venue followers on publish.
      payload.notify_followers_on_publish = !!form.notify_followers_on_publish

      // Publish is the default POST (live). Only the explicit Save as draft
      // button sends this flag.
      const body = isEditing ? payload : applySaveAsDraftFlag(payload, saveAsDraft)

      if (isEditing) {
        await apiClient.put(`/business/events/${eventId}`, body)
        router.push(`/business/events/${eventId}`)
      } else {
        const data = await apiClient.post<{
          event_id: number
          status: string
          moderation_status: string | null
          requires_stripe_to_publish?: boolean
          requires_approval_to_publish?: boolean
        }>("/business/events", body)
        if (
          shouldAutoPublishCreatedDraft({
            returnedStatus: data.status,
            isPending,
            saveAsDraft,
          })
        ) {
          try {
            await apiClient.post(`/business/events/${data.event_id}/publish`)
            router.push("/business/events")
          } catch {
            router.push(`/business/events/${data.event_id}`)
          }
        } else if (data.status === "draft") {
          // Saved as a draft (explicit Save as draft, or still pending approval).
          router.push(`/business/events/${data.event_id}`)
        } else if (data.moderation_status === "pending_review") {
          setModerationNotice("Your event has been created but is under review due to content moderation.")
          setTimeout(() => router.push("/business/events"), 3000)
        } else {
          router.push("/business/events")
        }
      }
    } catch (err) {
      // The leftover promoter-payout 400 must never paint its Connect demand
      // (escrow / in-review shops don't need Connect for promoters — HE-2).
      setServerError(
        surfaceEventFormServerError(
          err instanceof ApiError ? err.message : "Something went wrong. Please try again.",
        ),
      )
    } finally {
      setLoading(false)
    }
  }

  // D-F10.4 — an approved business publishes INSTANTLY, free or paid. The Stripe
  // gate only ever applies to money changing hands, and the server says so:
  // BusinessEventService.createEvent computes
  //     hasPaidTickets = payload.type === 'Ticketed' && tickets.some(price > 0)
  //     requiresStripe = hasPaidTickets && !stripeReady
  // so a Free event never requires Stripe and goes live on create.
  //
  // This client used to drop the `type === "Ticketed"` half of that test, so a
  // host who built a paid tier and then switched the event to Free kept the
  // stale tiers in form state, was told "Saved as a draft, connect Stripe to
  // publish", and got a Publish-labelled CTA reading "Save draft" — while the
  // server published the event immediately. Mirroring the server's own
  // predicate is the fix.
  const hasPaidTicket = form.type === "Ticketed" && form.tickets.some((t) => (t.price_usd ?? 0) > 0)
  const promoToggleDisabled = promoterToggleDisabled(hasPaidTicket)
  const promoDisabledReason = promoToggleDisabled
    ? "Add a paid ticket to enable the promoter program."
    : ""
  const showPromoterExtras = promoterExtrasVisible(form.promotion_enabled, promoToggleDisabled)
  const commissionType = form.promotion_commission_type || "percent"
  const lowstockType = form.lowstock_threshold_type || "percent"

  // What the review banner says. `isPending` is the only default-draft gate —
  // approved/verified hosts publish even without Stripe. `willDraft` must
  // never be true just because `!stripeOnboarded`.
  const willDraft = willDraftOnCreate(isPending)
  const draftReason = "Your business is still in review, so this may save as a draft until you're approved."

  // `isEditing` renders every section on one page, exactly as before 5.0.
  // Creating walks the three steps.
  const onStep = (i: number) => isEditing || step === i

  const detailsStep = (
    <>
      {/* Basic info */}
      <Card>
        <CardHeader><CardTitle>Basics</CardTitle></CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div>
            <Label htmlFor="name" className="mb-1.5 block">Event name</Label>
            <Input id="name" name="name" value={form.name} onChange={handleChange} placeholder="e.g. Spring Bash 2026" maxLength={100} />
            {errors.name && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.name}</p>}
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
                  <option key={t} value={t}>{EVENT_TYPE_LABELS[t]}</option>
                ))}
              </Select>
              {/* D-P2: "Free" never reads as "RSVP" — a free event still mints a
                  real $0 order and a scannable ticket. */}
              <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">{EVENT_TYPE_HINTS[form.type]}</p>
              {/* Approved businesses can publish paid events without Stripe —
                  payments go to escrow. Show a soft nudge, not a blocker. */}
              {form.type === "Ticketed" && hasPaidTicket && !stripeOnboarded && !isPending && (
                <div className="mt-1.5">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                    Connect Stripe to receive payments instantly
                  </p>
                  <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-400">
                    You can still publish paid events without it. We hold what you earn until you connect, then we send it all right away.
                  </p>
                  <button
                    type="button"
                    onClick={handleConnectStripe}
                    disabled={stripeConnecting}
                    className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#05EB54] hover:underline disabled:opacity-60"
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
                  className="size-4 rounded border-neutral-300 dark:border-neutral-700 text-[#05EB54] focus:ring-[#05EB54]"
                />
                <span className="text-sm text-neutral-700 dark:text-neutral-300">21+ only</span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Date & time / Flutter When */}
      <Card>
        <CardHeader><CardTitle>{!isEditing ? "When" : "Date and time"}</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 pt-0">
          {!isEditing && (
            <div>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  name="is_recurring"
                  checked={!!form.is_recurring}
                  onChange={(e) => {
                    handleChange(e)
                    if (e.target.checked && !seriesStarts) {
                      setSeriesStarts(splitDateTimeLocal(form.start_date_time).date || todayIsoDate())
                    }
                    setErrors((prev) => ({ ...prev, days_of_week: "", date_range_start: "", date_range_end: "" }))
                  }}
                  className="size-4 rounded border-neutral-300 text-[#05EB54] focus:ring-[#05EB54] dark:border-neutral-700"
                />
                <span className="text-sm text-neutral-700 dark:text-neutral-300">Repeats weekly</span>
              </label>
              <p className="mt-1 text-[13px] text-neutral-500 dark:text-neutral-400">
                Same event every week you pick. Stays a green event, not Weekly Cover.
              </p>
            </div>
          )}
          {!isEditing && form.is_recurring && (
            <>
              <RepeatsOnDays
                days={repeatDays}
                onToggle={(day) => {
                  setRepeatDays((prev) =>
                    prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b),
                  )
                  setErrors((prev) => ({ ...prev, days_of_week: "" }))
                }}
                error={errors.days_of_week}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="series_starts" className="mb-1.5 block">Starts</Label>
                  <DateField
                    id="series_starts"
                    value={seriesStarts}
                    onChange={(next) => {
                      setSeriesStarts(next)
                      setErrors((prev) => ({ ...prev, date_range_start: "" }))
                    }}
                  />
                  {errors.date_range_start && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.date_range_start}</p>}
                </div>
                <div>
                  <Label htmlFor="series_ends" className="mb-1.5 block">Ends</Label>
                  <DateField
                    id="series_ends"
                    value={seriesEnds}
                    placeholder="No end date"
                    onChange={(next) => {
                      setSeriesEnds(next)
                      setErrors((prev) => ({ ...prev, date_range_end: "" }))
                    }}
                  />
                  {errors.date_range_end && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.date_range_end}</p>}
                </div>
              </div>
            </>
          )}
          {!form.is_recurring && (
          <>
          <div>
            <Label htmlFor="start_date_time" className="mb-1.5 block">Starts</Label>
            <DateTimeField
              id="start_date_time"
              name="start_date_time"
              value={form.start_date_time}
              onChange={(next) => {
                setForm((prev) => ({ ...prev, start_date_time: next }))
                setErrors((prev) => ({ ...prev, start_date_time: "" }))
              }}
            />
            {errors.start_date_time && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.start_date_time}</p>}
          </div>
          <div>
            <Label htmlFor="end_date_time" className="mb-1.5 block">Ends</Label>
            <DateTimeField
              id="end_date_time"
              name="end_date_time"
              value={form.end_date_time}
              onChange={(next) => {
                setForm((prev) => ({ ...prev, end_date_time: next }))
                setErrors((prev) => ({ ...prev, end_date_time: "" }))
              }}
            />
            {errors.end_date_time && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.end_date_time}</p>}
          </div>
          </>
          )}
        </CardContent>
      </Card>

      {/* Location */}
      <Card>
        <CardHeader><CardTitle>Location</CardTitle></CardHeader>
        <CardContent className="space-y-4 pt-0">
          {venues.length > 0 && (
            <div>
              <Label htmlFor="venue_select" className="mb-1.5 block">Venue</Label>
              <Select
                id="venue_select"
                value={form.venue_id ?? ""}
                onChange={(e) => {
                  const venueId = Number(e.target.value)
                  if (!venueId) return
                  const v = venues.find((vv) => vv.id === venueId)
                  setForm((prev) => ({
                    ...prev,
                    venue_id: venueId,
                    venue_name: v?.name ?? prev.venue_name,
                    venue_address: v?.address ?? prev.venue_address,
                  }))
                  // Keep the dashboard-wide venue context in sync on create only;
                  // editing one event shouldn't change which venue you're browsing.
                  if (!isEditing) setSelectedVenue(venueId)
                  setErrors((prev) => ({ ...prev, venue_name: "" }))
                }}
              >
                <option value="" disabled>Select a venue</option>
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </Select>
              {errors.venue_name && !currentVenue && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.venue_name}</p>}
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
              disabled={!!currentVenue}
            />
            {!currentVenue && errors.venue_name && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.venue_name}</p>}
          </div>
          <div className="relative" ref={addressWrapperRef}>
            <Label htmlFor="venue_address" className="mb-1.5 block">Address</Label>
            <Input
              id="venue_address"
              name="venue_address"
              type="text"
              value={form.venue_address}
              autoComplete="off"
              disabled={!!currentVenue}
              onChange={(e) => onVenueAddressChange(e.target.value)}
              onFocus={() => !currentVenue && addressPredictions.length > 0 && setShowPredictions(true)}
              placeholder="Start typing an address…"
            />
            {showPredictions && addressPredictions.length > 0 && (
              <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg">
                {addressPredictions.map((p) => (
                  <li
                    key={p.place_id}
                    className="flex cursor-pointer items-center gap-2 px-3 py-2.5 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
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
                    <MapPin className="size-4 shrink-0 text-neutral-400 dark:text-neutral-500" />
                    <span className="truncate text-neutral-700 dark:text-neutral-300">{p.description}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Artwork — flyer upload. Create does not ask for a template. Venue photo is the empty-state default. */}
      <Card>
        <CardHeader className="flex-col items-start gap-1">
          <CardTitle>Artwork</CardTitle>
          <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
            {isEditing
              ? "Your flyer if you have one. Skip it and we use your venue photo."
              : "Optional flyer. Skip it and we use your venue photo."}
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <ArtworkSection
            flyerUrl={form.flyer_image_url}
            onFlyerChange={(url) => setForm((prev) => ({ ...prev, flyer_image_url: url }))}
            template={form.artwork_template}
            onTemplateChange={(t) => setForm((prev) => ({ ...prev, artwork_template: t }))}
            accent={form.artwork_accent}
            onAccentChange={(a) => setForm((prev) => ({ ...prev, artwork_accent: a }))}
            showTemplatePicker={isEditing}
            venuePhotoUrl={currentVenue?.photo_url || ""}
          />
        </CardContent>
      </Card>
    </>
  )

  const ticketsStep = (
    <>
      {/* Tickets */}
      {form.type === "Ticketed" && (
        <Card>
          <CardHeader><CardTitle>Tickets</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <TicketTierForm tiers={form.tickets} onChange={(tiers) => setForm((prev) => ({ ...prev, tickets: tiers }))} />
            {errors.tickets && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{errors.tickets}</p>}
          </CardContent>
        </Card>
      )}

      {form.type === "Free" && (
        <Card>
          <CardHeader className="flex-col items-start gap-1">
            <CardTitle>Free entry</CardTitle>
            <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
              Guests claim a real ticket at no charge. Same wallet pass, same scan at the door. Nothing to price.
            </p>
          </CardHeader>
        </Card>
      )}

      {/* V5 REDEMPTION — the "How will you check people in?" card is GONE.
          It asked the host a question the create funnel had already answered one
          screen earlier: this form builds an EVENT, and an event runs on the
          Bizzy scanner. (A Door Access night is built by the wizard next door and
          runs on camera + tap.) The type the host picked IS the choice, and the
          server derives redemption_mode from it, so a selector here could only
          ever produce an event whose door tooling contradicted its own product —
          a contradiction that surfaced at the door, not at creation. */}

      {/* Promoter program */}
      {form.type === "Ticketed" && (
        <Card>
          <CardHeader className="flex-col items-start gap-1">
            <CardTitle>Promoter program</CardTitle>
            {showPromoterExtras && (
              <p className="text-[13px] text-neutral-500 dark:text-neutral-400">Promoters share your event link and earn this on each sale.</p>
            )}
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
                className="size-4 rounded border-neutral-300 dark:border-neutral-700 text-[#05EB54] focus:ring-[#05EB54]"
              />
              <span className="text-sm text-neutral-700 dark:text-neutral-300">Enable promoter program</span>
            </label>
            {promoToggleDisabled && <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">{promoDisabledReason}</p>}

            {showPromoterExtras && (
              <div className="mt-4 space-y-3">
                <div>
                  <p className="mb-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300">Commission type</p>
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
                        className="text-[#05EB54] focus:ring-[#05EB54]"
                      />
                      <span className="text-sm text-neutral-700 dark:text-neutral-300">Percent of ticket price</span>
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
                        className="text-[#05EB54] focus:ring-[#05EB54]"
                      />
                      <span className="text-sm text-neutral-700 dark:text-neutral-300">Fixed amount per ticket</span>
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
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.promotion_commission_value}</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stock alerts - operator low-stock notifications (ticketed only) */}
      {form.type === "Ticketed" && (
        <Card>
          <CardHeader className="flex-col items-start gap-1">
            <CardTitle>Stock alerts</CardTitle>
            <p className="text-[13px] text-neutral-500 dark:text-neutral-400">Get notified when a ticket tier sells out, and optionally before it does.</p>
          </CardHeader>
          <CardContent className="pt-0">
            <StockAlertsFields
              enabled={!!form.lowstock_alerts_enabled}
              onEnabledChange={(enabled) => {
                setForm((prev) => ({ ...prev, lowstock_alerts_enabled: enabled }))
                setErrors((prev) => ({ ...prev, lowstock_threshold_value: "" }))
              }}
              thresholdType={lowstockType}
              onThresholdTypeChange={(type) => {
                setForm((prev) => ({ ...prev, lowstock_threshold_type: type }))
                setErrors((prev) => ({ ...prev, lowstock_threshold_value: "" }))
              }}
              thresholdInput={lowstockValueInput}
              onThresholdInputChange={(value) => {
                setLowstockValueInput(value)
                setErrors((prev) => ({ ...prev, lowstock_threshold_value: "" }))
              }}
              notifyTeam={!!form.lowstock_notify_business_team}
              onNotifyTeamChange={(notify) => setForm((prev) => ({ ...prev, lowstock_notify_business_team: notify }))}
              error={errors.lowstock_threshold_value}
            />
          </CardContent>
        </Card>
      )}
    </>
  )

  // The at-a-glance summary is a CREATE affordance — it exists so step 3 can
  // show what you're about to publish. Editing already shows every field.
  const reviewSummary = (
    <>
      <Card>
        <CardHeader><CardTitle>Review</CardTitle></CardHeader>
        <CardContent className="pt-0">
          <dl className="divide-y divide-neutral-200 dark:divide-neutral-800">
            <ReviewRow label="Name" value={form.name || "-"} />
            <ReviewRow label="Type" value={EVENT_TYPE_LABELS[form.type]} />
            <ReviewRow label="When" value={summariseWhen(form.start_date_time, form.end_date_time)} />
            <ReviewRow label="Where" value={[form.venue_name, form.venue_address].filter(Boolean).join(" · ") || "-"} />
            {form.is_21_plus && <ReviewRow label="Age" value="21+" />}
            {form.type === "Ticketed" && <ReviewRow label="Tickets" value={summariseTiers(form.tickets)} />}
            {/* Still shown, no longer a decision: the host should see what the
                door will do, they just don't get to pick it. Reads off the same
                derived value the server will stamp. */}
            <ReviewRow label="Door" value="Bizzy scanner" />
            <ReviewRow label="Artwork" value={summariseArtwork(form.flyer_image_url, form.artwork_template, currentVenue?.photo_url)} />
            {form.type === "Ticketed" && (
              <ReviewRow
                label="Promoters"
                value={form.promotion_enabled ? `On · ${promotionValueInput}${commissionType === "percent" ? "%" : " fixed"}` : "Off"}
              />
            )}
            {form.type === "Ticketed" && (
              <ReviewRow label="Stock alerts" value={form.lowstock_alerts_enabled ? "On" : "Off"} />
            )}
          </dl>
        </CardContent>
      </Card>
    </>
  )

  // Notify followers - opt-in announcement on publish (any event type). Shown
  // on BOTH create (step 3) and edit, exactly as before 5.0.
  const publishCard = (
    <>
      <Card>
        <CardHeader className="flex-col items-start gap-1">
          <CardTitle>{isEditing ? "Notify followers" : "When this goes live"}</CardTitle>
          <p className="text-[13px] text-neutral-500 dark:text-neutral-400">Send a push to followers of this venue when the event goes live.</p>
        </CardHeader>
        <CardContent className="pt-0">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={!!form.notify_followers_on_publish}
              onChange={(e) => setForm((prev) => ({ ...prev, notify_followers_on_publish: e.target.checked }))}
              className="size-4 rounded border-neutral-300 dark:border-neutral-700 text-[#05EB54] focus:ring-[#05EB54]"
            />
            <span className="text-sm text-neutral-700 dark:text-neutral-300">Announce to venue followers</span>
          </label>

          {/* D-F10.4: an approved business publishes instantly — free or paid.
              Create-only: on edit the event already has a status. */}
          {!isEditing && (
            <div
              className={cn(
                "mt-4 rounded-xl border px-4 py-3 text-sm",
                willDraft
                  ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
                  : "border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/30 dark:text-green-300"
              )}
            >
              {willDraft
                ? draftReason
                : form.type === "Free"
                  ? "This publishes the moment you create it. Free events don't need Stripe."
                  : "This publishes the moment you create it."}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )

  const submitRow = (
    <>
      {/* Submit */}
      {serverError && (
        <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          <p>{serverError}</p>
          {shouldOfferStripeConnectForError(serverError) && (
            <Button type="button" variant="primary" size="sm" className="mt-2" disabled={stripeConnecting} onClick={handleConnectStripe}>
              {stripeConnecting ? <><Loader2 className="size-3.5 animate-spin" /> Connecting…</> : "Connect Stripe →"}
            </Button>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          {!isEditing && step > 0 && (
            <Button type="button" variant="secondary" onClick={() => goToStep(step - 1)}>
              Back
            </Button>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          {!isEditing && (
            <Button type="button" variant="secondary" size="lg" disabled={loading} onClick={() => submitCreateOrEdit(true)}>
              {loading && <Loader2 className="animate-spin" />}
              Save as draft
            </Button>
          )}
          <Button type="submit" size="lg" disabled={loading}>
            {loading && <Loader2 className="animate-spin" />}
            {isEditing ? "Save changes" : "Publish event"}
          </Button>
        </div>
      </div>
    </>
  )

  if (!isEditing && form.is_recurring && step > 0) {
    return (
      <RecurringEventWizard
        seed={{
          name: form.name,
          description: form.description,
          venue_id: form.venue_id ?? selectedVenue?.id ?? null,
          venue_name: form.venue_name,
          venue_address: form.venue_address,
          type: form.type === "Free" ? "Free" : "Ticketed",
          is_21_plus: !!form.is_21_plus,
          flyer_image_url: form.flyer_image_url || "",
          venue_photo_url: currentVenue?.photo_url || "",
          days_of_week: repeatDays,
          date_range_start: seriesStarts,
          date_range_end: seriesEnds || null,
        }}
        onBackToDetails={() => goToStep(0)}
      />
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Link
        href="/business/events"
        className="inline-flex w-fit items-center gap-1.5 text-[13px] font-medium text-neutral-500 dark:text-neutral-400 transition-colors hover:text-neutral-900 dark:hover:text-neutral-100"
      >
        <ArrowLeft className="size-3.5" /> Back to events
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
          {isEditing ? "Edit event" : "Create event"}
        </h1>
        <p className="mt-1 text-[15px] text-neutral-600 dark:text-neutral-400">
          {isEditing
            ? "Update details, tickets, and settings."
            : `Step ${step + 1} of ${EVENT_CREATE_STEPS.length}. ${EVENT_CREATE_STEPS[step].label}.`}
        </p>
      </div>

      {!isEditing && <EventStepNav current={step} furthest={furthestStep} onJump={goToStep} />}

      {moderationNotice && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          {moderationNotice}
        </div>
      )}

      {onStep(0) && detailsStep}
      {onStep(1) && ticketsStep}
      {!isEditing && step === 2 && reviewSummary}
      {onStep(2) && publishCard}

      {/* Steps 1 and 2 advance; only the last step submits. Editing always
          submits, since it renders every section at once. */}
      {!isEditing && step < EVENT_CREATE_STEPS.length - 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            {step > 0 && (
              <Button type="button" variant="secondary" onClick={() => goToStep(step - 1)}>
                Back
              </Button>
            )}
          </div>
          <Button type="button" size="lg" onClick={() => goToStep(step + 1)}>
            Continue
          </Button>
        </div>
      ) : (
        submitRow
      )}
    </form>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 py-2.5">
      <dt className="text-[13px] text-neutral-500 dark:text-neutral-400">{label}</dt>
      <dd className="max-w-[70%] text-right text-sm font-medium text-neutral-900 dark:text-neutral-100">{value}</dd>
    </div>
  )
}

function summariseWhen(start: string, end: string): string {
  if (!start) return "-"
  const startLabel = fmtDateTime(start)
  if (!end) return startLabel
  const sameDay = start.slice(0, 10) === end.slice(0, 10)
  return sameDay ? `${startLabel} - ${fmtTime(end)}` : `${startLabel} - ${fmtDateTime(end)}`
}

function summariseTiers(tiers: TicketTier[]): string {
  if (!tiers.length) return "-"
  const prices = tiers.map((t) => Number(t.price_usd) || 0)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const count = `${tiers.length} tier${tiers.length === 1 ? "" : "s"}`
  if (max === 0) return `${count} · Free`
  return min === max ? `${count} · $${max.toFixed(2)}` : `${count} · ${min.toFixed(2)}-${max.toFixed(2)}`
}

function summariseArtwork(
  flyerUrl: string,
  template: ArtworkTemplate | null | undefined,
  venuePhoto?: string | null,
): string {
  if (flyerUrl) return "Your flyer"
  if (venuePhoto?.trim()) return "Venue photo"
  if (template && template !== "classic") {
    const label = ARTWORK_TEMPLATE_OPTIONS.find((o) => o.value === template)?.label ?? template
    return `${label} template`
  }
  return "Venue photo"
}
