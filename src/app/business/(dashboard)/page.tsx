"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/business/auth-context"
import { useVenue, useVenueParam } from "@/lib/business/venue-context"
import { apiClient } from "@/lib/business/api-client"
import type { DashboardSummary, QuickStats, ActivityFeedItem, EventListItem, DealListItem } from "@/lib/business/types"
import EventPreviewCard from "@/components/business/dashboard/EventPreviewCard"
import DealPreviewCard from "@/components/business/dashboard/DealPreviewCard"
import VenueSelectModal from "@/components/business/dashboard/VenueSelectModal"

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
  const router = useRouter()
  const { venues, isAllVenues, setSelectedVenue } = useVenue()
  const venueParam = useVenueParam()
  const [showVenueModal, setShowVenueModal] = useState(false)
  const [venueModalTarget, setVenueModalTarget] = useState("")
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [quickStats, setQuickStats] = useState<QuickStats | null>(null)
  const [activity, setActivity] = useState<ActivityFeedItem[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<EventListItem[]>([])
  const [liveDeals, setLiveDeals] = useState<DealListItem[]>([])
  const [loading, setLoading] = useState(true)

  const handleCreate = (path: string) => {
    if (isAllVenues && venues.length > 1) {
      setVenueModalTarget(path)
      setShowVenueModal(true)
    } else {
      if (isAllVenues && venues.length === 1) {
        setSelectedVenue(venues[0].id)
      }
      router.push(path)
    }
  }

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const results = await Promise.allSettled([
        apiClient.get<DashboardSummary>(`/business/dashboard/summary?_=1`),
        apiClient.get<QuickStats>(`/business/dashboard/quick-stats?_=1`),
        apiClient.get<ActivityFeedItem[]>(`/business/dashboard/activity?limit=10`),
        apiClient.get<{ events: EventListItem[]; total: number }>(`/business/events?tab=upcoming&limit=3${venueParam}`),
        apiClient.get<{ deals: DealListItem[]; total: number }>(`/business/deals?tab=live&limit=3${venueParam}`),
      ])

      const [summaryRes, statsRes, activityRes, eventsRes, dealsRes] = results

      if (summaryRes.status === 'fulfilled') setSummary(summaryRes.value)
      else console.error('[Dashboard] summary failed:', summaryRes.reason)

      if (statsRes.status === 'fulfilled') setQuickStats(statsRes.value)
      else console.error('[Dashboard] quick-stats failed:', statsRes.reason)

      if (activityRes.status === 'fulfilled') setActivity(activityRes.value)
      else console.error('[Dashboard] activity failed:', activityRes.reason)

      if (eventsRes.status === 'fulfilled') setUpcomingEvents(eventsRes.value.events)
      else console.error('[Dashboard] events failed:', eventsRes.reason)

      if (dealsRes.status === 'fulfilled') setLiveDeals(dealsRes.value.deals)
      else console.error('[Dashboard] deals failed:', dealsRes.reason)

      setLoading(false)
    }
    fetchData()
  }, [venueParam])

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

          {/* Your events preview */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-ink">Your events</h2>
              <Link href="/business/events" className="text-xs font-medium text-primary hover:underline">
                View all
              </Link>
            </div>
            {upcomingEvents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {upcomingEvents.map((event) => (
                  <EventPreviewCard key={event.event_id} event={event} />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
                <p className="text-sm text-gray-400 mb-2">No upcoming events</p>
                <button
                  onClick={() => handleCreate("/business/events/new")}
                  className="inline-flex items-center rounded-lg bg-gradient-to-br from-[#2ECB4E] to-[#05EB54] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:brightness-110 transition-all cursor-pointer"
                >
                  Create event
                </button>
              </div>
            )}
          </div>

          {/* Your deals preview */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-ink">Your deals</h2>
              <Link href="/business/deals" className="text-xs font-medium text-primary hover:underline">
                View all
              </Link>
            </div>
            {liveDeals.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {liveDeals.map((deal) => (
                  <DealPreviewCard key={deal.id} deal={deal} showVenue={isAllVenues} />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
                <p className="text-sm text-gray-400 mb-2">No deals yet</p>
                <button
                  onClick={() => handleCreate("/business/deals/new")}
                  className="inline-flex items-center rounded-lg bg-gradient-to-br from-[#2ECB4E] to-[#05EB54] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:brightness-110 transition-all cursor-pointer"
                >
                  Create deal
                </button>
              </div>
            )}
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

      {showVenueModal && (
        <VenueSelectModal
          venues={venues}
          onSelect={(venue) => {
            setSelectedVenue(venue.id)
            setShowVenueModal(false)
            router.push(venueModalTarget)
          }}
          onClose={() => setShowVenueModal(false)}
        />
      )}
    </div>
  )
}
