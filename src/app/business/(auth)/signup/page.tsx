"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import AuthCard from "@/components/business/auth/AuthCard"
import FormInput from "@/components/business/auth/FormInput"
import FormPasswordInput from "@/components/business/auth/FormPasswordInput"
import AuthSubmitButton from "@/components/business/auth/AuthSubmitButton"
import { apiClient, ApiError } from "@/lib/business/api-client"
import { CAMPUSES } from "@/lib/business/constants"

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
  const [addressPredictions, setAddressPredictions] = useState<{ description: string; place_id: string }[]>([])
  const [showPredictions, setShowPredictions] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const addressWrapperRef = useRef<HTMLDivElement>(null)

  // Phone verification state
  const [phoneVerified, setPhoneVerified] = useState(false)
  const [codeSent, setCodeSent] = useState(false)
  const [verifyCode, setVerifyCode] = useState("")
  const [phoneError, setPhoneError] = useState("")
  const [sendingCode, setSendingCode] = useState(false)
  const [verifyingCode, setVerifyingCode] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (addressWrapperRef.current && !addressWrapperRef.current.contains(e.target as Node)) {
        setShowPredictions(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Cooldown timer for resend
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  const onAddressChange = (value: string) => {
    setForm((prev) => ({ ...prev, address: value }))
    setErrors((prev) => ({ ...prev, address: undefined }))
    setServerError("")

    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (value.trim().length < 3) {
      setAddressPredictions([])
      setShowPredictions(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/places-autocomplete?input=${encodeURIComponent(value)}`)
        const data = await res.json()
        setAddressPredictions(data.predictions ?? [])
        setShowPredictions((data.predictions ?? []).length > 0)
      } catch {
        setAddressPredictions([])
      }
    }, 400)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setErrors((prev) => ({ ...prev, [e.target.name]: undefined }))
    setServerError("")
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setForm((prev) => ({ ...prev, phone: value }))
    setPhoneError("")
    // If phone changes after verification, reset verification
    if (phoneVerified) {
      setPhoneVerified(false)
      setCodeSent(false)
      setVerifyCode("")
    }
  }

  const sendCode = async () => {
    const digits = form.phone.replace(/\D/g, "")
    if (digits.length < 10) {
      setPhoneError("Enter a valid phone number")
      return
    }

    setSendingCode(true)
    setPhoneError("")
    try {
      await apiClient.authPost("/business/auth/send-phone-code", { phone: form.phone })
      setCodeSent(true)
      setCooldown(60)
    } catch (err) {
      setPhoneError(err instanceof ApiError ? err.message : "Failed to send code")
    } finally {
      setSendingCode(false)
    }
  }

  const verifyPhone = async () => {
    if (verifyCode.length !== 6) {
      setPhoneError("Enter the 6-digit code")
      return
    }

    setVerifyingCode(true)
    setPhoneError("")
    try {
      await apiClient.authPost("/business/auth/verify-phone-code", {
        phone: form.phone,
        code: verifyCode,
      })
      setPhoneVerified(true)
      setCodeSent(false)
    } catch (err) {
      setPhoneError(err instanceof ApiError ? err.message : "Verification failed")
    } finally {
      setVerifyingCode(false)
    }
  }

  const validate = (): boolean => {
    const errs: Partial<Record<keyof FormState, string>> = {}

    if (!form.business_name.trim()) errs.business_name = "Business name is required"
    if (!form.contact_name.trim()) errs.contact_name = "Contact name is required"
    if (!form.email.trim()) errs.email = "Email is required"
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Invalid email format"
    if (!form.phone.trim()) {
      errs.phone = "Phone number is required"
    } else if (!phoneVerified) {
      errs.phone = "Phone number must be verified"
    }
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
        phone: form.phone || undefined,
        campus_id: Number(form.campus_id),
        address: form.address,
        website: form.website || undefined,
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

        {/* Phone with verification */}
        <div className="mb-4">
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
            Phone<span className="text-red-500 ml-0.5">*</span>
          </label>
          <div className="flex gap-2">
            <input
              id="phone"
              name="phone"
              type="tel"
              value={form.phone}
              onChange={handlePhoneChange}
              placeholder="(555) 123-4567"
              autoComplete="tel"
              disabled={phoneVerified}
              className={`flex-1 rounded-lg border px-3 py-2.5 text-sm transition-colors outline-none
                ${errors.phone || phoneError ? "border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500" : "border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"}
                ${phoneVerified ? "bg-gray-50 text-gray-500 cursor-not-allowed" : "bg-white text-ink"}`}
            />
            {!phoneVerified && !codeSent && (
              <button
                type="button"
                onClick={sendCode}
                disabled={sendingCode || form.phone.replace(/\D/g, "").length < 10}
                className="px-4 py-2.5 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap transition-colors"
              >
                {sendingCode ? "Sending..." : "Verify"}
              </button>
            )}
            {phoneVerified && (
              <div className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Verified
              </div>
            )}
          </div>

          {/* Code input */}
          {codeSent && !phoneVerified && (
            <div className="mt-2">
              <p className="text-xs text-gray-500 mb-2">
                Enter the 6-digit code sent to {form.phone}
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={verifyCode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 6)
                    setVerifyCode(val)
                    setPhoneError("")
                  }}
                  placeholder="000000"
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-center tracking-widest font-mono outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white text-ink"
                />
                <button
                  type="button"
                  onClick={verifyPhone}
                  disabled={verifyingCode || verifyCode.length !== 6}
                  className="px-4 py-2.5 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap transition-colors"
                >
                  {verifyingCode ? "Checking..." : "Submit"}
                </button>
              </div>
              <button
                type="button"
                onClick={sendCode}
                disabled={cooldown > 0 || sendingCode}
                className="mt-2 text-xs text-primary hover:underline disabled:text-gray-400 disabled:no-underline disabled:cursor-not-allowed"
              >
                {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
              </button>
            </div>
          )}

          {(errors.phone || phoneError) && (
            <p className="mt-1 text-xs text-red-500">{errors.phone || phoneError}</p>
          )}
        </div>

        <div className="mb-4 relative" ref={addressWrapperRef}>
          <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
            Business Address<span className="text-red-500 ml-0.5">*</span>
          </label>
          <input
            id="address"
            name="address"
            type="text"
            value={form.address}
            onChange={(e) => onAddressChange(e.target.value)}
            onFocus={() => addressPredictions.length > 0 && setShowPredictions(true)}
            placeholder="Start typing an address..."
            autoComplete="off"
            className={`w-full rounded-lg border px-3 py-2.5 text-sm transition-colors outline-none bg-white text-ink
              ${errors.address ? "border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500" : "border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"}`}
          />
          {showPredictions && addressPredictions.length > 0 && (
            <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {addressPredictions.map((p) => (
                <li
                  key={p.place_id}
                  className="px-3 py-2.5 text-sm cursor-pointer hover:bg-gray-50 flex items-center gap-2"
                  onMouseDown={() => {
                    setForm((prev) => ({ ...prev, address: p.description }))
                    setAddressPredictions([])
                    setShowPredictions(false)
                    setErrors((prev) => ({ ...prev, address: undefined }))
                  }}
                >
                  <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="truncate">{p.description}</span>
                </li>
              ))}
            </ul>
          )}
          {errors.address && <p className="mt-1 text-xs text-red-500">{errors.address}</p>}
        </div>
        <FormInput
          label="Website"
          name="website"
          type="url"
          value={form.website}
          onChange={handleChange}
          placeholder="https://yourbusiness.com"
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
            {CAMPUSES.map((c) => (
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
