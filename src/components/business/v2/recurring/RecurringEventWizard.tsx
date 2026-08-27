"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2 } from "lucide-react"
import { apiClient, ApiError } from "@/lib/business/api-client"
import { promoterToggleDisabled } from "@/lib/business/create-publish"
import { EVENT_ACCENT } from "@/lib/business/door-access"
import { greenRecurringCreatePayload, todayIsoDate } from "@/lib/business/recurring-event-create"
import type { RecurringGenerationSummary, RecurringSeriesDetail } from "@/lib/business/types"
import { Button } from "@/components/business/v2/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/business/v2/ui/card"
import { TimeField } from "@/components/business/v2/ui/date-time-field"
import { Input } from "@/components/business/v2/ui/input"
import { Label } from "@/components/business/v2/ui/label"
import { EventStepNav } from "@/components/business/v2/events/EventStepNav"
import { ImageUpload } from "@/components/business/v2/events/ImageUpload"
import { cn } from "@/lib/v2/utils"
import {
  EMPTY_RECURRING_TIER,
  RecurringTierEditor,
  tierRowsToTemplate,
  type RecurringTierRow,
} from "./RecurringTierEditor"
import { stashCreationReport } from "./SeriesForm"
import { ISO_DAYS, fmtTimeOfDay, isoDayFull, scheduleSentence, upcomingScheduleDates } from "./schedule"
import { SERIES_NIGHTS_WINDOW_DAYS, addIsoDays } from "@/lib/business/series-nights-window"

/** Same contract as EventForm commissionInputToStored — kept local so this
 *  wizard does not import EventForm (EventForm mounts this file). */
