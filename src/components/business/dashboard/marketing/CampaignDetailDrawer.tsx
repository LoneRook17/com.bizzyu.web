"use client"

import { useEffect, useState } from "react"
import { apiClient, ApiError } from "@/lib/business/api-client"
import type { CampaignDetail, CampaignType } from "./types"

interface Props {
  campaignId: number | null
  onClose: () => void
}

const TYPE_LABEL: Record<CampaignType, string> = {
  announcement: "Announcement",
  event_sms: "Event SMS",
  attendee_sms: "Attendee SMS",
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export default function CampaignDetailDrawer({ campaignId, onClose }: Props) {
  const [detail, setDetail] = useState<CampaignDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (campaignId == null) {
      setDetail(null)
      setError(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    apiClient
      .get<CampaignDetail>(`/business/marketing/campaigns/${campaignId}`)
      .then((res) => {
        if (!cancelled) setDetail(res)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Failed to load campaign")
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [campaignId])

  if (campaignId == null) return null

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/40">
      <div className="flex h-full w-full max-w-lg flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h2 className="text-base font-semibold text-ink">Campaign details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-ink">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 text-sm text-ink">
          {loading && <p className="text-gray-500">Loading…</p>}
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-700">
              {error}
            </div>
          )}
          {detail && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                  {TYPE_LABEL[detail.blast_type]}
                </span>
                <span className="text-xs text-gray-500">
                  {formatDateTime(detail.sent_at)}
                </span>
              </div>

              <div>
                <h3 className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  Message
                </h3>
                <p className="mt-1 whitespace-pre-wrap rounded-md bg-gray-50 px-3 py-2 text-sm">
                  {detail.message}
                </p>
              </div>

              <div>
                <h3 className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  Audience
                </h3>
                <ul className="mt-1 space-y-1 text-sm">
                  {detail.audience.events.length > 0 && (
                    <li className="text-gray-700">
                      Events:{" "}
                      {detail.audience.events.map((e) => e.name).join(", ")}
                    </li>
                  )}
                  {detail.audience.cohort_note && (
                    <li className="text-gray-700">{detail.audience.cohort_note}</li>
                  )}
                  {detail.audience.recipients.length > 0 && (
                    <li className="text-gray-700">
                      Recipients ({detail.audience.recipients.length}):{" "}
                      {detail.audience.recipients
                        .slice(0, 12)
                        .map((r) => r.full_name)
                        .join(", ")}
                      {detail.audience.recipients.length > 12 && " …"}
                    </li>
                  )}
                </ul>
              </div>

              <div>
                <h3 className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  Delivery
                </h3>
                <dl className="mt-1 grid grid-cols-2 gap-2 text-sm">
                  <dt className="text-gray-500">Recipients</dt>
                  <dd>{detail.counts.recipients}</dd>
                  {detail.channel !== "sms" && (
                    <>
                      <dt className="text-gray-500">Push sent</dt>
                      <dd>{detail.counts.push_sent}</dd>
                    </>
                  )}
                  {detail.channel !== "push" && (
                    <>
                      <dt className="text-gray-500">SMS segments sent</dt>
                      <dd>{detail.counts.sms_segments_sent}</dd>
                      <dt className="text-gray-500">Estimated cost</dt>
                      <dd>${(detail.counts.estimated_cost_cents / 100).toFixed(2)}</dd>
                    </>
                  )}
                </dl>
                <p className="mt-2 text-xs text-gray-500">{detail.delivery_note}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
