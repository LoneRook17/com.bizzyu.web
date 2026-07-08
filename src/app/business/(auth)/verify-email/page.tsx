"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/business/v2/ui/button"
import {
  AuthAlert,
  AuthCard,
  AuthField,
  AuthFooterLink,
  AuthSpinner,
  AuthSubmit,
} from "@/components/business/v2/auth/auth-shell"
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
        <AuthSpinner />
      </AuthCard>
    )
  }

  if (status === "success") {
    return (
      <AuthCard title="Email verified!" subtitle="Your email address has been confirmed.">
        <AuthAlert tone="warning" className="mb-4">
          <p className="mb-1 font-semibold">Your account is pending approval</p>
          <p>
            You can explore your dashboard and build your first deal right away. It will go live
            once the Bizzy team approves your account. You&apos;ll get an email when that happens.
          </p>
        </AuthAlert>
        <Button asChild size="lg" className="w-full">
          <Link href="/business/login">Go to Login</Link>
        </Button>
      </AuthCard>
    )
  }

  if (status === "error") {
    return (
      <AuthCard title="Verification failed" subtitle={message}>
        <div className="space-y-4">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            The verification link may have expired. Enter your email to receive a new one.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleResend()
            }}
          >
            <AuthField
              label="Email"
              name="resendEmail"
              type="email"
              value={resendEmail}
              onChange={(e) => setResendEmail(e.target.value)}
              placeholder="you@business.com"
            />
            {resendSent ? (
              <AuthAlert tone="success">
                If an account exists, a new verification link has been sent.
              </AuthAlert>
            ) : (
              <AuthSubmit loading={resendLoading} disabled={!resendEmail}>
                Resend Verification Email
              </AuthSubmit>
            )}
          </form>
          <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
            <Link href="/business/login" className="font-medium text-[#05EB54] hover:underline">
              Back to Login
            </Link>
          </p>
        </div>
      </AuthCard>
    )
  }

  // pending - no token, just email
  return (
    <AuthCard title="Check your email" subtitle="We've sent a verification link to your email address.">
      <AuthAlert tone="info" className="mb-4">
        {emailParam ? (
          <>
            A verification link has been sent to <strong>{emailParam}</strong>.
          </>
        ) : (
          "Please check your inbox for the verification link."
        )}
      </AuthAlert>
      <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
        Didn&apos;t receive the email? Check your spam folder or resend it below.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleResend()
        }}
      >
        <AuthField
          label="Email"
          name="resendEmail"
          type="email"
          value={resendEmail}
          onChange={(e) => setResendEmail(e.target.value)}
          placeholder="you@business.com"
        />
        {resendSent ? (
          <AuthAlert tone="success" className="mb-4">
            If an account exists, a new verification link has been sent.
          </AuthAlert>
        ) : (
          <div className="mb-4">
            <AuthSubmit loading={resendLoading} disabled={!resendEmail}>
              Resend Verification Email
            </AuthSubmit>
          </div>
        )}
      </form>

      <AuthFooterLink>
        <Link href="/business/login" className="font-medium text-[#05EB54] hover:underline">
          Back to Login
        </Link>
      </AuthFooterLink>
    </AuthCard>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <AuthCard title="Loading..." subtitle="">
          <AuthSpinner />
        </AuthCard>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  )
}
