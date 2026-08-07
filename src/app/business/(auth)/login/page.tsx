"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  AuthAlert,
  AuthCard,
  AuthField,
  AuthFooterLink,
  AuthPasswordField,
  AuthSubmit,
} from "@/components/business/v2/auth/auth-shell"
import { apiClient } from "@/lib/business/api-client"
import { loginErrorMessage } from "@/lib/business/login-error"
import { safeNextPath } from "@/lib/business/login-redirect"
import type { LoginResponse } from "@/lib/business/types"

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <AuthCard title="Welcome back" subtitle="Log in to your business dashboard">
          <div />
        </AuthCard>
      }
    >
      <LoginPageInner />
    </Suspense>
  )
}

function LoginPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const justRegistered = searchParams.get("registered") === "1"
  // Where the middleware was taking them before the login wall. Untrusted
  // query input, so it is validated down to a same-origin dashboard path;
  // anything else resolves to the dashboard root exactly as before.
  const nextPath = safeNextPath(searchParams.get("next"))
  const [form, setForm] = useState({ email: "", password: "" })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setError("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      await apiClient.authPost<LoginResponse>("/business/auth/login", {
        email: form.email,
        password: form.password,
      })

      router.push(nextPath)
    } catch (err) {
      setError(loginErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthCard title="Welcome back" subtitle="Log in to your business dashboard">
      {justRegistered && !error && (
        <AuthAlert tone="success" className="mb-4">
          Application submitted. You&apos;ll receive an email once approved.
        </AuthAlert>
      )}
      <form onSubmit={handleSubmit}>
        <AuthField
          label="Email"
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          placeholder="you@business.com"
          required
          autoComplete="email"
        />
        <AuthPasswordField
          label="Password"
          name="password"
          value={form.password}
          onChange={handleChange}
          placeholder="Enter your password"
          required
          autoComplete="current-password"
        />

        <div className="mb-4 text-right">
          <Link
            href="/business/forgot-password"
            className="text-xs font-medium text-[#05EB54] hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        {error && (
          <AuthAlert tone="error" className="mb-4">
            {error}
          </AuthAlert>
        )}

        <AuthSubmit loading={loading}>Log In</AuthSubmit>
      </form>

      <AuthFooterLink>
        Don&apos;t have an account?{" "}
        <Link href="/business/signup" className="font-medium text-[#05EB54] hover:underline">
          Sign up
        </Link>
      </AuthFooterLink>
    </AuthCard>
  )
}
