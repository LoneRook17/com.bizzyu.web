"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import AuthCard from "@/components/business/auth/AuthCard"
import FormInput from "@/components/business/auth/FormInput"
import FormPasswordInput from "@/components/business/auth/FormPasswordInput"
import AuthSubmitButton from "@/components/business/auth/AuthSubmitButton"
import { apiClient, ApiError } from "@/lib/business/api-client"
import type { LoginResponse } from "@/lib/business/types"

export default function LoginPage() {
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

      // biz_session cookie is set by the server (httpOnly=false, for Next.js middleware routing)
      router.push("/business")
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
        <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">
          Application submitted. You&apos;ll receive an email once approved.
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <FormInput
          label="Email"
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          placeholder="you@business.com"
          required
          autoComplete="email"
        />
        <FormPasswordInput
          label="Password"
          name="password"
          value={form.password}
          onChange={handleChange}
          placeholder="Enter your password"
          required
          autoComplete="current-password"
        />

        <div className="mb-4 text-right">
          <Link href="/business/forgot-password" className="text-xs text-primary hover:underline">
            Forgot password?
          </Link>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <AuthSubmitButton loading={loading}>Log In</AuthSubmitButton>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Don&apos;t have an account?{" "}
        <Link href="/business/signup" className="text-primary font-medium hover:underline">
          Sign up
        </Link>
      </p>
    </AuthCard>
  )
}
