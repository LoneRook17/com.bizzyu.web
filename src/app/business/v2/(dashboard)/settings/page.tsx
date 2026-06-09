"use client"

import { Suspense, useState, useEffect, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { CheckCircle2 } from "lucide-react"
import { useAuth } from "@/lib/business/auth-context"
import { apiClient } from "@/lib/business/api-client"
import type { BusinessProfile } from "@/lib/business/types"
import { PageHeader } from "@/components/business/v2/PageHeader"
import { Card, CardContent } from "@/components/business/v2/ui/card"
import { Button } from "@/components/business/v2/ui/button"
import { Separator } from "@/components/business/v2/ui/separator"
import { Skeleton } from "@/components/business/v2/ui/skeleton"
import LogoUpload from "@/components/business/v2/settings/LogoUpload"
import ProfileForm from "@/components/business/v2/settings/ProfileForm"
import StripeConnectCard, { StripeReturnBanner } from "@/components/business/v2/settings/StripeConnectCard"
import VenueManagementSection from "@/components/business/v2/settings/VenueManagementSection"

function SectionHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div>
      <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{title}</h2>
      {description && <p className="mt-0.5 text-[13px] text-neutral-500 dark:text-neutral-400">{description}</p>}
    </div>
  )
}

function SettingsContent() {
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
      // silent
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

  const handleProfileSaved = () => { fetchProfile(); refreshProfile() }
  const handleLogoUploaded = () => { fetchProfile(); refreshProfile() }

  const handlePasswordReset = async () => {
    if (!business?.email) return
    setResetLoading(true)
    try {
      await apiClient.authPost("/business/auth/forgot-password", { email: business.email })
    } catch {
      // always show success
    } finally {
      setResetLoading(false)
      setResetSent(true)
    }
  }

  // Promoter — read-only message (never redirect)
  if (role === "promoter") {
    return (
      <>
        <PageHeader title="Settings" description="Manage your business profile, venues, and payouts." />
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">Settings are available to owners and managers.</p>
          </CardContent>
        </Card>
      </>
    )
  }

  if (loading) {
    return (
      <>
        <PageHeader title="Settings" description="Manage your business profile, venues, and payouts." />
        <div className="space-y-5">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </>
    )
  }

  if (!profile) {
    return (
      <>
        <PageHeader title="Settings" description="Manage your business profile, venues, and payouts." />
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-red-600 dark:text-red-400">Failed to load profile. Please refresh and try again.</p>
          </CardContent>
        </Card>
      </>
    )
  }

  return (
    <>
      <PageHeader title="Settings" description="Manage your business profile, venues, and payouts." />

      <div className="flex flex-col gap-6">
        {/* Venues */}
        <VenueManagementSection />

        <Separator />

        {/* Business settings */}
        <SectionHeading title="Business settings" description="These settings apply to your entire business across all venues." />

        {/* Stripe return banner */}
        {(stripeParam === "return" || stripeParam === "refresh") && (
          <StripeReturnBanner
            onComplete={() => {
              fetchProfile()
              refreshProfile()
              router.replace("/business/v2/settings")
            }}
          />
        )}

        {/* Stripe Connect */}
        <div id="stripe-connect" className="scroll-mt-20">
          <StripeConnectCard
            onboarded={profile.stripe_connect_onboarded}
            onOnboardingComplete={() => { fetchProfile(); refreshProfile() }}
          />
        </div>

        {/* Business photo */}
        <Card>
          <CardContent className="flex justify-center py-6">
            <LogoUpload currentUrl={profile.logo_image_url} onUploaded={handleLogoUploaded} disabled={!canEdit} />
          </CardContent>
        </Card>

        {/* Business info */}
        <Card>
          <CardContent className="py-5">
            <h3 className="mb-4 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Business information</h3>
            <ProfileForm profile={profile} onSaved={handleProfileSaved} disabled={!canEdit} />
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardContent className="py-5">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Security</h3>
            <p className="mt-1 text-[13px] text-neutral-500 dark:text-neutral-400">
              To change your password, we&apos;ll send a reset link to your email address.
            </p>
            {resetSent ? (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-950/40 px-3 py-2.5 text-sm text-green-700 dark:text-green-400">
                <CheckCircle2 className="size-4" /> Password reset email sent to {business?.email}. Check your inbox.
              </div>
            ) : (
              <Button variant="secondary" size="sm" className="mt-3" onClick={handlePasswordReset} disabled={resetLoading}>
                {resetLoading ? "Sending…" : "Send password reset email"}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Danger zone */}
        <Card className="border-red-200 dark:border-red-900 bg-red-50/40 dark:bg-red-950/40">
          <CardContent className="py-5">
            <h3 className="text-sm font-semibold text-red-700 dark:text-red-400">Danger zone</h3>
            <p className="mt-1 text-[13px] text-neutral-600 dark:text-neutral-400">
              Need to remove your business account? Contact our support team.
            </p>
            <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
              Account removal requests are reviewed within 48 hours. Your data is retained for 30 days before permanent deletion.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

export default function V2SettingsPage() {
  return (
    <Suspense fallback={<PageHeader title="Settings" description="Manage your business profile, venues, and payouts." />}>
      <SettingsContent />
    </Suspense>
  )
}
