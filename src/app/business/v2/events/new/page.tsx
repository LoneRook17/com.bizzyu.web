"use client"

import { useState, useEffect } from "react"
import { apiClient } from "@/lib/business/api-client"
import type { BusinessProfile } from "@/lib/business/types"
import { Skeleton } from "@/components/business/v2/ui/skeleton"
import { EventForm } from "@/components/business/v2/events/EventForm"

export default function V2CreateEventPage() {
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
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    )
  }

  return <EventForm stripeOnboarded={profile?.stripe_connect_onboarded ?? true} />
}
