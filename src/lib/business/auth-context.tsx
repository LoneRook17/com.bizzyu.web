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
    document.cookie = "biz_session=; path=/business; max-age=0; SameSite=Lax"
    router.push("/business/login")
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
