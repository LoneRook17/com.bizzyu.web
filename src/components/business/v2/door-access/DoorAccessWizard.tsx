"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2 } from "lucide-react"
import { apiClient, ApiError } from "@/lib/business/api-client"
import { useVenue } from "@/lib/business/venue-context"
import {
  ACCESS_BUTTON_VARIANT,
  WEEKLY_ACCESS_CREATION_LABEL,
  programHref,
  updateDoorAccessProgram,
  withDoorAccessProgramKind,
  type DoorAccessNight,
  type DoorAccessProgram,
} from "@/lib/business/door-access"
import {
  cheapestPaidPrice,
  dateEditsToWire,
  weeklyCoverProgramDescription,
  weeklyCoverProgramName,
  firstConfiguredNight,
  flutterWizardStep,
  hasPaidPrice,
  paidPricesFromDraft,
  productsFromTiers,
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
import { Button } from "@/components/business/v2/ui/button"
import { Card, CardContent } from "@/components/business/v2/ui/card"
import {
  isLeftoverPromoterPayoutPathError,
  isPromotionEnabled,
  promoterToggleDisabled,
} from "@/lib/business/create-publish"
import { commissionInputToStored, commissionValueToInput } from "@/components/business/v2/events/EventForm"
import {
  readyWcPromoDrafts,
  validateWcPromoDraft,
  wcPromoCreatePath,
  wcPromoCreatePayload,
  type WcPromoDraft,
} from "@/lib/business/wc-create-promo"
import { isoDayFull } from "@/components/business/v2/recurring/schedule"
import { WcProductsStep } from "@/components/business/v2/door-access/WcProductsStep"
import { WcDaysStep } from "@/components/business/v2/door-access/WcDaysStep"
import { WcNightsStep } from "@/components/business/v2/door-access/WcNightsStep"
import { WcDatesStep } from "@/components/business/v2/door-access/WcDatesStep"
import { WcDoorStep } from "@/components/business/v2/door-access/WcDoorStep"
import { WcReviewStep } from "@/components/business/v2/door-access/WcReviewStep"
import { WcProgressBar } from "@/components/business/v2/door-access/WcProgressBar"

/**
 * Weekly Cover CREATE, matched to Flutter WC_inapp_flow.
 *
 * Luke's per-weekday / per-date write (weekday_edits, date_edits,
 * template_tickets from the first night, cover/skip keys, flyer omit/null
 * rules, promoter gate) stays. What this rewrite removes from CREATE is
 * everything the app does not ask: typed name, program 21+,
 * program hours, date range, program flyer, venue picker, VIP,
 * stock alerts, follower blast, save-as-draft. Scan Window and Custom
 * description live on the weekday Prices editor. Promo codes live on the
 * last page and POST to the program-scoped promo API after Publish.
 *
 * Screens (Flutter 2-9; 1 is the create-funnel choice):
 *   0 Sell     what it sells — Cover / Skip / Both
 *   1 Days     MTWTFSS. date_range_end null. Name derived {Venue} Cover.
 *   2 Nights   one row per day; editor is Flutter 5; copy is Flutter 6
 *   3 Dates    higher prices on specific days. Skip for now.
 *   4 Door     camera copy + promoter
 *   5 Review   day chips switch preview. Publish.
 *
 * Edit skips Sell when products already exist.
 */

const STEP_SELL = 0
const STEP_DAYS = 1
const STEP_NIGHTS = 2
const STEP_DATES = 3
const STEP_DOOR = 4
const STEP_REVIEW = 5

async function persistProgramPromoDrafts(programId: number, drafts: WcPromoDraft[]) {
  const ready = readyWcPromoDrafts(drafts)
  for (const draft of ready) {
    await apiClient.post(wcPromoCreatePath(programId), wcPromoCreatePayload(draft))
  }
}

interface CreateResponse {
  program: DoorAccessProgram & { id: number }
  generation: unknown | null
  generation_error: string | null
}

export function DoorAccessWizard({
  mode = "create",
  programId,
  initialData,
  initialNights = [],
  stripeOnboarded = true,
}: {
  mode?: "create" | "edit"
  programId?: number
  initialData?: DoorAccessProgram
  initialNights?: DoorAccessNight[]
  stripeOnboarded?: boolean
  /** Kept so create/edit pages can still pass pending status. Unused: no draft CTA. */
  isPending?: boolean
}) {
  const router = useRouter()
  const isEdit = mode === "edit"
  const { venues, selectedVenue } = useVenue()
  const backHref = isEdit && programId ? programHref(programId) : "/business/create"

  const todayStr = new Date().toLocaleDateString("en-CA")

  const initialProducts = initialData?.template_tickets.length
    ? productsFromTiers(templateTiersToDrafts(initialData.template_tickets))
    : null

  // Edit: skip Sell if products exist. Create always starts on Sell.
  const [step, setStep] = useState(isEdit && initialProducts ? STEP_DAYS : STEP_SELL)
  const [products, setProducts] = useState<WcProducts | null>(initialProducts)

  const [venueId, setVenueId] = useState<number | null>(initialData?.venue_id ?? null)
  const [venueName, setVenueName] = useState(initialData?.venue_name ?? "")
  const [venueAddress, setVenueAddress] = useState(initialData?.venue_address ?? "")
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(initialData?.days_of_week ?? [])

  const [weekdayEdits, setWeekdayEdits] = useState<Record<number, NightDraft>>(() => {
    if (!isEdit || !initialData) return {}
    return weekdayEditsFromNights({ program: initialData, nights: initialNights })
  })
  const [dateEdits, setDateEdits] = useState<Record<string, NightDraft>>({})

  const [promotionEnabled, setPromotionEnabled] = useState(isPromotionEnabled(initialData?.promotion_enabled))
  const [commissionType, setCommissionType] = useState<"percent" | "fixed">(
    initialData?.promotion_commission_type ?? "percent"
  )
  const [promotionValueInput, setPromotionValueInput] = useState(
    commissionValueToInput(initialData?.promotion_commission_type ?? "percent", initialData?.promotion_commission_value)
  )
  const [promoDrafts, setPromoDrafts] = useState<WcPromoDraft[]>([])

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [nightErrors, setNightErrors] = useState<string[]>([])
  const [serverError, setServerError] = useState("")
  const [checking, setChecking] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [nightEditorOpen, setNightEditorOpen] = useState(false)
  const [previewDay, setPreviewDay] = useState<number | null>(null)

  const [generationNotice, setGenerationNotice] = useState<{
    id: number
    message: string
    kind: "created" | "updated"
  } | null>(null)

  useEffect(() => {
    if (!isEdit && venueId == null) {
      const v = selectedVenue ?? venues[0] ?? null
      if (!v) return
      setVenueId(v.id)
      setVenueName(v.name)
      setVenueAddress(v.address || "")
    }
  }, [selectedVenue, venues, isEdit, venueId])

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

  const currentVenue = venues.find((v) => v.id === venueId) ?? selectedVenue ?? null
  const scopedVenueName = venueName || currentVenue?.name || ""
  const scopedVenueAddress = venueAddress || currentVenue?.address || ""
  const programName = weeklyCoverProgramName({
    isEdit,
    venueName: scopedVenueName,
    existingName: initialData?.name,
  })
  const programDescription = weeklyCoverProgramDescription({
    isEdit,
    existingDescription: initialData?.description,
  })

  const fallbackTiers = useMemo(
    () => (products ? seedTiersForProducts(products) : templateTiersToDrafts(initialData?.template_tickets ?? [])),
    [products, initialData]
  )

  const templateTiers = useMemo(
    () => templateTicketsFromNights({ daysOfWeek, weekdayEdits, fallbackTiers }),
    [daysOfWeek, weekdayEdits, fallbackTiers]
  )

  const firstNight = useMemo(
    () => firstConfiguredNight(daysOfWeek, weekdayEdits),
    [daysOfWeek, weekdayEdits]
  )

  const paidPrices = useMemo(
    () => paidPricesFromDraft({ templateTickets: templateTiers, weekdayEdits, dateEdits }),
    [templateTiers, weekdayEdits, dateEdits]
  )
  const hasPaidTier = hasPaidPrice(paidPrices)
  const cheapestPaid = cheapestPaidPrice(paidPrices)

  const promoToggleDisabled = promoterToggleDisabled(hasPaidTier)
  const promoDisabledReason = promoToggleDisabled
    ? "Price at least one night before you can run a promoter program."
    : ""
  void stripeOnboarded

  useEffect(() => {
    if (promoToggleDisabled && promotionEnabled) setPromotionEnabled(false)
  }, [promoToggleDisabled, promotionEnabled])

  const nightsReady =
    daysOfWeek.length > 0 &&
    daysOfWeek.every((d) => {
      const draft = weekdayEdits[d]
      return !!draft && draft.startTime !== "" && draft.endTime !== ""
    })

  const nightsSaved = daysOfWeek.filter((d) => weekdayEdits[d]?.startTime && weekdayEdits[d]?.endTime).length
  const progressStep = flutterWizardStep({
    wizardIndex: step,
    editorOpen: nightEditorOpen,
    nightsSaved,
  })

  const toggleDay = (day: number) => {
    setErrors((prev) => ({ ...prev, days_of_week: "" }))
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)
    )
  }

  const detailsPayload = (): Record<string, unknown> => {
    const start = firstNight?.startTime || "21:00"
    const end = firstNight?.endTime || "02:00"
    const any21 =
      Object.values(weekdayEdits).some((n) => n.is21Plus || n.tiers.some((t) => t.is_21_plus)) ||
      Object.values(dateEdits).some((n) => n.is21Plus || n.tiers.some((t) => t.is_21_plus))
    return {
      name: programName,
      description: programDescription,
      venue_name: scopedVenueName,
      venue_address: scopedVenueAddress,
      ...(venueId != null ? { venue_id: venueId } : currentVenue?.id != null ? { venue_id: currentVenue.id } : {}),
      days_of_week: daysOfWeek,
      date_range_start: isEdit ? (initialData?.date_range_start || todayStr) : todayStr,
      date_range_end: isEdit ? (initialData?.date_range_end ?? null) : null,
      start_time: start,
      end_time: end,
      is_21_plus: any21,
    }
  }

  const salesPayload = (): Record<string, unknown> => {
    // Weekday slots are the FULL weekday template (tickets, prices, doors,
    // capacity, flyer). Every future Thursday gets Thursday's setup.
    // date_edits are Custom one-offs from THIS session (create game days).
    // Edit never hydrates Custom nights into dateEdits, so a program save
    // cannot send night-local Custom fields to restamp onto those nights.
    const weekday = weekdayEditsToWire(weekdayEdits, daysOfWeek)
    const dates = dateEditsToWire(dateEdits, daysOfWeek)
    const flyer = (firstNight?.flyerImageUrl || "").trim()

    const payload: Record<string, unknown> = {
      template_tickets: templateTiers,
      notify_followers_on_publish: false,
      promotion_enabled: false,
      flyer_image_url: flyer || null,
    }

    if (Object.keys(weekday).length > 0) payload.weekday_edits = weekday
    // Create may send date_edits. Edit only sends them when the host set a
    // game day in this session — never the already-Custom nights on the series.
    if (Object.keys(dates).length > 0) payload.date_edits = dates

    if (promotionEnabled && !promoToggleDisabled) {
      const { value } = commissionInputToStored(commissionType, promotionValueInput)
      payload.promotion_enabled = true
      payload.promotion_commission_type = commissionType
      payload.promotion_commission_value = value
    }

    return payload
  }

  const validateDays = (): boolean => {
    const errs: Record<string, string> = {}
    if (!venueId && !currentVenue) errs.venue_name = "This program needs a venue"
    if (daysOfWeek.length === 0) errs.days_of_week = "Pick at least one night of the week"
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

  const validateDoor = (): boolean => {
    const errs: Record<string, string> = {}
    if (promotionEnabled && !promoToggleDisabled) {
      const { error } = commissionInputToStored(commissionType, promotionValueInput)
      if (error) errs.promotion_commission_value = error
      if (!error && commissionType === "fixed" && cheapestPaid != null) {
        const cap = cheapestPaid / 2
        const entered = parseFloat(promotionValueInput)
        if (Number.isFinite(entered) && entered > cap) {
          errs.promotion_commission_value = `A fixed commission can't be more than half the cheapest paid price ($${trimMoney(cap)}).`
        }
      }
    }
    const started = promoDrafts.filter((d) => d.code.trim() !== "" || d.discount_value.trim() !== "")
    const promoProblem = started.map(validateWcPromoDraft).find((m) => m != null)
    if (promoProblem) errs.promo_codes = promoProblem
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const preflight = async (stepNumber: 1 | 2): Promise<boolean> => {
    setChecking(true)
    setServerError("")
    try {
      await apiClient.post("/business/door-access/validate-step", {
        step: stepNumber,
        ...(isEdit && programId != null ? { program_id: programId } : {}),
        ...(stepNumber === 1 ? detailsPayload() : { ...detailsPayload(), ...salesPayload() }),
      })
      return true
    } catch (err) {
      if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
        // Flutter create does not Stripe-gate promoter. This dash-only
        // validate-step still throws the leftover payout-path copy; D4
        // opened the toggle and must not leave Continue blocked on it.
        if (isLeftoverPromoterPayoutPathError(err.message)) return true
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
  }

  const handleNext = async () => {
    if (step === STEP_SELL) {
      if (!products) {
        setServerError("Pick what this program sells.")
        return
      }
      goTo(STEP_DAYS)
    } else if (step === STEP_DAYS) {
      if (!validateDays()) return
      if (!(await preflight(1))) return
      goTo(STEP_NIGHTS)
    } else if (step === STEP_NIGHTS) {
      if (!nightsReady || !validateNights()) return
      if (!(await preflight(2))) return
      goTo(STEP_DATES)
    } else if (step === STEP_DATES) {
      if (!validateNights()) {
        setStep(STEP_NIGHTS)
        return
      }
      goTo(STEP_DOOR)
    } else if (step === STEP_DOOR) {
      if (!validateDoor()) return
      if (!(await preflight(2))) return
      if (previewDay == null && daysOfWeek.length > 0) {
        setPreviewDay([...daysOfWeek].sort((a, b) => a - b)[0])
      }
      goTo(STEP_REVIEW)
    }
  }

  const handlePublish = async () => {
    setSubmitting(true)
    setServerError("")
    try {
      const body = {
        ...detailsPayload(),
        ...salesPayload(),
      }

      if (isEdit && programId != null) {
        const data = await updateDoorAccessProgram(programId, withDoorAccessProgramKind(body))
        if (data.restamp_error) {
          setGenerationNotice({ id: programId, message: data.restamp_error, kind: "updated" })
          return
        }
        try {
          await persistProgramPromoDrafts(programId, promoDrafts)
        } catch {
          // Program saved. Codes can still be added on the program page.
        }
        router.push(programHref(programId))
        return
      }

      const data = await apiClient.post<CreateResponse>(
        "/business/door-access",
        withDoorAccessProgramKind(body),
      )
      const id = Number(data.program?.id)
      if (Number.isFinite(id) && id > 0) {
        try {
          await persistProgramPromoDrafts(id, promoDrafts)
        } catch {
          // Program is live. Codes can still be added on the program page.
        }
      }
      let restamped = false
      if (Number.isFinite(id) && id > 0) {
        try {
          const restamp = await updateDoorAccessProgram(id, withDoorAccessProgramKind({}))
          if (restamp.restamp_error) {
            setGenerationNotice({ id, message: restamp.restamp_error, kind: "created" })
            return
          }
          restamped = true
        } catch (err) {
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
      if (data.generation_error && !restamped) {
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

  const firstStep = isEdit && initialProducts ? STEP_DAYS : STEP_SELL
  const continueDisabled =
    checking ||
    (step === STEP_SELL && !products) ||
    (step === STEP_DAYS && daysOfWeek.length === 0) ||
    (step === STEP_NIGHTS && !nightsReady)

  const continueLabel =
    step === STEP_DATES && Object.keys(dateEdits).length === 0 ? "Skip for now" : "Continue"

  const commissionSummary = promotionEnabled
    ? commissionType === "percent"
      ? `${promotionValueInput || "0"}% commission`
      : `$${promotionValueInput || "0"} commission`
    : ""

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
              : `${programName} is live and selling.`}
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
      </div>

      <WcProgressBar step={progressStep} />

      {step === STEP_SELL && (
        <Card>
          <CardContent className="pt-6">
            <WcProductsStep
              value={products}
              onChange={(next) => {
                setServerError("")
                setProducts(next)
              }}
            />
          </CardContent>
        </Card>
      )}

      {step === STEP_DAYS && (
        <Card>
          <CardContent className="pt-6">
            <WcDaysStep
              products={products}
              daysOfWeek={daysOfWeek}
              onToggleDay={toggleDay}
              venueName={scopedVenueName}
              venueAddress={scopedVenueAddress}
              error={errors.days_of_week || errors.venue_name}
            />
          </CardContent>
        </Card>
      )}

      {step === STEP_NIGHTS && (
        <Card>
          <CardContent className="pt-6">
            <WcNightsStep
              daysOfWeek={daysOfWeek}
              products={products}
              weekdayEdits={weekdayEdits}
              onChange={(next) => {
                setWeekdayEdits(next)
                setNightErrors([])
              }}
              venueName={scopedVenueName}
              inheritedFlyerUrl={currentVenue?.photo_url || ""}
              onEditorOpenChange={setNightEditorOpen}
            />
          </CardContent>
        </Card>
      )}

      {step === STEP_DATES && (
        <Card>
          <CardContent className="pt-6">
            <WcDatesStep
              daysOfWeek={daysOfWeek}
              products={products}
              rangeStart={isEdit ? (initialData?.date_range_start || todayStr) : todayStr}
              rangeEnd={isEdit ? (initialData?.date_range_end || "") : ""}
              dateEdits={dateEdits}
              weekdayEdits={weekdayEdits}
              onChange={(next) => {
                setDateEdits(next)
                setNightErrors([])
              }}
              defaultStartTime=""
              defaultEndTime=""
              programIs21Plus={false}
              venueName={scopedVenueName}
              inheritedFlyerUrl={currentVenue?.photo_url || ""}
            />
          </CardContent>
        </Card>
      )}

      {step === STEP_DOOR && (
        <Card>
          <CardContent className="pt-6">
            <WcDoorStep
              promotionEnabled={promotionEnabled}
              onPromotionEnabled={(on) => {
                setPromotionEnabled(on)
                setErrors((p) => ({ ...p, promotion_commission_value: "" }))
              }}
              commissionType={commissionType}
              onCommissionType={(next) => {
                setCommissionType(next)
                setPromotionValueInput("")
                setErrors((p) => ({ ...p, promotion_commission_value: "" }))
              }}
              promotionValueInput={promotionValueInput}
              onPromotionValueInput={(next) => {
                setPromotionValueInput(next)
                setErrors((p) => ({ ...p, promotion_commission_value: "" }))
              }}
              promoToggleDisabled={promoToggleDisabled}
              promoDisabledReason={promoDisabledReason}
              cheapestPaid={cheapestPaid}
              commissionError={errors.promotion_commission_value}
              promoDrafts={promoDrafts}
              onPromoDrafts={(next) => {
                setPromoDrafts(next)
                setErrors((p) => ({ ...p, promo_codes: "" }))
              }}
              promoDraftsError={errors.promo_codes}
            />
          </CardContent>
        </Card>
      )}

      {step === STEP_REVIEW && (
        <Card>
          <CardContent className="pt-6">
            <WcReviewStep
              products={products}
              venueName={scopedVenueName}
              venueAddress={scopedVenueAddress}
              venuePhotoUrl={currentVenue?.photo_url || ""}
              derivedName={programName}
              daysOfWeek={daysOfWeek}
              weekdayEdits={weekdayEdits}
              dateEdits={dateEdits}
              previewDay={previewDay}
              onPreviewDay={setPreviewDay}
              promotionEnabled={promotionEnabled && !promoToggleDisabled}
              commissionSummary={commissionSummary}
            />
          </CardContent>
        </Card>
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
        {step > firstStep ? (
          <Button variant="secondary" size="lg" onClick={() => goTo(step - 1)} disabled={checking || submitting}>
            Back
          </Button>
        ) : (
          <Button variant="secondary" size="lg" asChild>
            <Link href={backHref}>Cancel</Link>
          </Button>
        )}

        {step < STEP_REVIEW ? (
          <Button size="lg" variant={ACCESS_BUTTON_VARIANT} onClick={handleNext} disabled={continueDisabled}>
            {checking && <Loader2 className="animate-spin" />}
            {continueLabel}
          </Button>
        ) : (
          <Button size="lg" variant={ACCESS_BUTTON_VARIANT} onClick={handlePublish} disabled={submitting}>
            {submitting && <Loader2 className="animate-spin" />}
            {isEdit ? "Save program" : "Publish"}
          </Button>
        )}
      </div>
    </div>
  )
}
