"use client"

import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { apiClient } from "./api-client"
import type { BusinessUser, Business, AuthState, MeResponse } from "./types"

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within BusinessAuthProvider")
  return ctx
}

export function BusinessAuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<BusinessUser | null>(null)
  const [business, setBusiness] = useState<Business | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const isAuthenticated = !!user
  const isPending =
    !!business &&
    (business.status === "pending" || business.status === "pending_approval" || business.status === "pending_verification")

  const fetchMe = useCallback(async () => {
    try {
      const data = await apiClient.get<MeResponse>("/business/auth/me")
      setUser(data.user)
      setBusiness(data.business)
    } catch {
      // Access token may be expired — try refreshing before giving up
      try {
        await apiClient.authPost("/business/auth/refresh")
        const data = await apiClient.get<MeResponse>("/business/auth/me")
        setUser(data.user)
        setBusiness(data.business)
      } catch {
        setUser(null)
        setBusiness(null)
        document.cookie = "biz_session=; path=/business; max-age=0; SameSite=Lax"
      }
    }
  }, [])

  useEffect(() => {
    fetchMe().finally(() => setIsLoading(false))
  }, [fetchMe])

  const login = async (email: string, password: string) => {
    const data = await apiClient.authPost<{
      user: BusinessUser
      business: Business
    }>("/business/auth/login", { email, password })

    setUser(data.user)
    setBusiness(data.business)
    // biz_session cookie is now set by the server response
    router.push("/business")
  }

  const logout = async () => {
    try {
      await apiClient.authPost("/business/auth/logout")
    } catch {
      // Clear local state regardless
    }
    setUser(null)
    setBusiness(null)
    // Cooper (May 2026): defensively clear biz_session across path/domain variants.
    // Older deployments set this cookie host-only (no Domain attr); current backend
    // sets it with Domain=.bizzyu.com. If a user has a stale variant, the server's
    // single Set-Cookie clear can't match it and they stay "logged in" forever.
    const cookieClears = [
      "biz_session=; path=/business; max-age=0; SameSite=Lax",
      "biz_session=; path=/business; max-age=0; SameSite=Lax; domain=.bizzyu.com",
      "biz_session=; path=/business; max-age=0; SameSite=Lax; domain=bizzyu.com",
      "biz_session=; path=/; max-age=0; SameSite=Lax",
      "biz_session=; path=/; max-age=0; SameSite=Lax; domain=.bizzyu.com",
    ]
    cookieClears.forEach((c) => { document.cookie = c })
    // Hard navigation so middleware re-evaluates cookie state from a fresh request.
    window.location.href = "/business/login"
  }

  const refreshProfile = async () => {
    await fetchMe()
  }

  return (
    <AuthContext.Provider
      value={{ user, business, isLoading, isAuthenticated, isPending, login, logout, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  )
}
