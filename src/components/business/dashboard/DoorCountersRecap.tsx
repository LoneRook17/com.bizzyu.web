"use client"

import { useEffect, useState } from "react"
import { apiClient, ApiError } from "@/lib/business/api-client"

/**
 * Per-staff breakdown of one counter, shaped by the recap endpoint
 * (PRD §5.5 SQL on the services side).
 */
interface StaffBreakdown {
  staff_user_id: number
  staff_full_name: string | null
  taps: number
  net: number
}

interface CounterRecap {
  id: number
  title: string
  step: number
  goal: number | null
  current_value: number
  deleted_at: string | null
  staff: StaffBreakdown[]
}

interface DoorCountersRecapResponse {
  counters: CounterRecap[]
}

interface Props {
  eventId: number
  className?: string
}

export default function DoorCountersRecap({ eventId, className = "" }: Props) {
  const [counters, setCounters] = useState<CounterRecap[] | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    apiClient
      .get<DoorCountersRecapResponse>(`/business/events/${eventId}/counters-recap`)
      .then((res) => {
        if (!cancelled) setCounters(res.counters)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Failed to load")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [eventId])

  if (loading) {
    return (
      <div className={`rounded-xl border border-gray-200 bg-white p-5 ${className}`}>
        <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
        <div className="mt-3 h-3 w-full animate-pulse rounded bg-gray-100" />
      </div>
    )
  }

  if (error) {
    return (
      <div className={`rounded-xl border border-gray-200 bg-white p-5 ${className}`}>
        <h2 className="text-sm font-semibold text-ink">Door Counters</h2>
        <p className="mt-2 text-xs text-red-500">{error}</p>
      </div>
    )
  }

  if (!counters || counters.length === 0) {
    return (
      <div className={`rounded-xl border border-gray-200 bg-white p-5 ${className}`}>
        <h2 className="text-sm font-semibold text-ink">Door Counters</h2>
        <p className="mt-1 text-xs text-gray-500">
          No door counters were created for this event.
        </p>
      </div>
    )
  }

  return (
    <div className={`rounded-xl border border-gray-200 bg-white p-5 ${className}`}>
      <h2 className="text-sm font-semibold text-ink mb-3">Door Counters</h2>
      <div className="space-y-4">
        {counters.map((c) => {
          const total = c.staff.reduce((sum, s) => sum + s.net, 0)
          return (
            <div key={c.id}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-ink">
                  {c.title}
                  {c.deleted_at && (
                    <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-normal text-gray-500">
                      Deleted
                    </span>
                  )}
                </span>
                <span className="text-xs text-gray-500">
                  Total: <span className="font-semibold text-ink">{total}</span>
                </span>
              </div>
              {c.staff.length === 0 ? (
                <p className="mt-1 text-xs text-gray-400">No taps recorded.</p>
              ) : (
                <ul className="mt-1 divide-y divide-gray-100">
                  {c.staff.map((s) => (
                    <li
                      key={`${c.id}-${s.staff_user_id}`}
                      className="flex items-center justify-between py-1 text-xs"
                    >
                      <span className="text-gray-600">
                        {s.staff_full_name ?? `User #${s.staff_user_id}`}
                      </span>
                      <span className="font-medium text-ink">{s.net}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
