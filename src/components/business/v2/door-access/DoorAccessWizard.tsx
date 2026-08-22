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
  WEEKLY_ACCESS_CREATION_LABEL,
  fmtTime,
  formatDays,
  programHref,
  redemptionModeLabel,
  usdPrice,
  type DoorAccessProgram,
  type RedemptionMode,
} from "@/lib/business/door-access"
import { applySaveAsDraftFlag, promoterToggleDisabled, willDraftOnCreate } from "@/lib/business/create-publish"
import { Button } from "@/components/business/v2/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/business/v2/ui/card"
import { Input, Textarea, Select } from "@/components/business/v2/ui/input"
import { Label } from "@/components/business/v2/ui/label"
import { EventStepNav } from "@/components/business/v2/events/EventStepNav"
import { ImageUpload } from "@/components/business/v2/events/ImageUpload"
import { commissionInputToStored, lowstockInputToStored } from "@/components/business/v2/events/EventForm"
import { ISO_DAYS, upcomingScheduleDates, scheduleSentence } from "@/components/business/v2/recurring/schedule"
import {
  RecurringTierEditor,
  EMPTY_RECURRING_TIER,
  tierRowsToTemplate,
  type RecurringTierRow,
} from "@/components/business/v2/recurring/RecurringTierEditor"

/**
 * D2-A — the Door Access CREATION wizard, the thing DASH-A left out.
 *
 * Runs the same three-step spine as the event path (F10: Details → Access &
 * pricing → Review) against the SPINE's create endpoints, so the two products
 * feel like one flow with a fork rather than two dashboards:
 *
 *   POST /business/door-access/validate-step   step 1 + step 2 pre-flight
 *   POST /business/door-access                 the whole draft, committed once
 *
 * The pre-flight matters: `validate-step` runs the EXACT rules the create path
 * will run, so "Next" is authoritative instead of a client-side guess the
 * server contradicts two screens later. Client validation still runs first —
 * it's the fast, per-field half; the server's is the true one.
 *
 * WHAT THIS SCREEN DOES NOT DO. Creation sets the TEMPLATE only. Per-night
 * overrides (a holiday price, a closed Tuesday) live on the series page at
 * /business/door-access/:id, keyed off the date — deliberately not duplicated
 * here, where there are no nights to override yet.
 *
 * D-F10.4: Publish is the default CTA and POSTs live. Save as draft is the
 * only path that sends `save_as_draft: true`. Stripe Connect is not a draft
 * reason — approved hosts publish even without it.
 *
 * ROUTING INDEPENDENCE (D2-6): nothing here reads or requires a "Door Access"
 * nav entry. This page is reached from the create funnel and from Events rows,
 * and it keeps working when D2-B deletes the sidebar item.
 */

const NAME_MAX_LENGTH = 100

const DOOR_ACCESS_STEPS = [
  { key: "details", label: "Details" },
  { key: "access", label: "Access & pricing" },
  { key: "review", label: "Review" },
] as const

interface CreateResponse {
  program: DoorAccessProgram & { id: number }
  generation: unknown | null
  generation_error: string | null
}

/**
 * V5 REDEMPTION — what a Door Access program's door ALWAYS does.
 *
 * Module scope, not state: it is a property of the product, not a field of this
 * form. Kept only so the Review step can SHOW the host what their door will do —
 * the value is derived server-side and this wizard no longer sends one.
 */
const DOOR_ACCESS_REDEMPTION_MODE: RedemptionMode = "camera_tap"

