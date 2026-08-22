"use client"

import { useEffect, useState } from "react"
import { Lock } from "lucide-react"
import { apiClient } from "@/lib/business/api-client"
import { useAuth } from "@/lib/business/auth-context"
import type { BusinessProfile } from "@/lib/business/types"
import { WEEKLY_ACCESS_SECTION_LABEL } from "@/lib/business/door-access"
import { Skeleton } from "@/components/business/v2/ui/skeleton"
import { EmptyState } from "@/components/business/v2/ui/empty-state"
import RequireVenue from "@/components/business/v2/RequireVenue"
import { DoorAccessWizard } from "@/components/business/v2/door-access/DoorAccessWizard"

/**
 * D2-A — the Door Access creation route.
 *
 * Reached from the create funnel (/business/create) and from the Events
 * surface. It is a plain route with no nav dependency (D2-6): D2-B is deleting
 * the "Door Access" sidebar entry in parallel, and nothing here changes when
 * that lands.
 *
 * Mirrors the event create page's shell exactly — venue guard, then the form
 * with the Stripe state it needs to decide whether paid tiers can sell.
 */
export default function NewDoorAccessProgramPage() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<BusinessProfile | null>(null)
  const [loading, setLoading] = useState(true)

  // Same gate as the spine's create routes (owner/manager). Staff can SEE
  // programs but never build one — D-F9.3.
  const canBuild = user?.business_role === "owner" || user?.business_role === "manager"

  useEffect(() => {
    apiClient
      .get<BusinessProfile>("/business/profile")
      .then(setProfile)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    )
  }

  if (!canBuild) {
    return (
      <EmptyState
        icon={Lock}
        title="You can't create here"
        description={`Only owners and managers can set up a ${WEEKLY_ACCESS_SECTION_LABEL.toLowerCase()} program.`}
      />
    )
  }

  const isPending = profile?.status === "pending" || profile?.status === "pending_approval" || profile?.status === "pending_verification"

  return (
    <RequireVenue>
      <DoorAccessWizard stripeOnboarded={profile?.stripe_connect_onboarded ?? true} isPending={isPending} />
    </RequireVenue>
  )
}
