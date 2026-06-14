"use client"

import { useEffect, useState, use } from "react"
import Link from "next/link"
import Image from "next/image"
import { apiClient, ApiError } from "@/lib/business/api-client"

interface Blast {
  id: number
  message: string
  event_ids: number[] | string
  recipient_count: number
  sms_count: number
  estimated_cost_cents: number
  fired_at: string
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function formatCost(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

export default function SmsBlastHistoryPage({ params }: { params: Promise<{ id: string }> }) {
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

  const eventCount = (b: Blast) => {
    const ids = typeof b.event_ids === "string" ? JSON.parse(b.event_ids) : b.event_ids
    return Array.isArray(ids) ? ids.length : 0
  }

  return (
    <div className="max-w-3xl pb-32">
      <Link href={`/business/events/${id}/manage`} className="text-xs text-gray-500 hover:text-primary mb-2 inline-block">
        &larr; Back to Manage
      </Link>
      <h1 className="text-xl font-bold text-ink mb-6">SMS Blasts</h1>

      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-200 rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12">
          <Image
            src="/empty-state-blast.svg"
            alt="Paper plane"
            width={120}
            height={120}
            className="mx-auto opacity-80"
          />
          <h2 className="text-lg font-bold text-ink mt-4">Send Your First SMS Blast</h2>
          <p className="text-sm text-gray-500 mt-1">
            Quickly reach your audience with personalized text messages.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((b) => (
            <li key={b.id} className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-sm text-ink line-clamp-2">{b.message}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                <span>{formatDate(b.fired_at)}</span>
                <span>·</span>
                <span>{eventCount(b)} event{eventCount(b) === 1 ? "" : "s"}</span>
                <span>·</span>
                <span>{b.recipient_count} recipient{b.recipient_count === 1 ? "" : "s"}</span>
                <span>·</span>
                <span>{formatCost(b.estimated_cost_cents)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Pinned bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white p-4">
        <div className="mx-auto max-w-3xl">
          <Link
            href={`/business/events/${id}/manage/sms-blast/audience`}
            className="block w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary/90 text-center"
          >
            + New SMS Blast
          </Link>
        </div>
      </div>
    </div>
  )
}