export function DoorAccessWizard({ stripeOnboarded = true, isPending = false }: { stripeOnboarded?: boolean; isPending?: boolean }) {
  const router = useRouter()
  const { venues, selectedVenue, setSelectedVenue } = useVenue()

  const todayStr = new Date().toLocaleDateString("en-CA")

  const [step, setStep] = useState(0)
  const [furthest, setFurthest] = useState(0)

  // ── Step 1: details ──────────────────────────────────────────────────────
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [venueId, setVenueId] = useState<number | null>(null)
  const [venueName, setVenueName] = useState("")
  const [venueAddress, setVenueAddress] = useState("")
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([])
  const [dateRangeStart, setDateRangeStart] = useState(todayStr)
  const [dateRangeEnd, setDateRangeEnd] = useState("")
  const [startTime, setStartTime] = useState("21:00")
  const [endTime, setEndTime] = useState("02:00")
  const [is21Plus, setIs21Plus] = useState(false)
  const [flyerImageUrl, setFlyerImageUrl] = useState("")

  // ── Step 2: access & pricing ─────────────────────────────────────────────
  const [tiers, setTiers] = useState<RecurringTierRow[]>([
    { ...EMPTY_RECURRING_TIER, name: "Cover" },
  ])
  const [notifyFollowers, setNotifyFollowers] = useState(false)
  const [promotionEnabled, setPromotionEnabled] = useState(false)
  const [commissionType, setCommissionType] = useState<"percent" | "fixed">("percent")
  const [promotionValueInput, setPromotionValueInput] = useState("")
  const [lowstockEnabled, setLowstockEnabled] = useState(false)
  const [lowstockType, setLowstockType] = useState<"percent" | "count">("percent")
  const [lowstockValueInput, setLowstockValueInput] = useState("")
  const [lowstockNotifyTeam, setLowstockNotifyTeam] = useState(false)

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState("")
  const [checking, setChecking] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // A create that landed but whose first generation didn't. The program EXISTS
  // — navigating away silently would leave the host wondering where tonight
  // went, so the outcome is stated and they choose when to move on.
  const [generationNotice, setGenerationNotice] = useState<{ id: number; message: string } | null>(null)

  // Default to the globally-selected venue, like EventForm and SeriesForm.
  useEffect(() => {
    if (selectedVenue && venueId == null) {
      setVenueId(selectedVenue.id)
      setVenueName(selectedVenue.name)
      setVenueAddress(selectedVenue.address || "")
    }
  }, [selectedVenue, venueId])

  const currentVenue = venues.find((v) => v.id === venueId) ?? null

  const previewDates = useMemo(
    () => upcomingScheduleDates(daysOfWeek, dateRangeStart || undefined, dateRangeEnd || undefined, 4),
    [daysOfWeek, dateRangeStart, dateRangeEnd]
  )

  const templateTiers = useMemo(() => tierRowsToTemplate(tiers), [tiers])
  const paidTiers = templateTiers.filter((t) => (t.price_usd ?? 0) > 0)
  const hasPaidTier = paidTiers.length > 0

  const promoToggleDisabled = promoterToggleDisabled(hasPaidTier)
  const promoDisabledReason = promoToggleDisabled
    ? "Add a paid access tier to enable the promoter program."
    : ""
  const willDraft = willDraftOnCreate(isPending)

  // Promotion is silently dropped rather than left dangling if the tiers stop
  // qualifying — the server would 400 on it, and the host has no way to see
  // why from step 3.
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
    const payload: Record<string, unknown> = {
      // `template_tickets` — the same field name the series template uses, so
      // one editor serves both. The server mints each tier_key.
      template_tickets: templateTiers,
      // V5 REDEMPTION — not sent: services derives camera_tap from the
      // program's kind and discards anything a client posts here.
      notify_followers_on_publish: notifyFollowers,
      promotion_enabled: false,
    }

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

  const validateAccess = (): boolean => {
    const errs: Record<string, string> = {}
    if (tiers.length === 0) errs.tiers = "Add at least one access tier"
    for (const tier of tiers) {
      if (!tier.name.trim()) {
        errs.tiers = "Every access tier needs a name"
        break
      }
      if (tier.valid_from_time && tier.valid_until_time) {
        const from = tier.valid_from_day_offset * 1440 + toMinutes(tier.valid_from_time)
        const until = tier.valid_until_day_offset * 1440 + toMinutes(tier.valid_until_time)
        if (from >= until) {
          errs.tiers = `"${tier.name}": the scan window must end after it starts (tip: a window past midnight ends on “the day after”)`
          break
        }
      }
    }
    if (promotionEnabled && !promoToggleDisabled) {
      const { error } = commissionInputToStored(commissionType, promotionValueInput)
      if (error) errs.promotion_commission_value = error
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
        ...(stepNumber === 1 ? detailsPayload() : salesPayload()),
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
    if (step === 0) {
      if (!validateDetails()) return
      if (!(await preflight(1))) return
      goTo(1)
    } else if (step === 1) {
      if (!validateAccess()) return
      if (!(await preflight(2))) return
      goTo(2)
    }
  }

  const handlePublish = async (saveAsDraft = false) => {
    setSubmitting(true)
    setServerError("")
    try {
      const data = await apiClient.post<CreateResponse>(
        "/business/door-access",
        applySaveAsDraftFlag({
          ...detailsPayload(),
          ...salesPayload(),
          flyer_image_url: flyerImageUrl || null,
        }, saveAsDraft),
      )
      const id = Number(data.program?.id)
      if (data.generation_error && !saveAsDraft) {
        setGenerationNotice({ id, message: data.generation_error })
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
    return (
      <div className="flex max-w-3xl flex-col gap-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
            Program created
          </h1>
          <p className="mt-1 text-[15px] text-neutral-600 dark:text-neutral-400">
            &ldquo;{name.trim()}&rdquo; is live and selling on {scheduleSentence(daysOfWeek).toLowerCase()}.
          </p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400">
          <p className="font-semibold">Tonight&apos;s nights aren&apos;t on the schedule yet</p>
          <p className="mt-0.5">{generationNotice.message}</p>
        </div>
        <div>
          <Button size="lg" onClick={() => router.push(programHref(generationNotice.id))}>
            Open the program
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <Link
        href="/business/create"
        className="inline-flex w-fit items-center gap-1.5 text-[13px] font-medium text-neutral-500 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
      >
        <ArrowLeft className="size-3.5" /> Back
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
          {WEEKLY_ACCESS_CREATION_LABEL}
        </h1>
        <p className="mt-1 text-[15px] text-neutral-600 dark:text-neutral-400">
          Set your nights and prices once — every night is created for you and sells ahead.
        </p>
      </div>

      <EventStepNav
        current={step}
        furthest={furthest}
        onJump={goTo}
        steps={DOOR_ACCESS_STEPS}
        accent={ACCESS_ACCENT}
      />

      {step === 0 && (
        <>
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
                  className="size-4 rounded border-neutral-300 text-[#05EB54] focus:ring-[#05EB54] dark:border-neutral-700"
                />
                <span className="text-sm text-neutral-700 dark:text-neutral-300">21+ only</span>
              </label>
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
              <CardTitle>The nights it runs</CardTitle>
              <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
                Pick the nights, and every one of them is created for you as its own night on the schedule.
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
                    Ends past midnight? No problem — it rolls into the next morning.
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
                        No upcoming nights match this schedule — check the dates above.
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
            <CardHeader className="flex-col items-start gap-1">
              <CardTitle>Flyer image</CardTitle>
              <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
                Optional — used on every night. Without one, the venue photo stands in.
              </p>
            </CardHeader>
            <CardContent className="pt-0">
              <ImageUpload value={flyerImageUrl} onChange={setFlyerImageUrl} />
            </CardContent>
          </Card>
        </>
      )}

      {step === 1 && (
        <>
          <Card>
            <CardHeader className="flex-col items-start gap-1">
              <CardTitle>Access tiers</CardTitle>
              <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
                Cover, line skip, VIP — price them all. Every night gets a fresh set of these, and the numbers here are
                per night. You can change one night&apos;s price later from the program page.
              </p>
            </CardHeader>
            <CardContent className="pt-0">
              <RecurringTierEditor
                tiers={tiers}
                onChange={(t) => { setTiers(t); setErrors((p) => ({ ...p, tiers: "" })) }}
              />
              {errors.tiers && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{errors.tiers}</p>}
              {hasPaidTier && !stripeOnboarded && !isPending && (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                    Connect Stripe to receive payments instantly
                  </p>
                  <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-400">
                    You can still publish paid events without it. We hold what you earn until you connect, then we send it all right away.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* V5 REDEMPTION — the check-in card is GONE from this wizard too, and
              here the question was even emptier than on the event form: this
              wizard builds Door Access and nothing else, and Door Access is sold
              on "no staff setup — scan with any phone camera". Offering "Bizzy
              scanner" let a host configure a program to demand tooling its own
              pitch says it doesn't need. The server now derives camera + tap from
              program_kind, so there is nothing left to ask. */}

          <Card>
            <CardHeader className="flex-col items-start gap-1">
              <CardTitle>Notify followers</CardTitle>
              <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
                Saved onto each night. You can announce any single night from its page.
              </p>
            </CardHeader>
            <CardContent className="pt-0">
              <label className="flex w-fit cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={notifyFollowers}
                  onChange={(e) => setNotifyFollowers(e.target.checked)}
                  className="size-4 rounded border-neutral-300 text-[#05EB54] focus:ring-[#05EB54] dark:border-neutral-700"
                />
                <span className="text-sm text-neutral-700 dark:text-neutral-300">Announce to venue followers</span>
              </label>
            </CardContent>
          </Card>

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
                  className="size-4 rounded border-neutral-300 text-[#05EB54] focus:ring-[#05EB54] dark:border-neutral-700"
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
                          className="text-[#05EB54] focus:ring-[#05EB54]"
                        />
                        <span className="text-sm text-neutral-700 dark:text-neutral-300">Percent of the pass price</span>
                      </label>
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="radio"
                          name="da_commission_type"
                          checked={commissionType === "fixed"}
                          onChange={() => { setCommissionType("fixed"); setPromotionValueInput(""); setErrors((p) => ({ ...p, promotion_commission_value: "" })) }}
                          className="text-[#05EB54] focus:ring-[#05EB54]"
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
                  className="size-4 rounded border-neutral-300 text-[#05EB54] focus:ring-[#05EB54] dark:border-neutral-700"
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
                      className="size-4 rounded border-neutral-300 text-[#05EB54] focus:ring-[#05EB54] dark:border-neutral-700"
                    />
                    <span className="text-sm text-neutral-700 dark:text-neutral-300">Also notify business team</span>
                  </label>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {step === 2 && (
        <>
          <Card>
            <CardHeader><CardTitle>Review</CardTitle></CardHeader>
            <CardContent className="space-y-3 pt-0">
              <ReviewRow label="Program" value={name.trim() || "—"} />
              <ReviewRow label="Venue" value={venueName.trim() || "—"} />
              <ReviewRow label="Nights" value={formatDays(daysOfWeek) || "—"} />
              <ReviewRow
                label="Runs"
                value={`${dateRangeStart || "—"} → ${dateRangeEnd || "no end date"}`}
              />
              <ReviewRow label="Door window" value={`${fmtTime(startTime)} – ${fmtTime(endTime)}`} />
              {/* Shown, not chosen — the host sees what their door will do. */}
              <ReviewRow label="Check-in" value={redemptionModeLabel(DOOR_ACCESS_REDEMPTION_MODE)} />
              <ReviewRow label="Age" value={is21Plus ? "21+ only" : "All ages"} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Access tiers</CardTitle></CardHeader>
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
              willDraft
                ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
                : undefined,
            )}
            style={willDraft ? undefined : { borderColor: `${ACCESS_ACCENT}59`, backgroundColor: `${ACCESS_ACCENT}0f` }}
          >
            <p className={cn("font-semibold", !willDraft && "text-neutral-900 dark:text-neutral-100")}>
              {willDraft ? "Your business is still in review" : "This goes live right away"}
            </p>
            <p className={cn("mt-0.5", willDraft ? undefined : "text-neutral-600 dark:text-neutral-400")}>
              {willDraft
                ? "Publishing may stay a draft until you're approved. You can also save as a draft on purpose."
                : "Each night is created on your schedule and starts selling. To change a single night's price or close one, open the program afterwards."}
            </p>
          </div>
        </>
      )}

      {serverError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
          {serverError}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        {step > 0 ? (
          <Button variant="secondary" size="lg" onClick={() => goTo(step - 1)} disabled={checking || submitting}>
            Back
          </Button>
        ) : (
          <Button variant="secondary" size="lg" asChild>
            <Link href="/business/create">Cancel</Link>
          </Button>
        )}

        {step < 2 ? (
          <Button size="lg" onClick={handleNext} disabled={checking}>
            {checking && <Loader2 className="animate-spin" />}
            Next
          </Button>
        ) : (
          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button variant="secondary" size="lg" onClick={() => handlePublish(true)} disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              Save as draft
            </Button>
            <Button size="lg" onClick={() => handlePublish(false)} disabled={submitting}>
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

function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number)
  return h * 60 + (m || 0)
}
