"use client"

import { Suspense, useEffect, useState } from "react"
import { Lock } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { apiClient } from "@/lib/business/api-client"
import { useAuth } from "@/lib/business/auth-context"
import type { BusinessProfile } from "@/lib/business/types"
import {
  applyProgramAsCreateTemplate,
} from "@/lib/business/create-from-template"
import {
  fetchDoorAccessSeries,
  WEEKLY_ACCESS_SECTION_LABEL,
  type DoorAccessProgram,
} from "@/lib/business/door-access"
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
 *
 * L5/L6: ?from=:programId applies that Weekly Cover program as a new series
 * template. It never opens EventForm or /business/recurring.
 */
function CreateProgramFallback() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton className="h-5 w-28" />
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  )
}

function NewDoorAccessProgramPage() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const fromId = Number(searchParams.get("from"))
  const [profile, setProfile] = useState<BusinessProfile | null>(null)
  const [template, setTemplate] = useState<DoorAccessProgram | null>(null)
  const [loading, setLoading] = useState(true)

  const canBuild = user?.business_role === "owner" || user?.business_role === "manager"

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const data = await apiClient.get<BusinessProfile>("/business/profile")
        if (!cancelled) setProfile(data)
      } catch {
        // Stripe flag defaults below.
      }

      if (!Number.isFinite(fromId) || fromId <= 0) {
        if (!cancelled) setLoading(false)
        return
      }

      try {
        const { program } = await fetchDoorAccessSeries(fromId)
        if (cancelled) return
        const today = new Date().toLocaleDateString("en-CA")
        setTemplate(applyProgramAsCreateTemplate(program, today))
      } catch {
        // Blank Weekly Cover create if the source program cannot load.
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [fromId])

  if (loading) return <CreateProgramFallback />

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
      {template && (
        <p className="mb-3 text-[13px] text-neutral-500 dark:text-neutral-400">
          Starting from that Weekly Cover series. Nights, prices, and door hours are copied. This
          creates a new Weekly Cover series, not a one-off event.
        </p>
      )}
      <DoorAccessWizard
        initialData={template ?? undefined}
        stripeOnboarded={profile?.stripe_connect_onboarded ?? true}
        isPending={isPending}
      />
    </RequireVenue>
  )
}

export default function NewDoorAccessProgramPageWithSearch() {
  return (
    <Suspense fallback={<CreateProgramFallback />}>
      <NewDoorAccessProgramPage />
    </Suspense>
  )
}
