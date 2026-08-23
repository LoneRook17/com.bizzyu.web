"use client"

import { use } from "react"
import { ManageSubheader } from "@/components/business/v2/events/ManageSubheader"
import { ManageSalesTickets } from "@/components/business/v2/events/ManageSalesTickets"

export default function V2ManageTicketsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

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
