"use client"

import { useEffect, useState } from "react"
import { apiClient, ApiError } from "@/lib/business/api-client"
import type { AttendeeDetail } from "./types"
import TagChip from "./TagChip"

interface Props {
  userId: number | null
  onClose: () => void
}

function formatDate(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

export default function AttendeeDetailDrawer({ userId, onClose }: Props) {
  const [data, setData] = useState<AttendeeDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (userId == null) {
      setData(null)
      return
    }
    setLoading(true)
    setError(null)
    apiClient
      .get<AttendeeDetail>(`/business/marketing/attendees/${userId}`)
      .then((r) => setData(r))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 403) {
          setError("Only the business owner can view full attendee details, including phone numbers.")
        } else {
          setError(err instanceof ApiError ? err.message : "Failed to load attendee")
        }
      })
      .finally(() => setLoading(false))
  }, [userId])

  if (userId == null) return null

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/40">
      <div className="flex h-full w-full max-w-md flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h2 className="text-base font-semibold text-ink">Attendee details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-ink">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading && <p className="text-sm text-gray-500">Loading…</p>}
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          {data && (
            <div className="space-y-5">
              <div>
                <p className="text-lg font-semibold text-ink">{data.user.full_name}</p>
                <p className="text-sm text-gray-500">{data.user.email}</p>
                {data.user.phone_number && (
                  <p className="mt-1 text-sm text-gray-700">{data.user.phone_number}</p>
                )}
                {data.user.marketing_globally_muted && (
                  <p className="mt-1 inline-block rounded bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">
                    Marketing-muted globally
                  </p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 rounded-md border border-gray-200 p-3 text-sm">
                <div>
                  <p className="text-xs text-gray-500">Tickets</p>
                  <p className="font-semibold text-ink">{data.totals.tickets}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Line skips</p>
                  <p className="font-semibold text-ink">{data.totals.line_skips}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Spend</p>
                  <p className="font-semibold text-ink">
                    ${(data.totals.total_spend_cents / 100).toFixed(2)}
                  </p>
                </div>
              </div>

              <div>
                <p className="mb-1 text-xs font-medium text-gray-700">Tags</p>
                <div className="flex flex-wrap gap-1">
                  {data.tags.length === 0 ? (
                    <span className="text-sm text-gray-400">None</span>
                  ) : (
                    data.tags.map((t) => <TagChip key={t.id} tag={t} />)
                  )}
                </div>
              </div>

              <div>
                <p className="mb-1 text-xs font-medium text-gray-700">Following state</p>
                <p className="text-sm text-gray-600">
                  {data.user.following.followed_at
                    ? `Followed ${formatDate(data.user.following.followed_at)}`
                    : "Not following"}
                  {" · "}
                  SMS {data.user.following.sms_enabled ? "on" : "off"} · Push{" "}
                  {data.user.following.push_enabled ? "on" : "off"}
                </p>
              </div>

              <div>
                <p className="mb-1 text-xs font-medium text-gray-700">
                  Last purchase: {formatDate(data.totals.last_purchase_at)}
                </p>
              </div>

              <div>
                <p className="mb-2 text-xs font-medium text-gray-700">
                  Recent tickets ({data.tickets.length})
                </p>
                <ul className="divide-y divide-gray-100 rounded-md border border-gray-200 text-sm">
                  {data.tickets.slice(0, 10).map((t: any) => (
                    <li key={t.id} className="flex items-center justify-between px-3 py-2">
                      <span className="truncate">{t.event_name}</span>
                      <span className="text-xs text-gray-500">
                        ${Number(t.price).toFixed(2)}
                      </span>
                    </li>
                  ))}
                  {data.tickets.length === 0 && (
                    <li className="px-3 py-2 text-xs text-gray-400">No tickets yet</li>
                  )}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
