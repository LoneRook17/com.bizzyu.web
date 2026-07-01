"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/business/v2/ui/button"
import {
  AuthAlert,
  AuthCard,
  AuthField,
  AuthFooterLink,
  AuthPasswordField,
  AuthSubmit,
} from "@/components/business/v2/auth/auth-shell"
import { apiClient, ApiError } from "@/lib/business/api-client"

interface InviteInfo {
  business_name: string
  role: string
  email: string
  account_exists: boolean
}

function AcceptInviteContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null)
  const [inviteLoading, setInviteLoading] = useState(true)
  const [inviteError, setInviteError] = useState("")

  const [form, setForm] = useState({ full_name: "", phone: "", password: "", confirm_password: "" })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!token) {
      setInviteLoading(false)
      return
    }
    apiClient
      .get<InviteInfo>(`/business/auth/invite-info?token=${encodeURIComponent(token)}`)
      .then((data) => setInviteInfo(data))
      .catch(() => setInviteError("This invite link is invalid or has expired."))
      .finally(() => setInviteLoading(false))
  }, [token])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setErrors({})
    setServerError("")
  }

  if (!token || (!inviteLoading && inviteError)) {
    return (
      <AuthCard title="Invalid invite" subtitle={inviteError || "This invite link is invalid or has expired."}>
        <Button asChild size="lg" className="w-full">
          <Link href="/business/v2/login">Go to Login</Link>
        </Button>
      </AuthCard>
    )
  }

  if (inviteLoading) {
    return (
      <AuthCard title="Checking your invite..." subtitle="">
        <div className="flex justify-center py-4">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </AuthCard>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}

    if (inviteInfo?.account_exists) {
      if (!form.password) errs.password = "Password is required"
    } else {
      if (!form.full_name.trim()) errs.full_name = "Full name is required"
      const digits = form.phone.replace(/\D/g, "")
      if (digits.length < 10) errs.phone = "Please enter a valid phone number"
      if (form.password.length < 8) errs.password = "Password must be at least 8 characters"
      else if (!/\d/.test(form.password)) errs.password = "Password must contain at least 1 number"
      else if (!/[a-zA-Z]/.test(form.password)) errs.password = "Password must contain at least 1 letter"
      if (form.password !== form.confirm_password) errs.confirm_password = "Passwords do not match"
    }

    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }

    setLoading(true)
    try {
      const payload: Record<string, string> = { token: token!, password: form.password }
      if (!inviteInfo?.account_exists) {
        payload.full_name = form.full_name
        payload.phone = form.phone
      }

      await apiClient.authPost("/business/auth/accept-invite", payload)
      router.push("/business/v2")
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

  if (inviteInfo?.account_exists) {
    return (
      <AuthCard
        title={`Join ${inviteInfo.business_name}`}
        subtitle={`You already have a Bizzy account (${inviteInfo.email}). Enter your password to accept this invite.`}
      >
        <form onSubmit={handleSubmit}>
          <AuthPasswordField
            label="Your Bizzy Password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Enter your existing password"
            required
            autoComplete="current-password"
            error={errors.password}
          />

          {serverError && (
            <AuthAlert tone="error" className="mb-4">
              {serverError}
            </AuthAlert>
          )}

          <AuthSubmit loading={loading}>Accept Invite</AuthSubmit>
        </form>

        <AuthFooterLink>
          Wrong account?{" "}
          <Link href="/business/v2/login" className="font-medium text-[#05EB54] hover:underline">
            Log in with a different account
          </Link>
        </AuthFooterLink>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title={inviteInfo ? `Join ${inviteInfo.business_name}` : "Join your team"}
      subtitle="Set up your account to access the business dashboard."
    >
      <form onSubmit={handleSubmit}>
        <AuthField
          label="Full Name"
          name="full_name"
          value={form.full_name}
          onChange={handleChange}
          placeholder="John Doe"
          required
          autoComplete="name"
          error={errors.full_name}
        />
        <AuthField
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

        {serverError && (
          <AuthAlert tone="error" className="mb-4">
            {serverError}
          </AuthAlert>
        )}

        <AuthSubmit loading={loading}>Accept Invite</AuthSubmit>
      </form>

      <AuthFooterLink>
        Already have an account?{" "}
        <Link href="/business/v2/login" className="font-medium text-[#05EB54] hover:underline">
          Log in
        </Link>
      </AuthFooterLink>
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
