"use client"

import { useEffect, useState, use } from "react"
import Link from "next/link"
import Image from "next/image"
import { apiClient, ApiError } from "@/lib/business/api-client"

const MAX_LEN = 280

interface Announcement {
  id: number
  message: string
  recipient_count: number
  push_count: number
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

export default function AnnouncementsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [items, setItems] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [eventName, setEventName] = useState<string | null>(null)
  const [showCompose, setShowCompose] = useState(false)
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState("")
  const [confirmCount, setConfirmCount] = useState<number | null>(null)

  const fetchItems = () => {
    apiClient
      .get<{ announcements: Announcement[] }>(`/business/events/${id}/announcements`)
      .then((data) => setItems(data.announcements))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load"))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    apiClient.get<{ name: string }>(`/business/events/${id}`).then((d) => setEventName(d.name)).catch(() => {})
    fetchItems()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const handleSend = async () => {
    const trimmed = message.trim()
    if (!trimmed || trimmed.length > MAX_LEN) return
    setSending(true)
    setSendError("")
    try {
      const result = await apiClient.post<{ recipient_count: number }>(
        `/business/events/${id}/announcements`,
        { message: trimmed }
      )
      setShowCompose(false)
      setMessage("")
      setConfirmCount(result.recipient_count)
      fetchItems()
    } catch (err) {
      setSendError(err instanceof ApiError ? err.message : "Failed to send")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="max-w-3xl pb-32">
      <Link href={`/business/events/${id}/manage`} className="text-xs text-gray-500 hover:text-primary mb-2 inline-block">
        &larr; Back to Manage
      </Link>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-ink">Announcements</h1>
        {eventName && <p className="text-xs text-gray-500 mt-1">{eventName}</p>}
      </div>

      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

      {confirmCount !== null && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          Sent to {confirmCount} guest{confirmCount === 1 ? "" : "s"}.
        </div>
      )}

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
          <h2 className="text-lg font-bold text-ink mt-4">Send Your First Announcement</h2>
          <p className="text-sm text-gray-500 mt-1">
            Quickly notify everyone with a ticket to this event.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((a) => (
            <li key={a.id} className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-sm text-ink">{a.message}</p>
              <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                <span>{formatDate(a.fired_at)}</span>
                <span>·</span>
                <span>{a.recipient_count} recipient{a.recipient_count === 1 ? "" : "s"}</span>
                {a.push_count > 0 && (
                  <>
                    <span>·</span>
                    <span>{a.push_count} delivered</span>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Pinned bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white p-4">
        <div className="mx-auto max-w-3xl">
          <button
            onClick={() => {
              setShowCompose(true)
              setSendError("")
              setConfirmCount(null)
            }}
            className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary/90 cursor-pointer"
          >
            + New Announcement
          </button>
        </div>
      </div>

      {/* Compose modal */}
      {showCompose && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between mb-3">
              <h2 className="text-lg font-bold text-ink">{eventName || "Announcement"}</h2>
              <button
                onClick={() => setShowCompose(false)}
                className="text-gray-400 hover:text-gray-700 cursor-pointer text-xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, MAX_LEN))}
              placeholder="Your message here"
              rows={5}
              autoFocus
              className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
              <span>{message.length}/{MAX_LEN}</span>
              {sendError && <span className="text-red-500">{sendError}</span>}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowCompose(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
                disabled={sending}
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={sending || !message.trim() || message.trim().length > MAX_LEN}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {sending ? "Sending…" : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
