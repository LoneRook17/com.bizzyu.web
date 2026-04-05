"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/business/auth-context"
import { apiClient } from "@/lib/business/api-client"
import type { DashboardSummary, QuickStats, ActivityFeedItem } from "@/lib/business/types"

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-ink">{value}</p>
    </div>
  )
}

function QuickStatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-lg font-semibold text-ink">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function ActivityItem({ item }: { item: ActivityFeedItem }) {
  const time = new Date(item.timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })

  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className="mt-0.5 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-ink">{item.message}</p>
        <p className="text-xs text-gray-400 mt-0.5">{time}</p>
      </div>
    </div>
  )
}

export default function DashboardHomePage() {
  const { user, isPending } = useAuth()
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [quickStats, setQuickStats] = useState<QuickStats | null>(null)
  const [activity, setActivity] = useState<ActivityFeedItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [summaryData, statsData, activityData] = await Promise.all([
          apiClient.get<DashboardSummary>("/business/dashboard/summary"),
          apiClient.get<QuickStats>("/business/dashboard/quick-stats"),
          apiClient.get<ActivityFeedItem[]>("/business/dashboard/activity?limit=10"),
        ])
        setSummary(summaryData)
        setQuickStats(statsData)
        setActivity(activityData)
      } catch {
        // Dashboard data may be empty for new/pending businesses
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const formatCurrency = (val: number | null | undefined) => {
    if (val == null) return "—"
    return `$${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-ink mb-6">
        Welcome back{user ? `, ${user.full_name.split(" ")[0]}` : ""}
      </h1>

      {isPending && (
        <div className="mb-6 rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
          Your dashboard data will populate once your business is approved.
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
              <div className="h-8 bg-gray-200 rounded w-16" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <StatCard label="Total Events" value={summary?.total_events ?? 0} />
            <StatCard label="Total Attendees" value={summary?.total_attendees ?? 0} />
            <StatCard label="Total Revenue" value={formatCurrency(summary?.total_revenue)} />
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <QuickStatCard label="Active Deals" value={quickStats?.active_deals_count ?? 0} />
            <QuickStatCard label="Claims This Week" value={quickStats?.claims_this_week ?? 0} />
            <QuickStatCard label="Upcoming Events" value={quickStats?.upcoming_events_count ?? 0} />
            <QuickStatCard
              label="Next Event"
              value={
                quickStats?.next_event_date
                  ? new Date(quickStats.next_event_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                  : "—"
              }
            />
          </div>

          {/* Activity feed */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-ink mb-3">Recent Activity</h2>
            {activity.length > 0 ? (
              <div>
                {activity.map((item, i) => (
                  <ActivityItem key={i} item={item} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 py-4 text-center">
                No recent activity yet.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
