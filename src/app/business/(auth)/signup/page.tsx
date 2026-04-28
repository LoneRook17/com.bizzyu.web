"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import AuthCard from "@/components/business/auth/AuthCard"
import FormInput from "@/components/business/auth/FormInput"
import FormPasswordInput from "@/components/business/auth/FormPasswordInput"
import AuthSubmitButton from "@/components/business/auth/AuthSubmitButton"
import AddressAutocomplete from "@/components/business/dashboard/AddressAutocomplete"
import { apiClient, ApiError } from "@/lib/business/api-client"
import { CAMPUSES } from "@/lib/business/constants"

const BLOCKED_EMAIL_DOMAINS = [
  'proton.me', 'protonmail.com', 'pm.me',
  'tutanota.com', 'tuta.io', 'tutamail.com',
  'mailbox.org', 'posteo.de', 'disroot.org',
  'simplelogin.io', 'anonaddy.com', '33mail.com', 'duck.com',
  'tempmail.com', 'guerrillamail.com', '10minutemail.com',
  'throwawaymail.com', 'mailinator.com', 'yopmail.com',
  'sharklasers.com', 'guerrillamailblock.com', 'grr.la',
  'temp-mail.org', 'fakeinbox.com',
]

interface FormState {
  business_name: string
  contact_name: string
  email: string
  phone: string
  address: string
  website: string
  instagram: string
  description: string
  password: string
  confirm_password: string
  campus_id: string
}

interface CampusOption {
  id: number
  name: string
  full_name?: string | null
}

const FALLBACK_CAMPUSES: CampusOption[] = CAMPUSES.map(({ id, name }) => ({ id, name }))

