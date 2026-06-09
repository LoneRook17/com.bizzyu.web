"use client"

import { useState } from "react"
import Link from "next/link"
import {
  AuthAlert,
  AuthCard,
  AuthField,
  AuthFooterLink,
  AuthSubmit,
} from "@/components/business/v2/auth/auth-shell"
import { apiClient } from "@/lib/business/api-client"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setLoading(true)
    try {
      await apiClient.authPost("/business/auth/forgot-password", { email })
    } catch {
      // Always show success to prevent email enumeration
    } finally {
      setLoading(false)
      setSent(true)
    }
  }

  return (
    <AuthCard title="Reset your password" subtitle="Enter your email and we'll send you a reset link.">
      {sent ? (
        <div className="space-y-4">
          <AuthAlert tone="success">
            If an account exists with this email, a password reset link has been sent. Please check
            your inbox.
          </AuthAlert>
          <p className="text-center text-sm text-neutral-500">
            <Link href="/business/v2/login" className="font-medium text-[#079455] hover:underline">
              Back to Login
            </Link>
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <AuthField
            label="Email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@business.com"
            required
            autoComplete="email"
          />
          <AuthSubmit loading={loading}>Send Reset Link</AuthSubmit>

          <AuthFooterLink>
            <Link href="/business/v2/login" className="font-medium text-[#079455] hover:underline">
              Back to Login
            </Link>
          </AuthFooterLink>
        </form>
      )}
    </AuthCard>
  )
}
