"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  AuthAlert,
  AuthCard,
  AuthField,
  AuthFooterLink,
  AuthPasswordField,
  AuthSubmit,
} from "@/components/business/v2/auth/auth-shell"
import { Label } from "@/components/business/v2/ui/label"
import { Textarea } from "@/components/business/v2/ui/input"
import CampusCombobox from "@/components/business/v2/ui/campus-combobox"
import AddressAutocomplete from "@/components/business/dashboard/AddressAutocomplete"
import TurnstileWidget from "@/components/ui/TurnstileWidget"
import { apiClient, ApiError } from "@/lib/business/api-client"
import { CAMPUSES } from "@/lib/business/constants"
import { cn } from "@/lib/v2/utils"

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

const FALLBACK_CAMPUSES: CampusOption[] = CAMPUSES.map(({ id, name, full_name }) => ({ id, name, full_name }))

const errorRing = "border-red-400 focus-visible:border-red-500 focus-visible:ring-red-500/20"

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
  const [turnstileToken, setTurnstileToken] = useState("")
  const [honeypot, setHoneypot] = useState("")

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
        "cf-turnstile-response": turnstileToken,
        website_url: honeypot,
      })

      // Session cookies are set by the signup response - straight into the trial dashboard
      router.push("/business")
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
        <AuthField
          label="Business Name"
          name="business_name"
          value={form.business_name}
          onChange={handleChange}
          placeholder="Acme Coffee Shop"
          required
          error={errors.business_name}
        />
        <AuthField
          label="Contact Name"
          name="contact_name"
          value={form.contact_name}
          onChange={handleChange}
          placeholder="John Doe"
          required
          error={errors.contact_name}
        />
        <AuthField
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
        <AuthField
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
          <Label htmlFor="address" className="mb-1.5 block">
            Business Address<span className="ml-0.5 text-red-500 dark:text-red-400">*</span>
          </Label>
          <AddressAutocomplete
            value={form.address}
            onChange={(value) => {
              setForm((prev) => ({ ...prev, address: value }))
              setErrors((prev) => ({ ...prev, address: undefined }))
              setServerError("")
            }}
            placeholder="Start typing an address..."
            className={cn(
              "flex h-10 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 shadow-sm outline-none transition-colors placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus-visible:ring-2 focus-visible:ring-[#05EB54]/30 focus-visible:border-[#05EB54]",
              errors.address && errorRing
            )}
          />
          {errors.address && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.address}</p>}
        </div>
        <AuthField
          label="Website"
          name="website"
          value={form.website}
          onChange={handleChange}
          placeholder="www.yourbusiness.com"
        />
        <AuthField
          label="Instagram"
          name="instagram"
          value={form.instagram}
          onChange={handleChange}
          placeholder="@yourbusiness"
        />

        <div className="mb-4">
          <Label htmlFor="description" className="mb-1.5 block">
            Business Description<span className="ml-0.5 text-red-500 dark:text-red-400">*</span>
          </Label>
          <Textarea
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
            className={cn("resize-none", errors.description && errorRing)}
          />
          {errors.description && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.description}</p>}
        </div>

        <div className="mb-4">
          <Label htmlFor="campus_id" className="mb-1.5 block">
            Campus<span className="ml-0.5 text-red-500 dark:text-red-400">*</span>
          </Label>
          <CampusCombobox
            id="campus_id"
            campuses={campuses}
            value={form.campus_id}
            onChange={(campusId) => {
              setForm((prev) => ({ ...prev, campus_id: campusId }))
              setErrors((prev) => ({ ...prev, campus_id: undefined }))
              setServerError("")
            }}
            error={!!errors.campus_id}
          />
          {errors.campus_id && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.campus_id}</p>}
        </div>

        <AuthPasswordField
          label="Password"
          name="password"
          value={form.password}
          onChange={handleChange}
          placeholder="Min 8 chars, 1 number, 1 letter"
          required
          autoComplete="new-password"
          error={errors.password}
        />
        <AuthPasswordField
          label="Confirm Password"
          name="confirm_password"
          value={form.confirm_password}
          onChange={handleChange}
          placeholder="Confirm your password"
          required
          autoComplete="new-password"
          error={errors.confirm_password}
        />

        {/* Honeypot - humans never see this, bots fill every field */}
        <input
          type="text"
          name="website_url"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          className="absolute -left-[9999px] h-0 w-0 opacity-0"
        />

        <div className="mb-4">
          <TurnstileWidget
            onVerify={setTurnstileToken}
            onExpire={() => setTurnstileToken("")}
          />
        </div>

        {serverError && (
          <AuthAlert tone="error" className="mb-4">
            {serverError}
          </AuthAlert>
        )}

        <AuthSubmit loading={loading}>Create Account</AuthSubmit>
      </form>

      <AuthFooterLink>
        Already have an account?{" "}
        <Link href="/business/login" className="font-medium text-[#05EB54] hover:underline">
          Log in
        </Link>
      </AuthFooterLink>
    </AuthCard>
  )
}
