"use client"

import { useState, useEffect, useCallback } from "react"
import { ChevronRight, MapPin } from "lucide-react"
import { useAuth } from "@/lib/business/auth-context"
import { useVenue } from "@/lib/business/venue-context"
import { apiClient } from "@/lib/business/api-client"
import type { LineSkipDetail, LineSkipInstance } from "@/lib/business/types"
import { PageHeader } from "@/components/business/v2/PageHeader"
import { Skeleton } from "@/components/business/v2/ui/skeleton"
import LineSkipCalendar from "@/components/business/v2/line-skips/LineSkipCalendar"
import LineSkipInstanceModal from "@/components/business/v2/line-skips/LineSkipInstanceModal"

export default function LineSkipsPage() {
  const { user } = useAuth()
  const { venues, selectedVenue, setSelectedVenue } = useVenue()

  const [program, setProgram] = useState<LineSkipDetail | null>(null)
  const [instances, setInstances] = useState<LineSkipInstance[]>([])
  const [loading, setLoading] = useState(true)

  const [modalOpen, setModalOpen] = useState(false)
  const [selectedInstance, setSelectedInstance] = useState<LineSkipInstance | null>(null)

  const canEdit = user?.business_role === "owner" || user?.business_role === "manager"
  const canViewAnalytics = canEdit

  // The calendar is per-venue. Use the selected venue, or the only venue.
  const venueId = selectedVenue?.id ?? (venues.length === 1 ? venues[0].id : null)

  const fetchProgram = useCallback(async () => {
    if (venueId == null) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const { line_skips } = await apiClient.get<{ line_skips: Array<LineSkipDetail & { venue_id?: number | null }> }>(
        `/business/line-skips`
      )
      const active = line_skips.filter((l) => l.is_active)
      const prog =
        active.find((l) => l.venue_id === venueId) ??
        active.find((l) => l.venue_id == null) ??
        null
      if (prog) {
        const detail = await apiClient.get<{ line_skip: LineSkipDetail; instances: LineSkipInstance[] }>(
          `/business/line-skips/${prog.id}`
        )
        setProgram(detail.line_skip)
        setInstances(detail.instances ?? [])
      } else {
        setProgram(null)
        setInstances([])
      }
    } catch {
      setProgram(null)
      setInstances([])
    } finally {
      setLoading(false)
    }
  }, [venueId])

  useEffect(() => {
    fetchProgram()
  }, [fetchProgram])

  const openCancel = (i: LineSkipInstance) => {
    setSelectedInstance(i)
    setModalOpen(true)
  }

  return (
    <>
      <PageHeader
        title="Line skips"
        description="Let customers skip the line and pay cover in advance."
      />

      {/* Venue picker when there's more than one and none is selected */}
      {venueId == null ? (
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-5">
          <p className="mb-3 text-sm text-neutral-600 dark:text-neutral-400">Pick a venue to manage its line skips:</p>
          <div className="space-y-2">
            {venues.map((v) => (
              <button
                key={v.id}
                onClick={() => setSelectedVenue(v.id)}
                className="flex w-full items-center justify-between rounded-lg border border-neutral-200 dark:border-neutral-800 px-4 py-3 text-left text-sm font-medium text-neutral-800 dark:text-neutral-200 transition-colors hover:border-[#05EB54]/40 hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
              >
                <span className="inline-flex items-center gap-2"><MapPin className="size-4 text-neutral-400" /> {v.name}</span>
                <ChevronRight className="size-4 text-neutral-300 dark:text-neutral-600" />
              </button>
            ))}
          </div>
        </div>
      ) : loading ? (
        <div className="space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      ) : (
        <LineSkipCalendar
          lineSkip={program}
          venueId={venueId}
          instances={instances}
          canEdit={canEdit}
          canViewAnalytics={canViewAnalytics}
          onCloseNight={openCancel}
          onChanged={fetchProgram}
        />
      )}

      <LineSkipInstanceModal
        open={modalOpen}
        mode="cancel"
        instance={selectedInstance}
        onClose={() => setModalOpen(false)}
        onUpdated={fetchProgram}
      />
    </>
  )
}
