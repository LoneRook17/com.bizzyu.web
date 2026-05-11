"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { apiClient, ApiError } from "@/lib/business/api-client"
import type { EventListItem } from "@/lib/business/types"

/**
 * Marketing → Events sub-tab.
 *
 * Lists the business's upcoming events. Each card links to the existing
 * per-event Announcements + SMS Blast composer pages under
 * `/business/events/[id]/manage/announcements` and `/sms-blast`, which we
 * intentionally kept as power-user shortcuts.
 */
export default function EventsTab() {
  const [events, setEvents] = useState<EventListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    apiClient
      .get<{ events: EventListItem[]; total: number }>(
        "/business/events?tab=upcoming&limit=50",
      )
      .then((res) => {
        if (cancelled) return
        setEvents(res.events ?? [])
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof ApiError ? err.message : "Could not load events")
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return <div className="py-10 text-center text-sm text-gray-500">Loading events…</div>
  }
  if (error) {
    return <div className="py-10 text-center text-sm text-red-600">{error}</div>
  }
  if (events.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm font-semibold text-ink">No upcoming events.</p>
        <p className="mt-1 text-xs text-gray-500">
          Create an event to start sending event-specific blasts to ticket holders.
        </p>
      </div>
    )
  }

  return (
    <ul className="space-y-3">
      {events.map((e) => (
        <li
          key={e.event_id}
          className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{e.name}</p>
              <p className="mt-0.5 text-xs text-gray-500">
                {formatDate(e.start_date_time)} · {e.venue_name || "—"}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {e.ticket_sales_count} tickets sold
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Link
                href={`/business/events/${e.event_id}/manage/announcements`}
                className="rounded-md border border-primary bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20"
              >
                Announce
              </Link>
              <Link
                href={`/business/events/${e.event_id}/manage/sms-blast`}
                className="rounded-md border border-primary bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20"
              >
                SMS Blast
              </Link>
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  } catch {
    return iso
  }
}
