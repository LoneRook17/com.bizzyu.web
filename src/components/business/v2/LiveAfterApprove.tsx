"use client"

import { useEffect } from "react"
import { apiClient } from "@/lib/business/api-client"
import { useAuth } from "@/lib/business/auth-context"
import {
  draftIdsToPublish,
  draftNightEventIds,
  liveAfterApproveStorageKey,
  shouldRunLiveAfterApprove,
} from "@/lib/business/live-after-approve"
import {
  fetchDoorAccessProgramsSafe,
  fetchDoorAccessSeriesSafe,
} from "@/lib/business/door-access"
import type { EventListItem } from "@/lib/business/types"

/**
 * After admin approve, drafts created during review go live. Money stays in
 * escrow until Stripe — this only publishes queued posts.
 */
export default function LiveAfterApprove() {
  const { isPending, business, refreshProfile } = useAuth()

  useEffect(() => {
    if (!isPending) return
    const onFocus = () => {
      void refreshProfile()
    }
    const onVis = () => {
      if (document.visibilityState === "visible") void refreshProfile()
    }
    window.addEventListener("focus", onFocus)
    document.addEventListener("visibilitychange", onVis)
    return () => {
      window.removeEventListener("focus", onFocus)
      document.removeEventListener("visibilitychange", onVis)
    }
  }, [isPending, refreshProfile])

  useEffect(() => {
    const businessId = business?.business_id
    if (typeof window === "undefined") return
    const alreadyRan =
      businessId != null && !!window.sessionStorage.getItem(liveAfterApproveStorageKey(businessId))
    if (!shouldRunLiveAfterApprove({ isPending, businessId, alreadyRan })) return
    if (businessId == null) return

    let cancelled = false
    void (async () => {
      try {
        const data = await apiClient.get<{ events: EventListItem[] }>(
          "/business/events?tab=drafts&page=1&limit=50",
        )
        if (cancelled) return
        const ids = new Set(draftIdsToPublish(data.events ?? []))
        const programs = await fetchDoorAccessProgramsSafe()
        if (cancelled) return
        for (const program of programs) {
          const series = await fetchDoorAccessSeriesSafe(program.id)
          if (cancelled) return
          if (!series) continue
          for (const eventId of draftNightEventIds(series.nights)) ids.add(eventId)
        }
        for (const eventId of ids) {
          try {
            await apiClient.post(`/business/events/${eventId}/publish`)
          } catch {
            // Detail page and create flow still promote individually.
          }
        }
      } catch {
        return
      }
      if (!cancelled) {
        window.sessionStorage.setItem(liveAfterApproveStorageKey(businessId), "1")
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isPending, business?.business_id])

  return null
}
