"use client"

import { Fragment, use, useEffect, useState } from "react"
import { apiClient } from "@/lib/business/api-client"
import { isWeeklyCoverProduct } from "@/lib/business/door-access"
import type { EventDetail } from "@/lib/business/types"
import { Skeleton } from "@/components/business/v2/ui/skeleton"
import { ManageSubheader } from "@/components/business/v2/events/ManageSubheader"
import { ManageSalesTickets } from "@/components/business/v2/events/ManageSalesTickets"
import { WeeklyCoverAccent } from "@/components/business/v2/door-access/WeeklyCoverAccent"

export default function V2ManageTicketsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [ready, setReady] = useState(false)
  const [pink, setPink] = useState(false)

  // Luke (2026-08-29): a WC night's Manage Tickets is this same page in
  // pink, tickets only, never the night editor (that page mixes in door
  // hours). The old WC redirect guarded against the event ticket writes
  // skipping Custom; the services ticket-manage routes now stamp the WC
  // night Custom and persist per-date tier overrides themselves
  // (stampOccurrenceCustomFromTicketManage), so a tier edit here chips
  // that night only and series saves leave it alone. The read decides the
  // accent, nothing else.
  useEffect(() => {
    let cancelled = false
    apiClient
      .get<EventDetail>(`/business/events/${id}`)
      .then((event) => {
        if (cancelled) return
        setPink(isWeeklyCoverProduct(event))
        setReady(true)
      })
      // On a failed read, mount the editor: it fetches the same event itself
      // and owns the error state, so the host sees the real failure, not a
      // silent skeleton.
      .catch(() => {
        if (!cancelled) setReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  if (!ready) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  const AccentScope = pink ? WeeklyCoverAccent : Fragment
  return (
    <AccentScope>
      <ManageSalesTickets
        eventId={id}
        header={({ editing, addButton }) => (
          <ManageSubheader
            eventId={id}
            title="Manage Tickets"
            actions={!editing ? addButton : undefined}
          />
        )}
      />
    </AccentScope>
  )
}
