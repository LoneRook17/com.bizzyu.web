"use client"

import { useEffect, useState, use } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { apiClient, ApiError } from "@/lib/business/api-client"
import type { EventListItem } from "@/lib/business/types"

export default function AudiencePickerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const currentEventId = Number(id)

  const [events, setEvents] = useState<EventListItem[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set([currentEventId]))
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
    if (selected.size === 0) {
      setRecipientCount(0)
      return
    }
    const ids = Array.from(selected).join(",")
    setPreviewLoading(true)
    apiClient
      .get<{ recipient_count: number }>(`/business/sms-blasts/audience-preview?event_ids=${ids}`)
      .then((d) => setRecipientCount(d.recipient_count))
      .catch(() => setRecipientCount(null))
      .finally(() => setPreviewLoading(false))
  }, [selected])

  const toggle = (eventId: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(eventId)) next.delete(eventId)
      else next.add(eventId)
      return next
    })
  }

  const handleContinue = () => {
    if (selected.size === 0) return
    const ids = Array.from(selected).join(",")
    router.push(`/business/events/${id}/manage/sms-blast/compose?event_ids=${ids}`)
  }

  return (
    <div className="max-w-3xl pb-32">
      <Link
        href={`/business/events/${id}/manage/sms-blast`}
        className="text-xs text-gray-500 hover:text-primary mb-2 inline-block"
      >
        &larr; Back to SMS Blasts
      </Link>
      <div className="mb-2">
        <h1 className="text-xl font-bold text-ink">New SMS Blast</h1>
        <p className="text-sm text-gray-500 mt-1">Select SMS Blast Audience</p>
      </div>

      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

      <h2 className="text-sm font-semibold text-ink mt-6 mb-3">Your Events</h2>

      {loading ? (
        <div className="space-y-2 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-gray-200 rounded-xl" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <p className="text-sm text-gray-500">No events found.</p>
      ) : (
        <ul className="space-y-2">
          {events.map((e) => {
            const isChecked = selected.has(e.event_id)
            return (
              <li key={e.event_id}>
                <label
                  className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${
                    isChecked ? "border-primary bg-primary/5" : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggle(e.event_id)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  {e.flyer_image_url ? (
                    <Image
                      src={e.flyer_image_url}
                      alt=""
                      width={48}
                      height={48}
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-gray-100" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink truncate">{e.name}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {new Date(e.start_date_time).toLocaleDateString()} · {e.venue_name}
                    </p>
                  </div>
                </label>
              </li>
            )
          })}
        </ul>
      )}

      {/* Pinned bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white p-4">
        <div className="mx-auto max-w-3xl flex items-center justify-between gap-3">
          <div className="text-xs text-gray-500">
            {selected.size} event{selected.size === 1 ? "" : "s"}
            {recipientCount !== null && (
              <> · ~{recipientCount} contact{recipientCount === 1 ? "" : "s"}</>
            )}
            {previewLoading && <> · …</>}
          </div>
          <button
            onClick={handleContinue}
            disabled={selected.size === 0}
            className="rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Select audience
          </button>
        </div>
      </div>
    </div>
  )
}
