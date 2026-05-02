"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import AuthSubmitButton from "@/components/business/auth/AuthSubmitButton"
import ImageUpload from "./ImageUpload"
import { apiClient, ApiError } from "@/lib/business/api-client"
import { REDEMPTION_OPTIONS } from "@/lib/business/constants"
import { useAuth } from "@/lib/business/auth-context"
import { useVenue } from "@/lib/business/venue-context"
import type { DealFormData } from "@/lib/business/types"

interface DealFormProps {
  initialData?: Partial<DealFormData>
  dealId?: number
}

export default function DealForm({ initialData, dealId }: DealFormProps) {
  const router = useRouter()
  const { business } = useAuth()
  const { venues, selectedVenue, setSelectedVenue } = useVenue()
  const isEditing = !!dealId

  const [form, setForm] = useState<DealFormData>({
    deal_title: initialData?.deal_title || "",
    description: initialData?.description || "",
    total_saving: initialData?.total_saving || "",
    redemption_frequency: initialData?.redemption_frequency || "",
    start_date: initialData?.start_date || "",
    deal_image_path: initialData?.deal_image_path || "",
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState("")
  const [loading, setLoading] = useState(false)
  const [moderationNotice, setModerationNotice] = useState("")
  const [showFreqInfo, setShowFreqInfo] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setErrors((prev) => ({ ...prev, [e.target.name]: "" }))
    setServerError("")
  }

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (!selectedVenue) errs.venue = "Please select a venue"
    if (!form.deal_title.trim()) errs.deal_title = "Deal title is required"
    if (!form.description.trim()) errs.description = "Description is required"
    if (!form.total_saving.trim()) errs.total_saving = "Estimated savings is required"
    if (!form.redemption_frequency) errs.redemption_frequency = "Redemption frequency is required"
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    setServerError("")
    setModerationNotice("")

    try {
      // Map redemption_frequency to deal_type for the API
      const selectedOption = REDEMPTION_OPTIONS.find((o) => o.value === form.redemption_frequency)
      const dealType = selectedOption?.dealType || "Daily"

      // Strip $ sign and parse savings
      const savingsNum = parseFloat(form.total_saving.replace(/[$,]/g, "")) || 0

      const payload = {
        deal_title: form.deal_title,
        description: form.description,
        deal_type: dealType,
        deal_image_path: form.deal_image_path || undefined,
        start_date: form.start_date || undefined,
        total_saving: savingsNum,
        venue_id: selectedVenue?.id,
      }

      if (isEditing) {
        await apiClient.put(`/business/deals/${dealId}`, payload)
        router.push(`/business/deals/${dealId}`)
      } else {
        const data = await apiClient.post<{ deal_id: number; moderation_status: string | null }>(
          "/business/deals",
          payload
        )
        if (data.moderation_status === "pending_review") {
          setModerationNotice("Your deal has been created but is under review due to content moderation.")
          setTimeout(() => router.push("/business/deals"), 3000)
        } else {
          router.push("/business/deals")
        }
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.message)
      } else {
        setServerError("Something went wrong. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  // Derive preview values
  const freqLabel =
    REDEMPTION_OPTIONS.find((o) => o.value === form.redemption_frequency)?.label || "Claim Once Per Day"
  const selectedFreqOption = REDEMPTION_OPTIONS.find((o) => o.value === form.redemption_frequency)
  const hasImage = !!form.deal_image_path
  const businessName = selectedVenue?.name || business?.name || "Business Name"

  const inputClass =
    "w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-ink placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-sm"
  const inputErrorClass =
    "w-full px-4 py-3 rounded-xl border border-red-400 bg-white text-ink placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 transition-all text-sm"

  return (
    <div>
      <div className="mb-6">
        <Link href="/business/deals" className="text-xs text-gray-500 hover:text-primary">
          &larr; Back to Deals
        </Link>
        <h1 className="text-xl font-bold text-ink mt-2">
          {isEditing ? "Edit Deal" : "Create Deal"}
        </h1>
      </div>

      {moderationNotice && (
        <div className="mb-6 rounded-lg bg-orange-50 border border-orange-200 p-4 text-sm text-orange-800">
          {moderationNotice}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="flex flex-col lg:flex-row gap-8">
          {/* LEFT COLUMN — Live Preview */}
          <div className="w-full lg:w-[340px] shrink-0">
            <div className="lg:sticky lg:top-6">
              <div className="w-full max-w-[320px] mx-auto">
                {/* Preview Card */}
                <div className="bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-100">
                  {/* Header row */}
                  <div className="flex items-center justify-between px-4 pt-4 pb-2">
                    <div className="flex items-center gap-2">
                      {business?.logo_url ? (
                        <Image
                          src={business.logo_url}
                          alt="Logo"
                          width={28}
                          height={28}
                          className="w-7 h-7 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                          <span className="text-white text-xs font-bold">
                            {businessName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <span className="text-xs text-muted font-medium">{freqLabel}</span>
                    </div>
                    {/* Heart icon (decorative) */}
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#ccc"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                    </svg>
                  </div>

                  {/* Deal image */}
                  <div className="relative aspect-[16/10] bg-gray-100 mx-3 rounded-xl overflow-hidden">
                    {hasImage ? (
                      <Image
                        src={form.deal_image_path}
                        alt="Deal preview"
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-300">
                        <svg
                          width="40"
                          height="40"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        >
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                        <span className="text-xs mt-2">Deal Image</span>
                      </div>
                    )}
                    {/* Savings badge */}
                    {form.total_saving && (
                      <div className="absolute top-2 right-2 bg-primary text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-md">
                        Save {form.total_saving.startsWith("$") ? form.total_saving : `$${form.total_saving}`}
                      </div>
                    )}
                  </div>

                  {/* Deal info */}
                  <div className="px-4 py-3">
                    <h3 className="font-bold text-ink text-sm leading-snug line-clamp-2 min-h-[2.5rem]">
                      {form.deal_title || "Your Deal Title"}
                    </h3>
                    <p className="text-muted text-xs mt-1 truncate">{businessName}</p>
                  </div>
                </div>

                {/* Label */}
                <p className="text-center text-xs text-muted mt-3">
                  This is how your{" "}
                  <span className="font-semibold text-ink">Bizzy-exclusive</span> deal will
                  appear to students
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN — Deal Details Form */}
          <div className="flex-1 min-w-0">
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="text-2xl font-bold text-ink mb-1">Deal Details</h2>
              <p className="text-muted text-sm mb-5">
                Describe the deal you want to offer students.
              </p>

              {/* Exclusivity banner */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-6">
                <p className="text-sm text-blue-800 font-medium">
                  Your offer must be exclusive to Bizzy users and not available to the general
                  public elsewhere.
                </p>
              </div>

              {/* Venue Selection */}
              {!isEditing && venues.length > 0 && (
                <div className="mb-5">
                  <label htmlFor="venue_select" className="block text-sm font-medium text-ink mb-1.5">
                    Venue <span className="text-primary">*</span>
                  </label>
                  <select
                    id="venue_select"
                    value={selectedVenue?.id ?? ""}
                    onChange={(e) => {
                      const venueId = Number(e.target.value)
                      if (venueId) {
                        setSelectedVenue(venueId)
                      }
                    }}
                    className={selectedVenue ? inputClass : inputErrorClass}
                  >
                    <option value="" disabled>Select a venue</option>
                    {venues.map((v) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                  {errors.venue && (
                    <p className="mt-1 text-xs text-red-500">{errors.venue}</p>
                  )}
                </div>
              )}

              {/* Deal Title */}
              <div className="mb-5">
                <label htmlFor="deal_title" className="block text-sm font-medium text-ink mb-1.5">
                  Deal Title <span className="text-primary">*</span>
                </label>
                <input
                  id="deal_title"
                  name="deal_title"
                  type="text"
                  value={form.deal_title}
                  onChange={handleChange}
                  className={errors.deal_title ? inputErrorClass : inputClass}
                  placeholder="e.g. BOGO Espresso Martinis (21+)"
                />
                {errors.deal_title ? (
                  <p className="mt-1 text-xs text-red-500">{errors.deal_title}</p>
                ) : (
                  <p className="text-xs text-muted mt-1">
                    Keep it clear and compelling. Students should only be able to access this deal
                    through Bizzy.
                  </p>
                )}
              </div>

              {/* Deal Description */}
              <div className="mb-5">
                <label htmlFor="description" className="block text-sm font-medium text-ink mb-1.5">
                  Deal Description <span className="text-primary">*</span>
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={3}
                  className={`${errors.description ? inputErrorClass : inputClass} resize-none`}
                  placeholder="e.g. Buy one espresso martini, get one free. Must be 21+. Show this deal at checkout."
                />
                {errors.description && (
                  <p className="mt-1 text-xs text-red-500">{errors.description}</p>
                )}
              </div>

              {/* Estimated Savings + Redemption Frequency */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                <div>
                  <label htmlFor="total_saving" className="block text-sm font-medium text-ink mb-1.5">
                    Estimated Savings <span className="text-primary">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted">$</span>
                    <input
                      id="total_saving"
                      name="total_saving"
                      type="text"
                      value={form.total_saving}
                      onChange={(e) => {
                        // Strip $ if user types it (we show the $ prefix)
                        const val = e.target.value.replace(/^\$/, "")
                        setForm((prev) => ({ ...prev, total_saving: val }))
                        setErrors((prev) => ({ ...prev, total_saving: "" }))
                        setServerError("")
                      }}
                      className={`${errors.total_saving ? inputErrorClass : inputClass} pl-8`}
                      placeholder="e.g. 8"
                    />
                  </div>
                  {errors.total_saving && (
                    <p className="mt-1 text-xs text-red-500">{errors.total_saving}</p>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <label htmlFor="redemption_frequency" className="text-sm font-medium text-ink">
                      Redemption Frequency <span className="text-primary">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowFreqInfo(!showFreqInfo)}
                      className="w-4.5 h-4.5 rounded-full bg-gray-200 text-muted text-xs font-bold flex items-center justify-center hover:bg-gray-300 transition-colors cursor-pointer leading-none"
                      aria-label="What is redemption frequency?"
                    >
                      ?
                    </button>
                  </div>
                  <select
                    id="redemption_frequency"
                    name="redemption_frequency"
                    value={form.redemption_frequency}
                    onChange={handleChange}
                    className={errors.redemption_frequency ? inputErrorClass : inputClass}
                  >
                    <option value="">How often can students claim?</option>
                    {REDEMPTION_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {errors.redemption_frequency && (
                    <p className="mt-1 text-xs text-red-500">{errors.redemption_frequency}</p>
                  )}
                </div>
              </div>

              {/* Frequency info tooltip */}
              {showFreqInfo && (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-muted space-y-1.5 mb-5">
                  {selectedFreqOption ? (
                    <p>{selectedFreqOption.info}</p>
                  ) : (
                    REDEMPTION_OPTIONS.map((opt) => (
                      <p key={opt.value}>
                        <span className="font-semibold text-ink">{opt.label}:</span> {opt.info}
                      </p>
                    ))
                  )}
                </div>
              )}

              {/* Start Date */}
              <div className="mb-5">
                <label htmlFor="start_date" className="block text-xs font-medium text-muted mb-1">
                  Start Date
                </label>
                <input
                  id="start_date"
                  name="start_date"
                  type="date"
                  value={form.start_date}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-ink text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>

              {/* Deal Image */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-ink mb-1">
                  Deal Image <span className="text-muted font-normal">(optional)</span>
                </label>
                <p className="text-xs text-muted mb-2">
                  Recommended: 1600&times;1000px landscape (16:10). You can always send one later.
                </p>
                <ImageUpload
                  value={form.deal_image_path}
                  onChange={(url) => setForm((prev) => ({ ...prev, deal_image_path: url }))}
                  label=""
                />
              </div>

              {/* Submit */}
              {serverError && (
                <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{serverError}</div>
              )}
              <AuthSubmitButton loading={loading}>
                {isEditing ? "Save Changes" : "Create Deal"}
              </AuthSubmitButton>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
