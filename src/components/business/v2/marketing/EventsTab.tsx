"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { CalendarDays, Megaphone, MessageSquare } from "lucide-react"
import { apiClient, ApiError } from "@/lib/business/api-client"
import type { EventListItem } from "@/lib/business/types"
import { Card } from "@/components/business/v2/ui/card"
import { Button } from "@/components/business/v2/ui/button"
import { Skeleton } from "@/components/business/v2/ui/skeleton"
import { EmptyState } from "@/components/business/v2/ui/empty-state"

/**
 * Marketing → Events sub-tab.
 *
 * Lists upcoming events, scoped to a venue when one is selected. Each card
 * links to the per-event Announcements + SMS Blast composers under
 * /business/v2/events/[id]/manage/.
 */
interface Props {
  venueId: number | null
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

export default function EventsTab({ venueId }: Props) {
  const [events, setEvents] = useState<EventListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const params = new URLSearchParams({ tab: "upcoming", limit: "50" })
    if (venueId != null) params.set("venue_id", String(venueId))
    apiClient
      .get<{ events: EventListItem[]; total: number }>(`/business/events?${params.toString()}`)
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
  }, [venueId])

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-[88px] rounded-xl" />
        ))}
      </div>
    )
  }
  if (error) {
    return <EmptyState icon={CalendarDays} title="Couldn't load events" description={error} />
  }
  if (events.length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="No upcoming events"
        description={
          venueId == null
            ? "Create an event to start sending event-specific blasts to ticket holders."
            : "No upcoming events at the selected venue."
        }
      />
    )
  }

  return (
    <ul className="space-y-3">
      {events.map((e) => (
        <li key={e.event_id}>
          <Card className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-neutral-900">{e.name}</p>
                <p className="mt-0.5 text-xs text-neutral-500">
                  {formatDate(e.start_date_time)} · {e.venue_name || "—"}
                </p>
                <p className="mt-1 text-xs text-neutral-500">{e.ticket_sales_count} tickets sold</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button variant="secondary" size="sm" asChild>
                  <Link href={`/business/v2/events/${e.event_id}/manage/announcements`}>
                    <Megaphone /> Announce
                  </Link>
                </Button>
                <Button variant="secondary" size="sm" asChild>
                  <Link href={`/business/v2/events/${e.event_id}/manage/sms-blast`}>
                    <MessageSquare /> SMS blast
                  </Link>
                </Button>
              </div>
            </div>
          </Card>
        </li>
      ))}
    </ul>
  )
}
