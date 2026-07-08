"use client"

import { useState, useEffect } from "react"
import { apiClient } from "@/lib/business/api-client"
import EventForm from "@/components/business/dashboard/EventForm"
import type { BusinessProfile } from "@/lib/business/types"

export default function CreateEventPage() {
  const [profile, setProfile] = useState<BusinessProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.get<BusinessProfile>("/business/profile")
      .then((p) => setProfile(p))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="animate-pulse space-y-4 max-w-2xl">
        <div className="h-6 bg-gray-200 rounded w-32" />
        <div className="h-64 bg-gray-200 rounded-xl" />
      </div>
    )
  }

  return (
    <EventForm
      stripeOnboarded={profile?.stripe_connect_onboarded ?? true}
      businessName={profile?.name || ""}
      businessAddress={profile?.address || ""}
    />
  )
}
