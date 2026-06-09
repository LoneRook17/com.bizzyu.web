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
import { apiClient, ApiError } from "@/lib/business/api-client"
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

      router.push("/business/v2")
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 403 && err.message.toLowerCase().includes("verify")) {
          setError("Please verify your email before logging in.")
        } else if (err.status === 403) {
          setError(err.message)
        } else if (err.status === 401) {
          setError("Invalid email or password.")
        } else {
          setError(err.message)
        }
      } else {
        setError("Something went wrong. Please try again.")
      }
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
            href="/business/v2/forgot-password"
            className="text-xs font-medium text-[#079455] hover:underline"
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
        <Link href="/business/v2/signup" className="font-medium text-[#079455] hover:underline">
          Sign up
        </Link>
      </AuthFooterLink>
    </AuthCard>
  )
}
