"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { apiClient, ApiError } from "@/lib/business/api-client"
import { useVenue } from "@/lib/business/venue-context"
import type { BusinessProfile, LineSkipFormData } from "@/lib/business/types"

const DAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
]

function getUpcomingDates(daysOfWeek: number[], count: number = 7): string[] {
  if (daysOfWeek.length === 0) return []
  const dates: string[] = []
  const current = new Date()
  current.setDate(current.getDate() + 1) // start from tomorrow

  let daysChecked = 0
  while (dates.length < count && daysChecked < 60) {
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
    daysChecked++
  }
  return dates
}

export default function CreateLineSkipPage() {
  const router = useRouter()
  const { selectedVenue } = useVenue()
  const [profile, setProfile] = useState<BusinessProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [profileLoading, setProfileLoading] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState("")

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
      .get<BusinessProfile>("/business/profile")
      .then((p) => {
        setProfile(p)
        setForm((prev) => ({
          ...prev,
          name: `Skip the Line at ${selectedVenue?.name || p.name}`,
        }))
      })
      .catch(() => {})
      .finally(() => setProfileLoading(false))
  }, [])

  useEffect(() => {
    if (selectedVenue?.name) {
      setForm((prev) => ({
        ...prev,
        name: `Skip the Line at ${selectedVenue.name}`,
      }))
    }
  }, [selectedVenue])

  const upcomingDates = useMemo(
    () => getUpcomingDates(form.days_of_week),
    [form.days_of_week]
  )

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: "" }))
    setServerError("")
  }

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dollars = parseFloat(e.target.value)
    if (!isNaN(dollars)) {
      setForm((prev) => ({ ...prev, default_price_cents: Math.round(dollars * 100) }))
    } else if (e.target.value === "") {
      setForm((prev) => ({ ...prev, default_price_cents: 0 }))
    }
    setErrors((prev) => ({ ...prev, default_price_cents: "" }))
    setServerError("")
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
    if (!selectedVenue) errs.name = "Please select a venue first"
    if (!form.name.trim()) errs.name = "Name is required"
    if (form.days_of_week.length === 0) errs.days_of_week = "Select at least one day"
    if (!form.date_range_start) errs.date_range_start = "Start date is required"
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
    if (!validate()) return

    setLoading(true)
    setServerError("")

    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        days_of_week: form.days_of_week,
        date_range_start: form.date_range_start,
        date_range_end: "2099-12-31",
        default_start_time: form.default_start_time,
        default_end_time: form.default_end_time,
        default_price_cents: form.default_price_cents,
        default_capacity: form.default_capacity ? parseInt(form.default_capacity) : null,
        venue_id: selectedVenue?.id,
      }

      const data = await apiClient.post<{ line_skip: { id: number } }>("/business/line-skips", payload)
      router.push(`/business/line-skips/${data.line_skip.id}`)
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Failed to create Line Skip")
    } finally {
      setLoading(false)
    }
  }

  if (profileLoading) {
    return (
      <div className="animate-pulse space-y-4 max-w-2xl">
        <div className="h-6 bg-gray-200 rounded w-32" />
        <div className="h-64 bg-gray-200 rounded-xl" />
      </div>
    )
  }

  // Stripe Connect gate
  if (profile && !profile.stripe_connect_onboarded) {
    return (
      <div className="max-w-2xl">
        <Link href="/business/line-skips" className="text-xs text-gray-500 hover:text-primary mb-2 inline-block">
          &larr; Back to Line Skips
        </Link>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 mt-4">
          <div className="flex items-start gap-3">
            <svg className="h-6 w-6 text-amber-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <div>
              <h2 className="text-lg font-semibold text-ink mb-1">Connect Your Stripe Account</h2>
              <p className="text-sm text-gray-600 mb-4">
                Line Skips are paid products. You need to connect your Stripe account before you can start selling them.
              </p>
              <Link
                href="/business/settings"
                className="inline-flex items-center rounded-lg bg-gradient-to-br from-[#2ECB4E] to-[#05EB54] px-4 py-2 text-sm font-semibold text-white shadow-md shadow-primary/25 hover:brightness-110 transition-all"
              >
                Go to Settings
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <Link href="/business/line-skips" className="text-xs text-gray-500 hover:text-primary mb-2 inline-block">
        &larr; Back to Line Skips
      </Link>
      <h1 className="text-xl font-bold text-ink mb-6">Create Line Skip</h1>

      <div className="mb-5 rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 space-y-2">
        <p className="text-sm text-blue-700">
          Line skips include cover. Customers who purchase a line skip will skip the line and have their cover included in the price.
        </p>
        <p className="text-sm text-blue-700">
          Line skip tickets are scanned using the universal scanner — customers simply show their QR code and staff scan it with any phone camera. No app or special equipment needed.
        </p>
      </div>

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
            placeholder={`Skip the Line at ${selectedVenue?.name || "Your Venue"}`}
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
            placeholder="Skip the line with cover included. VIP entry, no wait..."
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

        {/* Start Date (no end date) */}
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
                type="number"
                step="0.01"
                min="0.01"
                value={(form.default_price_cents / 100).toFixed(2)}
                onChange={handlePriceChange}
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

        {/* Preview */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          {form.days_of_week.length === 0 ? (
            <p className="text-sm text-gray-500">Select days of the week to see upcoming nights</p>
          ) : (
            <>
              <p className="text-sm font-medium text-ink mb-1">
                Line Skips will be created on a rolling basis. Upcoming nights:
              </p>
              <div className="max-h-40 overflow-y-auto space-y-1 mb-2">
                {upcomingDates.map((date, i) => (
                  <p key={i} className="text-xs text-gray-600">{date}</p>
                ))}
              </div>
              <p className="text-xs text-gray-400">
                New nights are added automatically each week. You can stop this line skip at any time.
              </p>
            </>
          )}
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-gradient-to-br from-[#2ECB4E] to-[#05EB54] px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/25 hover:brightness-110 transition-all disabled:opacity-60 cursor-pointer"
          >
            {loading ? "Creating..." : "Create Line Skip"}
          </button>
          <Link
            href="/business/line-skips"
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
