"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import AuthCard from "@/components/business/auth/AuthCard"
import FormInput from "@/components/business/auth/FormInput"
import FormPasswordInput from "@/components/business/auth/FormPasswordInput"
import AuthSubmitButton from "@/components/business/auth/AuthSubmitButton"
import { apiClient, ApiError } from "@/lib/business/api-client"

function AcceptInviteContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [form, setForm] = useState({ full_name: "", phone: "", password: "", confirm_password: "" })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setErrors({})
    setServerError("")
  }

  if (!token) {
    return (
      <AuthCard title="Invalid invite" subtitle="This invite link is invalid or has expired.">
        <Link
          href="/business/login"
          className="block w-full rounded-lg bg-gradient-to-br from-[#2ECB4E] to-[#05EB54] px-4 py-2.5 text-center text-sm font-semibold text-white shadow-md shadow-primary/25 transition-all hover:brightness-110"
        >
          Go to Login
        </Link>
      </AuthCard>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!form.full_name.trim()) errs.full_name = "Full name is required"
    const digits = form.phone.replace(/\D/g, "")
    if (digits.length < 10) errs.phone = "Please enter a valid phone number"
    if (form.password.length < 8) errs.password = "Password must be at least 8 characters"
    else if (!/\d/.test(form.password)) errs.password = "Password must contain at least 1 number"
    else if (!/[a-zA-Z]/.test(form.password)) errs.password = "Password must contain at least 1 letter"
    if (form.password !== form.confirm_password) errs.confirm_password = "Passwords do not match"

    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }

    setLoading(true)
    try {
      await apiClient.authPost("/business/auth/accept-invite", {
        token,
        password: form.password,
        full_name: form.full_name,
        phone: form.phone,
      })

      // biz_session cookie is now set by the server response
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
    <AuthCard title="Join your team" subtitle="Set up your account to access the business dashboard.">
      <form onSubmit={handleSubmit}>
        <FormInput
          label="Full Name"
          name="full_name"
          value={form.full_name}
          onChange={handleChange}
          placeholder="John Doe"
          required
          autoComplete="name"
          error={errors.full_name}
        />
        <FormInput
          label="Phone Number"
          name="phone"
          type="tel"
          value={form.phone}
          onChange={handleChange}
          placeholder="(555) 123-4567"
          required
          autoComplete="tel"
          error={errors.phone}
        />
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
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{serverError}</div>
        )}

        <AuthSubmitButton loading={loading}>Accept Invite</AuthSubmitButton>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Already have an account?{" "}
        <Link href="/business/login" className="text-primary hover:underline">
          Log in
        </Link>
      </p>
    </AuthCard>
  )
}

export default function AcceptInvitePage() {
  return (
    <Suspense>
      <AcceptInviteContent />
    </Suspense>
  )
}
