"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2 } from "lucide-react"
import { apiClient, ApiError } from "@/lib/business/api-client"
import { useVenue } from "@/lib/business/venue-context"
import { cn } from "@/lib/v2/utils"
import type {
  RecurringGenerationSummary,
  RecurringOccurrence,
  RecurringRestampSummary,
  RecurringSeriesDetail,
  RecurringTemplateTicket,
} from "@/lib/business/types"
import { Button } from "@/components/business/v2/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/business/v2/ui/card"
import { DateField, TimeField } from "@/components/business/v2/ui/date-time-field"
import { Input, Textarea, Select } from "@/components/business/v2/ui/input"
import { Label } from "@/components/business/v2/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
} from "@/components/business/v2/ui/dialog"
import { promoterToggleDisabled } from "@/lib/business/create-publish"
import {
  commissionValueToInput, commissionInputToStored,
  lowstockValueToInput, lowstockInputToStored,
} from "@/components/business/v2/events/EventForm"
import { ImageUpload } from "@/components/business/v2/events/ImageUpload"
import { ISO_DAYS, upcomingScheduleDates, fmtDateOnlyLong } from "./schedule"
import { RestampReport } from "./RestampReport"
import { RecurringTierEditor, EMPTY_RECURRING_TIER, type RecurringTierRow, tierRowsToTemplate, templateToTierRows } from "./RecurringTierEditor"

const NAME_MAX_LENGTH = 100

/** Stashes the create-time generation result for the detail page to surface. */
export function stashCreationReport(seriesId: number, generation: RecurringGenerationSummary | null, error: string | null) {
  try {
    sessionStorage.setItem(`bizzy:series-created:${seriesId}`, JSON.stringify({ generation, error }))
  } catch { /* storage unavailable — the detail page just shows no banner */ }
}

interface SeriesFormProps {
  mode: "create" | "edit"
  seriesId?: number
  initialData?: RecurringSeriesDetail
  /** Pre-save occurrences (edit mode) — lets the post-save report label nights by date. */
  occurrences?: RecurringOccurrence[]
  stripeOnboarded?: boolean
  /** Business is pending approval — affects copy and behavior. */
  isPending?: boolean
}

