"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import AuthCard from "@/components/business/auth/AuthCard"
import AuthSubmitButton from "@/components/business/auth/AuthSubmitButton"
import FormInput from "@/components/business/auth/FormInput"
import { apiClient, ApiError } from "@/lib/business/api-client"

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const emailParam = searchParams.get("email")

  const [status, setStatus] = useState<"pending" | "verifying" | "success" | "error">(
    token ? "verifying" : "pending"
  )
  const [message, setMessage] = useState("")
  const [resendEmail, setResendEmail] = useState(emailParam || "")
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSent, setResendSent] = useState(false)

  const verifyToken = useCallback(async () => {
    if (!token) return
    try {
      await apiClient.authPost("/business/auth/verify-email", { token })
      setStatus("success")
      setMessage("Your email has been verified! Your business is now pending admin approval.")
    } catch (err) {
      setStatus("error")
      if (err instanceof ApiError) {
        setMessage(err.message)
      } else {
        setMessage("Verification failed. Please try again.")
      }
    }
  }, [token])

  useEffect(() => {
    if (token) verifyToken()
  }, [token, verifyToken])

  const handleResend = async () => {
    if (!resendEmail) return
    setResendLoading(true)
    try {
      await apiClient.authPost("/business/auth/resend-verification", { email: resendEmail })
      setResendSent(true)
    } catch {
      // Always show success to prevent email enumeration
      setResendSent(true)
    } finally {
      setResendLoading(false)
    }
  }

  if (status === "verifying") {
    return (
      <AuthCard title="Verifying your email" subtitle="Please wait...">
        <div className="flex justify-center py-8">
          <svg className="h-8 w-8 animate-spin text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      </AuthCard>
    )
  }

  if (status === "success") {
    return (
      <AuthCard title="Email Verified!" subtitle="Your email address has been confirmed.">
        <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4 text-sm text-yellow-800 mb-4">
          <p className="font-semibold mb-1">Your account is pending approval</p>
          <p>
            Your business account is now under review by the Bizzy team. You&apos;ll receive an
            email once your account has been approved and is ready to use.
          </p>
        </div>
        <Link
          href="/business/login"
          className="block w-full rounded-lg bg-gradient-to-br from-[#2ECB4E] to-[#05EB54] px-4 py-2.5 text-center text-sm font-semibold text-white shadow-md shadow-primary/25 transition-all hover:brightness-110"
        >
          Go to Login
        </Link>
      </AuthCard>
    )
  }

  if (status === "error") {
    return (
      <AuthCard title="Verification failed" subtitle={message}>
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            The verification link may have expired. Enter your email to receive a new one.
          </p>
          <FormInput
            label="Email"
            name="resendEmail"
            type="email"
            value={resendEmail}
            onChange={(e) => setResendEmail(e.target.value)}
            placeholder="you@business.com"
          />
          {resendSent ? (
            <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
              If an account exists, a new verification link has been sent.
            </div>
          ) : (
            <AuthSubmitButton loading={resendLoading} disabled={!resendEmail}>
              Resend Verification Email
            </AuthSubmitButton>
          )}
          <p className="text-center text-sm text-gray-500">
            <Link href="/business/login" className="text-primary hover:underline">
              Back to Login
            </Link>
          </p>
        </div>
      </AuthCard>
    )
  }

  // pending — no token, just email
  return (
    <AuthCard title="Check your email" subtitle="We've sent a verification link to your email address.">
      <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-700 mb-4">
        {emailParam ? (
          <>A verification link has been sent to <strong>{emailParam}</strong>.</>
        ) : (
          "Please check your inbox for the verification link."
        )}
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Didn&apos;t receive the email? Check your spam folder or resend it below.
      </p>

      <FormInput
        label="Email"
        name="resendEmail"
        type="email"
        value={resendEmail}
        onChange={(e) => setResendEmail(e.target.value)}
        placeholder="you@business.com"
      />
      {resendSent ? (
        <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700 mb-4">
          If an account exists, a new verification link has been sent.
        </div>
      ) : (
        <div className="mb-4">
          <AuthSubmitButton loading={resendLoading} disabled={!resendEmail}>
            Resend Verification Email
          </AuthSubmitButton>
        </div>
      )}

      <p className="text-center text-sm text-gray-500">
        <Link href="/business/login" className="text-primary hover:underline">
          Back to Login
        </Link>
      </p>
    </AuthCard>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <AuthCard title="Loading..." subtitle="">
        <div className="flex justify-center py-8">
          <svg className="h-8 w-8 animate-spin text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      </AuthCard>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}
