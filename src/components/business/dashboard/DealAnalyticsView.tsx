"use client"

import type { DealAnalytics } from "@/lib/business/types"

export default function DealAnalyticsView({ data }: { data: DealAnalytics }) {
  const maxClaims = Math.max(...data.claims_by_period.map((p) => p.count), 1)

  // Show claims chronologically (API returns DESC)
  const claimsSorted = [...data.claims_by_period].reverse()

  return (
    <div className="space-y-6">
      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs text-gray-500">Total Claims</p>
          <p className="text-2xl font-bold text-ink">{data.total_claims}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs text-gray-500">Click-Through Rate</p>
          <p className="text-2xl font-bold text-ink">{data.click_through_rate.rate.toFixed(1)}%</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {data.click_through_rate.claims} claims / {data.click_through_rate.clicks} clicks
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs text-gray-500">Supply Usage</p>
          {data.supply_usage.total ? (
            <>
              <p className="text-2xl font-bold text-ink">
                {data.supply_usage.used} / {data.supply_usage.total}
              </p>
              <div className="mt-2 h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.min((data.supply_usage.used / data.supply_usage.total) * 100, 100)}%` }}
                />
              </div>
            </>
          ) : (
            <>
              <p className="text-2xl font-bold text-ink">{data.supply_usage.used}</p>
              <p className="text-xs text-gray-400 mt-0.5">Unlimited supply</p>
            </>
          )}
        </div>
      </div>

      {/* Claims over time */}
      {claimsSorted.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-ink mb-4">Claims Over Time (Last 30 Days)</h3>
          <div className="space-y-1.5">
            {claimsSorted.map((period) => {
              const pct = (period.count / maxClaims) * 100
              const dateLabel = new Date(period.period + "T00:00:00").toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
              return (
                <div key={period.period} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-14 flex-shrink-0">{dateLabel}</span>
                  <div className="flex-1 h-5 rounded bg-gray-50 overflow-hidden">
                    <div
                      className="h-full rounded bg-primary/70"
                      style={{ width: `${Math.max(pct, period.count > 0 ? 2 : 0)}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-600 w-8 text-right">{period.count}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
