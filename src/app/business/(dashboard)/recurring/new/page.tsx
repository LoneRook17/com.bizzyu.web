"use client"

import { useEffect, useState } from "react"
import { apiClient } from "@/lib/business/api-client"
import type { BusinessProfile } from "@/lib/business/types"
import { Skeleton } from "@/components/business/v2/ui/skeleton"
import RequireVenue from "@/components/business/v2/RequireVenue"
import { SeriesForm } from "@/components/business/v2/recurring/SeriesForm"

export default function CreateRecurringSeriesPage() {
  const [profile, setProfile] = useState<BusinessProfile | null>(null)
  const [loading, setLoading] = useState(true)

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
        <Skeleton className="h-64 max-w-3xl rounded-xl" />
      </div>
    )
  }

  const isPending = profile?.status === "pending" || profile?.status === "pending_approval" || profile?.status === "pending_verification"

  return (
    <RequireVenue>
      <SeriesForm mode="create" stripeOnboarded={profile?.stripe_connect_onboarded ?? true} isPending={isPending} />
    </RequireVenue>
  )
}
