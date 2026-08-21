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
  EVENT_TYPE_FILTERS,
  groupEventRows,
  parseEventTypeFilter,
  showsAccess,
  showsEvents,
  type EventTypeFilter,
} from "@/lib/business/events-list"
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
import { AccessProgramRow } from "@/components/business/v2/door-access/AccessProgramRow"
import {
  fetchDoorAccessProgramsSafe,
  WEEKLY_ACCESS_CREATION_LABEL,
  type DoorAccessProgramSummary,
} from "@/lib/business/door-access"

/**
 * THE manage surface (D2-4). One page, two types, one create funnel.
 *
 * Two filters stack here and they are NOT the same question:
 *   • the TYPE segment (All / Events / Weekly Access) — which KIND of thing;
 *   • the status tabs (Upcoming / Past / Drafts / Recurring) — which STATE,
 *     and only meaningful for dated events, so they hide in the access view.
 *
 * Everything this page replaced still opens its own existing page: a series row
 * → /business/recurring/:id, an access row → /business/door-access/:id, an
 * event row → its manage page. Nothing was rebuilt; the entry points moved.
 */
export default function V2EventsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { venues, isAllVenues, setSelectedVenue } = useVenue()
  const venueParam = useVenueParam()
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
  const [programsLoading, setProgramsLoading] = useState(true)
  // D2-2: the series a night belongs to, so a run of Tuesdays collapses into
  // one row. Degrades to [] — an ungrouped list is a worse list, not a broken
  // one, so a failure here must never take the page down with it.
  const [series, setSeries] = useState<RecurringSeriesListItem[]>([])

  const [showVenueModal, setShowVenueModal] = useState(false)
  const [stripeOnboarded, setStripeOnboarded] = useState(true)
  const [stripeBannerDismissed, setStripeBannerDismissed] = useState(false)
  const [stripeConnecting, setStripeConnecting] = useState(false)
  const [stripeError, setStripeError] = useState<string | null>(null)

  const limit = 20
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
        `/business/events?tab=${tab}&page=${page}&limit=${limit}${venueParam}`
      )
      setEvents(data.events)
      setTotal(data.total)
    } catch {
      setEvents([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [tab, page, venueParam])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  // Access programs load ONCE and independently of the tab/page, because they
  // are not part of the paginated event query. fetchDoorAccessProgramsSafe
  // degrades to [] on any failure — this list worked before access rows
  // existed and must keep working if that endpoint is down or the build
  // predates it.
  useEffect(() => {
    let cancelled = false
    fetchDoorAccessProgramsSafe().then((rows) => {
      if (cancelled) return
      setPrograms(rows)
      setProgramsLoading(false)
    })
    return () => { cancelled = true }
  }, [])

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

  const activePrograms = programs.filter((p) => p.is_active)

  // In the combined view only on the tab that means "what's on". "Past" /
  // "Drafts" / "Recurring" are questions about dated events; an ongoing program
  // is not an answer to any of them. The Weekly Access segment is where the
  // full program list — ended ones included — lives.
  const visiblePrograms = !showsAccess(effectiveType)
    ? []
    : effectiveType === "access"
      ? programs
      : tab === "upcoming" ? activePrograms : []

  const rows = showsEvents(effectiveType) ? groupEventRows(events, series) : []
  const isEmpty = rows.length === 0 && visiblePrograms.length === 0

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
            ? "Events and weekly access, in one place."
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
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Stripe Connect not linked</p>
            <p className="mt-0.5 text-[13px] text-amber-700 dark:text-amber-400">
              To sell paid tickets, finish Stripe Connect onboarding. Free events work without it.
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
      {(showsEvents(effectiveType) ? loading : programsLoading) ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-[124px] rounded-xl" />)}
        </div>
      ) : isEmpty ? (
        <EmptyState
          icon={effectiveType === "access" ? Sparkles : CalendarDays}
          title={effectiveType === "access" ? "No weekly access programs yet" : "No events yet"}
          description={
            effectiveType === "access"
              ? `A ${WEEKLY_ACCESS_CREATION_LABEL} program sells cover and skip-the-line passes for every night it runs — set the nights once and each one is generated for you.`
              : tab === "upcoming" ? "Create your first event to start selling tickets." : `No ${tab} events found.`
          }
          action={
            canCreate && (effectiveType === "access" || tab === "upcoming") ? (
              <Button onClick={handleCreate}><Plus /> Create</Button>
            ) : undefined
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {visiblePrograms.map((program) => (
            <AccessProgramRow key={`program-${program.id}`} program={program} />
          ))}
          {rows.map((row) =>
            row.kind === "series"
              ? <SeriesGroupRow key={row.key} row={row} />
              : <EventCard key={row.key} event={row.event} />
          )}
        </div>
      )}

      {/* Programs are not paginated (D-F9.2), so the pager belongs to the event
          half of the list and goes when that half does. */}
      {showsEvents(effectiveType) && (
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
