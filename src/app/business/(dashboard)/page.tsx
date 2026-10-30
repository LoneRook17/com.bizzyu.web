"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Plus, ArrowUpRight, CalendarDays, Sparkles, ChevronRight, Tag, Ticket, UserPlus,
} from "lucide-react"
import { useAuth } from "@/lib/business/auth-context"
import { useVenue, useVenueParam } from "@/lib/business/venue-context"
import { isVenueScopeNotFound } from "@/lib/business/venue-selection"
import { useDashboardMode } from "@/lib/v2/mode"
import { apiClient } from "@/lib/business/api-client"
import type {
  DashboardSummary, QuickStats, ActivityFeedItem, EventListItem, DealListItem,
} from "@/lib/business/types"
import { LINE_SKIP_LABEL } from "@/lib/business/line-skip-label"
import { homeSections } from "@/lib/business/home-sections"
import {
  ACCESS_ACCENT,
  WEEKLY_ACCESS_SECTION_LABEL,
  easternToday,
  fetchDoorAccessProgramsSafe,
  fmtShortDate,
  loadProgramsUpcomingNights,
  programHref,
  type DoorAccessProgramSummary,
} from "@/lib/business/door-access"
import { canViewRevenue } from "@/lib/business/analytics-access"
import { homeUpcoming, nextAccessNight, type OneOffUpcomingNight } from "@/lib/business/home-upcoming"
import { oneOffNightsFromSeries } from "@/lib/business/wc-upcoming"
import { inactiveWeeklyCoverSeriesIds } from "@/lib/business/events-list"
import { probeInactiveSeriesIds } from "@/lib/business/inactive-series-probe"
import { cn, usd } from "@/lib/v2/utils"
import { PageHeader } from "@/components/business/v2/PageHeader"
import { MetricStrip, type Metric } from "@/components/business/v2/MetricStrip"
import { Badge } from "@/components/business/v2/ui/badge"
import { WeeklyCoverChip } from "@/components/business/v2/WeeklyCoverChip"
import { Button } from "@/components/business/v2/ui/button"
import { Skeleton } from "@/components/business/v2/ui/skeleton"
import { EmptyState } from "@/components/business/v2/ui/empty-state"
import { CreateEventModal } from "@/components/business/v2/events/CreateEventModal"
import TrialHome from "@/components/business/v2/TrialHome"
import EscrowPanel from "@/components/business/v2/EscrowPanel"
import HomeStripeConnectPrompt from "@/components/business/v2/HomeStripeConnectPrompt"

// Date formatting is fmtShortDate (door-access.ts): bare "YYYY-MM-DD" night
// dates format on the calendar — `new Date("2026-08-30")` is UTC midnight and
// used to render "Aug 29" here for every US viewer — while event datetimes
// keep the local parse this page always had.
function fmtRelative(s: string) {
  const d = new Date(s).getTime()
  const mins = Math.round((Date.now() - d) / 60000)
  if (mins < 1) return "now"
  if (mins < 60) return `${mins}m`
  const h = Math.round(mins / 60)
  if (h < 24) return `${h}h`
  return `${Math.round(h / 24)}d`
}
/** The leading glyph on an activity row, by feed type. */
const ACTIVITY_ICONS: Record<ActivityFeedItem["type"], React.ElementType> = {
  ticket_purchase: Ticket,
  deal_claim: Tag,
  team_join: UserPlus,
  event_milestone: Sparkles,
}

function eventBadge(status: string): { variant: "success" | "neutral" | "warning" | "danger"; label: string } {
  const s = status?.toLowerCase()
  if (s === "published" || s === "approved" || s === "active") return { variant: "success", label: "Live" }
  if (s === "draft") return { variant: "neutral", label: "Draft" }
  if (s?.includes("pending")) return { variant: "warning", label: "In review" }
  if (s === "cancelled" || s === "rejected") return { variant: "danger", label: s === "cancelled" ? "Cancelled" : "Rejected" }
  return { variant: "neutral", label: status || "-" }
}

/**
 * BETA shell: a Home section is a sentence-case label plus one bordered list
 * (hairlines between rows). No card-in-card: the empty state renders inside
 * the same container, borderless.
 */
function HomeSection({
  title,
  viewAllHref,
  children,
}: {
  title: string
  viewAllHref?: string
  children: React.ReactNode
}) {
  return (
    <section className="flex min-w-0 flex-col gap-3">
      <div className="flex items-center">
        <h2 className="text-[17px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">{title}</h2>
        {viewAllHref && <ViewAllLink href={viewAllHref} />}
      </div>
      <div className="divide-y divide-neutral-200 overflow-hidden rounded-[10px] border border-neutral-200 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900">
        {children}
      </div>
    </section>
  )
}

