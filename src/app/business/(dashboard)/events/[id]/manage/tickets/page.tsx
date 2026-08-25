"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { apiClient } from "@/lib/business/api-client"
import { weeklyCoverNightEditHref } from "@/lib/business/door-access"
import type { EventDetail } from "@/lib/business/types"
import { Skeleton } from "@/components/business/v2/ui/skeleton"
import { ManageSubheader } from "@/components/business/v2/events/ManageSubheader"
import { ManageSalesTickets } from "@/components/business/v2/events/ManageSalesTickets"

export default function V2ManageTicketsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [ready, setReady] = useState(false)

  // WC FLAW 3 — ManageSalesTickets writes PUT /business/events/:id and the
  // event ticket PUTs. Every WC night with a resolvable program edits tiers
  // on the night-override editor instead — including one already stamped
  // customized (Custom WC, never a green Event). The writer only mounts for
  // named events and for rows with no program to protect.
  useEffect(() => {
    let cancelled = false
    apiClient
      .get<EventDetail>(`/business/events/${id}`)
      .then((event) => {
        if (cancelled) return
        const wcNightEdit = weeklyCoverNightEditHref(event)
        if (wcNightEdit != null) router.replace(wcNightEdit)
        else setReady(true)
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
  }, [id, router])

  if (!ready) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  return (
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
  )
}
