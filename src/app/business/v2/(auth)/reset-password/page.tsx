"use client"

import { useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/business/v2/ui/button"
import {
  AuthAlert,
  AuthCard,
  AuthFooterLink,
  AuthPasswordField,
  AuthSubmit,
} from "@/components/business/v2/auth/auth-shell"
import { apiClient, ApiError } from "@/lib/business/api-client"

function ResetPasswordContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [form, setForm] = useState({ password: "", confirm_password: "" })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setErrors({})
    setServerError("")
  }

  if (!token) {
    return (
      <AuthCard title="Invalid link" subtitle="This password reset link is invalid or has expired.">
        <Button asChild size="lg" className="w-full">
          <Link href="/business/v2/forgot-password">Request a New Reset Link</Link>
        </Button>
      </AuthCard>
    )
  }

  if (success) {
    return (
      <AuthCard title="Password reset!" subtitle="Your password has been updated successfully.">
        <Button asChild size="lg" className="w-full">
          <Link href="/business/v2/login">Go to Login</Link>
        </Button>
      </AuthCard>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
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
      await apiClient.authPost("/business/auth/reset-password", {
        token,
        password: form.password,
      })
      setSuccess(true)
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
    <AuthCard title="Set new password" subtitle="Enter your new password below.">
      <form onSubmit={handleSubmit}>
        <AuthPasswordField
          label="New Password"
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

        {serverError && (
          <AuthAlert tone="error" className="mb-4">
            {serverError}
          </AuthAlert>
        )}

        <AuthSubmit loading={loading}>Reset Password</AuthSubmit>
      </form>

      <AuthFooterLink>
        <Link href="/business/v2/login" className="font-medium text-[#05EB54] hover:underline">
          Back to Login
        </Link>
      </AuthFooterLink>
    </AuthCard>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordContent />
    </Suspense>
  )
}
