"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { apiClient, ApiError } from "@/lib/business/api-client"
import { programIdFromOwnedEvent } from "@/lib/business/door-access"
import { seriesActiveFromRecurringResponse } from "@/lib/business/weekly-cover-visibility"
import type { EventDetail } from "@/lib/business/types"

/**
 * BETA shell: the manage layout reads the event once and shares it with the
 * Overview / Promo & tracking / Settings pages, so the header, the tabs and
 * those pages agree on status, kind and series state without three fetches.
 * The older subpages (tickets, team, analytics…) keep their own reads; this
 * context is additive.
 */
interface ManageEventValue {
  id: string
  event: EventDetail | null
  /** The night's program is still active (WC); true for plain events. */
  seriesActive: boolean
  loading: boolean
  error: string
  refresh: () => Promise<void>
}

const ManageEventContext = createContext<ManageEventValue | null>(null)

export function useManageEvent(): ManageEventValue {
  const ctx = useContext(ManageEventContext)
  if (!ctx) throw new Error("useManageEvent must be used inside the event manage layout")
  return ctx
}

export function ManageEventProvider({ id, children }: { id: string; children: React.ReactNode }) {
  const [event, setEvent] = useState<EventDetail | null>(null)
  const [seriesActive, setSeriesActive] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const refresh = useCallback(async () => {
    try {
      const row = await apiClient.get<EventDetail>(`/business/events/${id}`)
      setEvent(row)
      setError("")
      // Same resolution the old hub did: the WC stamp first, the series FK
      // second; a night with neither is a plain event and stays active.
      const fromStamp = programIdFromOwnedEvent(row)
      const fromFk = row.recurring_series_id != null ? Number(row.recurring_series_id) : NaN
      const seriesId = fromStamp ?? (Number.isFinite(fromFk) && fromFk > 0 ? fromFk : null)
      if (seriesId == null) {
        setSeriesActive(true)
      } else {
        try {
          const data = await apiClient.get<unknown>(`/business/recurring-series/${seriesId}`)
          setSeriesActive(seriesActiveFromRecurringResponse(data) !== false)
        } catch {
          setSeriesActive(true)
        }
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load event")
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    setLoading(true)
    refresh()
  }, [refresh])

  return (
    <ManageEventContext.Provider value={{ id, event, seriesActive, loading, error, refresh }}>
      {children}
    </ManageEventContext.Provider>
  )
}
