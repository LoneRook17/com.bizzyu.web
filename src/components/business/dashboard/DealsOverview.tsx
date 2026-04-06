"use client"

import { useState } from "react"
import type { DealsOverview, DealOverviewItem, DealAnalytics } from "@/lib/business/types"
import { apiClient } from "@/lib/business/api-client"
import DealAnalyticsView from "./DealAnalyticsView"

function AggregateStats({ data }: { data: DealsOverview }) {
  const stats = [
    { label: "Active Deals", value: data.total_active_deals },
    { label: "Total Claims", value: data.total_claims.toLocaleString() },
    { label: "Claims This Week", value: data.claims_this_week.toLocaleString() },
    { label: "Avg Claims / Deal", value: data.average_claims_per_deal },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {stats.map((s) => (
        <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">{s.label}</p>
          <p className="mt-1 text-2xl font-bold text-ink">{s.value}</p>
        </div>
      ))}
    </div>
  )
}

function DealCard({
  deal,
  isExpanded,
  onToggle,
}: {
  deal: DealOverviewItem
  isExpanded: boolean
  onToggle: () => void
}) {
  const [detail, setDetail] = useState<DealAnalytics | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const handleToggle = () => {
    if (!isExpanded && !detail) {
      setDetailLoading(true)
      apiClient
        .get<DealAnalytics>(`/business/analytics/deals/${deal.deal_id}`)
        .then(setDetail)
        .catch(() => setDetail(null))
        .finally(() => setDetailLoading(false))
    }
    onToggle()
  }

  const supplyLabel = deal.supply_limit
    ? `${deal.supply_used} / ${deal.supply_limit} claimed`
    : `${deal.supply_used} claimed`

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={handleToggle}
        className="w-full text-left p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-4">
          {/* Thumbnail */}
          {deal.deal_image_path ? (
            <img
              src={deal.deal_image_path}
              alt=""
              className="h-12 w-12 rounded-lg object-cover flex-shrink-0 bg-gray-100"
            />
          ) : (
            <div className="h-12 w-12 rounded-lg bg-gray-100 flex-shrink-0" />
          )}

          {/* Title + status */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full flex-shrink-0 ${deal.is_active ? "bg-green-500" : "bg-gray-400"}`}
              />
              <p className="text-sm font-semibold text-ink truncate">{deal.deal_title}</p>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{supplyLabel}</p>
          </div>

          {/* Inline stats */}
          <div className="hidden sm:flex items-center gap-6 flex-shrink-0">
            <div className="text-right">
              <p className="text-xs text-gray-500">Claims</p>
              <p className="text-sm font-semibold text-ink">{deal.total_claims}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">This Week</p>
              <p className="text-sm font-semibold text-ink">{deal.claims_this_week}</p>
            </div>
          </div>

          {/* Mobile stats */}
          <div className="flex sm:hidden items-center gap-3 flex-shrink-0">
            <div className="text-right">
              <p className="text-xs text-gray-500">Claims</p>
              <p className="text-sm font-semibold text-ink">{deal.total_claims}</p>
            </div>
          </div>

          {/* Chevron */}
          <svg
            className={`h-4 w-4 text-gray-400 flex-shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded detail */}
      {isExpanded && (
        <div className="border-t border-gray-100 p-4 bg-gray-50/50">
          {detailLoading ? (
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 rounded w-32" />
              <div className="h-24 bg-gray-200 rounded" />
            </div>
          ) : detail ? (
            <DealAnalyticsView data={detail} />
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">Unable to load detail.</p>
          )}
        </div>
      )}
    </div>
  )
}

export default function DealsOverviewComponent({ data }: { data: DealsOverview }) {
  const [expandedId, setExpandedId] = useState<number | null>(null)

  if (data.deals.length === 0) {
    return (
      <div>
        <AggregateStats data={data} />
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
          No deals yet. Create a deal to see analytics here.
        </div>
      </div>
    )
  }

  return (
    <div>
      <AggregateStats data={data} />
      <div className="space-y-3">
        {data.deals.map((deal) => (
          <DealCard
            key={deal.deal_id}
            deal={deal}
            isExpanded={expandedId === deal.deal_id}
            onToggle={() => setExpandedId(expandedId === deal.deal_id ? null : deal.deal_id)}
          />
        ))}
      </div>
    </div>
  )
}
