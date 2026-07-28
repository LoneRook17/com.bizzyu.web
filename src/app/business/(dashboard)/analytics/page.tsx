"use client"

import { useState, useEffect } from "react"
import { BarChart3 } from "lucide-react"
import { useAuth } from "@/lib/business/auth-context"
import { useVenue, useVenueParam } from "@/lib/business/venue-context"
import { apiClient } from "@/lib/business/api-client"
import type {
  DealsOverview as DealsOverviewType,
  EventsOverview as EventsOverviewType,
  PromoterLink,
  LineSkipAnalyticsOverview,
} from "@/lib/business/types"
import {
  canViewEventAnalytics,
  scopedAnalyticsFetchOutcome,
  EVENT_ANALYTICS_ACCESS_COPY,
} from "@/lib/business/analytics-access"
import { isVenueScopeNotFound } from "@/lib/business/venue-selection"
import { PageHeader } from "@/components/business/v2/PageHeader"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/business/v2/ui/tabs"
import { EmptyState } from "@/components/business/v2/ui/empty-state"
import DealsOverviewView from "@/components/business/v2/analytics/DealsOverview"
import EventsOverviewView from "@/components/business/v2/analytics/EventsOverview"
import LineSkipsOverviewView from "@/components/business/v2/analytics/LineSkipsOverview"
import PromoterStatsView from "@/components/business/v2/analytics/PromoterStats"
import { AnalyticsSkeleton } from "@/components/business/v2/analytics/shared"

function ErrorState() {
  return (
    <EmptyState
      icon={BarChart3}
      title="Couldn't load analytics"
      description="Something went wrong fetching this data. Please try again in a moment."
    />
  )
}

// A legit 403 (event analytics is owner/manager-only server-side — it exposes
// revenue) is not a failure: render a calm access state, not the error wall.
function ForbiddenState() {
  return (
    <EmptyState
      icon={BarChart3}
      title={EVENT_ANALYTICS_ACCESS_COPY.title}
      description={EVENT_ANALYTICS_ACCESS_COPY.description}
    />
  )
}

export default function AnalyticsPage() {
  const { user } = useAuth()
  const role = user?.business_role

  if (role === "promoter") return <PromoterView />
  if (role === "staff") return <StaffView />
  return <OwnerManagerView />
}

function PromoterView() {
  const venueParam = useVenueParam()
  const [links, setLinks] = useState<PromoterLink[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    apiClient
      .get<PromoterLink[]>(`/business/insights/promoter-stats?_=1${venueParam}`)
      .then(setLinks)
      .catch(() => setLinks([]))
      .finally(() => setLoading(false))
  }, [venueParam])

  return (
    <>
      <PageHeader title="Your stats" description="Track how your links are performing." />
      {loading ? <AnalyticsSkeleton /> : <PromoterStatsView links={links} />}
    </>
  )
}

function StaffView() {
  const { isAllVenues, resetToAllVenues } = useVenue()
  const venueParam = useVenueParam()
  const [deals, setDeals] = useState<DealsOverviewType | null>(null)
  const [loading, setLoading] = useState(true)
  const [errored, setErrored] = useState(false)

  useEffect(() => {
    setLoading(true)
    setErrored(false)
    apiClient
      .get<DealsOverviewType>(`/business/insights/deals/overview?_=1${venueParam}`)
      .then(setDeals)
      .catch((err) => {
        setDeals(null)
        // A stale/out-of-scope venue selection → reset to All venues + refetch,
        // never the error wall. Any other failure stays a genuine error.
        if (isVenueScopeNotFound(err)) resetToAllVenues()
        else setErrored(true)
      })
      .finally(() => setLoading(false))
  }, [venueParam, resetToAllVenues])

  return (
    <>
      <PageHeader title="Deal analytics" description="See how your deals are performing." />
      {loading ? <AnalyticsSkeleton /> : deals ? <DealsOverviewView data={deals} isAllVenues={isAllVenues} /> : errored ? <ErrorState /> : null}
    </>
  )
}

