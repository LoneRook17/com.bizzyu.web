"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2 } from "lucide-react"
import { apiClient, ApiError } from "@/lib/business/api-client"
import { useVenue } from "@/lib/business/venue-context"
import { cn } from "@/lib/v2/utils"
import {
  ACCESS_ACCENT,
  ACCESS_BUTTON_VARIANT,
  WEEKLY_ACCESS_CREATION_LABEL,
  fmtTime,
  formatDays,
  programHref,
  redemptionModeLabel,
  toTimeInput,
  updateDoorAccessProgram,
  withDoorAccessProgramKind,
  usdPrice,
  type DoorAccessNight,
  type DoorAccessProgram,
  type RedemptionMode,
} from "@/lib/business/door-access"
import {
  cheapestPaidPrice,
  dateEditsToWire,
  hasPaidPrice,
  nightLabelFor,
  nightPriceSummary,
  paidPricesFromDraft,
  productsFromTiers,
  productsPhrase,
  seedTiersForProducts,
  templateTicketsFromNights,
  templateTiersToDrafts,
  trimMoney,
  validateAllNights,
  weekdayEditsFromNights,
  weekdayEditsToWire,
  type NightDraft,
  type WcProducts,
} from "@/lib/business/weekly-cover-nights"
import { applySaveAsDraftFlag, willDraftOnCreate } from "@/lib/business/create-publish"
import {
  WEEKLY_COVER_CHECKBOX_CLASS,
  WEEKLY_COVER_RADIO_CLASS,
} from "@/components/business/v2/door-access/WeeklyCoverAccent"
import { Button } from "@/components/business/v2/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/business/v2/ui/card"
import { Input, Textarea, Select } from "@/components/business/v2/ui/input"
import { Label } from "@/components/business/v2/ui/label"
import { EventStepNav } from "@/components/business/v2/events/EventStepNav"
import { ImageUpload } from "@/components/business/v2/events/ImageUpload"
import {
  commissionInputToStored,
  commissionValueToInput,
  lowstockInputToStored,
  lowstockValueToInput,
} from "@/components/business/v2/events/EventForm"
import { ISO_DAYS, isoDayFull, upcomingScheduleDates, scheduleSentence } from "@/components/business/v2/recurring/schedule"
import { WcProductsStep } from "@/components/business/v2/door-access/WcProductsStep"
import { WcNightsStep } from "@/components/business/v2/door-access/WcNightsStep"
import { WcDatesStep } from "@/components/business/v2/door-access/WcDatesStep"

/**
 * The Weekly Cover CREATION wizard.
 *
 * WHAT CHANGED AND WHY. This used to be a three-step template builder: one
 * `template_tickets` list, one price for every night of every weekday, forever.
 * Per-night pricing existed only after the program was created, one night at a
 * time. The app has shipped a per-weekday and per-date model for a while, so the
 * two clients were writing different documents to the same endpoints — a host who
 * built a program on their phone could not see or edit its Thursday price here,
 * and a host who built one here could not price a game day at all.
 *
 * Six steps now, matching the app:
 *
 *   0  Sell     what the program sells — Cover / Skip the Line / Both
 *   1  Details  the venue, the nights of the week, the range, the default window
 *   2  Nights   each picked weekday's own prices, surge, hours, 21+, flyer
 *   3  Dates    game days that beat their weekday default
 *   4  Extras   promoter program, stock alerts
 *   5  Review
 *
 * Recurrence moves ahead of pricing because pricing is now SCOPED to it: you
 * cannot ask "what does Friday cost" before knowing Friday is one of the nights.
 *
 * WHAT THIS SCREEN STILL DOES NOT DO. Editing a single night after the fact —
 * closing one Tuesday, marking a tier sold out — stays on the program page at
 * /business/door-access/:id, which has the richer per-night editor. Creation sets
 * the weekly shape plus the game days the host already knows about.
 *
 * D-F10.4: Publish is the default CTA and POSTs live. Save as draft is the only
 * path that sends `save_as_draft: true`. Stripe Connect is not a draft reason —
 * approved hosts publish paid programs without it and we hold the money.
 *
 * ROUTING INDEPENDENCE (D2-6): nothing here reads or requires a "Door Access"
 * nav entry. Reached from /business/create and from Events rows.
 */

const NAME_MAX_LENGTH = 100

const DOOR_ACCESS_STEPS = [
  { key: "sell", label: "Sell" },
  { key: "details", label: "Details" },
  { key: "nights", label: "Nights" },
  { key: "dates", label: "Dates" },
  { key: "extras", label: "Extras" },
  { key: "review", label: "Review" },
] as const

const STEP_SELL = 0
const STEP_DETAILS = 1
const STEP_NIGHTS = 2
const STEP_DATES = 3
const STEP_EXTRAS = 4
const STEP_REVIEW = 5

interface CreateResponse {
  program: DoorAccessProgram & { id: number }
  generation: unknown | null
  generation_error: string | null
}

/**
 * V5 REDEMPTION — what a Door Access program's door ALWAYS does.
 *
 * Module scope, not state: it is a property of the product, not a field of this
 * form. Kept only so Review can SHOW the host what their door will do — the
 * value is derived server-side and this wizard does not send one.
 */
const DOOR_ACCESS_REDEMPTION_MODE: RedemptionMode = "camera_tap"

