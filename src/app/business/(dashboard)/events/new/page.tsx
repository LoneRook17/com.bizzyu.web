"use client"

import { Suspense, useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { apiClient } from "@/lib/business/api-client"
import type { BusinessProfile, EventDetail, EventFormData } from "@/lib/business/types"
import {
  applyEventAsCreateTemplate,
  programCreateFromHref,
  shouldRedirectEventTemplateToWeeklyCover,
} from "@/lib/business/create-from-template"
import { Skeleton } from "@/components/business/v2/ui/skeleton"
import { EventForm } from "@/components/business/v2/events/EventForm"
import RequireVenue from "@/components/business/v2/RequireVenue"

function CreateEventFallback() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton className="h-5 w-28" />
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  )
}

function V2CreateEventPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromId = Number(searchParams.get("from"))
  const [profile, setProfile] = useState<BusinessProfile | null>(null)
  const [template, setTemplate] = useState<Partial<EventFormData> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const profileData = await apiClient.get<BusinessProfile>("/business/profile")
        if (!cancelled) setProfile(profileData)
      } catch {
        // Stripe flag defaults to onboarded so a profile blip does not block create.
      }

      if (!Number.isFinite(fromId) || fromId <= 0) {
        if (!cancelled) setLoading(false)
        return
      }

      try {
        const event = await apiClient.get<EventDetail>(`/business/events/${fromId}`)
        if (cancelled) return
        if (shouldRedirectEventTemplateToWeeklyCover(event)) {
          router.replace(programCreateFromHref(Number(event.recurring_series_id)))
          return
        }
        setTemplate(applyEventAsCreateTemplate(event))
      } catch {
        // Fall through to a blank create if the source event cannot load.
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [fromId, router])

  if (loading) return <CreateEventFallback />

  return (
    <RequireVenue>
      {template && (
        <p className="mb-3 text-[13px] text-neutral-500 dark:text-neutral-400">
          Starting from that event. Dates are blank so you pick the new night. Review and publish
          when it looks right.
        </p>
      )}
      <EventForm
        initialData={template ?? undefined}
        stripeOnboarded={profile?.stripe_connect_onboarded ?? true}
      />
    </RequireVenue>
  )
}

export default function V2CreateEventPageWithSearch() {
  return (
    <Suspense fallback={<CreateEventFallback />}>
      <V2CreateEventPage />
    </Suspense>
  )
}
