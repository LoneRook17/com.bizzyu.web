"use client"

import { useState, useEffect } from "react"
import { BarChart3, Zap } from "lucide-react"
import { useAuth } from "@/lib/business/auth-context"
import { useVenue, useVenueParam } from "@/lib/business/venue-context"
import { apiClient } from "@/lib/business/api-client"
import type {
  DealsOverview as DealsOverviewType,
  EventsOverview as EventsOverviewType,
  LineSkipAnalyticsOverview,
} from "@/lib/business/types"
import {
  canViewEventAnalytics,
  scopedAnalyticsFetchOutcome,
  EVENT_ANALYTICS_ACCESS_COPY,
} from "@/lib/business/analytics-access"
import { isVenueScopeNotFound } from "@/lib/business/venue-selection"
import {
  resolveLandingTab,
  DEFAULT_ANALYTICS_TAB,
  type AnalyticsTab,
} from "@/lib/business/analytics-landing-tab"
import {
  ANALYTICS_ACCESS_TAB_LABEL,
  ANALYTICS_PAGE_DESCRIPTION,
  ANALYTICS_ACCESS_ACTIVE_SECTION,
  ANALYTICS_ACCESS_PAST_SECTION,
  ANALYTICS_ACCESS_EMPTY_TITLE,
  ANALYTICS_ACCESS_EMPTY_DESCRIPTION,
  ANALYTICS_ACCESS_TOTAL_LABEL,
} from "@/lib/business/analytics-copy"
import {
  bucketEventsOverview,
  weeklyEventIdsFromNights,
} from "@/lib/business/analytics-buckets"
import {
  fetchDoorAccessProgramsSafe,
  fetchDoorAccessSeries,
  type DoorAccessProgramSummary,
} from "@/lib/business/door-access"
import { PageHeader } from "@/components/business/v2/PageHeader"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/business/v2/ui/tabs"
import { EmptyState } from "@/components/business/v2/ui/empty-state"
import DealsOverviewView from "@/components/business/v2/analytics/DealsOverview"
import EventsOverviewView from "@/components/business/v2/analytics/EventsOverview"
import LineSkipsOverviewView from "@/components/business/v2/analytics/LineSkipsOverview"
import { AccessProgramRow } from "@/components/business/v2/door-access/AccessProgramRow"
import { AnalyticsSkeleton, Section } from "@/components/business/v2/analytics/shared"

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

  // No promoter branch: services rejects promoter dashboard logins outright
  // (TF-CLEANUP-S, 403 at login), so a promoter session can't reach this page.
  if (role === "staff") return <StaffView />
  return <OwnerManagerView />
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
  const { user, isLoading: authLoading } = useAuth()
  const { isAllVenues, resetToAllVenues } = useVenue()
  const venueParam = useVenueParam()

  // Events analytics exposes revenue → owner/manager only. Hide the tab (and skip
  // its fetch) for any other role that lands here (blank/unknown session), so no
  // one is shown a tab that 403s.
  const showEvents = canViewEventAnalytics(user?.business_role)

  const [deals, setDeals] = useState<DealsOverviewType | null>(null)
  const [events, setEvents] = useState<EventsOverviewType | null>(null)
  const [weekly, setWeekly] = useState<EventsOverviewType | null>(null)
  const [weeklyPrograms, setWeeklyPrograms] = useState<DoorAccessProgramSummary[]>([])
  const [lineSkips, setLineSkips] = useState<LineSkipAnalyticsOverview | null>(null)
  const [dealsLoading, setDealsLoading] = useState(true)
  const [eventsLoading, setEventsLoading] = useState(true)
  const [lineSkipsLoading, setLineSkipsLoading] = useState(true)
  const [dealsErr, setDealsErr] = useState(false)
  const [eventsErr, setEventsErr] = useState(false)
  const [eventsForbidden, setEventsForbidden] = useState(false)
  const [lineSkipsErr, setLineSkipsErr] = useState(false)

  const weeklyTabCount =
    (weekly?.events.length ?? 0) ||
    (lineSkips?.instances.length ?? 0) ||
    weeklyPrograms.length

  // Controlled tab (LSK-23). A line-skip-only venue used to land on a blank
  // Deals tab, and defaultValue is read on the first render — before any fetch
  // resolves — so it structurally cannot adapt. We hold the tab instead and
  // pick it once, the moment all three fetches have settled.
  //
  // `tabPinned` is what makes it once-only. It flips on the auto-selection AND
  // on any manual click, so the operator's choice survives every later refetch
  // (switching venue re-runs the effect below with fresh data). A click that
  // lands before the data settles also pins — explicit intent outranks the
  // heuristic.
  const [tab, setTab] = useState<AnalyticsTab>(DEFAULT_ANALYTICS_TAB)
  const [tabPinned, setTabPinned] = useState(false)

  const selectTab = (next: string) => {
    setTab(next as AnalyticsTab)
    setTabPinned(true)
  }

  // `isLoading` is part of "settled" on purpose: showEvents is derived from
  // user.business_role, so while the session is resolving an owner looks
  // role-less and the Events tab is hidden. Picking in that window would pin
  // the tab before Events could ever be a candidate, and the pin is permanent.
  useEffect(() => {
    const next = resolveLandingTab(
      {
        settled: !authLoading && !dealsLoading && !eventsLoading && !lineSkipsLoading,
        dealsCount: deals?.deals.length ?? 0,
        eventsCount: events?.events.length ?? 0,
        lineSkipsCount: weeklyTabCount,
        showEvents,
      },
      tabPinned,
    )
    if (!next) return
    setTab(next)
    setTabPinned(true)
  }, [authLoading, dealsLoading, eventsLoading, lineSkipsLoading, deals, events, weeklyTabCount, showEvents, tabPinned])

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
      setWeekly(null)
      setWeeklyPrograms([])
      void (async () => {
        const programs = await fetchDoorAccessProgramsSafe()
        setWeeklyPrograms(programs)
        try {
          const overview = await apiClient.get<EventsOverviewType>(
            `/business/insights/events/overview?_=1${venueParam}`,
          )
          const nightIds = (
            await Promise.all(
              programs.map(async (program) => {
                try {
                  const series = await fetchDoorAccessSeries(program.id, 180)
                  return weeklyEventIdsFromNights(series.nights)
                } catch {
                  return []
                }
              }),
            )
          ).flat()
          const split = bucketEventsOverview(overview, nightIds)
          setEvents(split.events)
          setWeekly(split.weekly)
        } catch (err) {
          setEvents(null)
          setWeekly(null)
          // Three outcomes: a scope-404 (stale venue) self-heals to All venues; a
          // 403 (revenue-gated / scoped role) → calm access state; 5xx/network →
          // error wall + retry.
          const outcome = scopedAnalyticsFetchOutcome(err, isVenueScopeNotFound)
          if (outcome === "reset-venue") resetToAllVenues()
          else if (outcome === "forbidden") setEventsForbidden(true)
          else setEventsErr(true)
        } finally {
          setEventsLoading(false)
        }
      })()
    } else {
      setEvents(null)
      setWeekly(null)
      setWeeklyPrograms([])
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
      <PageHeader title="Analytics" description={ANALYTICS_PAGE_DESCRIPTION} />

      <Tabs value={tab} onValueChange={selectTab}>
        <TabsList>
          <TabsTrigger value="deals">Deals</TabsTrigger>
          {showEvents && <TabsTrigger value="events">Events</TabsTrigger>}
          <TabsTrigger value="line-skips">{ANALYTICS_ACCESS_TAB_LABEL}</TabsTrigger>
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
          {lineSkipsLoading || eventsLoading ? (
            <AnalyticsSkeleton />
          ) : weekly && weekly.events.length > 0 ? (
            <EventsOverviewView
              data={weekly}
              isAllVenues={isAllVenues}
              copy={{
                totalLabel: ANALYTICS_ACCESS_TOTAL_LABEL,
                upcomingTitle: ANALYTICS_ACCESS_ACTIVE_SECTION,
                pastTitle: ANALYTICS_ACCESS_PAST_SECTION,
                emptyTitle: ANALYTICS_ACCESS_EMPTY_TITLE,
                emptyDescription: ANALYTICS_ACCESS_EMPTY_DESCRIPTION,
              }}
            />
          ) : lineSkips && lineSkips.instances.length > 0 ? (
            <LineSkipsOverviewView data={lineSkips} isAllVenues={isAllVenues} />
          ) : weeklyPrograms.length > 0 ? (
            <Section title={ANALYTICS_ACCESS_ACTIVE_SECTION} count={weeklyPrograms.length} defaultOpen>
              <div className="flex flex-col gap-3">
                {weeklyPrograms.map((program) => (
                  <AccessProgramRow key={program.id} program={program} />
                ))}
              </div>
            </Section>
          ) : lineSkipsErr ? (
            <ErrorState />
          ) : (
            <EmptyState icon={Zap} title={ANALYTICS_ACCESS_EMPTY_TITLE} description={ANALYTICS_ACCESS_EMPTY_DESCRIPTION} />
          )}
        </TabsContent>
      </Tabs>
    </>
  )
}
