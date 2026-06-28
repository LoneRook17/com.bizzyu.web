"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2, TriangleAlert, X, CopyPlus, Plus } from "lucide-react"
import { apiClient, ApiError } from "@/lib/business/api-client"
import { useVenue } from "@/lib/business/venue-context"
import { cn } from "@/lib/v2/utils"
import type { BusinessProfile, LineSkipDetail } from "@/lib/business/types"
import { Button } from "@/components/business/v2/ui/button"
import { Card, CardContent } from "@/components/business/v2/ui/card"
import { Input, Textarea, Select } from "@/components/business/v2/ui/input"
import { Label } from "@/components/business/v2/ui/label"
import { Skeleton } from "@/components/business/v2/ui/skeleton"

// Mon-first display order; value is JS getDay() (0=Sun..6=Sat).
const DAYS = [
  { value: 1, label: "Mon", full: "Monday" },
  { value: 2, label: "Tue", full: "Tuesday" },
  { value: 3, label: "Wed", full: "Wednesday" },
  { value: 4, label: "Thu", full: "Thursday" },
  { value: 5, label: "Fri", full: "Friday" },
  { value: 6, label: "Sat", full: "Saturday" },
  { value: 0, label: "Sun", full: "Sunday" },
]
const ORDER = (d: number) => (d + 6) % 7 // Mon=0 .. Sun=6
const fullName = (d: number) => DAYS.find((x) => x.value === d)?.full ?? ""

// One editable night-of-the-week row. Values are kept as strings for the inputs.
interface DayRow {
  day: number
  priceDisplay: string
  start_time: string
  end_time: string
  capacity: string
}

const NEW_DAY_DEFAULTS = { priceDisplay: "15.00", start_time: "22:00", end_time: "02:00", capacity: "" }

/** Dates matching the selected days within a rolling 2-week window. */
function matchingDates(daysOfWeek: number[], start?: string, end?: string): string[] {
  if (daysOfWeek.length === 0) return []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let current: Date
  if (start) {
    const startDate = new Date(start + "T00:00:00")
    current = startDate > today ? new Date(startDate) : new Date(today)
  } else {
    current = new Date(today)
    current.setDate(current.getDate() + 1)
  }

  const twoWeeksOut = new Date()
  twoWeeksOut.setHours(0, 0, 0, 0)
  twoWeeksOut.setDate(twoWeeksOut.getDate() + 14)
  let effectiveEnd = twoWeeksOut
  if (end) {
    const endDate = new Date(end + "T00:00:00")
    if (endDate < twoWeeksOut) effectiveEnd = endDate
  }

  const dates: { label: string; day: number }[] = []
  while (current <= effectiveEnd) {
    if (daysOfWeek.includes(current.getDay())) {
      dates.push({
        label: current.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }),
        day: current.getDay(),
      })
    }
    current.setDate(current.getDate() + 1)
  }
  return dates.map((d) => d.label)
}

interface LineSkipFormProps {
  mode: "create" | "edit"
  lineSkipId?: number
}

