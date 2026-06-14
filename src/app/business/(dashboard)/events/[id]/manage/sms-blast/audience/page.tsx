"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import { CalendarDays } from "lucide-react"
import { apiClient, ApiError } from "@/lib/business/api-client"
import type { EventListItem } from "@/lib/business/types"
import { cn } from "@/lib/v2/utils"
import { Card } from "@/components/business/v2/ui/card"
import { Button } from "@/components/business/v2/ui/button"
import { Skeleton } from "@/components/business/v2/ui/skeleton"
import { ManageSubheader } from "@/components/business/v2/events/ManageSubheader"
import { fmtDate } from "@/components/business/v2/events/eventStatus"

export default function V2AudiencePickerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const currentEventId = Number(id)

  const [events, setEvents] = useState<EventListItem[]>([])
  // Single-select to match the Flutter app — one event per SMS blast.
  const [selectedId, setSelectedId] = useState<number | null>(currentEventId)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [recipientCount, setRecipientCount] = useState<number | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  useEffect(() => {
    apiClient
      .get<{ events: EventListItem[] }>(`/business/events?tab=all&page=1&limit=100`)
      .then((d) => setEvents(d.events))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load events"))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (selectedId == null) {
      setRecipientCount(0)
      return
    }
    setPreviewLoading(true)
    apiClient
      .get<{ recipient_count: number }>(`/business/sms-blasts/audience-preview?event_ids=${selectedId}`)
      .then((d) => setRecipientCount(d.recipient_count))
      .catch(() => setRecipientCount(null))
      .finally(() => setPreviewLoading(false))
  }, [selectedId])

  const handleContinue = () => {
    if (selectedId == null) return
    router.push(`/business/events/${id}/manage/sms-blast/compose?event_ids=${selectedId}`)
  }

  return (
    <>
      <ManageSubheader
        eventId={id}
        title="New SMS blast"
        subtitle="Pick which event's ticket holders to text."
        backHref={`/business/events/${id}/manage/sms-blast`}
        backLabel="Back to SMS blasts"
      />

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Your events</h2>

      {loading ? (
        <div className="flex flex-col gap-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : events.length === 0 ? (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">No events found.</p>
      ) : (
        <div className="flex flex-col gap-2 pb-2">
          {events.map((e) => {
            const isChecked = selectedId === e.event_id
            return (
              <label
                key={e.event_id}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors",
                  isChecked ? "border-[#05EB54] bg-green-50/60 dark:bg-green-950/40" : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-300 dark:hover:border-neutral-700"
                )}
              >
                <input
                  type="radio"
                  name="sms-blast-event"
                  checked={isChecked}
                  onChange={() => setSelectedId(e.event_id)}
                  className="size-4 border-neutral-300 dark:border-neutral-700 text-[#05EB54] focus:ring-[#05EB54]"
                />
                {e.flyer_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={e.flyer_image_url} alt="" className="size-12 rounded-lg object-cover" />
                ) : (
                  <span className="flex size-12 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-300 dark:text-neutral-600"><CalendarDays className="size-5" /></span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{e.name}</span>
                  <span className="block truncate text-[13px] text-neutral-500 dark:text-neutral-400">{fmtDate(e.start_date_time)} · {e.venue_name}</span>
                </span>
              </label>
            )
          })}
        </div>
      )}

      <Card className="sticky bottom-4 flex items-center justify-between gap-3 px-4 py-3">
        <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
          {recipientCount !== null
            ? <>~{recipientCount} ticket holder{recipientCount === 1 ? "" : "s"} with SMS opted-in</>
            : <>1 event</>}
          {previewLoading && <> · …</>}
        </p>
        <Button onClick={handleContinue} disabled={selectedId == null}>Select audience</Button>
      </Card>
    </>
  )
}
