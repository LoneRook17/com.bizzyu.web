"use client"

import { useState } from "react"
import Link from "next/link"
import AuthCard from "@/components/business/auth/AuthCard"
import FormInput from "@/components/business/auth/FormInput"
import AuthSubmitButton from "@/components/business/auth/AuthSubmitButton"
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
          <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700">
            If an account exists with this email, a password reset link has been sent. Please check your inbox.
          </div>
          <p className="text-center text-sm text-gray-500">
            <Link href="/business/login" className="text-primary hover:underline">
              Back to Login
            </Link>
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <FormInput
            label="Email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@business.com"
            required
            autoComplete="email"
          />
          <AuthSubmitButton loading={loading}>Send Reset Link</AuthSubmitButton>

          <p className="mt-6 text-center text-sm text-gray-500">
            <Link href="/business/login" className="text-primary hover:underline">
              Back to Login
            </Link>
          </p>
        </form>
      )}
    </AuthCard>
  )
}
