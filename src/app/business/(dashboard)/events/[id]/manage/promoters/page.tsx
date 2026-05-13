"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
import { apiClient, ApiError } from "@/lib/business/api-client"
import type { PromoterDetail, PromotersResponse } from "@/lib/business/types"

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function EventPromotersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [promoters, setPromoters] = useState<PromoterDetail[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    apiClient
      .get<PromotersResponse>(`/events/${id}/promoters`)
      .then((res) => setPromoters(res.promoters ?? []))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load promoters"))
      .finally(() => setLoading(false))
  }, [id])

  // Total commission across all promoters this event = pending + paid (excludes
  // clawed_back already, since the server query filters that out).
  const totalCommissionCents = (promoters ?? []).reduce(
    (sum, p) => sum + p.commission_pending_cents + p.commission_paid_cents,
    0,
  )

  if (loading) {
    return (
      <div className="max-w-3xl animate-pulse space-y-4">
        <div className="h-6 bg-gray-200 rounded w-48" />
        <div className="h-32 bg-gray-200 rounded-xl" />
        <div className="h-24 bg-gray-200 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl">
      <Link href={`/business/events/${id}/manage`} className="text-xs text-gray-500 hover:text-primary mb-2 inline-block">
        &larr; Back to Manage
      </Link>
      <h1 className="text-xl font-bold text-ink mb-6">Promoters</h1>

      {error ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-sm text-red-500">{error}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* "Going to promoters" tile — explicit copy that this is already
              deducted from gross, so the owner doesn't pay it directly. */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center gap-2 mb-2">
              <svg className="h-4 w-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 3.94c.09-.542.56-.94 1.11-.94h1.1c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.929.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.424.07-.764.383-.929.78-.165.398-.143.854.107 1.204l.527.738c.32.447.27 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.398.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.27-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.893-.15c-.543-.09-.94-.56-.94-1.109v-1.094c0-.55.397-1.02.94-1.11l.894-.149c.424-.07.764-.383.929-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
              </svg>
              <h3 className="text-sm font-semibold text-gray-500">Going to promoters</h3>
            </div>
            <p className="text-2xl font-bold text-ink mb-1">{formatCurrency(totalCommissionCents)}</p>
            <p className="text-xs text-gray-500 leading-relaxed">
              Already deducted from your gross — you don&apos;t pay this separately.
              Your Stripe take-home is what&apos;s left after this.
            </p>
          </div>

          {/* Per-promoter list */}
          {(promoters ?? []).length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
              <p className="text-sm text-gray-500">
                No promoters yet. When users opt in to promote this event they&apos;ll appear here.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
              {(promoters ?? []).map((p) => (
                <div key={p.tracking_link_id} className="p-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {p.profile_photo_path ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.profile_photo_path} alt={p.full_name ?? ""} className="h-full w-full object-cover" />
                    ) : (
                      <svg className="h-5 w-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ink truncate">{p.full_name ?? "Unknown"}</p>
                    <p className="text-xs text-gray-500 truncate font-mono">{p.code}</p>
                  </div>
                  <div className="flex gap-3 text-xs">
                    <div className="text-center">
                      <p className="font-semibold text-gray-700">{p.clicks}</p>
                      <p className="text-gray-400">clicks</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-gray-700">{p.sales_count}</p>
                      <p className="text-gray-400">sales</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-purple-600">
                        {formatCurrency(p.commission_pending_cents + p.commission_paid_cents)}
                      </p>
                      <p className="text-gray-400">earned</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
