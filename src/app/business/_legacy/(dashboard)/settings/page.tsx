"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useAuth } from "@/lib/business/auth-context"
import { apiClient } from "@/lib/business/api-client"
import LogoUpload from "@/components/business/dashboard/LogoUpload"
import ProfileForm from "@/components/business/dashboard/ProfileForm"
import StripeConnectCard, { StripeReturnBanner } from "@/components/business/dashboard/StripeConnectCard"
import VenueManagementSection from "@/components/business/dashboard/VenueManagementSection"
import type { BusinessProfile } from "@/lib/business/types"

export default function SettingsPage() {
  const { user, business, refreshProfile } = useAuth()
  const role = user?.business_role
  const searchParams = useSearchParams()
  const router = useRouter()
  const stripeParam = searchParams.get("stripe")

  const [profile, setProfile] = useState<BusinessProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [resetSent, setResetSent] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

  const canEdit = role === "owner" || role === "manager"

  const fetchProfile = useCallback(async () => {
    try {
      const data = await apiClient.get<BusinessProfile>("/business/profile")
      setProfile(data)
    } catch {
      // Silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (role !== "promoter") {
      fetchProfile()
    } else {
      setLoading(false)
    }
  }, [role, fetchProfile])

  const handleProfileSaved = () => {
    fetchProfile()
    refreshProfile()
  }

  const handleLogoUploaded = () => {
    fetchProfile()
    refreshProfile()
  }

  const handlePasswordReset = async () => {
    if (!business?.email) return
    setResetLoading(true)
    try {
      await apiClient.authPost("/business/auth/forgot-password", { email: business.email })
    } catch {
      // Always show success
    } finally {
      setResetLoading(false)
      setResetSent(true)
    }
  }

  // Promoter — no access
  if (role === "promoter") {
    return (
      <div>
        <h1 className="text-xl font-bold text-ink mb-2">Settings</h1>
        <p className="text-sm text-gray-500">Settings are available to owners and managers.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-2xl animate-pulse space-y-6">
        <div className="h-6 bg-gray-200 rounded w-32" />
        <div className="flex justify-center"><div className="h-28 w-28 rounded-full bg-gray-200" /></div>
        <div className="h-64 bg-gray-200 rounded-xl" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div>
        <h1 className="text-xl font-bold text-ink mb-2">Settings</h1>
        <p className="text-sm text-red-500">Failed to load profile.</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-bold text-ink mb-6">Settings</h1>

      {/* Venues */}
      <VenueManagementSection />

      {/* Divider + Business Settings header */}
      <div className="border-t border-gray-200 pt-6 mb-4">
        <h2 className="text-sm font-semibold text-ink">Business Settings</h2>
        <p className="text-xs text-gray-500 mt-0.5">These settings apply to your entire business across all venues</p>
      </div>

      {/* Stripe Connect */}
      {(stripeParam === "return" || stripeParam === "refresh") && (
        <StripeReturnBanner onComplete={() => {
          fetchProfile()
          refreshProfile()
          // Clean the query string
          router.replace("/business/settings")
        }} />
      )}
      <div id="stripe-connect" className="mb-4 scroll-mt-20">
        <StripeConnectCard
          onboarded={profile.stripe_connect_onboarded}
          onOnboardingComplete={() => {
            fetchProfile()
            refreshProfile()
          }}
        />
      </div>

      {/* Business Photo */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 mb-4 flex justify-center">
        <LogoUpload
          currentUrl={profile.logo_image_url}
          onUploaded={handleLogoUploaded}
          disabled={!canEdit}
        />
      </div>

      {/* Business Info */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 mb-4">
        <h2 className="text-sm font-semibold text-ink mb-4">Business Information</h2>
        <ProfileForm
          profile={profile}
          onSaved={handleProfileSaved}
          disabled={!canEdit}
        />
      </div>

      {/* Security */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 mb-4">
        <h2 className="text-sm font-semibold text-ink mb-3">Security</h2>
        <p className="text-sm text-gray-500 mb-3">
          To change your password, we&apos;ll send a reset link to your email address.
        </p>
        {resetSent ? (
          <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
            Password reset email sent to {business?.email}. Check your inbox.
          </div>
        ) : (
          <button
            onClick={handlePasswordReset}
            disabled={resetLoading}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-60"
          >
            {resetLoading ? "Sending..." : "Send Password Reset Email"}
          </button>
        )}
      </div>

      {/* Danger Zone */}
      <div className="rounded-xl border border-red-200 bg-red-50/30 p-5">
        <h2 className="text-sm font-semibold text-red-700 mb-2">Danger Zone</h2>
        <p className="text-sm text-gray-600 mb-1">
          Need to remove your business account? Contact our support team.
        </p>
        <p className="text-xs text-gray-400">
          Account removal requests are reviewed within 48 hours. Your data will be retained for 30 days before permanent deletion.
        </p>
      </div>
    </div>
  )
}