export function DoorAccessWizard({
  mode = "create",
  programId,
  initialData,
  initialNights = [],
  stripeOnboarded = true,
  isPending = false,
}: {
  mode?: "create" | "edit"
  programId?: number
  initialData?: DoorAccessProgram
  /**
   * The program's scheduled nights, on edit.
   *
   * These are what the weekday editors hydrate FROM. Services accepts a
   * `weekday_edits` map on a write and never echoes it back on a GET, so a
   * weekday editor seeded from the program row opens on template defaults and
   * the host's saved Thursday price is invisible — then the next save pushes the
   * template back over it. The nights themselves are the only durable record.
   */
  initialNights?: DoorAccessNight[]
  stripeOnboarded?: boolean
  isPending?: boolean
}) {
  const router = useRouter()
  const isEdit = mode === "edit"
  const { venues, selectedVenue, setSelectedVenue } = useVenue()
  const backHref = isEdit && programId ? programHref(programId) : "/business/create"

  const todayStr = new Date().toLocaleDateString("en-CA")

  // Edit opens on Details: the product is already implied by the saved tiers, so
  // re-asking "what are you selling?" is a question with a known answer.
  const [step, setStep] = useState(isEdit ? STEP_DETAILS : STEP_SELL)
  const [furthest, setFurthest] = useState(isEdit ? STEP_REVIEW : STEP_SELL)

  // ── Step 0: what it sells ────────────────────────────────────────────────
  const [products, setProducts] = useState<WcProducts | null>(() => {
    if (!initialData?.template_tickets.length) return null
    return productsFromTiers(templateTiersToDrafts(initialData.template_tickets))
  })

  // ── Step 1: details ──────────────────────────────────────────────────────
  const [name, setName] = useState(initialData?.name ?? "")
  const [description, setDescription] = useState(initialData?.description ?? "")
  const [venueId, setVenueId] = useState<number | null>(initialData?.venue_id ?? null)
  const [venueName, setVenueName] = useState(initialData?.venue_name ?? "")
  const [venueAddress, setVenueAddress] = useState(initialData?.venue_address ?? "")
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(initialData?.days_of_week ?? [])
  const [dateRangeStart, setDateRangeStart] = useState(initialData?.date_range_start || todayStr)
  const [dateRangeEnd, setDateRangeEnd] = useState(initialData?.date_range_end ?? "")
  const [startTime, setStartTime] = useState(toTimeInput(initialData?.start_time) || "21:00")
  const [endTime, setEndTime] = useState(toTimeInput(initialData?.end_time) || "02:00")
  const [is21Plus, setIs21Plus] = useState(!!initialData?.is_21_plus)
  const [flyerImageUrl, setFlyerImageUrl] = useState(initialData?.flyer_image_url ?? "")

  // ── Steps 2 & 3: the per-night layer ─────────────────────────────────────
  const [weekdayEdits, setWeekdayEdits] = useState<Record<number, NightDraft>>(() => {
    if (!isEdit || !initialData) return {}
    return weekdayEditsFromNights({ program: initialData, nights: initialNights })
  })
  const [dateEdits, setDateEdits] = useState<Record<string, NightDraft>>({})

  // ── Step 4: extras ───────────────────────────────────────────────────────
  const [promotionEnabled, setPromotionEnabled] = useState(!!initialData?.promotion_enabled)
  const [commissionType, setCommissionType] = useState<"percent" | "fixed">(
    initialData?.promotion_commission_type ?? "percent"
  )
  const [promotionValueInput, setPromotionValueInput] = useState(
    commissionValueToInput(initialData?.promotion_commission_type ?? "percent", initialData?.promotion_commission_value)
  )
  const [lowstockEnabled, setLowstockEnabled] = useState(!!initialData?.lowstock_alerts_enabled)
  const [lowstockType, setLowstockType] = useState<"percent" | "count">(
    initialData?.lowstock_threshold_type ?? "percent"
  )
  const [lowstockValueInput, setLowstockValueInput] = useState(
    lowstockValueToInput(initialData?.lowstock_threshold_value)
  )
  const [lowstockNotifyTeam, setLowstockNotifyTeam] = useState(!!initialData?.lowstock_notify_business_team)

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [nightErrors, setNightErrors] = useState<string[]>([])
  const [serverError, setServerError] = useState("")
  const [checking, setChecking] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // A create that landed but whose first generation didn't. The program EXISTS
  // — navigating away silently would leave the host wondering where tonight
  // went, so the outcome is stated and they choose when to move on.
  const [generationNotice, setGenerationNotice] = useState<{
    id: number
    message: string
    kind: "created" | "updated"
  } | null>(null)

  // Create only: default to the globally-selected venue, like EventForm and SeriesForm.
  useEffect(() => {
    if (!isEdit && selectedVenue && venueId == null) {
      setVenueId(selectedVenue.id)
      setVenueName(selectedVenue.name)
      setVenueAddress(selectedVenue.address || "")
    }
  }, [selectedVenue, isEdit, venueId])

  // Dropping a weekday drops its prices with it — leaving them behind would send
  // a `weekday_edits` key that is not on the schedule, which services 400s.
  useEffect(() => {
    setWeekdayEdits((prev) => {
      const next: Record<number, NightDraft> = {}
      let changed = false
      for (const [key, draft] of Object.entries(prev)) {
        if (daysOfWeek.includes(Number(key))) next[Number(key)] = draft
        else changed = true
      }
      return changed ? next : prev
    })
  }, [daysOfWeek])

  const currentVenue = venues.find((v) => v.id === venueId) ?? null

  const previewDates = useMemo(
    () => upcomingScheduleDates(daysOfWeek, dateRangeStart || undefined, dateRangeEnd || undefined, 4),
    [daysOfWeek, dateRangeStart, dateRangeEnd]
  )

  /**
   * `template_tickets`, derived from the first configured night rather than from
   * a separate editor.
   *
   * The template is what every night inherits, so it has to carry real prices: if
   * a per-night override ever fails to apply, the program still sells at a real
   * price instead of free. The product pick's $0 placeholders are the fallback so
   * the payload stays well-formed before any night is set up.
   */
  const fallbackTiers = useMemo(
    () => (products ? seedTiersForProducts(products) : templateTiersToDrafts(initialData?.template_tickets ?? [])),
    [products, initialData]
  )

  const templateTiers = useMemo(
    () => templateTicketsFromNights({ daysOfWeek, weekdayEdits, fallbackTiers }),
    [daysOfWeek, weekdayEdits, fallbackTiers]
  )

  /**
   * Every paid price the program can charge — template, each weekday, each game
   * day, and every surge rung. The same universe services counts in
   * `paidPricesFromNightEdits`, deliberately: a narrower answer here refuses the
   * host locally and the payload's prices never get the chance to be read, which
   * is the "my nights are priced but the promoter toggle says free" bug.
   */
  const paidPrices = useMemo(
    () => paidPricesFromDraft({ templateTickets: templateTiers, weekdayEdits, dateEdits }),
    [templateTiers, weekdayEdits, dateEdits]
  )
  const hasPaidTier = hasPaidPrice(paidPrices)
  const cheapestPaid = cheapestPaidPrice(paidPrices)

  /**
   * The promoter gate. BOTH conditions, because services enforces both:
   * `validateAndNormalizePromotion` throws "Connect Stripe before enabling the
   * Promoter Program" without a payout path, and "at least one paid ticket"
   * without a price. Gating on the price alone let the host tick the box and
   * then eat a 400 they could not act on from step 4.
   */
  const promoToggleDisabled = !hasPaidTier || !stripeOnboarded
  const promoDisabledReason = !hasPaidTier
    ? "Price at least one night before you can run a promoter program."
    : !stripeOnboarded
      ? "Connect Stripe before enabling the promoter program. Promoters need a payout path to sell into."
      : ""
  const willDraft = willDraftOnCreate(isPending)

  // Promotion is silently dropped rather than left dangling if the program stops
  // qualifying — the server would 400 on it, and the host has no way to see why
  // from the Review step.
  useEffect(() => {
    if (promoToggleDisabled && promotionEnabled) setPromotionEnabled(false)
  }, [promoToggleDisabled, promotionEnabled])

  const toggleDay = (day: number) => {
    setErrors((prev) => ({ ...prev, days_of_week: "" }))
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)
    )
  }

  // ── Payloads (services/src/services/DoorAccessProgramService.ts) ──────────

  const detailsPayload = (): Record<string, unknown> => ({
    name: name.trim(),
    description: description.trim() || null,
    venue_name: venueName.trim(),
    venue_address: venueAddress.trim(),
    ...(venueId != null ? { venue_id: venueId } : {}),
    days_of_week: daysOfWeek,
    date_range_start: dateRangeStart,
    date_range_end: dateRangeEnd || null,
    start_time: startTime,
    end_time: endTime,
    is_21_plus: is21Plus,
  })

  const salesPayload = (): Record<string, unknown> => {
    const weekday = weekdayEditsToWire(weekdayEdits, daysOfWeek)
    const dates = dateEditsToWire(dateEdits, daysOfWeek)

    const payload: Record<string, unknown> = {
      // `template_tickets` — the same field name the series template uses, so
      // one reader serves both. Derived from the first configured night.
      template_tickets: templateTiers,
      // V5 REDEMPTION — not sent: services derives camera_tap from the
      // program's kind and discards anything a client posts here.
      // Weekly access create does not announce to followers.
      notify_followers_on_publish: false,
      promotion_enabled: false,
    }

    // The per-night layer. Services folds `weekday_edits` into a by-date map and
    // then lets `date_edits` overwrite those entries, so a game day beats its
    // weekday default inside one request — which is why both travel together
    // rather than as two calls whose order would decide the winner.
    if (Object.keys(weekday).length > 0) payload.weekday_edits = weekday
    if (Object.keys(dates).length > 0) payload.date_edits = dates

    if (promotionEnabled && !promoToggleDisabled) {
      const { value } = commissionInputToStored(commissionType, promotionValueInput)
      payload.promotion_enabled = true
      payload.promotion_commission_type = commissionType
      payload.promotion_commission_value = value
    }

    payload.lowstock_alerts_enabled = lowstockEnabled
    payload.lowstock_notify_business_team = lowstockNotifyTeam
    if (lowstockEnabled) {
      const { value } = lowstockInputToStored(lowstockType, lowstockValueInput)
      if (value != null) {
        payload.lowstock_threshold_type = lowstockType
        payload.lowstock_threshold_value = value
      } else {
        payload.lowstock_threshold_value = null
      }
    }

    return payload
  }

  // ── Validation ───────────────────────────────────────────────────────────

  const validateDetails = (): boolean => {
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = "Give the program a name"
    if (!venueId) errs.venue_name = "Pick the venue this program runs at"
    else if (!venueName.trim()) errs.venue_name = "Location name is required"
    // A program with no nights is the one shape this product cannot have.
    if (daysOfWeek.length === 0) errs.days_of_week = "Pick at least one night of the week"
    if (!dateRangeStart) errs.date_range_start = "Start date is required"
    if (dateRangeEnd && dateRangeStart && dateRangeEnd < dateRangeStart) {
      errs.date_range_end = "End date must be on or after the start date"
    }
    if (!startTime) errs.start_time = "Start time is required"
    if (!endTime) errs.end_time = "End time is required"
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const validateNights = (): boolean => {
    const problems = validateAllNights({
      daysOfWeek,
      weekdayEdits,
      dateEdits,
      dayLabel: isoDayFull,
    })
    setNightErrors(problems)
    return problems.length === 0
  }

  const validateExtras = (): boolean => {
    const errs: Record<string, string> = {}
    if (promotionEnabled && !promoToggleDisabled) {
      const { error } = commissionInputToStored(commissionType, promotionValueInput)
      if (error) errs.promotion_commission_value = error
      // Services caps a fixed commission at half the cheapest paid price. Saying
      // so here beats a 400 the host has to translate.
      if (!error && commissionType === "fixed" && cheapestPaid != null) {
        const cap = cheapestPaid / 2
        const entered = parseFloat(promotionValueInput)
        if (Number.isFinite(entered) && entered > cap) {
          errs.promotion_commission_value = `A fixed commission can't be more than half the cheapest paid price ($${trimMoney(cap)}).`
        }
      }
    }
    if (lowstockEnabled) {
      const { error } = lowstockInputToStored(lowstockType, lowstockValueInput)
      if (error) errs.lowstock_threshold_value = error
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  /**
   * Server pre-flight for the step being left. A 400 here is the same rule the
   * create call would have applied, so it is shown and the host stays put.
   * A transport failure is NOT a validation failure — the flow continues and
   * the create call becomes the checkpoint, rather than trapping a host behind
   * a network blip on step 1.
   */
  const preflight = async (stepNumber: 1 | 2): Promise<boolean> => {
    setChecking(true)
    setServerError("")
    try {
      await apiClient.post("/business/door-access/validate-step", {
        step: stepNumber,
        ...(isEdit && programId != null ? { program_id: programId } : {}),
        // Step 2 needs the details too: the promoter gate reads the payload's
        // per-night edits, and `weekday_edits` keys are checked against
        // `days_of_week`.
        ...(stepNumber === 1 ? detailsPayload() : { ...detailsPayload(), ...salesPayload() }),
      })
      return true
    } catch (err) {
      if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
        setServerError(err.message)
        return false
      }
      return true
    } finally {
      setChecking(false)
    }
  }

  const goTo = (index: number) => {
    setServerError("")
    setStep(index)
    setFurthest((f) => Math.max(f, index))
  }

  const handleNext = async () => {
    if (step === STEP_SELL) {
      if (!products) {
        setServerError("Pick what this program sells.")
        return
      }
      goTo(STEP_DETAILS)
    } else if (step === STEP_DETAILS) {
      if (!validateDetails()) return
      if (!(await preflight(1))) return
      goTo(STEP_NIGHTS)
    } else if (step === STEP_NIGHTS) {
      if (!validateNights()) return
      if (!(await preflight(2))) return
      goTo(STEP_DATES)
    } else if (step === STEP_DATES) {
      if (!validateNights()) {
        setStep(STEP_NIGHTS)
        return
      }
      goTo(STEP_EXTRAS)
    } else if (step === STEP_EXTRAS) {
      if (!validateExtras()) return
      if (!(await preflight(2))) return
      goTo(STEP_REVIEW)
    }
  }

  const handlePublish = async (saveAsDraft = false) => {
    setSubmitting(true)
    setServerError("")
    try {
      const body = {
        ...detailsPayload(),
        ...salesPayload(),
        flyer_image_url: flyerImageUrl || null,
      }

      if (isEdit && programId != null) {
        const data = await updateDoorAccessProgram(programId, withDoorAccessProgramKind(body))
        if (data.restamp_error) {
          setGenerationNotice({ id: programId, message: data.restamp_error, kind: "updated" })
          return
        }
        router.push(programHref(programId))
        return
      }

      const data = await apiClient.post<CreateResponse>(
        "/business/door-access",
        applySaveAsDraftFlag(withDoorAccessProgramKind(body), saveAsDraft),
      )
      const id = Number(data.program?.id)
      // Publish (not Save as draft) restamps so nights are not left draft.
      //
      // The empty body is deliberate: create already wrote the template AND the
      // per-night overrides, so this is a restamp trigger, not a second write.
      // Re-sending the payload would re-apply the night edits and, on a program
      // whose first generation already ran, overwrite nights the host had not
      // asked to touch.
      let restamped = false
      if (!saveAsDraft && Number.isFinite(id) && id > 0) {
        try {
          const restamp = await updateDoorAccessProgram(id, withDoorAccessProgramKind({}))
          if (restamp.restamp_error) {
            setGenerationNotice({ id, message: restamp.restamp_error, kind: "created" })
            return
          }
          restamped = true
        } catch (err) {
          // Create already committed, so this is not a failure of the program —
          // but it IS the reason tonight might not be on the schedule yet, and
          // the nightly job is what will fix it. Say so instead of navigating
          // as if nothing happened.
          setGenerationNotice({
            id,
            message:
              err instanceof ApiError
                ? err.message
                : "The program saved, but scheduling tonight's nights did not finish. The nightly job will pick them up.",
            kind: "created",
          })
          return
        }
      }
      if (data.generation_error && !saveAsDraft && !restamped) {
        setGenerationNotice({ id, message: data.generation_error, kind: "created" })
        return
      }
      router.push(programHref(id))
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const errClass = "border-red-400 focus-visible:border-red-500 focus-visible:ring-red-500/30"

  if (generationNotice) {
    const saved = generationNotice.kind === "updated"
    return (
      <div className="flex max-w-3xl flex-col gap-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
            {saved ? "Program saved" : "Program created"}
          </h1>
          <p className="mt-1 text-[15px] text-neutral-600 dark:text-neutral-400">
            {saved
              ? "The template is saved. Upcoming nights that still follow it will pick up the new defaults."
              : `“${name.trim()}” is live and selling on ${scheduleSentence(daysOfWeek).toLowerCase()}.`}
          </p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400">
          <p className="font-semibold">
            {saved ? "Upcoming nights could not be restamped just now" : "Tonight's nights aren't on the schedule yet"}
          </p>
          <p className="mt-0.5">{generationNotice.message}</p>
        </div>
        <div>
          <Button size="lg" variant={ACCESS_BUTTON_VARIANT} onClick={() => router.push(programHref(generationNotice.id))}>
            Open the program
          </Button>
        </div>
      </div>
    )
  }

  const nightsConfigured = daysOfWeek.filter((d) => weekdayEdits[d]).length

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <Link
        href={backHref}
        className="inline-flex w-fit items-center gap-1.5 text-[13px] font-medium text-neutral-500 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
      >
        <ArrowLeft className="size-3.5" /> Back
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
          {isEdit ? "Edit program" : WEEKLY_ACCESS_CREATION_LABEL}
        </h1>
        <p className="mt-1 text-[15px] text-neutral-600 dark:text-neutral-400">
          {isEdit
            ? "Change the nights, each night's prices and hours, and the flyer. Every night that still follows this program picks up the new defaults."
            : "Set your nights and prices once. Every night is created for you and sells ahead."}
        </p>
      </div>

      <EventStepNav
        current={step}
        furthest={furthest}
        onJump={goTo}
        steps={DOOR_ACCESS_STEPS}
        accent={ACCESS_ACCENT}
      />

      {step === STEP_SELL && (
        <Card>
          <CardContent className="pt-6">
            <WcProductsStep
              value={products}
              onChange={(next) => {
                setServerError("")
                setProducts(next)
                // Nights the host has not built yet re-seed from the new choice
                // on their own, because the editor seeds from `products` when it
                // opens. A night they already priced is theirs and is left alone
                // rather than silently rewritten by a change of mind here.
              }}
            />
          </CardContent>
        </Card>
      )}

      {step === STEP_DETAILS && (
        <>
          <Card>
            <CardHeader className="flex-col items-start gap-1">
              <CardTitle>The nights it runs</CardTitle>
              <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
                Pick the nights you have {productsPhrase(products)}. Each one gets its own prices on the next
                screen, and every night is created for you on the schedule.
              </p>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div>
                <Label className="mb-1.5 block">Nights</Label>
                <div className="flex flex-wrap gap-2">
                  {ISO_DAYS.map((day) => {
                    const active = daysOfWeek.includes(day.value)
                    return (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => toggleDay(day.value)}
                        aria-pressed={active}
                        className={cn(
                          "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                          !active &&
                            "border-neutral-300 bg-white text-neutral-600 hover:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:border-neutral-600"
                        )}
                        style={active ? { borderColor: ACCESS_ACCENT, backgroundColor: ACCESS_ACCENT, color: "#fff" } : undefined}
                      >
                        {day.label}
                      </button>
                    )
                  })}
                </div>
                {errors.days_of_week && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.days_of_week}</p>}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="da_range_start" className="mb-1.5 block">First night on or after</Label>
                  <Input
                    id="da_range_start"
                    type="date"
                    value={dateRangeStart}
                    onChange={(e) => { setDateRangeStart(e.target.value); setErrors((p) => ({ ...p, date_range_start: "" })) }}
                    className={cn(errors.date_range_start && errClass)}
                  />
                  {errors.date_range_start && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.date_range_start}</p>}
                </div>
                <div>
                  <Label htmlFor="da_range_end" className="mb-1.5 block">
                    Runs until <span className="font-normal text-neutral-400 dark:text-neutral-500">(optional)</span>
                  </Label>
                  <Input
                    id="da_range_end"
                    type="date"
                    value={dateRangeEnd}
                    onChange={(e) => { setDateRangeEnd(e.target.value); setErrors((p) => ({ ...p, date_range_end: "" })) }}
                    className={cn(errors.date_range_end && errClass)}
                  />
                  {errors.date_range_end && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.date_range_end}</p>}
                  <p className="mt-1 text-[11px] text-neutral-400 dark:text-neutral-500">
                    Leave blank to run until you end it.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="da_start_time" className="mb-1.5 block">Doors at</Label>
                  <Input
                    id="da_start_time"
                    type="time"
                    value={startTime}
                    onChange={(e) => { setStartTime(e.target.value); setErrors((p) => ({ ...p, start_time: "" })) }}
                    className={cn(errors.start_time && errClass)}
                  />
                  {errors.start_time && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.start_time}</p>}
                </div>
                <div>
                  <Label htmlFor="da_end_time" className="mb-1.5 block">Last call</Label>
                  <Input
                    id="da_end_time"
                    type="time"
                    value={endTime}
                    onChange={(e) => { setEndTime(e.target.value); setErrors((p) => ({ ...p, end_time: "" })) }}
                    className={cn(errors.end_time && errClass)}
                  />
                  {errors.end_time && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.end_time}</p>}
                  <p className="mt-1 text-[11px] text-neutral-400 dark:text-neutral-500">
                    The starting point for every night. You can change any night&apos;s hours on the next screen.
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-neutral-50 px-4 py-3 dark:bg-neutral-800/50">
                {daysOfWeek.length === 0 ? (
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Pick your nights above to preview the schedule.</p>
                ) : (
                  <>
                    <p className="mb-1 text-sm font-medium text-neutral-900 dark:text-neutral-100">Next nights</p>
                    {previewDates.length === 0 ? (
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        No upcoming nights match this schedule. Check the dates above.
                      </p>
                    ) : (
                      previewDates.map((d, i) => (
                        <p key={i} className="text-xs text-neutral-600 dark:text-neutral-400">{d}</p>
                      ))
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Basics</CardTitle></CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div>
                <Label htmlFor="da_name" className="mb-1.5 block">Program name</Label>
                <Input
                  id="da_name"
                  value={name}
                  onChange={(e) => { setName(e.target.value.slice(0, NAME_MAX_LENGTH)); setErrors((p) => ({ ...p, name: "" })) }}
                  placeholder="e.g. Friday Cover"
                  maxLength={NAME_MAX_LENGTH}
                  className={cn(errors.name && errClass)}
                />
                {errors.name && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.name}</p>}
                <p className="mt-1 text-[11px] text-neutral-400 dark:text-neutral-500">
                  Every night is created with this name.
                </p>
              </div>
              <div>
                <Label htmlFor="da_description" className="mb-1.5 block">
                  Description <span className="font-normal text-neutral-400 dark:text-neutral-500">(optional)</span>
                </Label>
                <Textarea
                  id="da_description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="What people get for their cover…"
                />
              </div>
              <label className="flex w-fit cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={is21Plus}
                  onChange={(e) => setIs21Plus(e.target.checked)}
                  className={WEEKLY_COVER_CHECKBOX_CLASS}
                />
                <span className="text-sm text-neutral-700 dark:text-neutral-300">21+ only</span>
              </label>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
                Applies to every night. You can make a single night or a single price 21+ on the next screen.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Where</CardTitle></CardHeader>
            <CardContent className="space-y-4 pt-0">
              {venues.length > 0 && (
                <div>
                  <Label htmlFor="da_venue" className="mb-1.5 block">Venue</Label>
                  <Select
                    id="da_venue"
                    value={venueId ?? ""}
                    onChange={(e) => {
                      const id = Number(e.target.value)
                      if (!id) return
                      const v = venues.find((vv) => vv.id === id)
                      setVenueId(id)
                      setVenueName(v?.name ?? venueName)
                      setVenueAddress(v?.address ?? venueAddress)
                      setSelectedVenue(id)
                      setErrors((p) => ({ ...p, venue_name: "" }))
                    }}
                  >
                    <option value="" disabled>Select a venue</option>
                    {venues.map((v) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </Select>
                  {errors.venue_name && !currentVenue && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.venue_name}</p>
                  )}
                </div>
              )}
              <div>
                <Label htmlFor="da_venue_name" className="mb-1.5 block">Location name</Label>
                <Input
                  id="da_venue_name"
                  value={venueName}
                  onChange={(e) => { setVenueName(e.target.value); setErrors((p) => ({ ...p, venue_name: "" })) }}
                  placeholder="e.g. The Main Room"
                  disabled={!!currentVenue}
                />
                {!currentVenue && errors.venue_name && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.venue_name}</p>
                )}
              </div>
              <div>
                <Label htmlFor="da_venue_address" className="mb-1.5 block">Address</Label>
                <Input
                  id="da_venue_address"
                  value={venueAddress}
                  onChange={(e) => setVenueAddress(e.target.value)}
                  placeholder="Street address"
                  disabled={!!currentVenue}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-col items-start gap-1">
              <CardTitle>Flyer image</CardTitle>
              <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
                Optional. Used on every night that doesn&apos;t have its own. Without one, the venue photo stands in.
              </p>
            </CardHeader>
            <CardContent className="pt-0">
              <ImageUpload
                value={flyerImageUrl}
                onChange={setFlyerImageUrl}
                fallbackSrc={currentVenue?.photo_url ?? null}
                fallbackCaption="Venue photo. Nights use this until you add a flyer."
              />
            </CardContent>
          </Card>
        </>
      )}

      {step === STEP_NIGHTS && (
        <>
          <Card>
            <CardContent className="pt-6">
              <WcNightsStep
                daysOfWeek={daysOfWeek}
                products={products}
                weekdayEdits={weekdayEdits}
                onChange={(next) => { setWeekdayEdits(next); setNightErrors([]) }}
                defaultStartTime={startTime}
                defaultEndTime={endTime}
                programIs21Plus={is21Plus}
                venueName={venueName}
                inheritedFlyerUrl={flyerImageUrl || currentVenue?.photo_url || ""}
              />
            </CardContent>
          </Card>

          {hasPaidTier && !stripeOnboarded && !isPending && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900 dark:bg-amber-950/40">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                Connect Stripe to receive payments instantly
              </p>
              <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-400">
                You can still publish paid programs without it. We hold what you earn until you connect, then we send
                it all right away.
              </p>
            </div>
          )}
        </>
      )}

      {step === STEP_DATES && (
        <Card>
          <CardContent className="pt-6">
            <WcDatesStep
              daysOfWeek={daysOfWeek}
              products={products}
              rangeStart={dateRangeStart}
              rangeEnd={dateRangeEnd}
              dateEdits={dateEdits}
              weekdayEdits={weekdayEdits}
              onChange={(next) => { setDateEdits(next); setNightErrors([]) }}
              defaultStartTime={startTime}
              defaultEndTime={endTime}
              programIs21Plus={is21Plus}
              venueName={venueName}
              inheritedFlyerUrl={flyerImageUrl || currentVenue?.photo_url || ""}
            />
          </CardContent>
        </Card>
      )}

      {step === STEP_EXTRAS && (
        <>
          <Card>
            <CardHeader className="flex-col items-start gap-1">
              <CardTitle>Promoter program</CardTitle>
              <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
                Promoters share the program&apos;s link and earn this on every pass they sell.
              </p>
            </CardHeader>
            <CardContent className="pt-0">
              <label
                className={cn("flex w-fit items-center gap-2", promoToggleDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer")}
                title={promoToggleDisabled ? promoDisabledReason : undefined}
              >
                <input
                  type="checkbox"
                  checked={promotionEnabled}
                  disabled={promoToggleDisabled}
                  onChange={(e) => { setPromotionEnabled(e.target.checked); setErrors((p) => ({ ...p, promotion_commission_value: "" })) }}
                  className={WEEKLY_COVER_CHECKBOX_CLASS}
                />
                <span className="text-sm text-neutral-700 dark:text-neutral-300">Enable promoter program</span>
              </label>
              {promoToggleDisabled && <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">{promoDisabledReason}</p>}

              {promotionEnabled && !promoToggleDisabled && (
                <div className="mt-4 space-y-3">
                  <div>
                    <p className="mb-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300">Commission type</p>
                    <div className="flex flex-wrap gap-4">
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="radio"
                          name="da_commission_type"
                          checked={commissionType === "percent"}
                          onChange={() => { setCommissionType("percent"); setPromotionValueInput(""); setErrors((p) => ({ ...p, promotion_commission_value: "" })) }}
                          className={WEEKLY_COVER_RADIO_CLASS}
                        />
                        <span className="text-sm text-neutral-700 dark:text-neutral-300">Percent of the pass price</span>
                      </label>
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="radio"
                          name="da_commission_type"
                          checked={commissionType === "fixed"}
                          onChange={() => { setCommissionType("fixed"); setPromotionValueInput(""); setErrors((p) => ({ ...p, promotion_commission_value: "" })) }}
                          className={WEEKLY_COVER_RADIO_CLASS}
                        />
                        <span className="text-sm text-neutral-700 dark:text-neutral-300">Fixed amount per pass</span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="da_commission_value" className="mb-1.5 block">
                      Commission {commissionType === "percent" ? "(%)" : "($)"}
                    </Label>
                    <Input
                      id="da_commission_value"
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      className="w-40"
                      placeholder={commissionType === "percent" ? "e.g. 10" : "e.g. 5.00"}
                      value={promotionValueInput}
                      onChange={(e) => { setPromotionValueInput(e.target.value); setErrors((p) => ({ ...p, promotion_commission_value: "" })) }}
                    />
                    {commissionType === "fixed" && cheapestPaid != null && (
                      <p className="mt-1 text-[11px] text-neutral-400 dark:text-neutral-500">
                        Up to ${trimMoney(cheapestPaid / 2)}, half your cheapest paid price.
                      </p>
                    )}
                    {errors.promotion_commission_value && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.promotion_commission_value}</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-col items-start gap-1">
              <CardTitle>Stock alerts</CardTitle>
              <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
                Get told when a night&apos;s tier sells out, and optionally before it does.
              </p>
            </CardHeader>
            <CardContent className="pt-0">
              <label className="flex w-fit cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={lowstockEnabled}
                  onChange={(e) => { setLowstockEnabled(e.target.checked); setErrors((p) => ({ ...p, lowstock_threshold_value: "" })) }}
                  className={WEEKLY_COVER_CHECKBOX_CLASS}
                />
                <span className="text-sm text-neutral-700 dark:text-neutral-300">Notify me when a tier sells out</span>
              </label>

              {lowstockEnabled && (
                <div className="mt-4 space-y-3">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="da_lowstock_type" className="mb-1.5 block">Warn on</Label>
                      <Select
                        id="da_lowstock_type"
                        value={lowstockType}
                        onChange={(e) => { setLowstockType(e.target.value as "percent" | "count"); setErrors((p) => ({ ...p, lowstock_threshold_value: "" })) }}
                      >
                        <option value="percent">Percent left</option>
                        <option value="count">Passes left</option>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="da_lowstock_value" className="mb-1.5 block">
                        Threshold {lowstockType === "percent" ? "(%)" : "(passes)"}{" "}
                        <span className="font-normal text-neutral-400 dark:text-neutral-500">(optional)</span>
                      </Label>
                      <Input
                        id="da_lowstock_value"
                        type="number"
                        inputMode="numeric"
                        step="1"
                        min="1"
                        max={lowstockType === "percent" ? "100" : undefined}
                        className="w-40"
                        placeholder={lowstockType === "percent" ? "e.g. 10" : "e.g. 20"}
                        value={lowstockValueInput}
                        onChange={(e) => { setLowstockValueInput(e.target.value); setErrors((p) => ({ ...p, lowstock_threshold_value: "" })) }}
                      />
                      {errors.lowstock_threshold_value && (
                        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.lowstock_threshold_value}</p>
                      )}
                    </div>
                  </div>
                  <label className="flex w-fit cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={lowstockNotifyTeam}
                      onChange={(e) => setLowstockNotifyTeam(e.target.checked)}
                      className={WEEKLY_COVER_CHECKBOX_CLASS}
                    />
                    <span className="text-sm text-neutral-700 dark:text-neutral-300">Also notify business team</span>
                  </label>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {step === STEP_REVIEW && (
        <>
          <Card>
            <CardHeader><CardTitle>Review</CardTitle></CardHeader>
            <CardContent className="space-y-3 pt-0">
              <ReviewRow label="Program" value={name.trim() || "-"} />
              <ReviewRow label="Selling" value={nightLabelFor(products)} />
              <ReviewRow label="Venue" value={venueName.trim() || "-"} />
              <ReviewRow label="Nights" value={formatDays(daysOfWeek) || "-"} />
              <ReviewRow
                label="Runs"
                value={`${dateRangeStart || "-"} → ${dateRangeEnd || "no end date"}`}
              />
              <ReviewRow label="Default door window" value={`${fmtTime(startTime)} - ${fmtTime(endTime)}`} />
              {/* Shown, not chosen — the host sees what their door will do. */}
              <ReviewRow label="Check-in" value={redemptionModeLabel(DOOR_ACCESS_REDEMPTION_MODE)} />
              <ReviewRow label="Age" value={is21Plus ? "21+ only" : "All ages"} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-col items-start gap-1">
              <CardTitle>Each night</CardTitle>
              <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
                {nightsConfigured} of {daysOfWeek.length} nights set up.
              </p>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {[...daysOfWeek].sort((a, b) => a - b).map((day) => {
                const draft = weekdayEdits[day]
                return (
                  <div
                    key={day}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 px-3 py-2.5 dark:border-neutral-800"
                  >
                    <span className="min-w-0 truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {isoDayFull(day)}
                    </span>
                    <span className="shrink-0 text-sm text-neutral-600 dark:text-neutral-400">
                      {draft
                        ? `${nightPriceSummary(draft)} · ${fmtTime(draft.startTime)} - ${fmtTime(draft.endTime)}`
                        : "Not set up"}
                    </span>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {Object.keys(dateEdits).length > 0 && (
            <Card>
              <CardHeader className="flex-col items-start gap-1">
                <CardTitle>Game days</CardTitle>
                <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
                  These dates beat their weekly price. Everything else keeps the weekly default.
                </p>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {Object.keys(dateEdits).sort().map((date) => (
                  <div
                    key={date}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-access/30 bg-access/[0.04] px-3 py-2.5"
                  >
                    <span className="min-w-0 truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {date}
                    </span>
                    <span className="shrink-0 text-sm text-neutral-600 dark:text-neutral-400">
                      {nightPriceSummary(dateEdits[date])}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex-col items-start gap-1">
              <CardTitle>What every night starts from</CardTitle>
              <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
                The program template, taken from your first set-up night. A night without its own price sells at these.
              </p>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {templateTiers.map((tier, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 px-3 py-2.5 dark:border-neutral-800"
                >
                  <span className="min-w-0 truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    {tier.name || "Untitled tier"}
                  </span>
                  <span className="shrink-0 text-sm text-neutral-600 dark:text-neutral-400">
                    {usdPrice(tier.price_usd ?? 0)} ·{" "}
                    {(tier.quantity ?? 0) === 0 ? "Unlimited" : `${tier.quantity} per night`}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          <div
            className={cn(
              "rounded-xl border px-4 py-3 text-sm",
              !isEdit && willDraft
                ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
                : undefined,
            )}
            style={!isEdit && willDraft ? undefined : { borderColor: `${ACCESS_ACCENT}59`, backgroundColor: `${ACCESS_ACCENT}0f` }}
          >
            <p className={cn("font-semibold", (isEdit || !willDraft) && "text-neutral-900 dark:text-neutral-100")}>
              {isEdit
                ? "This updates the whole program"
                : willDraft
                  ? "Your business is still in review"
                  : "This goes live right away"}
            </p>
            <p className={cn("mt-0.5", isEdit || !willDraft ? "text-neutral-600 dark:text-neutral-400" : undefined)}>
              {isEdit
                ? "Nights, prices, hours, and the flyer apply to every night that still follows this program. A night you already customised on the program page keeps its own price and hours."
                : willDraft
                  ? "Publishing may stay a draft until you're approved. You can also save as a draft on purpose."
                  : "Each night is created on your schedule and starts selling. To close a single night or mark a price sold out, open the program afterwards."}
            </p>
          </div>
        </>
      )}

      {nightErrors.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
          <p className="mb-1 font-semibold">Fix these before you continue</p>
          <ul className="flex flex-col gap-1">
            {nightErrors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {serverError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
          {serverError}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        {step > (isEdit ? STEP_DETAILS : STEP_SELL) ? (
          <Button variant="secondary" size="lg" onClick={() => goTo(step - 1)} disabled={checking || submitting}>
            Back
          </Button>
        ) : (
          <Button variant="secondary" size="lg" asChild>
            <Link href={backHref}>Cancel</Link>
          </Button>
        )}

        {step < STEP_REVIEW ? (
          <Button size="lg" variant={ACCESS_BUTTON_VARIANT} onClick={handleNext} disabled={checking}>
            {checking && <Loader2 className="animate-spin" />}
            {step === STEP_DATES && Object.keys(dateEdits).length === 0 ? "Skip for now" : "Next"}
          </Button>
        ) : isEdit ? (
          <Button size="lg" variant={ACCESS_BUTTON_VARIANT} onClick={() => handlePublish(false)} disabled={submitting}>
            {submitting && <Loader2 className="animate-spin" />}
            Save program
          </Button>
        ) : (
          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button variant="access-secondary" size="lg" onClick={() => handlePublish(true)} disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              Save as draft
            </Button>
            <Button size="lg" variant={ACCESS_BUTTON_VARIANT} onClick={() => handlePublish(false)} disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              Publish program
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="shrink-0 text-[13px] text-neutral-500 dark:text-neutral-400">{label}</span>
      <span className="min-w-0 text-right text-sm font-medium text-neutral-900 dark:text-neutral-100">{value}</span>
    </div>
  )
}
