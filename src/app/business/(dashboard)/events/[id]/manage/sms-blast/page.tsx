"use client"

import { Suspense, useEffect, useState, use } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
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
  return (
    <Suspense>
      <SmsBlastHistory params={params} />
    </Suspense>
  )
}

function SmsBlastHistory({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [items, setItems] = useState<Blast[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Post-send result handoff from the compose page (?sent=&recipients=&failed=&blocked=).
  // Without this banner a blast whose every send failed (e.g. no opted-in
  // recipients with valid phones) looks like nothing happened at all.
  const search = useSearchParams()
  const justSent = search.get("sent") !== null
  const sentN = Number(search.get("sent") ?? 0)
  const recipientsN = Number(search.get("recipients") ?? 0)
  const failedN = Number(search.get("failed") ?? 0)
  const blockedN = Number(search.get("blocked") ?? 0)

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
            <Link href={`/business/events/${id}/manage/sms-blast/audience`}><Plus /> New SMS blast</Link>
          </Button>
        }
      />

      {justSent && (
        sentN > 0 ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
            Blast sent — {sentN} of {recipientsN} text{recipientsN === 1 ? "" : "s"} delivered to Twilio
            {failedN > 0 && <> · {failedN} failed</>}
            {blockedN > 0 && <> · {blockedN} opted out (texted STOP)</>}.
          </div>
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
            Blast fired, but 0 of {recipientsN} text{recipientsN === 1 ? "" : "s"} went through
            {blockedN > 0 && <> ({blockedN} recipient{blockedN === 1 ? "" : "s"} opted out by texting STOP)</>}.
            Recipients must have bought a ticket, have a valid phone number, and have SMS enabled for your venue.
          </div>
        )
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {loading ? (
        <div className="flex flex-col gap-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={MessagesSquare}
          title="Send your first SMS blast"
          description="Reach ticket holders who opted in to text messages."
          action={<Button asChild><Link href={`/business/events/${id}/manage/sms-blast/audience`}><Plus /> New SMS blast</Link></Button>}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((b) => (
            <Card key={b.id} className="p-4">
              <p className="line-clamp-2 text-sm text-neutral-900 dark:text-neutral-100">{b.message}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-neutral-500 dark:text-neutral-400">
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
