"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/business/auth-context"
import { useVenueParam } from "@/lib/business/venue-context"
import { apiClient } from "@/lib/business/api-client"
import DealsOverview from "@/components/business/dashboard/DealsOverview"
import EventsOverview from "@/components/business/dashboard/EventsOverview"
import LineSkipsOverview from "@/components/business/dashboard/LineSkipsOverview"
import PromoterStatsView from "@/components/business/dashboard/PromoterStatsView"
import type { DealsOverview as DealsOverviewType, EventsOverview as EventsOverviewType, PromoterLink, LineSkipAnalyticsOverview } from "@/lib/business/types"

export default function AnalyticsPage() {
  const { user } = useAuth()
  const role = user?.business_role

  // Promoter view
  if (role === "promoter") return <PromoterView />

  // Staff — deals only
  if (role === "staff") return <StaffView />

  // Owner/Manager view — both tabs
  return <OwnerManagerView />
}

function PromoterView() {
  const venueParam = useVenueParam()
  const [links, setLinks] = useState<PromoterLink[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    apiClient
      .get<PromoterLink[]>(`/business/analytics/promoter-stats?_=1${venueParam}`)
      .then(setLinks)
      .catch(() => setLinks([]))
      .finally(() => setLoading(false))
  }, [venueParam])

  return (
    <div>
      <h1 className="text-xl font-bold text-ink mb-6">Your Stats</h1>
      {loading ? <SkeletonCards /> : <PromoterStatsView links={links} />}
    </div>
  )
}

function StaffView() {
  const venueParam = useVenueParam()
  const [deals, setDeals] = useState<DealsOverviewType | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    apiClient
      .get<DealsOverviewType>(`/business/analytics/deals/overview?_=1${venueParam}`)
      .then(setDeals)
      .catch(() => setDeals(null))
      .finally(() => setLoading(false))
  }, [venueParam])

  return (
    <div>
      <h1 className="text-xl font-bold text-ink mb-6">Deal Analytics</h1>
      {loading ? <SkeletonCards /> : deals ? <DealsOverview data={deals} /> : <ErrorState />}
    </div>
  )
}

function OwnerManagerView() {
  const venueParam = useVenueParam()
  const [tab, setTab] = useState<"deals" | "events" | "line-skips">("deals")
  const [deals, setDeals] = useState<DealsOverviewType | null>(null)
  const [events, setEvents] = useState<EventsOverviewType | null>(null)
  const [lineSkips, setLineSkips] = useState<LineSkipAnalyticsOverview | null>(null)
  const [dealsLoading, setDealsLoading] = useState(true)
  const [eventsLoading, setEventsLoading] = useState(true)
  const [lineSkipsLoading, setLineSkipsLoading] = useState(true)

  useEffect(() => {
    setDealsLoading(true)
    setEventsLoading(true)
    setLineSkipsLoading(true)

    apiClient
      .get<DealsOverviewType>(`/business/analytics/deals/overview?_=1${venueParam}`)
      .then(setDeals)
      .catch(() => setDeals(null))
      .finally(() => setDealsLoading(false))

    apiClient
      .get<EventsOverviewType>(`/business/analytics/events/overview?_=1${venueParam}`)
      .then(setEvents)
      .catch(() => setEvents(null))
      .finally(() => setEventsLoading(false))

    apiClient
      .get<LineSkipAnalyticsOverview>(`/business/line-skips/analytics/overview?_=1${venueParam}`)
      .then(setLineSkips)
      .catch(() => setLineSkips(null))
      .finally(() => setLineSkipsLoading(false))
  }, [venueParam])

  return (
    <div>
      <h1 className="text-xl font-bold text-ink mb-6">Analytics</h1>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        <TabButton active={tab === "deals"} onClick={() => setTab("deals")}>
          Deals
        </TabButton>
        <TabButton active={tab === "events"} onClick={() => setTab("events")}>
          Events
        </TabButton>
        <TabButton active={tab === "line-skips"} onClick={() => setTab("line-skips")}>
          Line Skips
        </TabButton>
      </div>

      {/* Tab content */}
      {tab === "deals" && (
        dealsLoading ? <SkeletonCards /> : deals ? <DealsOverview data={deals} /> : <ErrorState />
      )}
      {tab === "events" && (
        eventsLoading ? <SkeletonCards /> : events ? <EventsOverview data={events} /> : <ErrorState />
      )}
      {tab === "line-skips" && (
        lineSkipsLoading ? <SkeletonCards /> : lineSkips ? <LineSkipsOverview data={lineSkips} /> : <ErrorState />
      )}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
        active
          ? "border-ink text-ink"
          : "border-transparent text-gray-500 hover:text-gray-700"
      }`}
    >
      {children}
    </button>
  )
}

function SkeletonCards() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 animate-pulse">
            <div className="h-3 bg-gray-200 rounded w-16 mb-2" />
            <div className="h-7 bg-gray-200 rounded w-12" />
          </div>
        ))}
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-gray-200" />
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-40 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-24" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function ErrorState() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
      Unable to load analytics. Please try again later.
    </div>
  )
}
