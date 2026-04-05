"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import FormInput from "@/components/business/auth/FormInput"
import AuthSubmitButton from "@/components/business/auth/AuthSubmitButton"
import ImageUpload from "./ImageUpload"
import { apiClient, ApiError } from "@/lib/business/api-client"
import { DEAL_CATEGORIES, DEAL_TYPES } from "@/lib/business/constants"
import type { DealFormData } from "@/lib/business/types"

interface DealFormProps {
  initialData?: Partial<DealFormData>
  dealId?: number
}

export default function DealForm({ initialData, dealId }: DealFormProps) {
  const router = useRouter()
  const isEditing = !!dealId

  const [form, setForm] = useState<DealFormData>({
    deal_title: initialData?.deal_title || "",
    description: initialData?.description || "",
    deal_category: initialData?.deal_category || "",
    deal_type: initialData?.deal_type || "",
    deal_image_path: initialData?.deal_image_path || "",
    start_date: initialData?.start_date || "",
    expired_date: initialData?.expired_date || "",
    uses: initialData?.uses || "0",
    total_saving: initialData?.total_saving || "0",
    location: initialData?.location || "",
    supply_limit: initialData?.supply_limit || "0",
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState("")
  const [loading, setLoading] = useState(false)
  const [moderationNotice, setModerationNotice] = useState("")

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setErrors((prev) => ({ ...prev, [e.target.name]: "" }))
    setServerError("")
  }

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (!form.deal_title.trim()) errs.deal_title = "Deal title is required"
    if (!form.description.trim()) errs.description = "Description is required"
    if (!form.deal_category) errs.deal_category = "Category is required"
    if (!form.deal_type) errs.deal_type = "Deal type is required"
    if (!form.start_date) errs.start_date = "Start date is required"
    if (!form.expired_date) errs.expired_date = "Expiration date is required"
    if (form.start_date && form.expired_date && form.start_date >= form.expired_date) {
      errs.expired_date = "Expiration must be after start date"
    }
    if (!dealId && form.expired_date && new Date(form.expired_date) < new Date()) {
      errs.expired_date = "Expiration date must be in the future"
    }
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
      const payload = {
        deal_title: form.deal_title,
        description: form.description,
        deal_category: form.deal_category,
        deal_type: form.deal_type,
        deal_image_path: form.deal_image_path || undefined,
        start_date: form.start_date,
        expired_date: form.expired_date,
        uses: form.uses,
        total_saving: parseFloat(form.total_saving) || 0,
        location: form.location || undefined,
        supply_limit: parseInt(form.supply_limit) || 0,
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

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl">
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

      {/* Basic Info */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 mb-4">
        <h2 className="text-sm font-semibold text-ink mb-4">Deal Info</h2>
        <FormInput
          label="Deal Title"
          name="deal_title"
          value={form.deal_title}
          onChange={handleChange}
          placeholder='e.g. "Free Fries Deal"'
          required
          error={errors.deal_title}
        />
        <div className="mb-4">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description<span className="text-red-500 ml-0.5">*</span>
          </label>
          <textarea
            id="description"
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={3}
            placeholder="Describe the deal..."
            className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none resize-none bg-white text-ink
              ${errors.description ? "border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500" : "border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"}`}
          />
          {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="mb-4">
            <label htmlFor="deal_category" className="block text-sm font-medium text-gray-700 mb-1">
              Category<span className="text-red-500 ml-0.5">*</span>
            </label>
            <select
              id="deal_category"
              name="deal_category"
              value={form.deal_category}
              onChange={handleChange}
              className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none bg-white text-ink
                ${errors.deal_category ? "border-red-400" : "border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"}`}
            >
              <option value="">Select category</option>
              {DEAL_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            {errors.deal_category && <p className="mt-1 text-xs text-red-500">{errors.deal_category}</p>}
          </div>
          <div className="mb-4">
            <label htmlFor="deal_type" className="block text-sm font-medium text-gray-700 mb-1">
              Deal Type<span className="text-red-500 ml-0.5">*</span>
            </label>
            <select
              id="deal_type"
              name="deal_type"
              value={form.deal_type}
              onChange={handleChange}
              className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none bg-white text-ink
                ${errors.deal_type ? "border-red-400" : "border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"}`}
            >
              <option value="">Select type</option>
              {DEAL_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            {errors.deal_type && <p className="mt-1 text-xs text-red-500">{errors.deal_type}</p>}
          </div>
        </div>
      </div>

      {/* Dates & Limits */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 mb-4">
        <h2 className="text-sm font-semibold text-ink mb-4">Schedule & Limits</h2>
        <div className="grid grid-cols-2 gap-4">
          <FormInput
            label="Start Date"
            name="start_date"
            type="date"
            value={form.start_date}
            onChange={handleChange}
            required
            error={errors.start_date}
          />
          <FormInput
            label="Expiration Date"
            name="expired_date"
            type="date"
            value={form.expired_date}
            onChange={handleChange}
            required
            error={errors.expired_date}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormInput
            label="Supply Limit"
            name="supply_limit"
            type="number"
            value={form.supply_limit}
            onChange={handleChange}
            placeholder="0 = unlimited"
          />
          <FormInput
            label="Total Saving ($)"
            name="total_saving"
            type="number"
            value={form.total_saving}
            onChange={handleChange}
            placeholder="e.g. 5.00"
          />
        </div>
        <FormInput
          label="Location"
          name="location"
          value={form.location}
          onChange={handleChange}
          placeholder="Business address (auto-filled if blank)"
        />
      </div>

      {/* Deal Image */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 mb-4">
        <h2 className="text-sm font-semibold text-ink mb-4">Deal Image</h2>
        <ImageUpload
          value={form.deal_image_path}
          onChange={(url) => setForm((prev) => ({ ...prev, deal_image_path: url }))}
          label="Deal Image"
        />
      </div>

      {/* Submit */}
      {serverError && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{serverError}</div>
      )}
      <AuthSubmitButton loading={loading}>
        {isEditing ? "Save Changes" : "Create Deal"}
      </AuthSubmitButton>
    </form>
  )
}
