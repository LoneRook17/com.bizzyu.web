"use client"

import { useState, useEffect, useMemo, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { apiClient, ApiError } from "@/lib/business/api-client"
import { useVenue } from "@/lib/business/venue-context"
import type { LineSkipDetail, LineSkipFormData } from "@/lib/business/types"

const DAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
]

function getMatchingDates(daysOfWeek: number[], start: string, end: string): string[] {
  if (!start || !end || daysOfWeek.length === 0) return []
  const dates: string[] = []
  // Use today as the earliest start (no past dates in preview)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const startDate = new Date(start + "T00:00:00")
  const current = startDate > today ? new Date(startDate) : new Date(today)

  // Cap preview to 2 weeks from now (matches backend rolling window)
  const twoWeeksOut = new Date()
  twoWeeksOut.setDate(twoWeeksOut.getDate() + 14)
  const endDate = new Date(end + "T00:00:00")
  const effectiveEnd = endDate < twoWeeksOut ? endDate : twoWeeksOut

  if (current > effectiveEnd) return []

  while (current <= effectiveEnd) {
    if (daysOfWeek.includes(current.getDay())) {
      dates.push(
        current.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      )
    }
    current.setDate(current.getDate() + 1)
  }
  return dates
}

export default function EditLineSkipPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { selectedVenue } = useVenue()
  const [pageLoading, setPageLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState("")
  const [regenerate, setRegenerate] = useState(false)
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

  useEffect(() => {
    apiClient
      .get<{ line_skip: LineSkipDetail }>(`/business/line-skips/${id}`)
      .then(({ line_skip }) => {
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
      })
      .catch((err) => {
        setServerError(err instanceof ApiError ? err.message : "Failed to load Line Skip")
      })
      .finally(() => setPageLoading(false))
  }, [id])

  const matchingDates = useMemo(
    () => getMatchingDates(form.days_of_week, form.date_range_start, form.date_range_end),
    [form.days_of_week, form.date_range_start, form.date_range_end]
  )

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

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = "Name is required"
    if (form.days_of_week.length === 0) errs.days_of_week = "Select at least one day"
    if (!form.date_range_start) errs.date_range_start = "Start date is required"
    if (!form.date_range_end) errs.date_range_end = "End date is required"
    if (form.date_range_start && form.date_range_end && form.date_range_start > form.date_range_end)
      errs.date_range_end = "End date must be after start date"
    if (!form.default_start_time) errs.default_start_time = "Start time is required"
    if (!form.default_end_time) errs.default_end_time = "End time is required"
    if (form.default_price_cents <= 0) errs.default_price_cents = "Price must be greater than $0"
    if (form.default_capacity && parseInt(form.default_capacity) <= 0)
      errs.default_capacity = "Capacity must be a positive number"
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const dollars = parseFloat(priceDisplay)
    const cents = !isNaN(dollars) ? Math.round(dollars * 100) : 0
    setForm((prev) => ({ ...prev, default_price_cents: cents }))
    form.default_price_cents = cents
    if (!validate()) return

    setLoading(true)
    setServerError("")

    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        days_of_week: form.days_of_week,
        date_range_start: form.date_range_start,
        date_range_end: form.date_range_end,
        default_start_time: form.default_start_time,
        default_end_time: form.default_end_time,
        default_price_cents: form.default_price_cents,
        default_capacity: form.default_capacity ? parseInt(form.default_capacity) : null,
        regenerate_instances: regenerate,
        venue_id: selectedVenue?.id,
      }

      await apiClient.put(`/business/line-skips/${id}`, payload)
      router.push(`/business/line-skips/${id}`)
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Failed to update Line Skip")
    } finally {
      setLoading(false)
    }
  }

  if (pageLoading) {
    return (
      <div className="animate-pulse space-y-4 max-w-2xl">
        <div className="h-6 bg-gray-200 rounded w-32" />
        <div className="h-64 bg-gray-200 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <Link href={`/business/line-skips/${id}`} className="text-xs text-gray-500 hover:text-primary mb-2 inline-block">
        &larr; Back to Line Skip
      </Link>
      <h1 className="text-xl font-bold text-ink mb-6">Edit Line Skip</h1>

      {serverError && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-ink mb-1">Name</label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            className={`w-full rounded-lg border px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary ${
              errors.name ? "border-red-400" : "border-gray-300"
            }`}
          />
          {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-ink mb-1">
            Description <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary resize-none"
          />
        </div>

        {/* Days of week */}
        <div>
          <label className="block text-sm font-medium text-ink mb-2">Days of Week</label>
          <div className="flex gap-2 flex-wrap">
            {DAYS.map((day) => (
              <button
                key={day.value}
                type="button"
                onClick={() => toggleDay(day.value)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer border ${
                  form.days_of_week.includes(day.value)
                    ? "bg-primary text-white border-primary"
                    : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>
          {errors.days_of_week && <p className="mt-1 text-xs text-red-500">{errors.days_of_week}</p>}
        </div>

        {/* Date range */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Start Date</label>
            <input
              type="date"
              name="date_range_start"
              value={form.date_range_start}
              onChange={handleChange}
              className={`w-full rounded-lg border px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary ${
                errors.date_range_start ? "border-red-400" : "border-gray-300"
              }`}
            />
            {errors.date_range_start && <p className="mt-1 text-xs text-red-500">{errors.date_range_start}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">End Date</label>
            <input
              type="date"
              name="date_range_end"
              value={form.date_range_end}
              onChange={handleChange}
              className={`w-full rounded-lg border px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary ${
                errors.date_range_end ? "border-red-400" : "border-gray-300"
              }`}
            />
            {errors.date_range_end && <p className="mt-1 text-xs text-red-500">{errors.date_range_end}</p>}
          </div>
        </div>

        {/* Time range */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Doors Open</label>
            <input
              type="time"
              name="default_start_time"
              value={form.default_start_time}
              onChange={handleChange}
              className={`w-full rounded-lg border px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary ${
                errors.default_start_time ? "border-red-400" : "border-gray-300"
              }`}
            />
            {errors.default_start_time && <p className="mt-1 text-xs text-red-500">{errors.default_start_time}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Venue Closes</label>
            <input
              type="time"
              name="default_end_time"
              value={form.default_end_time}
              onChange={handleChange}
              className={`w-full rounded-lg border px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary ${
                errors.default_end_time ? "border-red-400" : "border-gray-300"
              }`}
            />
            {errors.default_end_time && <p className="mt-1 text-xs text-red-500">{errors.default_end_time}</p>}
          </div>
        </div>

        {/* Price and Capacity */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Default Price</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">$</span>
              <input
                type="text"
                inputMode="decimal"
                value={priceDisplay}
                onChange={handlePriceChange}
                onBlur={handlePriceBlur}
                placeholder="0.00"
                className={`w-full rounded-lg border pl-7 pr-3 py-2 text-sm text-ink outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary ${
                  errors.default_price_cents ? "border-red-400" : "border-gray-300"
                }`}
              />
            </div>
            {errors.default_price_cents && <p className="mt-1 text-xs text-red-500">{errors.default_price_cents}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">
              Line Skip Quantity <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="number"
              name="default_capacity"
              value={form.default_capacity}
              onChange={handleChange}
              min="1"
              placeholder="Leave blank for unlimited"
              className={`w-full rounded-lg border px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary ${
                errors.default_capacity ? "border-red-400" : "border-gray-300"
              }`}
            />
            {errors.default_capacity && <p className="mt-1 text-xs text-red-500">{errors.default_capacity}</p>}
          </div>
        </div>

        {/* Regenerate option */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={regenerate}
              onChange={(e) => setRegenerate(e.target.checked)}
              className="mt-0.5 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <div>
              <p className="text-sm font-medium text-ink">Regenerate future instances with new defaults</p>
              <p className="text-xs text-gray-500 mt-0.5">
                This will regenerate the next 2 weeks of nights using your new defaults. Past nights and nights with sold tickets will not be affected. Future nights beyond 2 weeks are added automatically on a rolling basis.
              </p>
            </div>
          </label>
        </div>

        {/* Preview */}
        {regenerate && matchingDates.length > 0 && (
          <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
            <p className="text-sm font-medium text-yellow-800 mb-2">
              Upcoming nights to regenerate (next 2 weeks):
            </p>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {matchingDates.map((date, i) => (
                <p key={i} className="text-xs text-yellow-700">{date}</p>
              ))}
            </div>
            <p className="text-xs text-yellow-600 mt-2">
              Only unsold future nights will be regenerated. Additional nights are added automatically on a rolling basis.
            </p>
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-gradient-to-br from-[#2ECB4E] to-[#05EB54] px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/25 hover:brightness-110 transition-all disabled:opacity-60 cursor-pointer"
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
          <Link
            href={`/business/line-skips/${id}`}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