function ViewAllLink({ href }: { href: string }) {
  return (
    <Link href={href} className="ml-auto inline-flex items-center gap-1 text-[13px] font-medium text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100">
      View all <ArrowUpRight className="size-3.5" />
    </Link>
  )
}

const ROW_CLASS = "flex min-h-[52px] items-center gap-3 px-4 py-2.5 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
const EMPTY_CLASS = "border-0 bg-transparent py-8 dark:bg-transparent"

export default function V2HomePage() {
  const { user, isPending } = useAuth()
  const { selectedVenue, isAllVenues, venues, isLoading: venuesLoading, resetToAllVenues } = useVenue()
  const venueParam = useVenueParam()
  const { config } = useDashboardMode()

  // The setup checklist owns Home until the business is BOTH approved and has a
  // venue - a venue is the hard requirement for being visible to students.
  const needsSetup = isPending || (!venuesLoading && venues.length === 0)

  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [stats, setStats] = useState<QuickStats | null>(null)
  const [activity, setActivity] = useState<ActivityFeedItem[]>([])
  const [events, setEvents] = useState<EventListItem[]>([])
  const [deals, setDeals] = useState<DealListItem[]>([])
  // D2-6: Home reflects BOTH types. Programs load alongside everything else and
  // degrade to [] — a business that runs no door access, or a build where the
  // endpoint is down, gets exactly the homepage it had before.
  const [programs, setPrograms] = useState<DoorAccessProgramSummary[]>([])
  const [oneOffNights, setOneOffNights] = useState<OneOffUpcomingNight[]>([])
  const [probedInactiveIds, setProbedInactiveIds] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  // BETA shell: Create event is the single green CTA and opens the hybrid modal.
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    if (needsSetup || venuesLoading) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const res = await Promise.allSettled([
        apiClient.get<DashboardSummary>(`/business/dashboard/summary?_=1${venueParam}`),
        apiClient.get<QuickStats>(`/business/dashboard/quick-stats?_=1${venueParam}`),
        apiClient.get<ActivityFeedItem[]>(`/business/dashboard/activity?limit=6${venueParam}`),
        apiClient.get<{ events: EventListItem[] }>(`/business/events?tab=upcoming&limit=4${venueParam}`),
        apiClient.get<{ deals: DealListItem[] }>(`/business/deals?tab=live&limit=4${venueParam}`),
      ])
      if (cancelled) return
      // If any scoped fetch 404'd on a stale/out-of-scope venue selection, self-heal
      // to All venues instead of showing a half-empty (silently-dropped) dashboard.
      // resetToAllVenues flips venueParam → this effect re-fires with a global fetch
      // the server re-scopes to the caller's own window (can't 404 again → no loop).
      if (res.some((r) => r.status === "rejected" && isVenueScopeNotFound(r.reason))) {
        resetToAllVenues()
        return
      }
      if (res[0].status === "fulfilled") setSummary(res[0].value)
      if (res[1].status === "fulfilled") setStats(res[1].value)
      if (res[2].status === "fulfilled") setActivity(res[2].value)
      if (res[3].status === "fulfilled") setEvents(res[3].value.events ?? [])
      if (res[4].status === "fulfilled") setDeals(res[4].value.deals ?? [])
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [venueParam, needsSetup, venuesLoading, resetToAllVenues])

  // Kept OUT of the Promise.allSettled above deliberately: that block treats a
  // 404 as "stale venue selection, self-heal to All venues", and the door-access
  // endpoint has its own reasons to 404 (older build, role). Folding it in would
  // let a missing program list reset the operator's venue.
  useEffect(() => {
    if (needsSetup || venuesLoading) return
    let cancelled = false
    fetchDoorAccessProgramsSafe().then(async (rows) => {
      if (cancelled) return
      setPrograms(rows)
      const loaded = await loadProgramsUpcomingNights(rows.filter((p) => p.is_active))
      if (!cancelled) setOneOffNights(oneOffNightsFromSeries(loaded, easternToday()))
    })
    return () => { cancelled = true }
  }, [needsSetup, venuesLoading])

  useEffect(() => {
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

  if (needsSetup) return <TrialHome />

  const firstName = user?.full_name?.split(" ")[0]
  const venueLabel = isAllVenues ? "all your venues" : selectedVenue?.name ?? "your venue"
  const canCreate = user?.business_role === "owner" || user?.business_role === "manager"

  // LSK-19 — each product section appears only if this business actually RUNS
  // that product. The decision itself lives in home-sections.ts, as a pure
  // function every business shape is pinned against by `npm test`; the reads
  // below are just the two presence signals it needs. `?? 0`/`?? false` mean a
  // failed fetch reads as "no product" rather than throwing.
  const sections = homeSections({
    totalEvents: summary?.total_events ?? 0,
    hasLineSkipNights: stats?.has_line_skip_nights ?? false,
    showEvents: config.showEvents,
    showLineSkips: config.showLineSkips,
    showDeals: config.showDeals,
    canViewRevenue: canViewRevenue(user?.business_role),
  })
  const showEventsSection = sections.events
  const showLineSkipSection = sections.lineSkips
  // Line-skip money is owner/manager only (the server omits the field for
  // staff) — `null` renders as "-" through usd(), same as event revenue does.
  const lineSkipRevenue =
    stats?.line_skip_revenue_cents == null ? null : stats.line_skip_revenue_cents / 100

  // D2-6. Door Access is a TYPE on this page, not a section of its own: it
  // feeds the same upcoming list and the same tiles the events do.
  // Presence-gated exactly like every other product here — a business with
  // no programs sees no trace of them.
  const activePrograms = config.showLineSkips ? programs.filter((p) => p.is_active) : []
  const inactiveWcIds = [
    ...new Set([...inactiveWeeklyCoverSeriesIds(programs, [], events), ...probedInactiveIds]),
  ]
  const showAccessSection = activePrograms.length > 0
  // One "today" (US/Eastern) for every lower bound on this page: a stale/past
  // next_night_date from the API must never surface as Next / Upcoming.
  const today = easternToday()
  const nextNights = activePrograms
    .map((p) => nextAccessNight(p, today))
    .filter((n): n is NonNullable<ReturnType<typeof nextAccessNight>> => n !== null)
    .sort((a, b) => a.date.localeCompare(b.date))
  const soonestNight = nextNights[0] ?? null

  // The interleaved list (green events + pink nights) this section now shows.
  const upcoming = homeUpcoming(
    showEventsSection ? events : [],
    activePrograms,
    4,
    inactiveWcIds,
    oneOffNights,
    today,
  )
  const showUpcomingCard = showEventsSection || showAccessSection

  // The "next night" tile answers across BOTH systems while they coexist — a
  // venue mid-F15 has legacy nights AND programs, and two competing "next"
  // figures would be worse than one honest earliest.
  const nextAccessDate = [stats?.next_line_skip_date, soonestNight?.date]
    .filter((d): d is string => !!d)
    .sort((a, b) => a.localeCompare(b))[0] ?? null

  // BETA shell: the metric row is one compact strip. Same figures, same gates
  // (home-sections.ts decides presence; the server decides who sees revenue).
  const metrics: Metric[] = []
  // This is the EVENT revenue figure. It is never blended with the line-skip
  // take below — Backroads is $171,782 of events against $12 of skip the line
  // tickets, and one total would erase the $12.
  if (sections.revenueTile) metrics.push({ label: "Revenue · all time", value: usd(summary?.total_revenue) })
  // BETA (Luke PRD 2026-10-29, change 2): the week-to-date host take, same
  // owner gate and same units as all-time. The server defines the week
  // (Monday 00:00 America/New_York → now); an older build that omits the
  // field renders "—" exactly like a manager's view.
  if (sections.revenueTile) metrics.push({ label: "Revenue this week", value: usd(summary?.revenue_this_week), sub: "Since Monday" })
  if (config.showDeals) {
    metrics.push({ label: "Active deals", value: stats?.active_deals_count ?? 0, sub: `${stats?.claims_this_week ?? 0} claims this week` })
  }
  if (config.showDeals && !config.showEvents) {
    metrics.push({ label: "Claims this week", value: stats?.claims_this_week ?? 0, sub: "Across all live deals" })
  }
  if (showEventsSection) {
    metrics.push({ label: "Total attendees", value: (summary?.total_attendees ?? 0).toLocaleString() })
    metrics.push({ label: "Upcoming events", value: stats?.upcoming_events_count ?? 0, sub: stats?.next_event_date ? `Next ${fmtShortDate(stats.next_event_date)}` : "None scheduled" })
  }

  // LSK-19 — the door-side figures, as their OWN labelled row so they can
  // never be read as part of (or blended into) the event totals above.
  // D2-6 widened it from skip the line tickets to WEEKLY COVER: the same row
  // now covers programs and the legacy nights side by side, because a venue
  // mid-F15 genuinely runs both and needs to see both.
  const accessMetrics: Metric[] = []
  if (showLineSkipSection && canViewRevenue(user?.business_role)) {
    accessMetrics.push({ label: "Revenue · all time", value: usd(lineSkipRevenue) })
  }
  if (showLineSkipSection) {
    accessMetrics.push({ label: "Passes sold", value: (stats?.line_skip_passes_sold ?? 0).toLocaleString() })
  }
  if (showAccessSection) {
    accessMetrics.push({
      label: "Active programs",
      value: activePrograms.length,
      sub: `${activePrograms.reduce((n, p) => n + (p.upcoming_night_count ?? 0), 0)} nights scheduled`,
    })
  }
  accessMetrics.push({
    label: "Next night",
    value: nextAccessDate ? fmtShortDate(nextAccessDate) : "-",
    sub: nextAccessDate ? undefined : "None scheduled",
    aside: nextAccessDate && showAccessSection ? <WeeklyCoverChip /> : undefined,
  })

  return (
    <>
      {/* BE-D2: money Bizzy is holding is the single most important thing on
          this page — first and largest, above the greeting, revenue, and
          events. Renders nothing (no placeholder) without escrow history, so
          every other business's homepage is unchanged. */}
      <EscrowPanel variant="hero" />

      <PageHeader
        title={`Good to see you${firstName ? `, ${firstName}` : ""}`}
        description={`Here's what's happening at ${venueLabel}.`}
        actions={
          <div className="flex w-full items-center gap-2 sm:w-auto">
            {/* BETA shell (locked 2026-10-29): Create event is the one green
                CTA on Home. New deal is secondary. The Weekly Cover path stays
                reachable from inside the modal. On a phone Create event leads
                and takes the wider half (mobile mock). */}
            {config.showDeals && (
              <Button variant="secondary" asChild className="h-11 flex-1 sm:h-10 sm:flex-none">
                <Link href="/business/deals/new"><Plus /> New deal</Link>
              </Button>
            )}
            {config.showEvents && canCreate && (
              <Button onClick={() => setShowCreate(true)} className="order-first h-11 flex-[1.4] sm:order-none sm:h-10 sm:flex-none"><Plus /> Create event</Button>
            )}
          </div>
        }
      />

      {/* DASH2-D: the OTHER half of the no-Stripe story. The hero above covers
          "money is waiting"; this quiet card covers the zero-balance business,
          which used to be told nothing at all. Mutually exclusive with the hero
          by construction (home-stripe-prompt.ts) — never two Stripe CTAs — and
          renders nothing for a connected business. Below the greeting on
          purpose: a nudge, not an alarm. */}
      <HomeStripeConnectPrompt />

      {/* metric strip - filtered by dashboard mode AND by what this business runs */}
      {(loading || sections.tileCount > 0) && (
        loading ? <Skeleton className="h-[76px] rounded-[10px]" /> : <MetricStrip metrics={metrics} />
      )}

      {/* "View all" points at the Events page, where Weekly Cover now lives —
          never at the retired nav route. */}
      {!loading && (showLineSkipSection || showAccessSection) && (
        <section data-testid="line-skip-section" className="flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: ACCESS_ACCENT }} />
            <h2 className="text-[17px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
              {showAccessSection ? WEEKLY_ACCESS_SECTION_LABEL : LINE_SKIP_LABEL}
            </h2>
            <ViewAllLink href="/business/events" />
          </div>
          <MetricStrip metrics={accessMetrics} />
        </section>
      )}

      {/* two lists - first one follows the dashboard mode */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* LSK-19: the events list follows PRESENCE now, not just the mode — a
            venue with no events never posted one, so neither the tiles nor the
            "Create an event" empty state belong on its Home. The deals branch
            stays exactly where it was (it only ever rendered when the events
            card did not), but no longer catches a line-skip-only venue that has
            deals switched off: that venue gets no product card here at all, and
            its Skip the Line row above carries the page. */}
        {showUpcomingCard ? (
          <HomeSection title={showAccessSection ? "Upcoming" : "Upcoming events"} viewAllHref="/business/events">
            {loading ? (
              [0, 1, 2].map((i) => <div key={i} className="px-3 py-3.5"><Skeleton className="h-5 w-40" /></div>)
            ) : upcoming.length === 0 ? (
              // D2-B's emptiness test (the interleaved list, not just events)
              // over D2-A's destination (the funnel, not the event form).
              <EmptyState
                className={EMPTY_CLASS}
                icon={CalendarDays}
                title="Nothing coming up"
                description={`Create an event or a ${WEEKLY_ACCESS_SECTION_LABEL.toLowerCase()} program to start selling.`}
                // The header's Create event owns this; the chooser link only
                // stands in when that button is hidden (events switched off).
                action={canCreate && !config.showEvents ? <Button asChild variant="secondary" size="sm"><Link href="/business/create"><Plus /> Create</Link></Button> : undefined}
              />
            ) : (
              // Interleaved (D2-6). The pink type chip is the whole type marker:
              // the row shapes are otherwise identical, which is the point —
              // one list, one reading order, two kinds.
              upcoming.map((entry) => {
                if (entry.kind === "access") {
                  const p = entry.program
                  return (
                    <Link key={entry.key} href={programHref(p.id)} className={ROW_CLASS}>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{p.name}</span>
                        <span className="block text-[13px] text-neutral-500 dark:text-neutral-400">{fmtShortDate(entry.date)} · {p.venue_name}</span>
                      </span>
                      <WeeklyCoverChip />
                      <ChevronRight className="size-4 text-neutral-300 dark:text-neutral-600" />
                    </Link>
                  )
                }
                const e = entry.event
                const b = eventBadge(e.status)
                return (
                  <Link key={entry.key} href={`/business/events/${e.event_id}/manage`} className={ROW_CLASS}>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{e.name}</span>
                      {/* BETA (Luke PRD 2026-10-29, change 3): the venue leads the
                          subtitle ("Fifth Quarter · Oct 31 · 166 sold") so an
                          All-venues list reads where each event is. An older row
                          without a venue_name keeps the date-first line. */}
                      <span className="block text-[13px] text-neutral-500 dark:text-neutral-400">{e.venue_name ? `${e.venue_name} · ` : ""}{fmtShortDate(e.start_date_time)} · {e.ticket_sales_count} sold</span>
                    </span>
                    <Badge variant={b.variant}>{b.label}</Badge>
                    <ChevronRight className="size-4 text-neutral-300 dark:text-neutral-600" />
                  </Link>
                )
              })
            )}
          </HomeSection>
        ) : sections.dealsCard ? (
          <HomeSection title="Live deals" viewAllHref="/business/deals">
            {loading ? (
              [0, 1, 2].map((i) => <div key={i} className="px-3 py-3.5"><Skeleton className="h-5 w-40" /></div>)
            ) : deals.length === 0 ? (
              <EmptyState
                className={EMPTY_CLASS}
                icon={Tag}
                title="No live deals"
                description="Create a deal to start reaching students."
                action={<Button asChild variant="secondary" size="sm"><Link href="/business/deals/new"><Plus /> Create deal</Link></Button>}
              />
            ) : (
              deals.map((d) => (
                <Link key={d.id} href={`/business/deals/${d.id}`} className={ROW_CLASS}>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{d.deal_title}</span>
                    <span className="block text-[13px] text-neutral-500 dark:text-neutral-400">{d.deal_category} · expires {fmtShortDate(d.expired_date)}</span>
                  </span>
                  <Badge variant="success">Live</Badge>
                  <ChevronRight className="size-4 text-neutral-300 dark:text-neutral-600" />
                </Link>
              ))
            )}
          </HomeSection>
        ) : null}

        {/* recent activity - plain rows, no decorative dots (BETA shell) */}
        <HomeSection title="Recent activity">
          {loading ? (
            [0, 1, 2, 3].map((i) => <div key={i} className="px-3 py-3.5"><Skeleton className="h-5 w-48" /></div>)
          ) : activity.length === 0 ? (
            <EmptyState className={EMPTY_CLASS} icon={Sparkles} title="No activity yet" description="Sales, claims, and check-ins will show up here." />
          ) : (
            activity.map((a, i) => {
              const Icon = ACTIVITY_ICONS[a.type] ?? Sparkles
              return (
                <div key={i} className={cn("flex min-h-[52px] items-center gap-3 px-4 py-2.5")}>
                  <Icon aria-hidden strokeWidth={1.75} className="size-4 shrink-0 text-neutral-400 dark:text-neutral-500" />
                  <span className="min-w-0 flex-1 text-sm text-neutral-800 dark:text-neutral-200">{a.message}</span>
                  <span className="shrink-0 text-[12px] tabular-nums text-neutral-400 dark:text-neutral-500">{fmtRelative(a.timestamp)} ago</span>
                </div>
              )
            })
          )}
        </HomeSection>
      </div>

      <CreateEventModal open={showCreate} onOpenChange={setShowCreate} />
    </>
  )
}