function commissionToStored(
  type: "percent" | "fixed",
  inputValue: string,
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

function wizardSteps(ticketed: boolean): { key: string; label: string }[] {
  const steps = [
    { key: "days", label: "Nights" },
    { key: "hours", label: "Hours" },
  ]
  if (ticketed) steps.push({ key: "tickets", label: "Tickets" })
  steps.push({ key: "more", label: "Promoter" }, { key: "review", label: "Review" })
  return steps
}

export type RecurringEventSeed = {
  name: string
  description: string
  venue_id: number | null
  venue_name: string
  venue_address: string
  type: "Ticketed" | "Free"
  is_21_plus: boolean
  flyer_image_url: string
}

/**
 * Green recurring create after the host turns on Repeats weekly on Event
 * create. Same spine as the access wizard (nights → template → extras → review)
 * but stays an Event: green chrome, no access-product wording, POST /business/recurring-series
 * with product_kind=event.
 */
export function RecurringEventWizard({
  seed,
  onBackToDetails,
}: {
  seed: RecurringEventSeed
  onBackToDetails: () => void
}) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [furthest, setFurthest] = useState(0)
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([])
  const [startTime, setStartTime] = useState("21:00")
  const [endTime, setEndTime] = useState("02:00")
  const [flyerImageUrl, setFlyerImageUrl] = useState(seed.flyer_image_url)
  const [tiers, setTiers] = useState<RecurringTierRow[]>([
    { ...EMPTY_RECURRING_TIER, name: "General Admission" },
  ])
  const [promotionEnabled, setPromotionEnabled] = useState(false)
  const [commissionType, setCommissionType] = useState<"percent" | "fixed">("percent")
  const [promotionValueInput, setPromotionValueInput] = useState("")
  const [notifyFollowers, setNotifyFollowers] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const hasPaidTier = seed.type === "Ticketed" && tiers.some((t) => (parseFloat(t.priceInput) || 0) > 0)
  const promoDisabled = promoterToggleDisabled(hasPaidTier)
  const STEPS = useMemo(() => wizardSteps(seed.type === "Ticketed"), [seed.type])
  const stepKey = STEPS[step]?.key ?? "days"
  const previewDates = useMemo(() => {
    const start = todayIsoDate()
    return upcomingScheduleDates(daysOfWeek, start, addIsoDays(start, SERIES_NIGHTS_WINDOW_DAYS), 8)
  }, [daysOfWeek])

  const toggleDay = (day: number) => {
    setErrors((prev) => ({ ...prev, days_of_week: "" }))
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b),
    )
  }

  const validateDays = (): boolean => {
    const errs: Record<string, string> = {}
    if (daysOfWeek.length === 0) errs.days_of_week = "Pick at least one night of the week"
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const validateHours = (): boolean => {
    const errs: Record<string, string> = {}
    if (!startTime) errs.start_time = "Start time is required"
    if (!endTime) errs.end_time = "End time is required"
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const validateTickets = (): boolean => {
    const errs: Record<string, string> = {}
    if (seed.type === "Ticketed") {
      if (tiers.length === 0) errs.tickets = "At least one ticket tier is required"
      else if (tiers.some((t) => !t.name.trim())) errs.tickets = "All ticket tiers must have a name"
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const validateMore = (): boolean => {
    const errs: Record<string, string> = {}
    if (promotionEnabled && !promoDisabled) {
      const { error } = commissionToStored(commissionType, promotionValueInput)
      if (error) errs.promotion_commission_value = error
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const goNext = () => {
    if (stepKey === "days" && !validateDays()) return
    if (stepKey === "hours" && !validateHours()) return
    if (stepKey === "tickets" && !validateTickets()) return
    if (stepKey === "more" && !validateMore()) return
    setServerError("")
    const next = step + 1
    setStep(next)
    setFurthest((prev) => Math.max(prev, next))
  }

  const handlePublish = async () => {
    if (!validateDays() || !validateHours() || !validateTickets() || !validateMore()) return
    setSubmitting(true)
    setServerError("")
    try {
      const promo = promotionEnabled && !promoDisabled
        ? commissionToStored(commissionType, promotionValueInput)
        : { value: null, error: null }
      const payload = greenRecurringCreatePayload({
        name: seed.name,
        description: seed.description,
        venue_id: seed.venue_id,
        venue_name: seed.venue_name,
        venue_address: seed.venue_address,
        days_of_week: daysOfWeek,
        start_time: startTime,
        end_time: endTime,
        type: seed.type,
        is_21_plus: seed.is_21_plus,
        flyer_image_url: flyerImageUrl,
        template_tickets: seed.type === "Ticketed" ? tierRowsToTemplate(tiers) : [],
        notify_followers_on_publish: notifyFollowers,
        promotion_enabled: promo.value != null,
        promotion_commission_type: commissionType,
        promotion_commission_value: promo.value,
      })
      const data = await apiClient.post<{
        series: RecurringSeriesDetail
        generation: RecurringGenerationSummary | null
        generation_error: string | null
      }>("/business/recurring-series", payload)
      stashCreationReport(data.series.id, data.generation, data.generation_error)
      router.push(`/business/recurring/${data.series.id}`)
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const commissionSummary = promotionEnabled && !promoDisabled
    ? commissionType === "percent"
      ? `${promotionValueInput || "0"}%`
      : `$${promotionValueInput || "0"}`
    : "Off"

  return (
    <div className="flex flex-col gap-5">
      <button
        type="button"
        onClick={step === 0 ? onBackToDetails : () => setStep(step - 1)}
        className="inline-flex w-fit items-center gap-1.5 text-[13px] font-medium text-neutral-500 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
      >
        <ArrowLeft className="size-3.5" /> Back
      </button>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
          Create event
        </h1>
        <p className="mt-1 text-[15px] text-neutral-600 dark:text-neutral-400">
          Repeats every week. Step {step + 1} of {STEPS.length}. {STEPS[step].label}.
        </p>
      </div>

      <EventStepNav
        current={step}
        furthest={furthest}
        onJump={(i) => i <= furthest && setStep(i)}
        steps={STEPS}
        accent={EVENT_ACCENT}
      />

      {stepKey === "days" && (
        <Card>
          <CardHeader className="flex-col items-start gap-1">
            <CardTitle>Nights it repeats</CardTitle>
            <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
              Each weekday is the template for that night. Differences here are weekday templates, not Custom.
            </p>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
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
                      active
                        ? "border-[#05EB54] bg-[#05EB54] text-white"
                        : "border-neutral-300 bg-white text-neutral-600 hover:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400",
                    )}
                  >
                    {day.label}
                  </button>
                )
              })}
            </div>
            {errors.days_of_week && <p className="text-xs text-red-600 dark:text-red-400">{errors.days_of_week}</p>}
            {daysOfWeek.length > 0 && (
              <div className="flex flex-col gap-2">
                {daysOfWeek.map((day) => (
                  <div
                    key={day}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#05EB54]/40 bg-[#05EB54]/[0.04] px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{isoDayFull(day)}</p>
                      <p className="text-[13px] text-neutral-500">Weekday template</p>
                    </div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-300">
                      {fmtTimeOfDay(startTime)} - {fmtTimeOfDay(endTime)}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <div className="rounded-xl bg-neutral-50 px-4 py-3 dark:bg-neutral-800/50">
              {daysOfWeek.length === 0 ? (
                <p className="text-sm text-neutral-500">Pick the nights this event repeats.</p>
              ) : (
                <>
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    {scheduleSentence(daysOfWeek)}
                  </p>
                  <p className="mt-1 text-[13px] text-neutral-500">
                    Next two weeks: {previewDates.length ? previewDates.join(" · ") : "none"}
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {stepKey === "hours" && (
        <>
          <Card>
            <CardHeader className="flex-col items-start gap-1">
              <CardTitle>Hours</CardTitle>
              <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
                Same hours for every night you picked. This is the weekday template, not a Custom night.
              </p>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 pt-0 sm:grid-cols-2">
              <div>
                <Label htmlFor="rc_start" className="mb-1.5 block">Opens</Label>
                <TimeField id="rc_start" value={startTime} onChange={(next) => { setStartTime(next); setErrors((p) => ({ ...p, start_time: "" })) }} />
                {errors.start_time && <p className="mt-1 text-xs text-red-600">{errors.start_time}</p>}
              </div>
              <div>
                <Label htmlFor="rc_end" className="mb-1.5 block">Closes</Label>
                <TimeField id="rc_end" value={endTime} onChange={(next) => { setEndTime(next); setErrors((p) => ({ ...p, end_time: "" })) }} />
                {errors.end_time && <p className="mt-1 text-xs text-red-600">{errors.end_time}</p>}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Flyer</CardTitle></CardHeader>
            <CardContent className="pt-0">
              <ImageUpload value={flyerImageUrl} onChange={setFlyerImageUrl} />
            </CardContent>
          </Card>
        </>
      )}

      {stepKey === "tickets" && (
        <Card>
          <CardHeader className="flex-col items-start gap-1">
            <CardTitle>Tickets</CardTitle>
            <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
              One ticket template for every weekday you picked. Custom is only after a later one-date edit.
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            <RecurringTierEditor tiers={tiers} onChange={setTiers} />
            {errors.tickets && <p className="mt-2 text-xs text-red-600">{errors.tickets}</p>}
          </CardContent>
        </Card>
      )}

      {stepKey === "more" && (
        <Card>
          <CardHeader className="flex-col items-start gap-1">
            <CardTitle>Promoter program</CardTitle>
            <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
              Promoters share each night&apos;s link and earn this on every sale. Escrow hosts can turn this on.
            </p>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <label className={cn("flex items-center gap-2", promoDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer")}>
              <input
                type="checkbox"
                checked={promotionEnabled && !promoDisabled}
                disabled={promoDisabled}
                onChange={(e) => setPromotionEnabled(e.target.checked)}
                className="size-4 rounded border-neutral-300 text-[#05EB54] focus:ring-[#05EB54]"
              />
              <span className="text-sm text-neutral-700 dark:text-neutral-300">Enable promoter program</span>
            </label>
            {promoDisabled && (
              <p className="text-xs text-amber-600">Add a paid ticket to enable the promoter program.</p>
            )}
            {promotionEnabled && !promoDisabled && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-4">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input type="radio" checked={commissionType === "percent"} onChange={() => { setCommissionType("percent"); setPromotionValueInput("") }} className="text-[#05EB54]" />
                    <span className="text-sm">Percent</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input type="radio" checked={commissionType === "fixed"} onChange={() => { setCommissionType("fixed"); setPromotionValueInput("") }} className="text-[#05EB54]" />
                    <span className="text-sm">Fixed</span>
                  </label>
                </div>
                <div>
                  <Label htmlFor="rc_promo" className="mb-1.5 block">{commissionType === "percent" ? "Percent" : "Amount ($)"}</Label>
                  <Input
                    id="rc_promo"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    className="w-40"
                    value={promotionValueInput}
                    onChange={(e) => setPromotionValueInput(e.target.value)}
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

      {stepKey === "review" && (
        <>
          <Card>
            <CardHeader><CardTitle>Review</CardTitle></CardHeader>
            <CardContent className="pt-0">
              <dl className="divide-y divide-neutral-200 dark:divide-neutral-800">
                <ReviewRow label="Name" value={seed.name || "-"} />
                <ReviewRow label="Repeats" value={scheduleSentence(daysOfWeek) || "-"} />
                <ReviewRow label="Hours" value={`${fmtTimeOfDay(startTime)} - ${fmtTimeOfDay(endTime)}`} />
                <ReviewRow label="Where" value={[seed.venue_name, seed.venue_address].filter(Boolean).join(" · ") || "-"} />
                <ReviewRow label="Type" value={seed.type} />
                {seed.is_21_plus && <ReviewRow label="Age" value="21+" />}
                <ReviewRow label="Promoters" value={commissionSummary} />
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={notifyFollowers}
                  onChange={(e) => setNotifyFollowers(e.target.checked)}
                  className="size-4 rounded border-neutral-300 text-[#05EB54] focus:ring-[#05EB54]"
                />
                <span className="text-sm text-neutral-700 dark:text-neutral-300">Announce to venue followers</span>
              </label>
              <p className="mt-3 text-[13px] text-neutral-500">
                This publishes a green recurring event. Upcoming series nights show for today plus two weeks. Custom chips stay off until a later one-date edit.
              </p>
            </CardContent>
          </Card>
        </>
      )}

      {serverError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
          {serverError}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="secondary" size="lg" asChild>
          <Link href="/business/events">Cancel</Link>
        </Button>
        {step < STEPS.length - 1 ? (
          <Button type="button" size="lg" onClick={goNext}>Continue</Button>
        ) : (
          <Button type="button" size="lg" disabled={submitting} onClick={handlePublish}>
            {submitting && <Loader2 className="animate-spin" />}
            Publish event
          </Button>
        )}
      </div>
    </div>
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
