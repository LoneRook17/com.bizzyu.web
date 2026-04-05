"use client"

import { useState, useEffect } from "react"
import { apiClient } from "@/lib/business/api-client"
import EventForm from "@/components/business/dashboard/EventForm"
import type { BusinessProfile } from "@/lib/business/types"

export default function CreateEventPage() {
  const [stripeOnboarded, setStripeOnboarded] = useState(true)

  useEffect(() => {
    apiClient.get<BusinessProfile>("/business/profile")
      .then((p) => setStripeOnboarded(p.stripe_connect_onboarded))
      .catch(() => {})
  }, [])

  return <EventForm stripeOnboarded={stripeOnboarded} />
}