export default function LineSkipForm({ mode, lineSkipId }: LineSkipFormProps) {
  const router = useRouter()
  const { venues, selectedVenue, setSelectedVenue } = useVenue()
  const isEdit = mode === "edit"

  // Single destination now: the line-skips calendar (no per-id detail page).
  const backHref = "/business/line-skips"

  const [profile, setProfile] = useState<BusinessProfile | null>(null)
  const [pageLoading, setPageLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState("")

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [dateRangeEnd, setDateRangeEnd] = useState("")
  const [days, setDays] = useState<DayRow[]>([])

  const [stripeConnecting, setStripeConnecting] = useState(false)
  const [stripeError, setStripeError] = useState<string | null>(null)

  // Load: edit → fetch existing; create → fetch profile (Stripe gate + name default)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (isEdit && lineSkipId) {
        try {
          const { line_skip } = await apiClient.get<{ line_skip: LineSkipDetail }>(
            `/business/line-skips/${lineSkipId}`
          )
          if (cancelled) return
          setName(line_skip.name)
          setDescription(line_skip.description || "")
          setDateRangeEnd(line_skip.date_range_end && line_skip.date_range_end < "2099-01-01" ? line_skip.date_range_end : "")

          // Build a row per selected day, preferring its per-day override and
          // falling back to the program defaults for days without one.
          const overrideByDay = new Map((line_skip.day_overrides ?? []).map((o) => [o.day_of_week, o]))
          const rows: DayRow[] = line_skip.days_of_week
            .slice()
            .sort((a, b) => ORDER(a) - ORDER(b))
            .map((day) => {
              const o = overrideByDay.get(day)
              return {
                day,
                priceDisplay: ((o?.price_cents ?? line_skip.default_price_cents) / 100).toFixed(2),
                start_time: (o?.start_time ?? line_skip.default_start_time).slice(0, 5),
                end_time: (o?.end_time ?? line_skip.default_end_time).slice(0, 5),
                capacity: (o?.capacity ?? line_skip.default_capacity)?.toString() ?? "",
              }
            })
          setDays(rows)
        } catch (err) {
          if (!cancelled) setServerError(err instanceof ApiError ? err.message : "Failed to load line skip")
        } finally {
          if (!cancelled) setPageLoading(false)
        }
      } else {
        try {
          const p = await apiClient.get<BusinessProfile>("/business/profile")
          if (cancelled) return
          setProfile(p)
          setName(`Skip the line at ${selectedVenue?.name || p.name}`)
        } catch {
          // non-critical
        } finally {
          if (!cancelled) setPageLoading(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, lineSkipId])

  // Keep create default name in sync with venue
  useEffect(() => {
    if (!isEdit && selectedVenue?.name) {
      setName(`Skip the line at ${selectedVenue.name}`)
    }
  }, [selectedVenue, isEdit])

  const selectedDays = useMemo(() => days.map((d) => d.day), [days])
  const previewDates = useMemo(() => matchingDates(selectedDays, undefined, dateRangeEnd || undefined), [selectedDays, dateRangeEnd])

  // Add/remove a night-of-the-week. New rows copy the last edited day's
  // settings so "all nights the same" stays one edit, while differing nights
  // are just a couple of taps.
  const toggleDay = (day: number) => {
    setErrors((prev) => ({ ...prev, days: "" }))
    setDays((prev) => {
      if (prev.some((d) => d.day === day)) {
        return prev.filter((d) => d.day !== day)
      }
      const template = prev.length ? prev[prev.length - 1] : null
      const row: DayRow = {
        day,
        priceDisplay: template?.priceDisplay || NEW_DAY_DEFAULTS.priceDisplay,
        start_time: template?.start_time || NEW_DAY_DEFAULTS.start_time,
        end_time: template?.end_time || NEW_DAY_DEFAULTS.end_time,
        capacity: template?.capacity ?? NEW_DAY_DEFAULTS.capacity,
      }
      return [...prev, row].sort((a, b) => ORDER(a.day) - ORDER(b.day))
    })
  }

  const updateDay = (day: number, patch: Partial<DayRow>) => {
    setDays((prev) => prev.map((d) => (d.day === day ? { ...d, ...patch } : d)))
    setServerError("")
  }

  const normalizePrice = (day: number) => {
    setDays((prev) =>
      prev.map((d) => {
        if (d.day !== day) return d
        const dollars = parseFloat(d.priceDisplay)
        return { ...d, priceDisplay: !isNaN(dollars) && dollars > 0 ? (Math.round(dollars * 100) / 100).toFixed(2) : "" }
      })
    )
  }

  // Copy one day's price/time/limit onto every other selected day.
  const applyToAll = (day: number) => {
    setDays((prev) => {
      const src = prev.find((d) => d.day === day)
      if (!src) return prev
      return prev.map((d) => (d.day === day ? d : { ...d, priceDisplay: src.priceDisplay, start_time: src.start_time, end_time: src.end_time, capacity: src.capacity }))
    })
  }

  const handleConnectStripe = async () => {
    setStripeConnecting(true)
    setStripeError(null)
    try {
      const data = await apiClient.post<{ url: string }>("/business/profile/stripe-onboard?platform=web")
      window.location.href = data.url
    } catch (err) {
      setStripeError(err instanceof Error ? err.message : "Failed to start Stripe onboarding")
      setStripeConnecting(false)
    }
  }

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (!isEdit && !selectedVenue) errs.venue = "Please select a venue"
    if (!name.trim()) errs.name = "Name is required"
    if (days.length === 0) errs.days = "Add at least one night"
    for (const d of days) {
      const dollars = parseFloat(d.priceDisplay)
      if (isNaN(dollars) || dollars <= 0) errs[`price_${d.day}`] = "Price must be greater than $0"
      if (!d.start_time) errs[`start_${d.day}`] = "Required"
      if (!d.end_time) errs[`end_${d.day}`] = "Required"
      if (d.capacity && parseInt(d.capacity) <= 0) errs[`cap_${d.day}`] = "Must be positive"
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    const sorted = days.slice().sort((a, b) => ORDER(a.day) - ORDER(b.day))
    const day_overrides = sorted.map((d) => ({
      day_of_week: d.day,
      start_time: d.start_time,
      end_time: d.end_time,
      price_cents: Math.round(parseFloat(d.priceDisplay) * 100),
      capacity: d.capacity ? parseInt(d.capacity) : null,
    }))
    // default_* representative = first (Mon-first) day; backend recomputes the
    // same value but the create endpoint requires these fields present.
    const rep = day_overrides[0]
    const todayStr = new Date().toLocaleDateString("en-CA")

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      days_of_week: sorted.map((d) => d.day),
      date_range_start: todayStr,
      date_range_end: dateRangeEnd || "2099-12-31",
      default_start_time: rep.start_time,
      default_end_time: rep.end_time,
      default_price_cents: rep.price_cents,
      default_capacity: rep.capacity,
      day_overrides,
      venue_id: selectedVenue?.id,
    }

    setLoading(true)
    setServerError("")
    try {
      if (isEdit && lineSkipId) {
        await apiClient.put(`/business/line-skips/${lineSkipId}`, payload)
      } else {
        await apiClient.post("/business/line-skips", payload)
      }
      router.push("/business/line-skips")
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Failed to save line skip")
    } finally {
      setLoading(false)
    }
  }

  const errClass = "border-red-400 focus-visible:border-red-500 focus-visible:ring-red-500/30"
  const allSame = days.length > 1 && days.every(
    (d) => d.priceDisplay === days[0].priceDisplay && d.start_time === days[0].start_time && d.end_time === days[0].end_time && d.capacity === days[0].capacity
  )

  if (pageLoading) {
    return (
      <>
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-96 max-w-2xl rounded-xl" />
      </>
    )
  }

  // Stripe Connect gate (create only)
  if (!isEdit && profile && !profile.stripe_connect_onboarded) {
    return (
      <div className="max-w-2xl">
        <Link href="/business/line-skips" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100">
          <ArrowLeft className="size-4" /> Back to line skips
        </Link>
        <Card className="mt-4 border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <TriangleAlert className="mt-0.5 size-6 shrink-0 text-amber-600 dark:text-amber-400" />
              <div>
                <h2 className="mb-1 text-lg font-semibold text-neutral-900 dark:text-neutral-100">Connect your Stripe account</h2>
                <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-400">
                  Line skips are paid products. You need to connect your Stripe account before you can start selling them.
                </p>
                {stripeError && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{stripeError}</p>}
                <Button onClick={handleConnectStripe} disabled={stripeConnecting}>
                  {stripeConnecting && <Loader2 className="size-4 animate-spin" />}
                  {stripeConnecting ? "Connecting..." : "Connect Stripe"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <Link href={backHref} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100">
        <ArrowLeft className="size-4" /> Back to line skips
      </Link>
      <h1 className="mb-6 mt-2 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
        {isEdit ? "Edit line skip" : "Create line skip"}
      </h1>

      {!isEdit && (
        <div className="mb-5 space-y-2 rounded-xl border border-blue-100 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 px-4 py-3">
          <p className="text-sm text-blue-700 dark:text-blue-400">
            Line skips include cover. Customers who purchase a line skip will skip the line and have their cover included in the price.
          </p>
          <p className="text-sm text-blue-700 dark:text-blue-400">
            Line skip tickets are scanned using the universal scanner. Customers simply show their QR code and staff scan it with any phone camera. No app or special equipment needed.
          </p>
        </div>
      )}

      {serverError && (
        <div className="mb-4 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-3 text-sm text-red-700 dark:text-red-400">{serverError}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Venue (create only) */}
        {!isEdit && venues.length > 0 && (
          <div className="space-y-1.5">
            <Label htmlFor="ls_venue">Venue</Label>
            <Select
              id="ls_venue"
              value={selectedVenue?.id ?? ""}
              onChange={(e) => {
                const venueId = Number(e.target.value)
                if (venueId) setSelectedVenue(venueId)
              }}
              className={cn(errors.venue && errClass)}
            >
              <option value="" disabled>Select a venue</option>
              {venues.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </Select>
            {errors.venue && <p className="text-xs text-red-500 dark:text-red-400">{errors.venue}</p>}
          </div>
        )}

        {/* Name */}
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: "" })) }}
            placeholder={`Skip the line at ${selectedVenue?.name || "your venue"}`}
            className={cn(errors.name && errClass)}
          />
          {errors.name && <p className="text-xs text-red-500 dark:text-red-400">{errors.name}</p>}
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <Label htmlFor="description">
            Description <span className="font-normal text-neutral-400 dark:text-neutral-500">(optional)</span>
          </Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Skip the line with cover included. VIP entry, no wait..."
            className="resize-none"
          />
        </div>

        {/* Per-night schedule */}
        <div className="space-y-3">
          <div>
            <Label>Nights it runs</Label>
            <p className="mt-1 text-[13px] text-neutral-500 dark:text-neutral-400">
              Tap the nights this line skip runs. Each night has its own price &amp; hours. Set them all the same, or charge more on busy nights.
            </p>
          </div>

          {/* Day toggles */}
          <div className="flex flex-wrap gap-2">
            {DAYS.map((day) => {
              const active = selectedDays.includes(day.value)
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
          {errors.days && <p className="text-xs text-red-500 dark:text-red-400">{errors.days}</p>}

          {/* Per-day setting cards */}
          {days.length === 0 ? (
            <Card className="border-dashed bg-neutral-50 dark:bg-neutral-800/40">
              <CardContent className="flex items-center gap-2 p-4 text-sm text-neutral-500 dark:text-neutral-400">
                <Plus className="size-4" /> Pick a night above to set its price and hours.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2.5">
              {allSame && (
                <p className="text-xs text-neutral-400 dark:text-neutral-500">Every night is set the same. Change any single night to charge differently.</p>
              )}
              {days.map((d) => (
                <Card key={d.day} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{fullName(d.day)}</h4>
                      <div className="flex items-center gap-3">
                        {days.length > 1 && (
                          <button
                            type="button"
                            onClick={() => applyToAll(d.day)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-[#05EB54] hover:underline"
                            title="Copy this night's settings to every selected night"
                          >
                            <CopyPlus className="size-3.5" /> Apply to all
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => toggleDay(d.day)}
                          className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-200"
                          aria-label={`Remove ${fullName(d.day)}`}
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Price</Label>
                        <div className="relative">
                          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-500 dark:text-neutral-400">$</span>
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={d.priceDisplay}
                            onChange={(e) => updateDay(d.day, { priceDisplay: e.target.value })}
                            onBlur={() => normalizePrice(d.day)}
                            placeholder="0.00"
                            className={cn("pl-7", errors[`price_${d.day}`] && errClass)}
                          />
                        </div>
                        {errors[`price_${d.day}`] && <p className="text-xs text-red-500 dark:text-red-400">{errors[`price_${d.day}`]}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Limit <span className="font-normal text-neutral-400 dark:text-neutral-500">(optional)</span></Label>
                        <Input
                          type="number"
                          min="1"
                          value={d.capacity}
                          onChange={(e) => updateDay(d.day, { capacity: e.target.value })}
                          placeholder="Unlimited"
                          className={cn(errors[`cap_${d.day}`] && errClass)}
                        />
                        {errors[`cap_${d.day}`] && <p className="text-xs text-red-500 dark:text-red-400">{errors[`cap_${d.day}`]}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Doors open</Label>
                        <Input type="time" value={d.start_time} onChange={(e) => updateDay(d.day, { start_time: e.target.value })} className={cn(errors[`start_${d.day}`] && errClass)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Closes</Label>
                        <Input type="time" value={d.end_time} onChange={(e) => updateDay(d.day, { end_time: e.target.value })} className={cn(errors[`end_${d.day}`] && errClass)} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Runs until (optional) - open-ended by default */}
        <div className="space-y-1.5">
          <Label htmlFor="date_range_end">
            Runs until <span className="font-normal text-neutral-400 dark:text-neutral-500">(optional, leave blank to run until you turn it off)</span>
          </Label>
          <Input
            id="date_range_end"
            type="date"
            value={dateRangeEnd}
            onChange={(e) => setDateRangeEnd(e.target.value)}
          />
        </div>

        {/* Preview - the upcoming nights this schedule will run */}
        <Card className="bg-neutral-50 dark:bg-neutral-800/50">
          <CardContent className="p-4">
            {days.length === 0 ? (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Pick your nights to preview the schedule.</p>
            ) : (
              <>
                <p className="mb-1 text-sm font-medium text-neutral-900 dark:text-neutral-100">Next few nights</p>
                <div className="mb-2 max-h-40 space-y-1 overflow-y-auto">
                  {previewDates.map((dStr, i) => (
                    <p key={i} className="text-xs text-neutral-600 dark:text-neutral-400">{dStr}</p>
                  ))}
                </div>
                <p className="text-xs text-neutral-400 dark:text-neutral-500">
                  Runs every selected night{dateRangeEnd ? " until your end date" : " until you turn it off"}. You can edit or close individual nights anytime on the calendar.
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" size="lg" disabled={loading}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            {isEdit ? (loading ? "Saving..." : "Save changes") : loading ? "Creating..." : "Create line skip"}
          </Button>
          <Button variant="secondary" size="lg" asChild>
            <Link href={backHref}>Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
