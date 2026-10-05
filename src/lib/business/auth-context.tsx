"use client"

import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { apiClient } from "./api-client"
import { clearBizSession } from "./cookies"
import { safeNextPath } from "./login-redirect"
import { performBusinessSwitch, readAvailableBusinesses } from "./business-switcher"
import type { BusinessUser, Business, BusinessSummary, AuthState, MeResponse } from "./types"

interface AuthContextValue extends AuthState {
  /**
   * `destination` is optional and defaults to the dashboard root, so existing
   * behaviour is unchanged for any caller that omits it. It is passed through
   * the same safeNextPath guard the login page uses, so an untrusted value
   * (e.g. a ?next= param) can be handed straight in.
   */
  login: (email: string, password: string, destination?: string | null) => Promise<void>
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>
  applyBusinessPatch: (patch: Partial<Business>) => void
  /**
   * Switch the dashboard session to another business in `availableBusinesses`.
   * On success the page hard-navigates to /business. On failure it rejects and
   * the current session is untouched, so the caller only has to reset its UI.
   */
  switchBusiness: (businessId: number) => Promise<void>
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
  const [availableBusinesses, setAvailableBusinesses] = useState<BusinessSummary[]>([])
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
      setAvailableBusinesses(readAvailableBusinesses(data.available_businesses))
    } catch {
      // Access token may be expired - try refreshing before giving up
      try {
        await apiClient.authPost("/business/auth/refresh")
        const data = await apiClient.get<MeResponse>("/business/auth/me")
        setUser(data.user)
        setBusiness(data.business)
        setAvailableBusinesses(readAvailableBusinesses(data.available_businesses))
      } catch {
        setUser(null)
        setBusiness(null)
        setAvailableBusinesses([])
        // Cooper (May 2026): use multi-variant clear so stale biz_session
        // cookies (set with different domain/path by older deployments) are
        // actually removed - otherwise middleware keeps the user "logged in"
        // and we get a redirect loop.
        clearBizSession()
      }
    }
  }, [])

  useEffect(() => {
    fetchMe().finally(() => setIsLoading(false))
  }, [fetchMe])

  const login = async (email: string, password: string, destination?: string | null) => {
    const data = await apiClient.authPost<{
      user: BusinessUser
      business: Business
    }>("/business/auth/login", { email, password })

    setUser(data.user)
    setBusiness(data.business)
    // biz_session cookie is now set by the server response.
    // safeNextPath(undefined) === "/business", so omitting `destination` keeps
    // the pre-existing behaviour byte for byte.
    router.push(safeNextPath(destination))
  }

  const logout = async () => {
    try {
      await apiClient.authPost("/business/auth/logout")
    } catch {
      // Clear local state regardless
    }
    setUser(null)
    setBusiness(null)
    setAvailableBusinesses([])
    // Cooper (May 2026): see clearBizSession in lib/business/cookies.ts.
    clearBizSession()
    // Hard navigation so middleware re-evaluates cookie state from a fresh request.
    window.location.href = "/business/login"
  }

  const refreshProfile = async () => {
    await fetchMe()
  }

  const applyBusinessPatch = (patch: Partial<Business>) => {
    setBusiness((prev) => (prev ? { ...prev, ...patch } : prev))
  }

  // Fail closed: a refused switch rejects before anything local changes. The
  // hard navigation (not router.push) is what resets every provider and drops
  // a ?venue_id that belonged to the business being left.
  const switchBusiness = (businessId: number) =>
    performBusinessSwitch(businessId, {
      post: (path, body) => apiClient.post(path, body),
      storage: typeof window !== "undefined" ? window.localStorage : null,
      navigate: (path) => {
        window.location.href = path
      },
    })

  return (
    <AuthContext.Provider
      value={{
        user,
        business,
        availableBusinesses,
        isLoading,
        isAuthenticated,
        isPending,
        login,
        logout,
        refreshProfile,
        applyBusinessPatch,
        switchBusiness,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