function OwnerManagerView() {
  const { user } = useAuth()
  const { isAllVenues, resetToAllVenues } = useVenue()
  const venueParam = useVenueParam()

  // Events analytics exposes revenue → owner/manager only. Hide the tab (and skip
  // its fetch) for any other role that lands here (blank/unknown session), so no
  // one is shown a tab that 403s.
  const showEvents = canViewEventAnalytics(user?.business_role)

  const [deals, setDeals] = useState<DealsOverviewType | null>(null)
  const [events, setEvents] = useState<EventsOverviewType | null>(null)
  const [lineSkips, setLineSkips] = useState<LineSkipAnalyticsOverview | null>(null)
  const [dealsLoading, setDealsLoading] = useState(true)
  const [eventsLoading, setEventsLoading] = useState(true)
  const [lineSkipsLoading, setLineSkipsLoading] = useState(true)
  const [dealsErr, setDealsErr] = useState(false)
  const [eventsErr, setEventsErr] = useState(false)
  const [eventsForbidden, setEventsForbidden] = useState(false)
  const [lineSkipsErr, setLineSkipsErr] = useState(false)

  useEffect(() => {
    setDealsLoading(true)
    setLineSkipsLoading(true)
    setDealsErr(false)
    setEventsErr(false)
    setEventsForbidden(false)
    setLineSkipsErr(false)

    apiClient
      .get<DealsOverviewType>(`/business/insights/deals/overview?_=1${venueParam}`)
      .then(setDeals)
      .catch((err) => {
        setDeals(null)
        // Stale/out-of-scope venue → reset to All + refetch; else a genuine error.
        if (isVenueScopeNotFound(err)) resetToAllVenues()
        else setDealsErr(true)
      })
      .finally(() => setDealsLoading(false))

    if (showEvents) {
      setEventsLoading(true)
      apiClient
        .get<EventsOverviewType>(`/business/insights/events/overview?_=1${venueParam}`)
        .then(setEvents)
        .catch((err) => {
          setEvents(null)
          // Three outcomes: a scope-404 (stale venue) self-heals to All venues; a
          // 403 (revenue-gated / scoped role) → calm access state; 5xx/network →
          // error wall + retry.
          const outcome = scopedAnalyticsFetchOutcome(err, isVenueScopeNotFound)
          if (outcome === "reset-venue") resetToAllVenues()
          else if (outcome === "forbidden") setEventsForbidden(true)
          else setEventsErr(true)
        })
        .finally(() => setEventsLoading(false))
    } else {
      setEvents(null)
      setEventsLoading(false)
    }

    apiClient
      .get<LineSkipAnalyticsOverview>(`/business/line-skips/analytics/overview?_=1${venueParam}`)
      .then(setLineSkips)
      .catch((err) => {
        setLineSkips(null)
        // Line-skip analytics is venue-scoped too — same self-heal on a scope-404.
        if (isVenueScopeNotFound(err)) resetToAllVenues()
        else setLineSkipsErr(true)
      })
      .finally(() => setLineSkipsLoading(false))
  }, [venueParam, showEvents, resetToAllVenues])

  return (
    <>
      <PageHeader title="Analytics" description="Performance across deals, events, and line skips." />

      <Tabs defaultValue="deals">
        <TabsList>
          <TabsTrigger value="deals">Deals</TabsTrigger>
          {showEvents && <TabsTrigger value="events">Events</TabsTrigger>}
          <TabsTrigger value="line-skips">Line skips</TabsTrigger>
        </TabsList>

        <TabsContent value="deals">
          {dealsLoading ? <AnalyticsSkeleton /> : deals ? <DealsOverviewView data={deals} isAllVenues={isAllVenues} /> : dealsErr ? <ErrorState /> : null}
        </TabsContent>
        {showEvents && (
          <TabsContent value="events">
            {eventsLoading ? <AnalyticsSkeleton /> : events ? <EventsOverviewView data={events} isAllVenues={isAllVenues} /> : eventsForbidden ? <ForbiddenState /> : eventsErr ? <ErrorState /> : null}
          </TabsContent>
        )}
        <TabsContent value="line-skips">
          {lineSkipsLoading ? <AnalyticsSkeleton /> : lineSkips ? <LineSkipsOverviewView data={lineSkips} isAllVenues={isAllVenues} /> : lineSkipsErr ? <ErrorState /> : null}
        </TabsContent>
      </Tabs>
    </>
  )
}