export default function SignupPage() {
  const router = useRouter()
  const [form, setForm] = useState<FormState>({
    business_name: "",
    contact_name: "",
    email: "",
    phone: "",
    address: "",
    website: "",
    instagram: "",
    description: "",
    password: "",
    confirm_password: "",
    campus_id: "",
  })
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [serverError, setServerError] = useState("")
  const [loading, setLoading] = useState(false)
  const [campuses, setCampuses] = useState<CampusOption[]>(FALLBACK_CAMPUSES)

  useEffect(() => {
    let cancelled = false

    apiClient.authGet<{ campuses: CampusOption[] }>("/business/auth/campuses")
      .then((data) => {
        if (!cancelled && data.campuses.length > 0) {
          setCampuses(data.campuses)
        }
      })
      .catch(() => {
        // Keep the bundled fallback list available if the campus API is unavailable.
      })

    return () => {
      cancelled = true
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setErrors((prev) => ({ ...prev, [e.target.name]: undefined }))
    setServerError("")
  }

  const validate = (): boolean => {
    const errs: Partial<Record<keyof FormState, string>> = {}

    if (!form.business_name.trim()) errs.business_name = "Business name is required"
    if (!form.contact_name.trim()) errs.contact_name = "Contact name is required"
    if (!form.email.trim()) errs.email = "Email is required"
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Invalid email format"
    else if (BLOCKED_EMAIL_DOMAINS.includes(form.email.split("@")[1]?.toLowerCase())) errs.email = "Please use a business email address"
    if (!form.phone.trim()) errs.phone = "Phone number is required"
    else if (form.phone.replace(/\D/g, "").length < 10) errs.phone = "Enter a valid phone number"
    if (!form.address.trim()) errs.address = "Business address is required"
    if (!form.description.trim()) errs.description = "Business description is required"
    if (!form.campus_id) errs.campus_id = "Please select a campus"
    if (!form.password) errs.password = "Password is required"
    else if (form.password.length < 8) errs.password = "Password must be at least 8 characters"
    else if (!/\d/.test(form.password)) errs.password = "Password must contain at least 1 number"
    else if (!/[a-zA-Z]/.test(form.password)) errs.password = "Password must contain at least 1 letter"
    if (form.password !== form.confirm_password) errs.confirm_password = "Passwords do not match"

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    setServerError("")

    try {
      await apiClient.authPost("/business/auth/signup", {
        email: form.email,
        password: form.password,
        business_name: form.business_name,
        contact_name: form.contact_name,
        phone: form.phone,
        campus_id: Number(form.campus_id),
        address: form.address,
        website: form.website
          ? (/^https?:\/\//i.test(form.website) ? form.website : `https://${form.website}`)
          : undefined,
        instagram: form.instagram || undefined,
        description: form.description,
      })

      router.push(`/business/verify-email?email=${encodeURIComponent(form.email)}`)
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
    <AuthCard title="Create your account" subtitle="Register your business to get started">
      <form onSubmit={handleSubmit}>
        <FormInput
          label="Business Name"
          name="business_name"
          value={form.business_name}
          onChange={handleChange}
          placeholder="Acme Coffee Shop"
          required
          error={errors.business_name}
        />
        <FormInput
          label="Contact Name"
          name="contact_name"
          value={form.contact_name}
          onChange={handleChange}
          placeholder="John Doe"
          required
          error={errors.contact_name}
        />
        <FormInput
          label="Email"
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          placeholder="you@business.com"
          required
          autoComplete="email"
          error={errors.email}
        />
        <FormInput
          label="Phone"
          name="phone"
          type="tel"
          value={form.phone}
          onChange={handleChange}
          placeholder="(555) 123-4567"
          required
          autoComplete="tel"
          error={errors.phone}
        />
        <div className="mb-4">
          <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
            Business Address<span className="text-red-500 ml-0.5">*</span>
          </label>
          <AddressAutocomplete
            value={form.address}
            onChange={(value) => {
              setForm((prev) => ({ ...prev, address: value }))
              setErrors((prev) => ({ ...prev, address: undefined }))
              setServerError("")
            }}
            placeholder="Start typing an address..."
            className={`w-full rounded-lg border px-3 py-2.5 text-sm transition-colors outline-none bg-white text-ink
              ${errors.address ? "border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500" : "border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"}`}
          />
          {errors.address && <p className="mt-1 text-xs text-red-500">{errors.address}</p>}
        </div>
        <FormInput
          label="Website"
          name="website"
          value={form.website}
          onChange={handleChange}
          placeholder="www.yourbusiness.com"
        />
        <FormInput
          label="Instagram"
          name="instagram"
          value={form.instagram}
          onChange={handleChange}
          placeholder="@yourbusiness"
        />

        <div className="mb-4">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Business Description<span className="text-red-500 ml-0.5">*</span>
          </label>
          <textarea
            id="description"
            name="description"
            value={form.description}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, description: e.target.value }))
              setErrors((prev) => ({ ...prev, description: undefined }))
              setServerError("")
            }}
            rows={3}
            placeholder="Briefly describe your business and what you offer"
            className={`w-full rounded-lg border px-3 py-2.5 text-sm transition-colors outline-none bg-white text-ink resize-none
              ${errors.description ? "border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500" : "border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"}`}
          />
          {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description}</p>}
        </div>

        <div className="mb-4">
          <label htmlFor="campus_id" className="block text-sm font-medium text-gray-700 mb-1">
            Campus<span className="text-red-500 ml-0.5">*</span>
          </label>
          <select
            id="campus_id"
            name="campus_id"
            value={form.campus_id}
            onChange={handleChange}
            className={`w-full rounded-lg border px-3 py-2.5 text-sm transition-colors outline-none bg-white text-ink
              ${errors.campus_id ? "border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500" : "border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"}`}
          >
            <option value="">Select a campus</option>
            {campuses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {errors.campus_id && <p className="mt-1 text-xs text-red-500">{errors.campus_id}</p>}
        </div>

        <FormPasswordInput
          label="Password"
          name="password"
          value={form.password}
          onChange={handleChange}
          placeholder="Min 8 chars, 1 number, 1 letter"
          required
          autoComplete="new-password"
          error={errors.password}
        />
        <FormPasswordInput
          label="Confirm Password"
          name="confirm_password"
          value={form.confirm_password}
          onChange={handleChange}
          placeholder="Confirm your password"
          required
          autoComplete="new-password"
          error={errors.confirm_password}
        />

        {serverError && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {serverError}
          </div>
        )}

        <AuthSubmitButton loading={loading}>Create Account</AuthSubmitButton>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Already have an account?{" "}
        <Link href="/business/login" className="text-primary font-medium hover:underline">
          Log in
        </Link>
      </p>
    </AuthCard>
  )
}
