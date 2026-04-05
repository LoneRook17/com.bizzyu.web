"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
import { apiClient, ApiError } from "@/lib/business/api-client"
import type { CheckinEntry } from "@/lib/business/types"

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export default function CheckinsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [checkins, setCheckins] = useState<CheckinEntry[]>([])
  const [summary, setSummary] = useState({ total: 0, redeemed: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    apiClient
      .get<{ checkins: CheckinEntry[]; summary: { total: number; redeemed: number } }>(`/business/events/${id}/checkins`)
      .then((data) => {
        setCheckins(data.checkins)
        setSummary(data.summary)
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load check-in history"))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="max-w-3xl animate-pulse space-y-4">
        <div className="h-6 bg-gray-200 rounded w-48" />
        <div className="h-48 bg-gray-200 rounded-xl" />
      </div>
    )
  }

  const checkedIn = checkins.filter((c) => c.is_redeemed)
  const notCheckedIn = checkins.filter((c) => !c.is_redeemed)
  const pct = summary.total > 0 ? ((summary.redeemed / summary.total) * 100).toFixed(1) : "0.0"

  return (
    <div className="max-w-3xl">
      <Link href={`/business/events/${id}/manage`} className="text-xs text-gray-500 hover:text-primary mb-2 inline-block">
        &larr; Back to Manage
      </Link>
      <h1 className="text-xl font-bold text-ink mb-6">Check-In History</h1>

      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-ink">{summary.total}</p>
          <p className="text-xs text-gray-500">Total Tickets</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{summary.redeemed}</p>
          <p className="text-xs text-gray-500">Checked In</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-ink">{pct}%</p>
          <p className="text-xs text-gray-500">Check-in Rate</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="h-3 w-full rounded-full bg-gray-100 overflow-hidden">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {checkins.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-sm text-gray-500">No ticket holders yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Checked in */}
          {checkedIn.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 bg-green-50/50">
                <h3 className="text-sm font-semibold text-green-700">Checked In ({checkedIn.length})</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {checkedIn.map((c) => (
                  <div key={c.ticket_instance_id} className="flex items-center justify-between px-5 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink truncate">{c.attendee_name || "Guest"}</p>
                      <p className="text-xs text-gray-500">
                        {c.ticket_name}
                        {c.ticket_type === "line_skip" && (
                          <span className="ml-1 text-orange-600">(Line Skip)</span>
                        )}
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className="text-xs text-green-600 font-medium">Checked In</p>
                      {c.redeemed_at && (
                        <p className="text-[10px] text-gray-400">{formatTime(c.redeemed_at)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Not checked in */}
          {notCheckedIn.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
                <h3 className="text-sm font-semibold text-gray-600">Not Checked In ({notCheckedIn.length})</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {notCheckedIn.map((c) => (
                  <div key={c.ticket_instance_id} className="flex items-center justify-between px-5 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink truncate">{c.attendee_name || "Guest"}</p>
                      <p className="text-xs text-gray-500">
                        {c.ticket_name}
                        {c.ticket_type === "line_skip" && (
                          <span className="ml-1 text-orange-600">(Line Skip)</span>
                        )}
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className="text-xs text-gray-400">Not scanned</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
