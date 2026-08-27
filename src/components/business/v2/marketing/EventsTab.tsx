"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { CalendarDays, Megaphone } from "lucide-react"
import { apiClient, ApiError } from "@/lib/business/api-client"
import type { EventListItem } from "@/lib/business/types"
import {
  ACCESS_ACCENT,
  EVENT_ACCENT,
  fetchDoorAccessProgramsSafe,
  loadProgramsUpcomingNights,
} from "@/lib/business/door-access"
import { marketingUpcomingRows, type MarketingEventRow } from "@/lib/business/marketing-events"
import { marketingNightsFromSeries } from "@/lib/business/wc-upcoming"
import { easternToday } from "@/lib/business/door-access"
import { Card } from "@/components/business/v2/ui/card"
import { Button } from "@/components/business/v2/ui/button"
import { Skeleton } from "@/components/business/v2/ui/skeleton"
import { EmptyState } from "@/components/business/v2/ui/empty-state"

/**
 * Marketing → Events sub-tab.
 *
 * Upcoming green events AND upcoming Weekly Cover nights. A venue that only
 * has live WC nights must not empty-state.
 */
interface Props {
  venueId: number | null
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "-"
  const day = iso.slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(day) && iso.length <= 19) {
    const [y, m, d] = day.split("-")
    const dt = new Date(Number(y), Number(m) - 1, Number(d))
    return dt.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
  }
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
  const [rows, setRows] = useState<MarketingEventRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const params = new URLSearchParams({ tab: "upcoming", limit: "50" })
    if (venueId != null) params.set("venue_id", String(venueId))
    void (async () => {
      try {
        const [eventsRes, programs] = await Promise.all([
          apiClient.get<{ events: EventListItem[]; total: number }>(`/business/events?${params.toString()}`),
          fetchDoorAccessProgramsSafe(venueId),
        ])
        const loaded = await loadProgramsUpcomingNights(programs.filter((p) => p.is_active))
        if (cancelled) return
        setRows(
          marketingUpcomingRows({
            events: eventsRes.events ?? [],
            programs,
            nights: marketingNightsFromSeries(loaded, easternToday()),
          }),
        )
        setLoading(false)
      } catch (err: unknown) {
        if (cancelled) return
        setError(err instanceof ApiError ? err.message : "Could not load events")
        setLoading(false)
      }
    })()
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
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="No upcoming events"
        description={
          venueId == null
            ? "Create an event or weekly cover night to start sending blasts to ticket holders."
            : "No upcoming events or weekly cover nights at the selected venue."
        }
      />
    )
  }

  return (
    <ul className="space-y-3">
      {rows.map((row) => {
        const ring = row.kind === "weekly_cover" ? ACCESS_ACCENT : EVENT_ACCENT
        return (
          <li key={row.key}>
            <Card className="p-4" style={{ borderColor: `${ring}55` }}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{row.name}</p>
                  <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                    {formatDate(row.start)} · {row.venueName || "-"}
                    {row.kind === "weekly_cover" ? " · Weekly Cover" : ""}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{row.ticketsSold} tickets sold</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button variant="secondary" size="sm" asChild>
                    <Link href={row.announceHref}>
                      <Megaphone /> Announce
                    </Link>
                  </Button>
                </div>
              </div>
            </Card>
          </li>
        )
      })}
    </ul>
  )
}
