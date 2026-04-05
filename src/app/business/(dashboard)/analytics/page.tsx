"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/business/auth-context"
import { apiClient } from "@/lib/business/api-client"
import AnalyticsEventSelector from "@/components/business/dashboard/AnalyticsEventSelector"
import EventAnalyticsView from "@/components/business/dashboard/EventAnalyticsView"
import DealAnalyticsView from "@/components/business/dashboard/DealAnalyticsView"
import PromoterStatsView from "@/components/business/dashboard/PromoterStatsView"
import type { EventListItem, DealListItem, EventAnalytics, DealAnalytics, PromoterLink } from "@/lib/business/types"

export default function AnalyticsPage() {
  const { user } = useAuth()
  const role = user?.business_role

  // Promoter view
  if (role === "promoter") return <PromoterView />

  // Staff — no access
  if (role === "staff") {
    return (
      <div>
        <h1 className="text-xl font-bold text-ink mb-2">Analytics</h1>
        <p className="text-sm text-gray-500">Analytics are available to owners and managers.</p>
      </div>
    )
  }

  // Owner/Manager view
  return <OwnerManagerView />
}

function PromoterView() {
  const [links, setLinks] = useState<PromoterLink[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient
      .get<PromoterLink[]>("/business/analytics/promoter-stats")
      .then(setLinks)
      .catch(() => setLinks([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <h1 className="text-xl font-bold text-ink mb-6">Your Stats</h1>
      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-5 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-48 mb-3" />
          <div className="h-32 bg-gray-200 rounded" />
        </div>
      ) : (
        <PromoterStatsView links={links} />
      )}
    </div>
  )
}

function OwnerManagerView() {
  // Event/deal lists for selector
  const [events, setEvents] = useState<{ id: number; label: string }[]>([])
  const [deals, setDeals] = useState<{ id: number; label: string }[]>([])
  const [listsLoading, setListsLoading] = useState(true)

  // Selected items
  const [selectedEvent, setSelectedEvent] = useState<number | null>(null)
  const [selectedDeal, setSelectedDeal] = useState<number | null>(null)

  // Analytics data
  const [eventAnalytics, setEventAnalytics] = useState<EventAnalytics | null>(null)
  const [dealAnalytics, setDealAnalytics] = useState<DealAnalytics | null>(null)
  const [eventLoading, setEventLoading] = useState(false)
  const [dealLoading, setDealLoading] = useState(false)

  // Fetch event/deal lists
  useEffect(() => {
    async function fetchLists() {
      try {
        const [eventsRes, dealsRes] = await Promise.all([
          apiClient.get<{ events: EventListItem[] }>("/business/events?tab=upcoming&limit=100"),
          apiClient.get<{ deals: DealListItem[] }>("/business/deals?tab=live&limit=100"),
        ])

        // Also fetch past events for analytics
        const pastRes = await apiClient.get<{ events: EventListItem[] }>("/business/events?tab=past&limit=100")

        const allEvents = [...eventsRes.events, ...pastRes.events]
        setEvents(allEvents.map((e) => ({ id: e.event_id, label: e.name })))
        setDeals(dealsRes.deals.map((d) => ({ id: d.id, label: d.deal_title })))

        // Auto-select first if available
        if (allEvents.length > 0) setSelectedEvent(allEvents[0].event_id)
        if (dealsRes.deals.length > 0) setSelectedDeal(dealsRes.deals[0].id)
      } catch {
        // Silent
      } finally {
        setListsLoading(false)
      }
    }
    fetchLists()
  }, [])

  // Fetch event analytics
  useEffect(() => {
    if (!selectedEvent) {
      setEventAnalytics(null)
      return
    }
    setEventLoading(true)
    apiClient
      .get<EventAnalytics>(`/business/analytics/events/${selectedEvent}`)
      .then(setEventAnalytics)
      .catch(() => setEventAnalytics(null))
      .finally(() => setEventLoading(false))
  }, [selectedEvent])

  // Fetch deal analytics
  useEffect(() => {
    if (!selectedDeal) {
      setDealAnalytics(null)
      return
    }
    setDealLoading(true)
    apiClient
      .get<DealAnalytics>(`/business/analytics/deals/${selectedDeal}`)
      .then(setDealAnalytics)
      .catch(() => setDealAnalytics(null))
      .finally(() => setDealLoading(false))
  }, [selectedDeal])

  return (
    <div>
      <h1 className="text-xl font-bold text-ink mb-6">Analytics</h1>

      {/* Event Analytics Section */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-ink">Event Analytics</h2>
          <AnalyticsEventSelector
            items={events}
            selected={selectedEvent}
            onChange={setSelectedEvent}
            placeholder="Select an event"
            loading={listsLoading}
          />
        </div>

        {eventLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-32 mb-3" />
                <div className="h-24 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        ) : eventAnalytics ? (
          <EventAnalyticsView data={eventAnalytics} />
        ) : events.length === 0 && !listsLoading ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
            No events to analyze yet. Create an event to see analytics.
          </div>
        ) : null}
      </section>

      {/* Deal Analytics Section */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-ink">Deal Analytics</h2>
          <AnalyticsEventSelector
            items={deals}
            selected={selectedDeal}
            onChange={setSelectedDeal}
            placeholder="Select a deal"
            loading={listsLoading}
          />
        </div>

        {dealLoading ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 bg-white p-5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-32 mb-3" />
              <div className="h-24 bg-gray-200 rounded" />
            </div>
          </div>
        ) : dealAnalytics ? (
          <DealAnalyticsView data={dealAnalytics} />
        ) : deals.length === 0 && !listsLoading ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
            No deals to analyze yet. Create a deal to see analytics.
          </div>
        ) : null}
      </section>

      {/* Paid Tier Placeholder */}
      <section>
        <div className="rounded-xl border border-gray-200 bg-white p-6 relative overflow-hidden">
          <div className="absolute top-3 right-3">
            <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
              Coming Soon
            </span>
          </div>
          <h2 className="text-base font-semibold text-ink mb-2">AI-Powered Insights</h2>
          <p className="text-sm text-gray-500 mb-4">
            Unlock advanced analytics with Bizzy Premium.
          </p>
          <ul className="space-y-2 text-sm text-gray-400">
            <li className="flex items-center gap-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
              Peak hours analysis — &quot;Your busiest sales happen at 8-9 PM on Thursdays&quot;
            </li>
            <li className="flex items-center gap-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
              Pricing recommendations — &quot;VIP sells out 3x faster than GA&quot;
            </li>
            <li className="flex items-center gap-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
              Demand forecasting based on historical data
            </li>
            <li className="flex items-center gap-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
              Heat maps, funnel charts, cohort analysis
            </li>
          </ul>
        </div>
      </section>
    </div>
  )
}
