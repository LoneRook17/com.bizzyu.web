"use client"

import { useCallback, useEffect, useState } from "react"
import { apiClient, ApiError } from "@/lib/business/api-client"
import CampaignDetailDrawer from "@/components/business/dashboard/marketing/CampaignDetailDrawer"
import type {
  CampaignRow,
  CampaignType,
  CampaignTypeFilter,
  CampaignsResponse,
} from "@/components/business/dashboard/marketing/types"

const FILTER_TABS: Array<{ value: CampaignTypeFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "announcement", label: "Announcements" },
  { value: "event_sms", label: "Event SMS" },
  { value: "attendee_sms", label: "Attendee SMS" },
]

const TYPE_LABEL: Record<CampaignType, string> = {
  announcement: "Announcement",
  event_sms: "Event SMS",
  attendee_sms: "Attendee SMS",
}

const TYPE_COLOR: Record<CampaignType, string> = {
  announcement: "bg-blue-100 text-blue-800",
  event_sms: "bg-amber-100 text-amber-800",
  attendee_sms: "bg-purple-100 text-purple-800",
}

const TYPE_ICON: Record<CampaignType, string> = {
  announcement: "🔔",
  event_sms: "🎟",
  attendee_sms: "💬",
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export default function CampaignsPage() {
  const [type, setType] = useState<CampaignTypeFilter>("all")
  const [page, setPage] = useState(1)
  const [data, setData] = useState<CampaignsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [drawerId, setDrawerId] = useState<number | null>(null)

  const fetchCampaigns = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiClient.get<CampaignsResponse>(
        `/business/marketing/campaigns?type=${type}&page=${page}&limit=50`
      )
      setData(res)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load campaigns")
    } finally {
      setLoading(false)
    }
  }, [type, page])

  useEffect(() => {
    fetchCampaigns()
  }, [fetchCampaigns])

  useEffect(() => {
    setPage(1)
  }, [type])

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-ink">Campaigns</h2>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {FILTER_TABS.map((tab) => {
          const isActive = type === tab.value
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setType(tab.value)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-white"
                  : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {error && (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
            <tr>
              <th className="px-3 py-2 text-left">Date</th>
              <th className="px-3 py-2 text-left">Type</th>
              <th className="px-3 py-2 text-left">Audience</th>
              <th className="px-3 py-2 text-left">Message</th>
              <th className="px-3 py-2 text-right">Recipients</th>
              <th className="px-3 py-2 text-right">Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (!data || data.campaigns.length === 0) && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-sm text-gray-500">
                  Loading campaigns…
                </td>
              </tr>
            )}
            {!loading && data && data.campaigns.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-sm text-gray-500">
                  No campaigns yet.
                </td>
              </tr>
            )}
            {data?.campaigns.map((row) => (
              <CampaignTableRow
                key={row.id}
                row={row}
                onOpen={() => setDrawerId(row.id)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {data && data.pagination.total_pages > 1 && (
        <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
          <span>
            Page {data.pagination.page} of {data.pagination.total_pages} ·{" "}
            {data.pagination.total} campaigns
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= data.pagination.total_pages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      <CampaignDetailDrawer campaignId={drawerId} onClose={() => setDrawerId(null)} />
    </div>
  )
}

function CampaignTableRow({ row, onOpen }: { row: CampaignRow; onOpen: () => void }) {
  return (
    <tr className="cursor-pointer hover:bg-gray-50" onClick={onOpen}>
      <td className="px-3 py-2 text-xs text-gray-700">{formatDate(row.sent_at)}</td>
      <td className="px-3 py-2">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLOR[row.blast_type]}`}
        >
          <span aria-hidden>{TYPE_ICON[row.blast_type]}</span>
          {TYPE_LABEL[row.blast_type]}
        </span>
      </td>
      <td className="px-3 py-2 text-sm text-ink">{row.audience_summary}</td>
      <td className="px-3 py-2 text-sm text-gray-600">{row.message_preview}</td>
      <td className="px-3 py-2 text-right tabular-nums">{row.recipients_count}</td>
      <td className="px-3 py-2 text-right tabular-nums">
        ${(row.estimated_cost_cents / 100).toFixed(2)}
      </td>
    </tr>
  )
}