export function SeriesForm({ mode, seriesId, initialData, occurrences = [], stripeOnboarded = true, isPending = false }: SeriesFormProps) {
  const router = useRouter()
  const isEdit = mode === "edit"
  const { venues, selectedVenue, setSelectedVenue } = useVenue()
  const backHref = isEdit && seriesId ? `/business/recurring/${seriesId}` : "/business/recurring"

  const todayStr = new Date().toLocaleDateString("en-CA")

  const [name, setName] = useState(initialData?.name ?? "")
  const [description, setDescription] = useState(initialData?.description ?? "")
  const [type, setType] = useState<"Ticketed" | "Free">(initialData?.type === "Free" ? "Free" : "Ticketed")
  const [is21Plus, setIs21Plus] = useState(!!initialData?.is_21_plus)

  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(initialData?.days_of_week ?? [])
  const [dateRangeStart, setDateRangeStart] = useState((initialData?.date_range_start ?? todayStr).slice(0, 10))
  const [dateRangeEnd, setDateRangeEnd] = useState(initialData?.date_range_end?.slice(0, 10) ?? "")
  const [startTime, setStartTime] = useState(initialData?.start_time?.slice(0, 5) ?? "21:00")
  const [endTime, setEndTime] = useState(initialData?.end_time?.slice(0, 5) ?? "02:00")

  const [venueId, setVenueId] = useState<number | null>(initialData?.venue_id ?? null)
  const [venueName, setVenueName] = useState(initialData?.venue_name ?? "")
  const [venueAddress, setVenueAddress] = useState(initialData?.venue_address ?? "")

  const [flyerImageUrl, setFlyerImageUrl] = useState(initialData?.flyer_image_url ?? "")

  const [tiers, setTiers] = useState<RecurringTierRow[]>(() =>
    initialData?.template_tickets?.length
      ? templateToTierRows(initialData.template_tickets)
      : [{ ...EMPTY_RECURRING_TIER, name: "General Admission" }]
  )

  const [promotionEnabled, setPromotionEnabled] = useState(!!initialData?.promotion_enabled)
  const [commissionType, setCommissionType] = useState<"percent" | "fixed">(initialData?.promotion_commission_type ?? "percent")
  const [promotionValueInput, setPromotionValueInput] = useState<string>(
    commissionValueToInput(initialData?.promotion_commission_type ?? "percent", initialData?.promotion_commission_value)
  )

  const [notifyFollowers, setNotifyFollowers] = useState(!!initialData?.notify_followers_on_publish)

  const [lowstockEnabled, setLowstockEnabled] = useState(!!initialData?.lowstock_alerts_enabled)
  const [lowstockType, setLowstockType] = useState<"percent" | "count">(initialData?.lowstock_threshold_type ?? "percent")
  const [lowstockValueInput, setLowstockValueInput] = useState<string>(lowstockValueToInput(initialData?.lowstock_threshold_value))
  const [lowstockNotifyTeam, setLowstockNotifyTeam] = useState(!!initialData?.lowstock_notify_business_team)

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState("")
  const [loading, setLoading] = useState(false)

  // Post-save report (edit mode). While open, the save is already done —
  // closing it always lands back on the series page.
  const [saveReport, setSaveReport] = useState<{
    restamp: RecurringRestampSummary | null
    restampError: string | null
    generation: RecurringGenerationSummary | null
  } | null>(null)

  // Create: default the venue to the globally-selected one, like EventForm.
  useEffect(() => {
    if (!isEdit && selectedVenue && venueId == null) {
      setVenueId(selectedVenue.id)
      setVenueName(selectedVenue.name)
      setVenueAddress(selectedVenue.address || "")
    }
  }, [selectedVenue, isEdit, venueId])

  const currentVenue = venues.find((v) => v.id === venueId) ?? null

  const toggleDay = (day: number) => {
    setErrors((prev) => ({ ...prev, days_of_week: "" }))
    setDaysOfWeek((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)))
  }

  const previewDates = useMemo(
    () => upcomingScheduleDates(daysOfWeek, dateRangeStart || undefined, dateRangeEnd || undefined, 4),
    [daysOfWeek, dateRangeStart, dateRangeEnd]
  )

  const hasPaidTicket = type === "Ticketed" && tiers.some((t) => (parseFloat(t.priceInput) || 0) > 0)
  const promoToggleDisabled = promoterToggleDisabled(hasPaidTicket)
  const promoDisabledReason = promoToggleDisabled
    ? "Add a paid ticket to enable the promoter program."
    : ""

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = "Series name is required"
    if (daysOfWeek.length === 0) errs.days_of_week = "Pick at least one night of the week"
    if (!dateRangeStart) errs.date_range_start = "Start date is required"
    if (dateRangeEnd && dateRangeStart && dateRangeEnd < dateRangeStart) {
      errs.date_range_end = "End date must be on or after the start date"
    }
    if (!startTime) errs.start_time = "Start time is required"
    if (!endTime) errs.end_time = "End time is required"
    if (!isEdit && !venueId) errs.venue_name = "Please select a venue before creating a series"
    else if (!venueName.trim()) errs.venue_name = "Location name is required"
    if (type === "Ticketed") {
      if (tiers.length === 0) errs.tickets = "At least one ticket tier is required"
      for (const tier of tiers) {
        if (!tier.name.trim()) {
          errs.tickets = "All ticket tiers must have a name"
          break
        }
        if (tier.valid_from_time && tier.valid_until_time) {
          const from = tier.valid_from_day_offset * 1440 + toMinutes(tier.valid_from_time)
          const until = tier.valid_until_day_offset * 1440 + toMinutes(tier.valid_until_time)
          if (from >= until) {
            errs.tickets = `"${tier.name}": the scan window must end after it starts (tip: a window past midnight ends next morning)`
            break
          }
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

  const buildPayload = (): Record<string, unknown> => {
    const payload: Record<string, unknown> = {
      name: name.trim(),
      description: description.trim() || null,
      days_of_week: daysOfWeek,
      date_range_start: dateRangeStart,
      date_range_end: dateRangeEnd || null,
      start_time: startTime,
      end_time: endTime,
      venue_id: venueId,
      venue_name: venueName,
      venue_address: venueAddress,
      type,
      is_21_plus: is21Plus,
      flyer_image_url: flyerImageUrl || null,
      template_tickets: type === "Ticketed" ? tierRowsToTemplate(tiers) : [],
      notify_followers_on_publish: notifyFollowers,
    }

    if (promotionEnabled && !promoToggleDisabled) {
      const { value } = commissionInputToStored(commissionType, promotionValueInput)
      payload.promotion_enabled = true
      payload.promotion_commission_type = commissionType
      payload.promotion_commission_value = value
    } else {
      payload.promotion_enabled = false
    }

    if (type === "Ticketed") {
      payload.lowstock_alerts_enabled = lowstockEnabled
      payload.lowstock_notify_business_team = lowstockNotifyTeam
      if (lowstockEnabled) {
        const { value: lowstockValue } = lowstockInputToStored(lowstockType, lowstockValueInput)
        if (lowstockValue != null) {
          payload.lowstock_threshold_type = lowstockType
          payload.lowstock_threshold_value = lowstockValue
        } else {
          // Explicit null so an edit that BLANKS the threshold clears it —
          // the series update applies only the keys present in the payload.
          payload.lowstock_threshold_value = null
        }
      }
    } else {
      payload.lowstock_alerts_enabled = false
    }

    return payload
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    setServerError("")
    try {
      const payload = buildPayload()
      if (isEdit && seriesId) {
        const data = await apiClient.put<{
          series: RecurringSeriesDetail
          restamp: RecurringRestampSummary | null
          restamp_error: string | null
        }>(`/business/recurring-series/${seriesId}`, payload)

        // Best-effort top-up so nights ADDED by this edit (new weekday, longer
        // range) appear right away instead of waiting for the nightly run.
        // Idempotent core-side; a failure only means the report omits them.
        let generation: RecurringGenerationSummary | null = null
        if (!data.restamp_error) {
          try {
            const g = await apiClient.post<{ generation: RecurringGenerationSummary }>(
              `/business/recurring-series/${seriesId}/generate-now`
            )
            generation = g.generation
          } catch { /* nightly top-up will cover it */ }
        }

        setSaveReport({ restamp: data.restamp, restampError: data.restamp_error, generation })
      } else {
        const data = await apiClient.post<{
          series: RecurringSeriesDetail
          generation: RecurringGenerationSummary | null
          generation_error: string | null
        }>("/business/recurring-series", payload)
        stashCreationReport(data.series.id, data.generation, data.generation_error)
        router.push(`/business/recurring/${data.series.id}`)
      }
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const dateByEventId = useMemo(() => {
    const map: Record<number, string> = {}
    for (const o of occurrences) map[o.event_id] = fmtDateOnlyLong(o.occurrence_date)
    return map
  }, [occurrences])

  const errClass = "border-red-400 focus-visible:border-red-500 focus-visible:ring-red-500/30"

  return (
    <form onSubmit={handleSubmit} className="flex max-w-3xl flex-col gap-5">
      <Link
        href={backHref}
        className="inline-flex w-fit items-center gap-1.5 text-[13px] font-medium text-neutral-500 dark:text-neutral-400 transition-colors hover:text-neutral-900 dark:hover:text-neutral-100"
      >
        <ArrowLeft className="size-3.5" /> {isEdit ? "Back to series" : "Back to recurring"}
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
          {isEdit ? "Edit the series" : "Create a recurring series"}
        </h1>
        <p className="mt-1 text-[15px] text-neutral-600 dark:text-neutral-400">
          {isEdit
            ? "You're editing the whole series, not a single night."
            : "Set it up once. Every night becomes its own event automatically."}
        </p>
      </div>

      {/* Decision-2 explainer, plain language */}
      <div className="rounded-xl border border-blue-100 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 px-4 py-3 text-sm text-blue-700 dark:text-blue-400">
        {isEdit ? (
          <p>
            Changes here apply to <strong>future nights that haven&apos;t been customized</strong>. Nights you&apos;ve
            edited individually keep their changes. To change just one night, open that night from the series page instead.
          </p>
        ) : (
          <p>
            Think of this as a template: we&apos;ll create each night as a normal event on your schedule. You can
            still edit or cancel any single night later without touching the rest.
          </p>
        )}
      </div>

      {/* Schedule */}
      <Card>
        <CardHeader><CardTitle>Schedule</CardTitle></CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div>
            <Label className="mb-1.5 block">Nights it runs</Label>
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
                        : "border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400 dark:hover:border-neutral-600"
                    )}
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
              <Label htmlFor="date_range_start" className="mb-1.5 block">First night on or after</Label>
              <DateField
                id="date_range_start"
                value={dateRangeStart}
                onChange={(next) => { setDateRangeStart(next); setErrors((p) => ({ ...p, date_range_start: "" })) }}
              />
              {errors.date_range_start && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.date_range_start}</p>}
            </div>
            <div>
              <Label htmlFor="date_range_end" className="mb-1.5 block">
                Runs until <span className="font-normal text-neutral-400 dark:text-neutral-500">(optional. Leave blank to run until you suspend it)</span>
              </Label>
              <DateField
                id="date_range_end"
                value={dateRangeEnd}
                onChange={(next) => { setDateRangeEnd(next); setErrors((p) => ({ ...p, date_range_end: "" })) }}
              />
              {errors.date_range_end && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.date_range_end}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="start_time" className="mb-1.5 block">Starts at</Label>
              <TimeField
                id="start_time"
                value={startTime}
                onChange={(next) => { setStartTime(next); setErrors((p) => ({ ...p, start_time: "" })) }}
              />
              {errors.start_time && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.start_time}</p>}
            </div>
            <div>
              <Label htmlFor="end_time" className="mb-1.5 block">Ends at</Label>
              <TimeField
                id="end_time"
                value={endTime}
                onChange={(next) => { setEndTime(next); setErrors((p) => ({ ...p, end_time: "" })) }}
              />
              {errors.end_time && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.end_time}</p>}
              <p className="mt-1 text-[11px] text-neutral-400 dark:text-neutral-500">
                Ends past midnight? No problem. It rolls into the next morning.
              </p>
            </div>
          </div>

          {/* Live preview of the next nights this schedule produces */}
          <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/50 px-4 py-3">
            {daysOfWeek.length === 0 ? (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Pick your nights above to preview the schedule.</p>
            ) : (
              <>
                <p className="mb-1 text-sm font-medium text-neutral-900 dark:text-neutral-100">Next nights</p>
                {previewDates.length === 0 ? (
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">No upcoming nights match this schedule. Check the dates above.</p>
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

      {/* Basics */}
      <Card>
        <CardHeader><CardTitle>Basics</CardTitle></CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div>
            <Label htmlFor="series_name" className="mb-1.5 block">Event name</Label>
            <Input
              id="series_name"
              value={name}
              onChange={(e) => { setName(e.target.value.slice(0, NAME_MAX_LENGTH)); setErrors((p) => ({ ...p, name: "" })) }}
              placeholder="e.g. Trivia Tuesdays"
              maxLength={NAME_MAX_LENGTH}
              className={cn(errors.name && errClass)}
            />
            {errors.name && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.name}</p>}
            <p className="mt-1 text-[11px] text-neutral-400 dark:text-neutral-500">Every night is created with this name.</p>
          </div>
          <div>
            <Label htmlFor="series_description" className="mb-1.5 block">Description</Label>
            <Textarea
              id="series_description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Tell people about it…"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="series_type" className="mb-1.5 block">Event type</Label>
              <Select id="series_type" value={type} onChange={(e) => setType(e.target.value as "Ticketed" | "Free")}>
                <option value="Ticketed">Ticketed</option>
                <option value="Free">Free</option>
              </Select>
              {type === "Ticketed" && hasPaidTicket && !stripeOnboarded && !isPending && (
                <div className="mt-1.5">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                    Connect Stripe to receive payments instantly
                  </p>
                  <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-400">
                    You can still publish paid events without it. We hold what you earn until you connect, then we send it all right away.
                  </p>
                </div>
              )}
            </div>
            <div className="flex items-end pb-2">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={is21Plus}
                  onChange={(e) => setIs21Plus(e.target.checked)}
                  className="size-4 rounded border-neutral-300 dark:border-neutral-700 text-[#05EB54] focus:ring-[#05EB54]"
                />
                <span className="text-sm text-neutral-700 dark:text-neutral-300">21+ only</span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Location */}
      <Card>
        <CardHeader><CardTitle>Location</CardTitle></CardHeader>
        <CardContent className="space-y-4 pt-0">
          {venues.length > 0 && (
            <div>
              <Label htmlFor="series_venue" className="mb-1.5 block">Venue</Label>
              <Select
                id="series_venue"
                value={venueId ?? ""}
                onChange={(e) => {
                  const id = Number(e.target.value)
                  if (!id) return
                  const v = venues.find((vv) => vv.id === id)
                  setVenueId(id)
                  setVenueName(v?.name ?? venueName)
                  setVenueAddress(v?.address ?? venueAddress)
                  if (!isEdit) setSelectedVenue(id)
                  setErrors((p) => ({ ...p, venue_name: "" }))
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
            <Label htmlFor="series_venue_name" className="mb-1.5 block">Location name</Label>
            <Input
              id="series_venue_name"
              value={venueName}
              onChange={(e) => { setVenueName(e.target.value); setErrors((p) => ({ ...p, venue_name: "" })) }}
              placeholder="e.g. The Main Stage"
              disabled={!!currentVenue}
            />
            {!currentVenue && errors.venue_name && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.venue_name}</p>}
          </div>
          <div>
            <Label htmlFor="series_venue_address" className="mb-1.5 block">Address</Label>
            <Input
              id="series_venue_address"
              value={venueAddress}
              onChange={(e) => setVenueAddress(e.target.value)}
              placeholder="Street address"
              disabled={!!currentVenue}
            />
          </div>
        </CardContent>
      </Card>

      {/* Flyer */}
      <Card>
        <CardHeader><CardTitle>Flyer image</CardTitle></CardHeader>
        <CardContent className="pt-0">
          <ImageUpload value={flyerImageUrl} onChange={setFlyerImageUrl} />
        </CardContent>
      </Card>

      {/* Tickets */}
      {type === "Ticketed" && (
        <Card>
          <CardHeader className="flex-col items-start gap-1">
            <CardTitle>Tickets</CardTitle>
            <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
              Every night gets a fresh set of these tickets.
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            <RecurringTierEditor tiers={tiers} onChange={(t) => { setTiers(t); setErrors((p) => ({ ...p, tickets: "" })) }} />
            {errors.tickets && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{errors.tickets}</p>}
          </CardContent>
        </Card>
      )}

      {/* Notify followers */}
      <Card>
        <CardHeader className="flex-col items-start gap-1">
          <CardTitle>Notify followers</CardTitle>
          <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
            The notify setting is saved onto each night. Automatic weekly pushes are off for now. You can announce any
            night from its event page.
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={notifyFollowers}
              onChange={(e) => setNotifyFollowers(e.target.checked)}
              className="size-4 rounded border-neutral-300 dark:border-neutral-700 text-[#05EB54] focus:ring-[#05EB54]"
            />
            <span className="text-sm text-neutral-700 dark:text-neutral-300">Announce to venue followers</span>
          </label>
        </CardContent>
      </Card>

      {/* Promoter program */}
      {type === "Ticketed" && (
        <Card>
          <CardHeader className="flex-col items-start gap-1">
            <CardTitle>Promoter program</CardTitle>
            <p className="text-[13px] text-neutral-500 dark:text-neutral-400">Promoters share each night&apos;s link and earn this on every sale.</p>
          </CardHeader>
          <CardContent className="pt-0">
            <label
              className={cn("flex items-center gap-2", promoToggleDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer")}
              title={promoToggleDisabled ? promoDisabledReason : undefined}
            >
              <input
                type="checkbox"
                checked={promotionEnabled}
                disabled={promoToggleDisabled}
                onChange={(e) => { setPromotionEnabled(e.target.checked); setErrors((p) => ({ ...p, promotion_commission_value: "" })) }}
                className="size-4 rounded border-neutral-300 dark:border-neutral-700 text-[#05EB54] focus:ring-[#05EB54]"
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
                        name="series_commission_type"
                        checked={commissionType === "percent"}
                        onChange={() => { setCommissionType("percent"); setPromotionValueInput(""); setErrors((p) => ({ ...p, promotion_commission_value: "" })) }}
                        className="text-[#05EB54] focus:ring-[#05EB54]"
                      />
                      <span className="text-sm text-neutral-700 dark:text-neutral-300">Percent of ticket price</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="series_commission_type"
                        checked={commissionType === "fixed"}
                        onChange={() => { setCommissionType("fixed"); setPromotionValueInput(""); setErrors((p) => ({ ...p, promotion_commission_value: "" })) }}
                        className="text-[#05EB54] focus:ring-[#05EB54]"
                      />
                      <span className="text-sm text-neutral-700 dark:text-neutral-300">Fixed amount per ticket</span>
                    </label>
                  </div>
                </div>
                <div>
                  <Label htmlFor="series_commission_value" className="mb-1.5 block">
                    Commission {commissionType === "percent" ? "(%)" : "($)"}
                  </Label>
                  <Input
                    id="series_commission_value"
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
      )}

      {/* Stock alerts */}
      {type === "Ticketed" && (
        <Card>
          <CardHeader className="flex-col items-start gap-1">
            <CardTitle>Stock alerts</CardTitle>
            <p className="text-[13px] text-neutral-500 dark:text-neutral-400">Get notified when a night&apos;s ticket tier sells out, and optionally before it does.</p>
          </CardHeader>
          <CardContent className="pt-0">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={lowstockEnabled}
                onChange={(e) => { setLowstockEnabled(e.target.checked); setErrors((p) => ({ ...p, lowstock_threshold_value: "" })) }}
                className="size-4 rounded border-neutral-300 dark:border-neutral-700 text-[#05EB54] focus:ring-[#05EB54]"
              />
              <span className="text-sm text-neutral-700 dark:text-neutral-300">Notify me when a ticket tier sells out</span>
            </label>

            {lowstockEnabled && (
              <div className="mt-4 space-y-3">
                <div>
                  <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Also warn me when it&apos;s running low</p>
                  <p className="text-[13px] text-neutral-500 dark:text-neutral-400">Optional. Leave blank to only be notified on sell-out.</p>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="series_lowstock_type" className="mb-1.5 block">Warn on</Label>
                    <Select
                      id="series_lowstock_type"
                      value={lowstockType}
                      onChange={(e) => { setLowstockType(e.target.value as "percent" | "count"); setErrors((p) => ({ ...p, lowstock_threshold_value: "" })) }}
                    >
                      <option value="percent">Percent left</option>
                      <option value="count">Tickets left</option>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="series_lowstock_value" className="mb-1.5 block">
                      Threshold {lowstockType === "percent" ? "(%)" : "(tickets)"}
                    </Label>
                    <Input
                      id="series_lowstock_value"
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
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={lowstockNotifyTeam}
                    onChange={(e) => setLowstockNotifyTeam(e.target.checked)}
                    className="size-4 rounded border-neutral-300 dark:border-neutral-700 text-[#05EB54] focus:ring-[#05EB54]"
                  />
                  <span className="text-sm text-neutral-700 dark:text-neutral-300">Also notify business team</span>
                </label>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {serverError && (
        <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {serverError}
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        <Button variant="secondary" size="lg" asChild>
          <Link href={backHref}>Cancel</Link>
        </Button>
        <Button type="submit" size="lg" disabled={loading}>
          {loading && <Loader2 className="animate-spin" />}
          {isEdit ? "Save the series" : "Create series"}
        </Button>
      </div>

      {/* Post-save report (edit): the save already happened — this explains
          exactly what it did to the scheduled nights, incl. pattern shrink. */}
      <Dialog open={!!saveReport} onOpenChange={(o) => { if (!o) router.push(backHref) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>What this changed</DialogTitle>
            <DialogDescription>Here&apos;s what happened to your scheduled nights.</DialogDescription>
          </DialogHeader>
          {saveReport && (
            <RestampReport
              restamp={saveReport.restamp}
              restampError={saveReport.restampError}
              generation={saveReport.generation}
              dateByEventId={dateByEventId}
            />
          )}
          <DialogFooter>
            <Button variant="primary" onClick={() => router.push(backHref)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  )
}

function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number)
  return h * 60 + (m || 0)
}
