"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CalendarDays, Loader2, Plus, Sparkles, X, Zap } from "lucide-react"
import { useAuth } from "@/lib/business/auth-context"
import { useVenue, useVenueParam } from "@/lib/business/venue-context"
import { useDashboardMode } from "@/lib/v2/mode"
import { apiClient } from "@/lib/business/api-client"
import { EVENT_TABS } from "@/lib/business/constants"
import type { EventListItem, BusinessProfile, RecurringSeriesListItem } from "@/lib/business/types"
import {
  eventAccessGroupsForPrograms,
  eventAccessGroupsForVenue,
  EVENT_TYPE_FILTERS,
  groupEventRows,
  inactiveWeeklyCoverSeriesIds,
  parseEventTypeFilter,
  pendingCancelWeeklyCoverNights,
  shouldShowWeeklyCoverOnEventsTab,
  shouldShowWeeklyCoverOneOffsOnEventsTab,
  showsAccess,
  showsEvents,
  weeklyCoverProgramsForDash,
  weeklyCoverRowsForVenue,
  weeklyCoverSeriesIds,
  type EventTypeFilter,
} from "@/lib/business/events-list"
import { probeInactiveSeriesIds } from "@/lib/business/inactive-series-probe"
import { PageHeader } from "@/components/business/v2/PageHeader"
import { Button } from "@/components/business/v2/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/business/v2/ui/tabs"
import { Skeleton } from "@/components/business/v2/ui/skeleton"
import { EmptyState } from "@/components/business/v2/ui/empty-state"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/business/v2/ui/dialog"
import { EventCard } from "@/components/business/v2/events/EventCard"
import { SeriesGroupRow } from "@/components/business/v2/events/SeriesGroupRow"
import { Pagination } from "@/components/business/v2/events/Pagination"
import { AccessEventGroupRow } from "@/components/business/v2/door-access/AccessEventGroupRow"
import { AccessProgramRow } from "@/components/business/v2/door-access/AccessProgramRow"
import {
  easternToday,
  fetchDoorAccessProgramsSafe,
  fmtNightDate,
  loadProgramsUpcomingNights,
  nightHref,
  WEEKLY_ACCESS_CREATION_LABEL,
  WEEKLY_ACCESS_SECTION_LABEL,
  type DoorAccessNight,
  type DoorAccessProgramSummary,
} from "@/lib/business/door-access"
import { mergeUpcomingWithQueuedDrafts } from "@/lib/business/live-after-approve"
import { customUpcomingNightsFromSeries } from "@/lib/business/wc-upcoming"
import { eventsForHostUpcomingList } from "@/lib/business/series-nights-window"
import { hostCustomSlot } from "@/lib/business/weekly-cover-nights"
import {
  buildHostLiveList,
  hostLiveListIsEmpty,
} from "@/lib/business/host-live-list"
import { HostLiveList } from "@/components/business/v2/host/HostLiveList"
import {
  HostCardThumbnail,
  HostListCard,
} from "@/components/business/v2/host/HostListCard"

/**
 * THE manage surface (D2-4). One page, two types, one create funnel.
 *
 * Two filters stack here and they are NOT the same question:
 *   • the TYPE segment (All / Events / Weekly Access) — which KIND of thing;
 *   • the status tabs (Upcoming / Past / Drafts / Recurring) — which STATE,
 *     and only meaningful for dated events, so they hide in the access view.
 *
 * Approved Upcoming matches Flutter Host: Tonight, expandable Upcoming events
 * & WC with date separators, and Schedules (repeating WC templates + green RC).
 * Past / Drafts / Recurring keep the older list. A series row still opens
 * /business/recurring/:id, an access row /business/door-access/:id, a night
 * card its manage / night page.
 */
