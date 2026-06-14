"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2, TriangleAlert } from "lucide-react"
import { apiClient, ApiError } from "@/lib/business/api-client"
import { useVenue } from "@/lib/business/venue-context"
import { useAuth } from "@/lib/business/auth-context"
import { cn } from "@/lib/v2/utils"
import type { BusinessProfile, LineSkipDetail, LineSkipFormData } from "@/lib/business/types"
import { Button } from "@/components/business/v2/ui/button"
import { Card, CardContent } from "@/components/business/v2/ui/card"
import { Badge } from "@/components/business/v2/ui/badge"
import { Input, Textarea, Select } from "@/components/business/v2/ui/input"
import { Label } from "@/components/business/v2/ui/label"
import { Skeleton } from "@/components/business/v2/ui/skeleton"

const DAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
]

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

  const dates: string[] = []
  while (current <= effectiveEnd) {
    if (daysOfWeek.includes(current.getDay())) {
      dates.push(
        current.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })
      )
    }
    current.setDate(current.getDate() + 1)
  }
  return dates
}

interface LineSkipFormProps {
  mode: "create" | "edit"
  lineSkipId?: number
}

export default function LineSkipForm({ mode, lineSkipId }: LineSkipFormProps) {
  const router = useRouter()
  const { venues, selectedVenue, setSelectedVenue } = useVenue()
  const { business } = useAuth()
  const isEdit = mode === "edit"

  const backHref = isEdit && lineSkipId ? `/business/line-skips/${lineSkipId}` : "/business/line-skips"

  const [profile, setProfile] = useState<BusinessProfile | null>(null)
  const [pageLoading, setPageLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState("")
  const [priceDisplay, setPriceDisplay] = useState("15.00")

  const [form, setForm] = useState<LineSkipFormData>({
    name: "",
    description: "",
    days_of_week: [],
    date_range_start: "",
    date_range_end: "",
    default_start_time: "22:00",
    default_end_time: "02:00",
    default_price_cents: 1500,
    default_capacity: "",
  })

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
          setForm({
            name: line_skip.name,
            description: line_skip.description || "",
            days_of_week: line_skip.days_of_week,
            date_range_start: line_skip.date_range_start,
            date_range_end: line_skip.date_range_end,
            default_start_time: line_skip.default_start_time,
            default_end_time: line_skip.default_end_time,
            default_price_cents: line_skip.default_price_cents,
            default_capacity: line_skip.default_capacity?.toString() ?? "",
          })
          setPriceDisplay((line_skip.default_price_cents / 100).toFixed(2))
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
          setForm((prev) => ({ ...prev, name: `Skip the line at ${selectedVenue?.name || p.name}` }))
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
      setForm((prev) => ({ ...prev, name: `Skip the line at ${selectedVenue.name}` }))
    }
  }, [selectedVenue, isEdit])

  const previewDates = useMemo(() => {
    if (isEdit) return matchingDates(form.days_of_week, form.date_range_start, form.date_range_end)
    return matchingDates(form.days_of_week)
  }, [isEdit, form.days_of_week, form.date_range_start, form.date_range_end])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: "" }))
    setServerError("")
  }

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPriceDisplay(e.target.value)
    setErrors((prev) => ({ ...prev, default_price_cents: "" }))
    setServerError("")
  }

  const handlePriceBlur = () => {
    const dollars = parseFloat(priceDisplay)
    if (!isNaN(dollars) && dollars > 0) {
      const cents = Math.round(dollars * 100)
      setForm((prev) => ({ ...prev, default_price_cents: cents }))
      setPriceDisplay((cents / 100).toFixed(2))
    } else {
      setForm((prev) => ({ ...prev, default_price_cents: 0 }))
      setPriceDisplay("")
    }
  }

  const toggleDay = (day: number) => {
    setForm((prev) => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(day)
        ? prev.days_of_week.filter((d) => d !== day)
        : [...prev.days_of_week, day],
    }))
    setErrors((prev) => ({ ...prev, days_of_week: "" }))
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

  const validate = (cents: number): boolean => {
    const errs: Record<string, string> = {}
    if (!isEdit && !selectedVenue) errs.venue = "Please select a venue"
    if (!form.name.trim()) errs.name = "Name is required"
    if (form.days_of_week.length === 0) errs.days_of_week = "Select at least one night"
    if (form.date_range_end && form.date_range_start && form.date_range_end < form.date_range_start)
      errs.date_range_end = "End date must be after the start"
    if (!form.default_start_time) errs.default_start_time = "Start time is required"
    if (!form.default_end_time) errs.default_end_time = "End time is required"
    if (cents <= 0) errs.default_price_cents = "Price must be greater than $0"
    if (form.default_capacity && parseInt(form.default_capacity) <= 0)
      errs.default_capacity = "Limit must be a positive number"
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const dollars = parseFloat(priceDisplay)
    const cents = !isNaN(dollars) ? Math.round(dollars * 100) : 0
    setForm((prev) => ({ ...prev, default_price_cents: cents }))
    if (!validate(cents)) return

    // Open-ended by default: start today, run until the optional end date (or far future).
    const todayStr = new Date().toLocaleDateString("en-CA")
    setLoading(true)
    setServerError("")
    try {
      if (isEdit && lineSkipId) {
        await apiClient.put(`/business/line-skips/${lineSkipId}`, {
          name: form.name.trim(),
          description: form.description.trim() || null,
          days_of_week: form.days_of_week,
          date_range_start: form.date_range_start || todayStr,
          date_range_end: form.date_range_end || "2099-12-31",
          default_start_time: form.default_start_time,
          default_end_time: form.default_end_time,
          default_price_cents: cents,
          default_capacity: form.default_capacity ? parseInt(form.default_capacity) : null,
          venue_id: selectedVenue?.id,
        })
        router.push(`/business/line-skips/${lineSkipId}`)
      } else {
        const data = await apiClient.post<{ line_skip: { id: number } }>("/business/line-skips", {
          name: form.name.trim(),
          description: form.description.trim() || null,
          days_of_week: form.days_of_week,
          date_range_start: todayStr,
          date_range_end: form.date_range_end || "2099-12-31",
          default_start_time: form.default_start_time,
          default_end_time: form.default_end_time,
          default_price_cents: cents,
          default_capacity: form.default_capacity ? parseInt(form.default_capacity) : null,
          venue_id: selectedVenue?.id,
        })
        router.push(`/business/line-skips/${data.line_skip.id}`)
      }
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Failed to save line skip")
    } finally {
      setLoading(false)
    }
  }

  const errClass = "border-red-400 focus-visible:border-red-500 focus-visible:ring-red-500/30"

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
        <ArrowLeft className="size-4" /> {isEdit ? "Back to line skip" : "Back to line skips"}
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
            Line skip tickets are scanned using the universal scanner — customers simply show their QR code and staff scan it with any phone camera. No app or special equipment needed.
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
            name="name"
            value={form.name}
            onChange={handleChange}
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
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={3}
            placeholder="Skip the line with cover included. VIP entry, no wait..."
            className="resize-none"
          />
        </div>

        {/* Days */}
        <div className="space-y-2">
          <Label>Days of week</Label>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((day) => {
              const active = form.days_of_week.includes(day.value)
              return (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDay(day.value)}
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
          {errors.days_of_week && <p className="text-xs text-red-500 dark:text-red-400">{errors.days_of_week}</p>}
        </div>

        {/* Runs until (optional) — open-ended by default */}
        <div className="space-y-1.5">
          <Label htmlFor="date_range_end">
            Runs until <span className="font-normal text-neutral-400 dark:text-neutral-500">(optional — leave blank to run until you turn it off)</span>
          </Label>
          <Input
            id="date_range_end"
            name="date_range_end"
            type="date"
            value={form.date_range_end && form.date_range_end < "2099-01-01" ? form.date_range_end : ""}
            onChange={handleChange}
            className={cn(errors.date_range_end && errClass)}
          />
          {errors.date_range_end && <p className="text-xs text-red-500 dark:text-red-400">{errors.date_range_end}</p>}
        </div>

        {/* Time range */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="default_start_time">Doors open</Label>
            <Input id="default_start_time" name="default_start_time" type="time" value={form.default_start_time} onChange={handleChange} className={cn(errors.default_start_time && errClass)} />
            {errors.default_start_time && <p className="text-xs text-red-500 dark:text-red-400">{errors.default_start_time}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="default_end_time">Venue closes</Label>
            <Input id="default_end_time" name="default_end_time" type="time" value={form.default_end_time} onChange={handleChange} className={cn(errors.default_end_time && errClass)} />
            {errors.default_end_time && <p className="text-xs text-red-500 dark:text-red-400">{errors.default_end_time}</p>}
          </div>
        </div>

        {/* Price + Capacity */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="price">Default price</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-500 dark:text-neutral-400">$</span>
              <Input
                id="price"
                type="text"
                inputMode="decimal"
                value={priceDisplay}
                onChange={handlePriceChange}
                onBlur={handlePriceBlur}
                placeholder="0.00"
                className={cn("pl-7", errors.default_price_cents && errClass)}
              />
            </div>
            {errors.default_price_cents && <p className="text-xs text-red-500 dark:text-red-400">{errors.default_price_cents}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="default_capacity">
              Limit per night <span className="font-normal text-neutral-400 dark:text-neutral-500">(optional)</span>
            </Label>
            <Input
              id="default_capacity"
              name="default_capacity"
              type="number"
              min="1"
              value={form.default_capacity}
              onChange={handleChange}
              placeholder="Leave blank for unlimited"
              className={cn(errors.default_capacity && errClass)}
            />
            {errors.default_capacity && <p className="text-xs text-red-500 dark:text-red-400">{errors.default_capacity}</p>}
          </div>
        </div>

        {/* Preview — the upcoming nights this schedule will run */}
        <Card className="bg-neutral-50 dark:bg-neutral-800/50">
          <CardContent className="p-4">
            {form.days_of_week.length === 0 ? (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Pick your nights to preview the schedule.</p>
            ) : (
              <>
                <p className="mb-1 text-sm font-medium text-neutral-900 dark:text-neutral-100">Next few nights</p>
                <div className="mb-2 max-h-40 space-y-1 overflow-y-auto">
                  {previewDates.map((d, i) => (
                    <p key={i} className="text-xs text-neutral-600 dark:text-neutral-400">{d}</p>
                  ))}
                </div>
                <p className="text-xs text-neutral-400 dark:text-neutral-500">
                  Runs every selected night{form.date_range_end && form.date_range_end < "2099-01-01" ? " until your end date" : " until you turn it off"}. You can edit or close individual nights anytime.
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
