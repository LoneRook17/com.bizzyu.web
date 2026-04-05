"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/business/auth-context"
import { apiClient } from "@/lib/business/api-client"
import { EVENT_TABS } from "@/lib/business/constants"
import EventCard from "@/components/business/dashboard/EventCard"
import EmptyState from "@/components/business/dashboard/EmptyState"
import Pagination from "@/components/business/dashboard/Pagination"
import type { EventListItem, BusinessProfile } from "@/lib/business/types"

export default function EventsPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState("upcoming")
  const [events, setEvents] = useState<EventListItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [stripeOnboarded, setStripeOnboarded] = useState(true)
  const [stripeBannerDismissed, setStripeBannerDismissed] = useState(false)
  const limit = 20

  const canCreate = user?.business_role === "owner" || user?.business_role === "manager"

  // Check Stripe Connect status
  useEffect(() => {
    if (canCreate) {
      apiClient.get<BusinessProfile>("/business/profile")
        .then((p) => setStripeOnboarded(p.stripe_connect_onboarded))
        .catch(() => {})
    }
  }, [canCreate])

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiClient.get<{ events: EventListItem[]; total: number }>(
        `/business/events?tab=${tab}&page=${page}&limit=${limit}`
      )
      setEvents(data.events)
      setTotal(data.total)
    } catch {
      setEvents([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [tab, page])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  const handleTabChange = (newTab: string) => {
    setTab(newTab)
    setPage(1)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-ink">Events</h1>
        {canCreate && (
          <Link
            href="/business/events/new"
            className="rounded-lg bg-gradient-to-br from-[#2ECB4E] to-[#05EB54] px-4 py-2 text-sm font-semibold text-white shadow-md shadow-primary/25 hover:brightness-110 transition-all"
          >
            Create Event
          </Link>
        )}
      </div>

      {/* Stripe Connect prompt */}
      {canCreate && !stripeOnboarded && !stripeBannerDismissed && (
        <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4 flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-yellow-800">Stripe Connect not linked</p>
            <p className="text-xs text-yellow-700 mt-0.5">
              To create paid events, complete Stripe Connect onboarding. Free and RSVP events can be created without Stripe.
            </p>
            <Link href="/business/settings" className="text-xs text-primary font-medium hover:underline mt-1 inline-block">
              Go to Settings &rarr;
            </Link>
          </div>
          <button
            onClick={() => setStripeBannerDismissed(true)}
            className="text-yellow-600 hover:text-yellow-800 flex-shrink-0 ml-3 cursor-pointer"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {EVENT_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => handleTabChange(t.value)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer -mb-px
              ${tab === t.value
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 animate-pulse">
              <div className="flex gap-4">
                <div className="h-20 w-20 rounded-lg bg-gray-200" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-48 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-32 mb-1" />
                  <div className="h-3 bg-gray-200 rounded w-24" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <EmptyState
          title="No events yet"
          message={tab === "upcoming" ? "Create your first event to get started." : `No ${tab} events found.`}
          actionLabel={canCreate && tab === "upcoming" ? "Create Event" : undefined}
          actionHref={canCreate && tab === "upcoming" ? "/business/events/new" : undefined}
        />
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <EventCard key={event.event_id} event={event} />
          ))}
        </div>
      )}

      <Pagination page={page} total={total} limit={limit} onPageChange={setPage} />
    </div>
  )
}