export default function V2EventsPage() {
  const { user, isPending } = useAuth()
  const router = useRouter()
  const { venues, isAllVenues, selectedVenue, selectedVenueId, setSelectedVenue } = useVenue()
  const venueParam = useVenueParam()
  // Matches useVenueParam: All venues / unknown selection omits venue_id so
  // every owned series stays visible. A concrete id scopes both fetches.
  const scopedVenueId =
    typeof selectedVenueId === "number" && selectedVenueId > 0 ? selectedVenueId : null
  const { config } = useDashboardMode()

  // Weekly Access follows the same flag Door Access always did — it IS the
  // line-skip successor, so the two can never be half-on for a business.
  const accessEnabled = config.showLineSkips
  const [typeFilter, setTypeFilter] = useState<EventTypeFilter>("all")
  const effectiveType: EventTypeFilter = accessEnabled ? typeFilter : "events"

  const [tab, setTab] = useState("upcoming")
  const [events, setEvents] = useState<EventListItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  // F9 COMBINED LIST: green EVENT rows + magenta WEEKLY ACCESS rows in one
  // list. Programs are "ongoing by nature" (D-F9.2) — they have no single date
  // to sort on, so they PIN ABOVE the dated rows rather than being given a
  // fake one, and they are never paginated with the events below them.
  const [programs, setPrograms] = useState<DoorAccessProgramSummary[]>([])
  const [loadedNights, setLoadedNights] = useState<
    Array<{ program: DoorAccessProgramSummary; nights: DoorAccessNight[] }>
  >([])
  const [programsLoading, setProgramsLoading] = useState(true)
  // D2-2: the series a night belongs to, so a run of Tuesdays collapses into
  // one row. Degrades to [] — an ungrouped list is a worse list, not a broken
  // one, so a failure here must never take the page down with it.
  const [series, setSeries] = useState<RecurringSeriesListItem[]>([])
  // Host-deleted series omitted from both list endpoints still carry
  // published nights. Probe every recurring_series_id; unknown / 404
  // stays active (series-23 fallback).
  const [probedInactiveIds, setProbedInactiveIds] = useState<number[]>([])

  const [showVenueModal, setShowVenueModal] = useState(false)
  const [stripeOnboarded, setStripeOnboarded] = useState(true)
  const [stripeBannerDismissed, setStripeBannerDismissed] = useState(false)
  const [stripeConnecting, setStripeConnecting] = useState(false)
  const [stripeError, setStripeError] = useState<string | null>(null)

  const limit = 20
  const hostLive = tab === "upcoming"
  const fetchLimit = hostLive ? 100 : limit
  const fetchPage = hostLive ? 1 : page
  const canCreate = user?.business_role === "owner" || user?.business_role === "manager"

  const handleConnectStripe = async () => {
    setStripeConnecting(true)
    setStripeError(null)
    try {
      const data = await apiClient.post<{ url: string; stripe_connect_id: string }>(
        "/business/profile/stripe-onboard?platform=web"
      )
      window.location.href = data.url
    } catch (err) {
      setStripeError(err instanceof Error ? err.message : "Failed to start Stripe onboarding")
      setStripeConnecting(false)
    }
  }

  // D2-1: ONE create funnel. This button no longer knows what is being created
  // — /business/create asks (Event / Weekly Cover–Skip the Line) and routes.
  // The venue picker still runs first, because BOTH paths need a venue and
  // asking after the type choice would be a second interruption.
  const handleCreate = () => {
    if (isAllVenues && venues.length > 1) {
      setShowVenueModal(true)
    } else {
      if (isAllVenues && venues.length === 1) setSelectedVenue(venues[0].id)
      router.push("/business/create")
    }
  }

  useEffect(() => {
    if (canCreate) {
      apiClient
        .get<BusinessProfile>("/business/profile")
        .then((p) => setStripeOnboarded(p.stripe_connect_onboarded))
        .catch(() => {})
    }
  }, [canCreate])

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiClient.get<{ events: EventListItem[]; total: number }>(
        `/business/events?tab=${tab}&page=${fetchPage}&limit=${fetchLimit}${venueParam}`
      )
      let next = data.events
      let nextTotal = data.total
      if (tab === "upcoming" && !isPending) {
        const drafts = await apiClient.get<{ events: EventListItem[]; total: number }>(
          `/business/events?tab=drafts&page=1&limit=50${venueParam}`
        )
        next = mergeUpcomingWithQueuedDrafts(next, drafts.events ?? [], isPending)
        nextTotal = data.total + Math.max(0, next.length - data.events.length)
      }
      setEvents(next)
      setTotal(nextTotal)
    } catch {
      setEvents([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [tab, fetchPage, fetchLimit, venueParam, isPending])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  // Access programs follow the venue switcher, independently of tab/page,
  // because they are not part of the paginated event query. Passing
  // scopedVenueId (or omitting it for All venues) is what keeps The Dungeon's
  // Weekly Cover off The Devil Dungeon. fetchDoorAccessProgramsSafe degrades
  // to [] on any failure — this list worked before access rows existed and
  // must keep working if that endpoint is down or the build predates it.
  useEffect(() => {
    let cancelled = false
    setProgramsLoading(true)
    fetchDoorAccessProgramsSafe(scopedVenueId).then(async (rows) => {
      if (cancelled) return
      setPrograms(rows)
      const loaded = await loadProgramsUpcomingNights(rows.filter((p) => p.is_active))
      if (!cancelled) setLoadedNights(loaded)
      setProgramsLoading(false)
    })
    return () => { cancelled = true }
  }, [scopedVenueId])

  // Series load once too, and for the same reason: they label groups, they do
  // not page. A group whose series is missing still renders — it falls back to
  // its first night's name (see groupEventRows).
  useEffect(() => {
    let cancelled = false
    apiClient
      .get<{ series: RecurringSeriesListItem[] }>("/business/recurring-series")
      .then((data) => { if (!cancelled) setSeries(data.series ?? []) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  // Belt-and-suspenders: even if an older door-access build ignores
  // ?venue_id=, hide another venue's Weekly Cover on a single-venue view.
  // All venues keeps every owned series.
  const venuePrograms = weeklyCoverRowsForVenue(programs, scopedVenueId, selectedVenue?.name)
  const venueSeries = weeklyCoverRowsForVenue(series, scopedVenueId, selectedVenue?.name)
  const wcSeriesIds = weeklyCoverSeriesIds(venuePrograms, venueSeries)

  useEffect(() => {
    // Always resolve is_active for every series FK on this page. Skipping
    // ids that are merely "known" left series 66 live when the list omitted
    // the flag or nights were not WC-stamped (green SeriesGroupRow leak).
    let cancelled = false
    probeInactiveSeriesIds(events, (id) => apiClient.get(`/business/recurring-series/${id}`)).then(
      (ids) => {
        if (!cancelled) setProbedInactiveIds(ids)
      },
    )
    return () => {
      cancelled = true
    }
  }, [events])

  const inactiveWcIds = [
    ...new Set([
      ...inactiveWeeklyCoverSeriesIds(venuePrograms, venueSeries, events),
      ...probedInactiveIds,
    ]),
  ]
  // Host-deleted / ended series are not live program rows. Sold nights of
  // those series stay as pending-cancel EventCards (same as a one-off).
  const activePrograms = weeklyCoverProgramsForDash(venuePrograms)

  // In the combined view only on the tab that means "what's on". "Past" /
  // "Drafts" / "Recurring" are questions about dated events; an ongoing program
  // is not an answer to any of them. The Weekly Cover segment used to keep
  // Ended rows; a host series delete with 0 sales must leave the dash entirely.
  const visiblePrograms = shouldShowWeeklyCoverOnEventsTab(tab, isPending, effectiveType)
    ? activePrograms
    : []
  const visibleOneOffs = shouldShowWeeklyCoverOneOffsOnEventsTab(tab, isPending, effectiveType)
    ? customUpcomingNightsFromSeries(loadedNights, easternToday())
    : []

  const rows = showsEvents(effectiveType)
    ? groupEventRows(
        tab === "upcoming" ? eventsForHostUpcomingList(events, easternToday()) : events,
        venueSeries,
        wcSeriesIds,
        inactiveWcIds,
      )
    : []
  // AccessProgramRow uses GET /business/door-access ids. Stamped WC nights
  // still group by recurring_series_id when that list omits the series
  // (program_kind=event). Host-deleted series (is_active=0) do not resurrect
  // from published nights. EventCard / SeriesGroupRow open the series id,
  // never /door-access/{event_id}.
  const eventAccessGroups = showsAccess(effectiveType) && !(isPending && tab === "upcoming")
    ? eventAccessGroupsForVenue(
        eventAccessGroupsForPrograms(events, venuePrograms, wcSeriesIds, inactiveWcIds),
        scopedVenueId,
        selectedVenue?.name,
      )
    : []
  const pendingCancelNights = showsAccess(effectiveType) && !showsEvents(effectiveType)
    ? pendingCancelWeeklyCoverNights(events, wcSeriesIds, inactiveWcIds)
    : []
  const hostList = hostLive
    ? buildHostLiveList({
        today: easternToday(),
        events,
        series: venueSeries,
        programs: visiblePrograms,
        loadedNights,
        eventAccessGroups,
        wcSeriesIds,
        inactiveWcIds,
        includeEvents: showsEvents(effectiveType),
        includeAccess: shouldShowWeeklyCoverOnEventsTab(tab, isPending, effectiveType),
        slotFor: (night, program, nights) => hostCustomSlot(night, nights, program),
      })
    : null
  const isEmpty = hostList
    ? hostLiveListIsEmpty(hostList)
    : rows.length === 0 &&
      visiblePrograms.length === 0 &&
      visibleOneOffs.length === 0 &&
      eventAccessGroups.length === 0 &&
      pendingCancelNights.length === 0
  const listLoading = hostLive
    ? loading || (showsAccess(effectiveType) && programsLoading)
    : showsEvents(effectiveType)
      ? loading
      : programsLoading

  const handleTabChange = (newTab: string) => {
    setTab(newTab)
    setPage(1)
  }

  const handleTypeChange = (next: string) => {
    setTypeFilter(parseEventTypeFilter(next))
    setPage(1)
  }

  return (
    <>
      <PageHeader
        title="Events"
        description={
          accessEnabled
            ? `Events and ${WEEKLY_ACCESS_SECTION_LABEL.toLowerCase()}, in one place.`
            : "Create, manage, and track your events."
        }
        actions={
          canCreate ? (
            <Button onClick={handleCreate}><Plus /> Create</Button>
          ) : undefined
        }
      />

      {/* Stripe Connect prompt */}
      {canCreate && !stripeOnboarded && !stripeBannerDismissed && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 px-4 py-3.5">
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              {isPending ? "Stripe Connect not linked" : "Connect Stripe to receive payments instantly"}
            </p>
            <p className="mt-0.5 text-[13px] text-amber-700 dark:text-amber-400">
              {isPending
                ? "To sell paid tickets, finish Stripe Connect onboarding. Free events work without it."
                : "You can still publish paid events without it. We hold what you earn until you connect, then we send it all right away."}
            </p>
            {stripeError && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{stripeError}</p>}
            <Button size="sm" className="mt-2.5" disabled={stripeConnecting} onClick={handleConnectStripe}>
              {stripeConnecting ? <><Loader2 className="size-3.5 animate-spin" /> Connecting…</> : "Connect Stripe →"}
            </Button>
          </div>
          <button
            onClick={() => setStripeBannerDismissed(true)}
            className="shrink-0 rounded-lg p-1 text-amber-600 dark:text-amber-400 transition-colors hover:bg-amber-100 dark:hover:bg-amber-900/40"
            aria-label="Dismiss"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {/* TYPE segment (D2-6). Only where there is a second type to switch to —
            a business with line skips off would be choosing between "All" and
            one thing. */}
        {accessEnabled && (
          <Tabs value={effectiveType} onValueChange={handleTypeChange}>
            <TabsList>
              {EVENT_TYPE_FILTERS.map((t) => (
                <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}

        {/* STATUS tabs — dated events only, so they leave with them. */}
        {showsEvents(effectiveType) && (
          <Tabs value={tab} onValueChange={handleTabChange}>
            <TabsList>
              {EVENT_TABS.map((t) => (
                <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}
      </div>

      {/* Each half owns its own spinner: the access view must not read "no
          programs yet" while its fetch is still in flight, and the event view
          must not wait on a fetch it doesn't render. */}
      {listLoading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-[124px] rounded-xl" />)}
        </div>
      ) : isEmpty ? (
        <EmptyState
          icon={effectiveType === "access" ? Sparkles : CalendarDays}
          title={effectiveType === "access" ? `No ${WEEKLY_ACCESS_SECTION_LABEL.toLowerCase()} programs yet` : "No events yet"}
          description={
            effectiveType === "access"
              ? `A ${WEEKLY_ACCESS_CREATION_LABEL} program sells cover and skip-the-line passes for every night it runs. Set the nights once and each one is generated for you.`
              : tab === "upcoming" ? "Create your first event to start selling tickets." : `No ${tab} events found.`
          }
          action={
            canCreate && (effectiveType === "access" || tab === "upcoming") ? (
              <Button variant={effectiveType === "access" ? "access" : "primary"} onClick={handleCreate}><Plus /> Create</Button>
            ) : undefined
          }
        />
      ) : (
        hostList ? (
          <HostLiveList
            list={hostList}
            programs={venuePrograms}
            wcSeriesIds={wcSeriesIds}
            inactiveWcIds={inactiveWcIds}
            onNightCancelled={fetchEvents}
          />
        ) : (
        <div className="flex flex-col gap-3">
          {visiblePrograms.map((program) => (
            <AccessProgramRow key={`program-${program.id}`} program={program} />
          ))}
          {visibleOneOffs.map(({ program, night }) => (
            <HostListCard
              key={`oneoff-${program.id}-${night.occurrence_date}`}
              kind="access"
              href={nightHref(program.id, night.occurrence_date)}
              title={program.name || WEEKLY_ACCESS_SECTION_LABEL}
              meta={[fmtNightDate(night.occurrence_date), program.venue_name].filter(Boolean).join(" · ")}
              secondary="One-off night"
              thumbnail={
                <HostCardThumbnail
                  kind="access"
                  src={night.flyer_image_url || program.flyer_image_url}
                  alt={program.name}
                  icon={Zap}
                />
              }
            />
          ))}
          {eventAccessGroups.map((group) => (
            <AccessEventGroupRow key={`access-event-${group.programId}`} group={group} />
          ))}
          {pendingCancelNights.map((event) => (
            <EventCard
              key={`pending-cancel-${event.event_id}`}
              event={event}
              programs={venuePrograms}
              wcSeriesIds={wcSeriesIds}
              inactiveWcSeriesIds={inactiveWcIds}
            />
          ))}
          {rows.map((row) =>
            row.kind === "series"
              ? (
                <SeriesGroupRow
                  key={row.key}
                  row={row}
                  programs={venuePrograms}
                  wcSeriesIds={wcSeriesIds}
                  inactiveWcSeriesIds={inactiveWcIds}
                />
              )
              : (
                <EventCard
                  key={row.key}
                  event={row.event}
                  programs={venuePrograms}
                  wcSeriesIds={wcSeriesIds}
                  inactiveWcSeriesIds={inactiveWcIds}
                />
              )
          )}
        </div>
        )
      )}

      {/* Programs are not paginated (D-F9.2), so the pager belongs to the event
          half of the list and goes when that half does. Upcoming uses Host
          expand instead of paging generated nights. */}
      {showsEvents(effectiveType) && !hostLive && (
        <Pagination page={page} total={total} limit={limit} onPageChange={setPage} />
      )}

      {/* D2-3 / F15. The legacy line-skip schedules keep an entry point — here,
          inside the type they belong to, and NOT in the nav. Muted on purpose:
          this is the door out of a system being retired, not a feature. It stays
          until the F15 conversion moves the data onto Weekly Access; removing
          the nav item did not remove that obligation. */}
      {effectiveType === "access" && (
        <p className="flex items-center gap-1.5 text-[13px] text-neutral-500 dark:text-neutral-400">
          <Zap className="size-3.5 shrink-0" />
          <span>
            Older setup:{" "}
            <Link href="/business/line-skips" className="font-medium underline underline-offset-2 hover:text-neutral-700 dark:hover:text-neutral-200">
              Line Skips
            </Link>{" "}
            are still running and unchanged until they&apos;re converted.
          </span>
        </p>
      )}

      {/* Venue picker (all-venues create flow) */}
      <Dialog open={showVenueModal} onOpenChange={setShowVenueModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Which venue?</DialogTitle>
            <DialogDescription>Pick the venue this belongs to.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            {venues.map((v) => (
              <button
                key={v.id}
                onClick={() => {
                  setSelectedVenue(v.id)
                  setShowVenueModal(false)
                  router.push("/business/create")
                }}
                className="flex items-center gap-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 px-3 py-2.5 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300 transition-colors hover:border-[#05EB54]/40 hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
              >
                <CalendarDays className="size-4 text-neutral-400 dark:text-neutral-500" />
                <span className="min-w-0">
                  <span className="block truncate">{v.name}</span>
                  {v.address && <span className="block truncate text-xs font-normal text-neutral-500 dark:text-neutral-400">{v.address}</span>}
                </span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
        Need a hand? Visit <Link href="/business/help" className="font-medium text-[#05EB54] hover:underline">Help &amp; tutorials</Link>.
      </p>
    </>
  )
}
