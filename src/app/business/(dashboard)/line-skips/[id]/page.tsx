"use client"

import { useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { apiClient } from "@/lib/business/api-client"
import { useVenue } from "@/lib/business/venue-context"
import type { LineSkipDetail } from "@/lib/business/types"
import { Skeleton } from "@/components/business/v2/ui/skeleton"

/**
 * The per-schedule detail page was folded into the single /business/line-skips
 * calendar (stats live below the calendar there now). This route is kept only so
 * existing deep links still resolve: it selects the line skip's venue, then
 * redirects to the consolidated page.
 */
export default function LineSkipDetailRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { setSelectedVenue } = useVenue()

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { line_skip } = await apiClient.get<{ line_skip: LineSkipDetail & { venue_id?: number | null } }>(
          `/business/line-skips/${id}`
        )
        if (cancelled) return
        if (line_skip.venue_id) setSelectedVenue(line_skip.venue_id)
      } catch {
        // fall through to the calendar regardless
      } finally {
        if (!cancelled) router.replace("/business/line-skips")
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  return (
    <div className="space-y-3">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-72 rounded-xl" />
    </div>
  )
}
