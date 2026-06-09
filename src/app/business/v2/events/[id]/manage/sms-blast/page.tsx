"use client"

import { useEffect, useState, use } from "react"
import Link from "next/link"
import { MessagesSquare, Plus } from "lucide-react"
import { apiClient, ApiError } from "@/lib/business/api-client"
import { money } from "@/lib/v2/utils"
import { Card } from "@/components/business/v2/ui/card"
import { Button } from "@/components/business/v2/ui/button"
import { Skeleton } from "@/components/business/v2/ui/skeleton"
import { EmptyState } from "@/components/business/v2/ui/empty-state"
import { ManageSubheader } from "@/components/business/v2/events/ManageSubheader"
import { fmtDateTime } from "@/components/business/v2/events/eventStatus"

interface Blast {
  id: number
  message: string
  event_ids: number[] | string
  recipient_count: number
  sms_count: number
  estimated_cost_cents: number
  fired_at: string
}

function eventCount(b: Blast): number {
  const ids = typeof b.event_ids === "string" ? JSON.parse(b.event_ids) : b.event_ids
  return Array.isArray(ids) ? ids.length : 0
}

export default function V2SmsBlastHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [items, setItems] = useState<Blast[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    apiClient
      .get<{ blasts: Blast[] }>(`/business/sms-blasts?event_id=${id}`)
      .then((data) => setItems(data.blasts))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load"))
      .finally(() => setLoading(false))
  }, [id])

  return (
    <>
      <ManageSubheader
        eventId={id}
        title="SMS blasts"
        subtitle="Text-message campaigns sent for this event."
        actions={
          <Button asChild>
            <Link href={`/business/v2/events/${id}/manage/sms-blast/audience`}><Plus /> New SMS blast</Link>
          </Button>
        }
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <div className="flex flex-col gap-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={MessagesSquare}
          title="Send your first SMS blast"
          description="Reach ticket holders who opted in to text messages."
          action={<Button asChild><Link href={`/business/v2/events/${id}/manage/sms-blast/audience`}><Plus /> New SMS blast</Link></Button>}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((b) => (
            <Card key={b.id} className="p-4">
              <p className="line-clamp-2 text-sm text-neutral-900">{b.message}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-neutral-500">
                <span>{fmtDateTime(b.fired_at)}</span>
                <span>·</span>
                <span>{eventCount(b)} event{eventCount(b) === 1 ? "" : "s"}</span>
                <span>·</span>
                <span>{b.recipient_count} recipient{b.recipient_count === 1 ? "" : "s"}</span>
                <span>·</span>
                <span>{money(b.estimated_cost_cents)}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
