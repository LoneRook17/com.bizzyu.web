"use client"

import { Suspense, useState, useEffect, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import {
  AtSign,
  Building2,
  CheckCircle2,
  CreditCard,
  ImageIcon,
  KeyRound,
  LayoutGrid,
  MapPin,
  ShieldCheck,
  SlidersHorizontal,
  SunMoon,
  TriangleAlert,
  User,
} from "lucide-react"
import { useAuth } from "@/lib/business/auth-context"
import { apiClient } from "@/lib/business/api-client"
import type { BusinessProfile } from "@/lib/business/types"
import { PageHeader } from "@/components/business/v2/PageHeader"
import { Card, CardContent } from "@/components/business/v2/ui/card"
import { Button } from "@/components/business/v2/ui/button"
import { Skeleton } from "@/components/business/v2/ui/skeleton"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/business/v2/ui/tabs"
import LogoUpload from "@/components/business/v2/settings/LogoUpload"
import ProfileForm from "@/components/business/v2/settings/ProfileForm"
import EmailChangeForm from "@/components/business/v2/settings/EmailChangeForm"
import { canChangeBusinessEmail } from "@/lib/business/email-change"
import StripeConnectCard, { StripeReturnBanner } from "@/components/business/v2/settings/StripeConnectCard"
import VenuePayoutAccountsSection from "@/components/business/v2/settings/VenuePayoutAccountsSection"
import EscrowPanel from "@/components/business/v2/EscrowPanel"
import VenueManagementSection from "@/components/business/v2/settings/VenueManagementSection"
import VenuePageSection from "@/components/business/v2/settings/VenuePageSection"
import DashboardPreferences, { AppearanceSettings } from "@/components/business/v2/settings/DashboardPreferences"

const TAB_ITEMS = [
  { value: "profile", label: "Profile", icon: User },
  { value: "preferences", label: "Preferences", icon: SlidersHorizontal },
  { value: "payments", label: "Payments", icon: CreditCard },
  { value: "venues", label: "Venues", icon: MapPin },
  { value: "security", label: "Security", icon: ShieldCheck },
] as const

type SettingsTab = (typeof TAB_ITEMS)[number]["value"]

function isSettingsTab(value: string | null): value is SettingsTab {
  return TAB_ITEMS.some((t) => t.value === value)
}

/** Consistent card shell: tinted icon + title + description, content below. */
function SettingsCard({
  icon: Icon,
  title,
  description,
  children,
  className,
}: {
  icon: React.ElementType
  title: string
  description?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <Card className={className}>
      <CardContent className="py-5">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
            <Icon className="size-[18px]" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{title}</h3>
            {description && <p className="mt-0.5 text-[13px] text-neutral-500 dark:text-neutral-400">{description}</p>}
          </div>
        </div>
        <div className="mt-5">{children}</div>
      </CardContent>
    </Card>
  )
}

function SettingsContent() {
  const { user, business, refreshProfile } = useAuth()
  const role = user?.business_role
  const searchParams = useSearchParams()
  const router = useRouter()
  const stripeParam = searchParams.get("stripe")
  // #9 venue-stripe: an account_id on the Stripe return/refresh URL means the
  // bounce belongs to a business_stripe_accounts row — VenuePayoutAccountsSection
  // completes that row, not the legacy profile endpoint.
  const stripeReturnIsAccountRow = !!searchParams.get("account_id")

  // Deep links pick the starting tab: ?stripe=return|refresh → Payments,
  // ?action=add-venue → Venues, ?tab=<name> → that tab.
  const [tab, setTab] = useState<SettingsTab>(() => {
    if (stripeParam === "return" || stripeParam === "refresh") return "payments"
    if (searchParams.get("action") === "add-venue") return "venues"
    const requested = searchParams.get("tab")
    return isSettingsTab(requested) ? requested : "profile"
  })

  const [profile, setProfile] = useState<BusinessProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [resetSent, setResetSent] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

  const canEdit = role === "owner" || role === "manager"
  // Deliberately narrower than canEdit: businesses.email is the login
  // credential (recon B1), so managers must not move it. HF-1's 403 backs this.
  const canChangeEmail = canChangeBusinessEmail(role)

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

  const handleTabChange = (value: string) => {
    if (!isSettingsTab(value)) return
    setTab(value)
    router.replace(`/business/settings?tab=${value}`, { scroll: false })
  }

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

  const header = (
    <PageHeader title="Settings" description="Manage your business profile, venues, and payouts." />
  )

  // Promoter - read-only message (never redirect)
  if (role === "promoter") {
    return (
      <>
        {header}
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
        {header}
        <div className="space-y-5">
          <Skeleton className="h-10 w-full max-w-md rounded-lg" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </>
    )
  }

  if (!profile) {
    return (
      <>
        {header}
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
      {header}

      <Tabs value={tab} onValueChange={handleTabChange}>
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <TabsList className="w-max">
            {TAB_ITEMS.map(({ value, label, icon: Icon }) => (
              <TabsTrigger key={value} value={value} className="gap-1.5">
                <Icon className="size-4" /> {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* --- Profile --- */}
        <TabsContent value="profile">
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
            <SettingsCard
              icon={Building2}
              title="Business information"
              description="Your business details, shown to students in the app."
            >
              <ProfileForm profile={profile} onSaved={handleProfileSaved} disabled={!canEdit} />
            </SettingsCard>

            <SettingsCard
              icon={ImageIcon}
              title="Business logo"
              description="Shown next to your business name across Bizzy."
            >
              <LogoUpload currentUrl={profile.logo_image_url} onUploaded={handleLogoUploaded} disabled={!canEdit} />
            </SettingsCard>
          </div>
        </TabsContent>

        {/* --- Preferences --- */}
        <TabsContent value="preferences">
          <div className="flex flex-col gap-5">
            <SettingsCard
              icon={LayoutGrid}
              title="Dashboard mode"
              description="Choose what your dashboard is built around. Hidden sections aren't deleted. Switch back anytime."
            >
              <DashboardPreferences disabled={!canEdit} />
            </SettingsCard>

            <SettingsCard icon={SunMoon} title="Appearance" description="Theme for this device.">
              <AppearanceSettings />
            </SettingsCard>
          </div>
        </TabsContent>

        {/* --- Payments --- */}
        <TabsContent value="payments">
          <div id="stripe-connect" className="scroll-mt-20">
            {(stripeParam === "return" || stripeParam === "refresh") && !stripeReturnIsAccountRow && (
              <StripeReturnBanner
                onComplete={() => {
                  fetchProfile()
                  refreshProfile()
                  router.replace("/business/settings?tab=payments", { scroll: false })
                }}
              />
            )}
            {/* BE-D2: escrow held by Bizzy, findable deliberately next to the
                Stripe cards. Renders nothing without escrow history — the mb-5
                rides on the panel's card and disappears with it, so this tab is
                unchanged for businesses without escrow. */}
            <EscrowPanel variant="compact" className="mb-5" />
            <StripeConnectCard
              onboarded={profile.stripe_connect_onboarded}
              reconnectRequired={profile.stripe_reconnect_required ?? false}
              onOnboardingComplete={() => { fetchProfile(); refreshProfile() }}
            />
            <VenuePayoutAccountsSection />
          </div>
        </TabsContent>

        {/* --- Venues --- */}
        <TabsContent value="venues">
          <div className="flex flex-col gap-8">
            <VenueManagementSection />
            <VenuePageSection />
          </div>
        </TabsContent>

        {/* --- Security --- */}
        <TabsContent value="security">
          <div className="flex flex-col gap-5">
            {canChangeEmail && (
              <SettingsCard
                icon={AtSign}
                title="Login email"
                description="The address you sign in with. We'll email the new address to confirm — nothing changes until you open that link."
              >
                <EmailChangeForm currentEmail={profile.email} businessId={profile.business_id} />
              </SettingsCard>
            )}

            <SettingsCard
              icon={KeyRound}
              title="Password"
              description="To change your password, we'll send a reset link to your email address."
            >
              {resetSent ? (
                <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-950/40 px-3 py-2.5 text-sm text-green-700 dark:text-green-400">
                  <CheckCircle2 className="size-4 shrink-0" /> Password reset email sent to {business?.email}. Check your inbox.
                </div>
              ) : (
                <Button variant="secondary" size="sm" onClick={handlePasswordReset} disabled={resetLoading}>
                  {resetLoading ? "Sending…" : "Send password reset email"}
                </Button>
              )}
            </SettingsCard>

            <Card className="border-red-200 dark:border-red-900 bg-red-50/40 dark:bg-red-950/40">
              <CardContent className="py-5">
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400">
                    <TriangleAlert className="size-[18px]" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-red-700 dark:text-red-400">Danger zone</h3>
                    <p className="mt-0.5 text-[13px] text-neutral-600 dark:text-neutral-400">
                      Need to remove your business account? Contact our support team.
                    </p>
                    <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
                      Account removal requests are reviewed within 48 hours. Your data is retained for 30 days before permanent deletion.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
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
