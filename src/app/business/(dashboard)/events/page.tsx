"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { ArrowUpRight, CalendarDays, FilePen, Loader2, MoreHorizontal, Plus, Search, Sparkles, X, Zap } from "lucide-react"
import { useAuth } from "@/lib/business/auth-context"
import { useVenue, useVenueParam } from "@/lib/business/venue-context"
import { useDashboardMode } from "@/lib/v2/mode"
import { apiClient } from "@/lib/business/api-client"
import { isKnightBusiness } from "@/lib/business/knight"
import FeaturedOnKnightSection from "@/components/business/v2/events/FeaturedOnKnightSection"
import { EVENT_TABS } from "@/lib/business/constants"
import type { EventListItem, BusinessProfile, RecurringSeriesListItem } from "@/lib/business/types"
import {
  eventAccessGroupsForPrograms,
  eventAccessGroupsForVenue,
  EVENT_TYPE_FILTERS,
  eventsListQueryTab,
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
import {
  HOST_UPCOMING_FETCH_LIMIT,
  hostDashIsEmpty,
  hostDashSections,
  shouldUseHostDashLayout,
} from "@/lib/business/host-dash-sections"
import { HostDashList } from "@/components/business/v2/host/HostDashList"
import { probeInactiveSeriesIds } from "@/lib/business/inactive-series-probe"
import { PageHeader } from "@/components/business/v2/PageHeader"
import { Button } from "@/components/business/v2/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/business/v2/ui/tabs"
import { Input } from "@/components/business/v2/ui/input"
import { Skeleton } from "@/components/business/v2/ui/skeleton"
import { EmptyState } from "@/components/business/v2/ui/empty-state"
import { CreateEventModal } from "@/components/business/v2/events/CreateEventModal"
import { EventCard } from "@/components/business/v2/events/EventCard"
import { SeriesGroupRow } from "@/components/business/v2/events/SeriesGroupRow"
import { TablePager } from "@/components/business/v2/events/Pagination"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/business/v2/ui/dropdown-menu"
import { AccessEventGroupRow } from "@/components/business/v2/door-access/AccessEventGroupRow"
import { AccessProgramRow } from "@/components/business/v2/door-access/AccessProgramRow"
import {
  easternToday,
  fetchDoorAccessProgramsSafe,
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
import {
  HostCardThumbnail,
  HostListCard,
  HostListGroup,
} from "@/components/business/v2/host/HostListCard"

/** The status tab as a noun for the table footer ("12 past events"). */
const TAB_NOUN: Record<string, string> = {
  upcoming: "upcoming",
  past: "past",
  drafts: "draft",
  recurring: "recurring",
}

/**
 * THE manage surface (D2-4). One page, two types, one create funnel.
 *
 * Two filters stack here and they are NOT the same question:
 *   • the TYPE segment (All / Events / Weekly Cover) — which KIND of thing;
 *   • the status tabs (Upcoming / Past / Drafts / Recurring) — which STATE,
 *     except Recurring, which is a kind filter (RC + WC nights + Schedules).
 *     Status tabs hide in the Weekly Cover-only view.
 *
 * Live Upcoming and Recurring match Flutter Host: Tonight, expandable
 * Upcoming events & WC (today+30 for series; one-off / Custom always), then
 * Schedules. Recurring keeps RC and WC night cards on those dates plus both
 * RC and WC schedule rows. Standalone named one-offs stay on All / Events.
 * Weekly Cover keeps WC nights plus WC schedules. Past / Drafts keep
 * the older flat list.
 *
 * Everything this page replaced still opens its own existing page: a series row
 * → /business/recurring/:id, an access row → /business/door-access/:id, an
 * event row → its manage page. Nothing was rebuilt; the entry points moved.
 */
export default function V2EventsPage() {
  const { user, business, isPending } = useAuth()
  const { selectedVenue, selectedVenueId } = useVenue()
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
  const [programNights, setProgramNights] = useState<Array<{ program: DoorAccessProgramSummary; nights: DoorAccessNight[] }>>([])
  const [programsLoading, setProgramsLoading] = useState(true)
  // D2-2: the series a night belongs to, so a run of Tuesdays collapses into
  // one row. Degrades to [] — an ungrouped list is a worse list, not a broken
  // one, so a failure here must never take the page down with it.
  const [series, setSeries] = useState<RecurringSeriesListItem[]>([])
  // Host-deleted series omitted from both list endpoints still carry
  // published nights. Probe every recurring_series_id; unknown / 404
  // stays active (series-23 fallback).
  const [probedInactiveIds, setProbedInactiveIds] = useState<number[]>([])

  // BETA shell: Create event is the hybrid modal (name · when · venue →
  // draft → editor). The venue picker that used to run first is inside it.
  const [showCreate, setShowCreate] = useState(false)
  // Search stub (BETA shell): a client-side name filter over the rows this
  // page already fetched. Not a server query — the window is what it was.
  const [query, setQuery] = useState("")
  const [stripeOnboarded, setStripeOnboarded] = useState(true)
  const [stripeBannerDismissed, setStripeBannerDismissed] = useState(false)
  const [stripeConnecting, setStripeConnecting] = useState(false)
  const [stripeError, setStripeError] = useState<string | null>(null)

  const useHostLayout = shouldUseHostDashLayout(tab, effectiveType)
  const limit = useHostLayout ? HOST_UPCOMING_FETCH_LIMIT : 20
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

  // BETA shell (locked 2026-10-29): Create event opens the modal. Weekly Cover
  // keeps its own entry (the ghost button beside it, and a link inside the
  // modal) — /business/create still exists as the type chooser.
  const handleCreate = () => setShowCreate(true)

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
    const queryTab = eventsListQueryTab(tab)
    try {
      const data = await apiClient.get<{ events: EventListItem[]; total: number }>(
        `/business/events?tab=${queryTab}&page=${page}&limit=${limit}${venueParam}`,
      )
      let next = data.events
      let nextTotal = data.total
      if (queryTab === "upcoming" && !isPending) {
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
  }, [tab, page, venueParam, isPending, limit])

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
      if (!cancelled) setProgramNights(loaded)
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

  // Upcoming pins WC programs as Schedules. Recurring does too, and also
  // keeps WC night cards on Tonight/Upcoming dates. Past / Drafts stay dated
  // events only. The Weekly Cover segment used to keep Ended rows; a host
  // series delete with 0 sales must leave the dash entirely.
  const visiblePrograms = shouldShowWeeklyCoverOnEventsTab(tab, isPending, effectiveType)
    ? activePrograms
    : []
  const oneOffNights = customUpcomingNightsFromSeries(programNights, easternToday())
  const visibleOneOffs = shouldShowWeeklyCoverOneOffsOnEventsTab(tab, isPending, effectiveType)
    ? oneOffNights
    : []
  const showAccessNights = shouldShowWeeklyCoverOneOffsOnEventsTab(tab, isPending, effectiveType)
  const showAccessSchedules = shouldShowWeeklyCoverOnEventsTab(tab, isPending, effectiveType)

  // The search stub filters what this page already holds, by name.
  const q = query.trim().toLowerCase()
  const visibleEvents = q ? events.filter((e) => (e.name ?? "").toLowerCase().includes(q)) : events

  const hostSections = useHostLayout
    ? hostDashSections({
        events: visibleEvents,
        programs: visiblePrograms,
        programNights,
        series: venueSeries,
        wcSeriesIds,
        inactiveWcIds,
        today: easternToday(),
        showEvents: showsEvents(effectiveType),
        showAccessNights,
        showAccessSchedules,
        recurringNightsOnly: tab === "recurring",
      })
    : null

  const rows = !useHostLayout && showsEvents(effectiveType)
    ? groupEventRows(
        tab === "upcoming" ? eventsForHostUpcomingList(visibleEvents, easternToday()) : visibleEvents,
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
  const eventAccessGroups = !useHostLayout && showsAccess(effectiveType) && !(isPending && tab === "upcoming")
    ? eventAccessGroupsForVenue(
        eventAccessGroupsForPrograms(events, venuePrograms, wcSeriesIds, inactiveWcIds),
        scopedVenueId,
        selectedVenue?.name,
      )
    : []
  const pendingCancelNights = !useHostLayout && showsAccess(effectiveType) && !showsEvents(effectiveType)
    ? pendingCancelWeeklyCoverNights(events, wcSeriesIds, inactiveWcIds)
    : []
  const isEmpty = useHostLayout
    ? hostSections != null && hostDashIsEmpty(hostSections)
    : rows.length === 0 &&
      visiblePrograms.length === 0 &&
      visibleOneOffs.length === 0 &&
      eventAccessGroups.length === 0 &&
      pendingCancelNights.length === 0

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
            // Two header actions at most (VISUAL-BRIEF): New Weekly Cover is
            // secondary and folds into the filter row's overflow on a phone.
            <div className="flex w-full items-center gap-2 sm:w-auto">
              {accessEnabled && (
                <Button variant="secondary" asChild className="hidden sm:inline-flex">
                  <Link href="/business/door-access/new">New Weekly Cover</Link>
                </Button>
              )}
              <Button onClick={handleCreate} className="h-11 flex-1 sm:h-10 sm:flex-none"><Plus /> Create event</Button>
            </div>
          ) : undefined
        }
      />

      {/* Knight Library only: the Featured rail at the top of the Knight app's
          Home (business_featured_events). Other businesses never mount this. */}
      {isKnightBusiness(business) && <FeaturedOnKnightSection />}

      {/* Stripe Connect prompt */}
      {canCreate && !stripeOnboarded && !stripeBannerDismissed && (
        <div className="flex items-start justify-between gap-3 rounded-[10px] border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 px-4 py-3">
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

      {/* Filters. Desktop: type · status · search on one line. Phone: type
          (+ overflow), search, then status, each on its own row. */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-3">
        {/* TYPE segment (D2-6). Only where there is a second type to switch to —
            a business with skip the line tickets off would be choosing between "All" and
            one thing. */}
        {accessEnabled && (
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Tabs value={effectiveType} onValueChange={handleTypeChange}>
              <TabsList>
                {EVENT_TYPE_FILTERS.map((t) => (
                  <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            {canCreate && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label="More create options"
                  className="ml-auto flex size-9 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 outline-none transition-colors hover:bg-neutral-100 focus-visible:ring-2 focus-visible:ring-[#05EB54]/40 sm:hidden dark:border-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800"
                >
                  <MoreHorizontal className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href="/business/door-access/new"><Plus /> New Weekly Cover</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {showsEvents(effectiveType) && (
              <span aria-hidden className="mx-1 hidden h-6 w-px bg-neutral-200 sm:block dark:bg-neutral-800" />
            )}
          </div>
        )}

        {/* STATUS tabs — dated events only, so they leave with them. */}
        {showsEvents(effectiveType) && (
          <div className="order-last -mx-4 w-[calc(100%+2rem)] overflow-x-auto px-4 sm:order-none sm:mx-0 sm:w-auto sm:px-0">
            <Tabs value={tab} onValueChange={handleTabChange}>
              <TabsList>
                {EVENT_TABS.map((t) => (
                  <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        )}

        {/* Search stub (BETA shell): filters the loaded rows by name. */}
        {showsEvents(effectiveType) && (
          <div className="relative w-full sm:ml-auto sm:w-60">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search events"
              aria-label="Search events"
              className="h-9 pl-9 text-[13px]"
            />
          </div>
        )}
      </div>

      {/* Each half owns its own spinner: the access view must not read "no
          programs yet" while its fetch is still in flight, and the event view
          must not wait on a fetch it doesn't render. */}
      {(useHostLayout
        ? ((showsEvents(effectiveType) && loading) || (showsAccess(effectiveType) && programsLoading))
        : (showsEvents(effectiveType) ? loading : programsLoading)
      ) ? (
        <div className="flex flex-col gap-1.5">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 rounded-[10px]" />)}
        </div>
      ) : isEmpty ? (
        // Solid surface, short copy, no create button: the header owns create.
        <EmptyState
          className="py-16"
          icon={effectiveType === "access" ? Sparkles : CalendarDays}
          title={
            q
              ? "No events match that search"
              : effectiveType === "access"
                ? `No ${WEEKLY_ACCESS_SECTION_LABEL.toLowerCase()} programs yet`
                : tab === "upcoming"
                  ? "Your next event starts here"
                  : `No ${TAB_NOUN[tab] ?? tab} events`
          }
          description={
            q
              ? "Try a different name, or clear the search."
              : effectiveType === "access"
                ? `A ${WEEKLY_ACCESS_CREATION_LABEL} program sells cover and skip-the-line passes for every night it runs. Set the nights once and each one is generated for you.`
                : tab === "upcoming"
                  ? (
                    <>
                      <p>Create an event to start selling tickets.</p>
                      {canCreate && <p className="mt-1">Use Create event above. Add tickets and artwork next.</p>}
                    </>
                  )
                  : `Nothing on the ${TAB_NOUN[tab] ?? tab} tab right now.`
          }
          action={
            q ? <Button variant="secondary" onClick={() => setQuery("")}>Clear search</Button> : undefined
          }
          footnote={
            !q && canCreate && effectiveType !== "access" && tab === "upcoming" ? (
              <span className="inline-flex items-center gap-2">
                <FilePen className="size-4 shrink-0" /> Start with a draft. Publish when you&apos;re ready.
              </span>
            ) : undefined
          }
        />
      ) : useHostLayout && hostSections ? (
        <HostDashList
          sections={hostSections}
          programs={venuePrograms}
          wcSeriesIds={wcSeriesIds}
          inactiveWcIds={inactiveWcIds}
        />
      ) : (
        // One table: header, rows on hairlines, count + pager as the footer.
        <HostListGroup
          header
          footer={
            showsEvents(effectiveType) ? (
              <TablePager page={page} total={total} limit={limit} onPageChange={setPage} noun={`${TAB_NOUN[tab] ?? ""} ${total === 1 ? "event" : "events"}`.trim()} />
            ) : undefined
          }
        >
          {visiblePrograms.map((program) => (
            <AccessProgramRow key={`program-${program.id}`} program={program} />
          ))}
          {visibleOneOffs.map(({ program, night }) => (
            <HostListCard
              key={`oneoff-${program.id}-${night.occurrence_date}`}
              kind="access"
              href={nightHref(program.id, night.occurrence_date)}
              title={program.name || WEEKLY_ACCESS_SECTION_LABEL}
              date={night.occurrence_date}
              meta={program.venue_name ?? ""}
              secondary="One-off night"
              sold={{ label: "passes sold", value: (night.passes_sold ?? 0).toLocaleString("en-US") }}
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
        </HostListGroup>
      )}

      {/* Host Upcoming is one window, not a pager of generated nights; the
          flat tabs page inside the table footer above. */}
      {!isEmpty && showsEvents(effectiveType) && (
        <p className="-mt-2 text-[12px] text-neutral-500 dark:text-neutral-400">All times shown in America/New_York (ET).</p>
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
              Skip the Line Tickets
            </Link>{" "}
            are still running and unchanged until they&apos;re converted.
          </span>
        </p>
      )}

      {/* Create event (hybrid): essentials → real draft → editor */}
      <CreateEventModal open={showCreate} onOpenChange={setShowCreate} />

      <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
        Need a hand?{" "}
        <Link href="/business/help" className="inline-flex items-center gap-0.5 font-medium text-neutral-900 hover:underline dark:text-neutral-100">
          Help &amp; tutorials <ArrowUpRight className="size-3.5" />
        </Link>
      </p>
    </>
  )
}
