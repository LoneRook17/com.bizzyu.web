"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Plus, ArrowUpRight, CalendarDays, TrendingUp, Ticket, Sparkles, ChevronRight, Tag, Zap,
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
  WEEKLY_ACCESS_TYPE_LABEL,
  fetchDoorAccessProgramsSafe,
  programHref,
  type DoorAccessProgramSummary,
} from "@/lib/business/door-access"
import { homeUpcoming, nextAccessNight } from "@/lib/business/home-upcoming"
import { cn, usd } from "@/lib/v2/utils"
import { PageHeader } from "@/components/business/v2/PageHeader"
import { Card, CardContent } from "@/components/business/v2/ui/card"
import { Badge } from "@/components/business/v2/ui/badge"
import { Button } from "@/components/business/v2/ui/button"
import { Skeleton } from "@/components/business/v2/ui/skeleton"
import { EmptyState } from "@/components/business/v2/ui/empty-state"
import TrialHome from "@/components/business/v2/TrialHome"
import EscrowPanel from "@/components/business/v2/EscrowPanel"
import HomeStripeConnectPrompt from "@/components/business/v2/HomeStripeConnectPrompt"

function fmtDate(s?: string | null) {
  if (!s) return "—"
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}
function fmtRelative(s: string) {
  const d = new Date(s).getTime()
  const mins = Math.round((Date.now() - d) / 60000)
  if (mins < 1) return "now"
  if (mins < 60) return `${mins}m`
  const h = Math.round(mins / 60)
  if (h < 24) return `${h}h`
  return `${Math.round(h / 24)}d`
}
function eventBadge(status: string): { variant: "success" | "neutral" | "warning" | "danger"; label: string } {
  const s = status?.toLowerCase()
  if (s === "published" || s === "approved" || s === "active") return { variant: "success", label: "Live" }
  if (s === "draft") return { variant: "neutral", label: "Draft" }
  if (s?.includes("pending")) return { variant: "warning", label: "In review" }
  if (s === "cancelled" || s === "rejected") return { variant: "danger", label: s === "cancelled" ? "Cancelled" : "Rejected" }
  return { variant: "neutral", label: status || "—" }
}

function MetricTile({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <Card className="p-5">
      <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">{value}</p>
      {sub && <p className="mt-1.5 text-[13px] text-neutral-500 dark:text-neutral-400">{sub}</p>}
    </Card>
  )
}

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
  const [loading, setLoading] = useState(true)

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
    fetchDoorAccessProgramsSafe().then((rows) => { if (!cancelled) setPrograms(rows) })
    return () => { cancelled = true }
  }, [needsSetup, venuesLoading])

  if (needsSetup) return <TrialHome />

  const firstName = user?.full_name?.split(" ")[0]
  const venueLabel = isAllVenues ? "all your venues" : selectedVenue?.name ?? "your venue"

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
  })
  const showEventsSection = sections.events
  const showLineSkipSection = sections.lineSkips
  // Line-skip money is owner/manager only (the server omits the field for
  // staff) — `null` renders as "—" through usd(), same as event revenue does.
  const lineSkipRevenue =
    stats?.line_skip_revenue_cents == null ? null : stats.line_skip_revenue_cents / 100

  // D2-6. Door Access is a TYPE on this page, not a section of its own: it
  // feeds the same upcoming list, the same tiles and the same attention hub the
  // events do. Presence-gated exactly like every other product here — a
  // business with no programs sees no trace of them.
  const activePrograms = config.showLineSkips ? programs.filter((p) => p.is_active) : []
  const showAccessSection = activePrograms.length > 0
  const nextNights = activePrograms
    .map(nextAccessNight)
    .filter((n): n is NonNullable<ReturnType<typeof nextAccessNight>> => n !== null)
    .sort((a, b) => a.date.localeCompare(b.date))
  const soonestNight = nextNights[0] ?? null

  // The interleaved list (green events + pink nights) this card now shows.
  const upcoming = homeUpcoming(showEventsSection ? events : [], activePrograms, 4)
  const showUpcomingCard = showEventsSection || showAccessSection

  // The "next night" tile answers across BOTH systems while they coexist — a
  // venue mid-F15 has legacy nights AND programs, and two competing "next"
  // figures would be worse than one honest earliest.
  const nextAccessDate = [stats?.next_line_skip_date, soonestNight?.date]
    .filter((d): d is string => !!d)
    .sort((a, b) => a.localeCompare(b))[0] ?? null

  // Attention items derived from real data
  const attention: { icon: React.ElementType; tint: string; title: string; sub: string; href: string; cta: string }[] = []
  const nextEvent = showEventsSection ? events[0] : undefined
  if (nextEvent) {
    attention.push({
      icon: TrendingUp, tint: "bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400",
      title: `${nextEvent.name} is coming up`,
      sub: `${fmtDate(nextEvent.start_date_time)} · ${nextEvent.ticket_sales_count} sold`,
      href: `/business/events/${nextEvent.event_id}/manage`, cta: "Manage",
    })
  }
  if (soonestNight) {
    attention.push({
      icon: Zap, tint: "bg-pink-50 dark:bg-pink-950/40 text-[#FF3ED1]",
      title: `${soonestNight.program.name} runs ${fmtDate(soonestNight.date)}`,
      sub: `${soonestNight.program.upcoming_night_count} nights scheduled · ${soonestNight.program.tier_count} tiers`,
      href: programHref(soonestNight.program.id), cta: "Manage",
    })
  }
  if (config.showDeals && (stats?.active_deals_count ?? 0) > 0) {
    attention.push({
      icon: Ticket, tint: "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400",
      title: `${stats!.active_deals_count} deals live right now`,
      sub: `${stats?.claims_this_week ?? 0} claims this week`,
      href: "/business/deals", cta: "View",
    })
  }

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
          <div className="flex items-center gap-2">
            {config.showEvents && (
              <Button variant={config.showDeals ? "secondary" : "primary"} asChild>
                <Link href="/business/create"><Plus /> Create</Link>
              </Button>
            )}
            {config.showDeals && (
              <Button asChild>
                <Link href="/business/deals/new"><Plus /> New deal</Link>
              </Button>
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

      {/* metric tiles - filtered by dashboard mode AND by what this business runs */}
      {(loading || sections.tileCount > 0) && (
        <div className={cn("grid grid-cols-2 gap-4", loading
          ? (config.showDeals && config.showEvents ? "lg:grid-cols-4" : "lg:grid-cols-3")
          : sections.tileCount >= 4 ? "lg:grid-cols-4" : sections.tileCount === 3 ? "lg:grid-cols-3" : "lg:grid-cols-2")}>
          {loading ? (
            [0, 1, 2, 3].slice(0, config.showDeals && config.showEvents ? 4 : 3).map((i) => <Skeleton key={i} className="h-[104px] rounded-xl" />)
          ) : (
            <>
              {/* This is the EVENT revenue figure. It is never blended with the
                  line-skip take below — Backroads is $171,782 of events against
                  $12 of line skips, and one total would erase the $12. */}
              {sections.revenueTile && <MetricTile label="Revenue (all-time)" value={usd(summary?.total_revenue)} />}
              {config.showDeals && (
                <MetricTile label="Active deals" value={stats?.active_deals_count ?? 0} sub={`${stats?.claims_this_week ?? 0} claims this week`} />
              )}
              {config.showDeals && !config.showEvents && (
                <MetricTile label="Claims this week" value={stats?.claims_this_week ?? 0} sub="Across all live deals" />
              )}
              {showEventsSection && (
                <MetricTile label="Total attendees" value={(summary?.total_attendees ?? 0).toLocaleString()} />
              )}
              {showEventsSection && (
                <MetricTile label="Upcoming events" value={stats?.upcoming_events_count ?? 0} sub={stats?.next_event_date ? `Next ${fmtDate(stats.next_event_date)}` : "None scheduled"} />
              )}
            </>
          )}
        </div>
      )}

      {/* LSK-19 — the door-side figures, as their OWN labelled row so they can
          never be read as part of (or blended into) the event totals above.
          D2-6 widened it from line skips to WEEKLY ACCESS: the same row now
          covers programs and the legacy nights side by side, because a venue
          mid-F15 genuinely runs both and needs to see both. "View all" points
          at the Events page, where Weekly Access now lives — never at the
          retired nav route. */}
      {!loading && (showLineSkipSection || showAccessSection) && (
        <section data-testid="line-skip-section">
          <div className="flex items-center gap-2">
            <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: ACCESS_ACCENT }} />
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              {showAccessSection ? WEEKLY_ACCESS_SECTION_LABEL : LINE_SKIP_LABEL}
            </h2>
            <Link href="/business/events" className="ml-auto inline-flex items-center gap-1 text-[13px] font-semibold text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100">
              View all <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-3">
            {showLineSkipSection && (
              <MetricTile label="Revenue (all-time)" value={usd(lineSkipRevenue)} />
            )}
            {showLineSkipSection && (
              <MetricTile label="Passes sold" value={(stats?.line_skip_passes_sold ?? 0).toLocaleString()} />
            )}
            {showAccessSection && (
              <MetricTile
                label="Active programs"
                value={activePrograms.length}
                sub={`${activePrograms.reduce((n, p) => n + (p.upcoming_night_count ?? 0), 0)} nights scheduled`}
              />
            )}
            <MetricTile
              label="Next night"
              value={nextAccessDate ? fmtDate(nextAccessDate) : "—"}
              sub={nextAccessDate ? undefined : "None scheduled"}
            />
          </div>
        </section>
      )}

      {/* attention hub */}
      {!loading && attention.length > 0 && (
        <Card className="overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4">
            <Sparkles className="size-4 text-[#05EB54]" />
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Needs your attention</h2>
            <Badge variant="brand" className="ml-1">{attention.length}</Badge>
          </div>
          <div className="border-t border-neutral-100 dark:border-neutral-800">
            {attention.map((a, i) => (
              <Link
                key={i}
                href={a.href}
                className={cn("flex items-center gap-3.5 px-5 py-3.5 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/60", i > 0 && "border-t border-neutral-100 dark:border-neutral-800")}
              >
                <span className={cn("flex size-9 items-center justify-center rounded-lg", a.tint)}>
                  <a.icon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-neutral-900 dark:text-neutral-100">{a.title}</span>
                  <span className="block text-[13px] text-neutral-500 dark:text-neutral-400">{a.sub}</span>
                </span>
                <Button variant="secondary" size="sm" asChild><span>{a.cta}</span></Button>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* bento - first card follows the dashboard mode */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* LSK-19: the events card follows PRESENCE now, not just the mode — a
            venue with no events never posted one, so neither the tiles nor the
            "Create an event" empty state belong on its Home. The deals branch
            stays exactly where it was (it only ever rendered when the events
            card did not), but no longer catches a line-skip-only venue that has
            deals switched off: that venue gets no product card here at all, and
            its Skip the Line row above carries the page. */}
        {showUpcomingCard ? (
          <Card className="overflow-hidden">
            <div className="flex items-center px-5 py-4">
              <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                {showAccessSection ? "Upcoming" : "Upcoming events"}
              </h2>
              <Link href="/business/events" className="ml-auto inline-flex items-center gap-1 text-[13px] font-semibold text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100">
                View all <ArrowUpRight className="size-3.5" />
              </Link>
            </div>
            <div className="border-t border-neutral-100 dark:border-neutral-800">
              {loading ? (
                [0, 1, 2].map((i) => <div key={i} className="border-t border-neutral-100 dark:border-neutral-800 px-5 py-3.5 first:border-t-0"><Skeleton className="h-5 w-40" /></div>)
              ) : upcoming.length === 0 ? (
                // D2-B's emptiness test (the interleaved list, not just events)
                // over D2-A's destination (the funnel, not the event form).
                <div className="p-5"><EmptyState icon={CalendarDays} title="Nothing coming up" description={`Create an event or a ${WEEKLY_ACCESS_SECTION_LABEL.toLowerCase()} program to start selling.`} action={<Button asChild size="sm"><Link href="/business/create"><Plus /> Create</Link></Button>} /></div>
              ) : (
                // Interleaved (D2-6). A pink 2px spine is the whole type marker:
                // the row shapes are otherwise identical, which is the point —
                // one list, one reading order, two kinds.
                upcoming.map((entry, i) => {
                  const rowClass = cn(
                    "flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/60",
                    i > 0 && "border-t border-neutral-100 dark:border-neutral-800",
                  )
                  if (entry.kind === "access") {
                    const p = entry.program
                    return (
                      <Link key={entry.key} href={programHref(p.id)} className={rowClass}>
                        <span aria-hidden className="h-8 w-[2px] shrink-0 rounded-full" style={{ backgroundColor: ACCESS_ACCENT }} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{p.name}</span>
                          <span className="block text-[13px] text-neutral-500 dark:text-neutral-400">{fmtDate(entry.date)} · {p.venue_name}</span>
                        </span>
                        <span
                          className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-[0.06em]"
                          style={{ backgroundColor: `${ACCESS_ACCENT}1A`, color: ACCESS_ACCENT }}
                        >
                          {WEEKLY_ACCESS_TYPE_LABEL}
                        </span>
                        <ChevronRight className="size-4 text-neutral-300 dark:text-neutral-600" />
                      </Link>
                    )
                  }
                  const e = entry.event
                  const b = eventBadge(e.status)
                  return (
                    <Link key={entry.key} href={`/business/events/${e.event_id}/manage`} className={rowClass}>
                      {showAccessSection && <span aria-hidden className="h-8 w-[2px] shrink-0 rounded-full bg-[#05EB54]" />}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{e.name}</span>
                        <span className="block text-[13px] text-neutral-500 dark:text-neutral-400">{fmtDate(e.start_date_time)} · {e.ticket_sales_count} sold</span>
                      </span>
                      <Badge variant={b.variant}>{b.label}</Badge>
                      <ChevronRight className="size-4 text-neutral-300 dark:text-neutral-600" />
                    </Link>
                  )
                })
              )}
            </div>
          </Card>
        ) : sections.dealsCard ? (
          <Card className="overflow-hidden">
            <div className="flex items-center px-5 py-4">
              <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Live deals</h2>
              <Link href="/business/deals" className="ml-auto inline-flex items-center gap-1 text-[13px] font-semibold text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100">
                View all <ArrowUpRight className="size-3.5" />
              </Link>
            </div>
            <div className="border-t border-neutral-100 dark:border-neutral-800">
              {loading ? (
                [0, 1, 2].map((i) => <div key={i} className="border-t border-neutral-100 dark:border-neutral-800 px-5 py-3.5 first:border-t-0"><Skeleton className="h-5 w-40" /></div>)
              ) : deals.length === 0 ? (
                <div className="p-5"><EmptyState icon={Tag} title="No live deals" description="Create a deal to start reaching students." action={<Button asChild size="sm"><Link href="/business/deals/new"><Plus /> Create deal</Link></Button>} /></div>
              ) : (
                deals.map((d, i) => (
                  <Link key={d.id} href={`/business/deals/${d.id}`} className={cn("flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/60", i > 0 && "border-t border-neutral-100 dark:border-neutral-800")}>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{d.deal_title}</span>
                      <span className="block text-[13px] text-neutral-500 dark:text-neutral-400">{d.deal_category} · expires {fmtDate(d.expired_date)}</span>
                    </span>
                    <Badge variant="success">Live</Badge>
                    <ChevronRight className="size-4 text-neutral-300 dark:text-neutral-600" />
                  </Link>
                ))
              )}
            </div>
          </Card>
        ) : null}

        {/* recent activity */}
        <Card className="overflow-hidden">
          <div className="flex items-center px-5 py-4">
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Recent activity</h2>
          </div>
          <div className="border-t border-neutral-100 dark:border-neutral-800">
            {loading ? (
              [0, 1, 2, 3].map((i) => <div key={i} className="border-t border-neutral-100 dark:border-neutral-800 px-5 py-3.5 first:border-t-0"><Skeleton className="h-5 w-48" /></div>)
            ) : activity.length === 0 ? (
              <div className="p-5"><EmptyState icon={Sparkles} title="No activity yet" description="Sales, claims, and check-ins will show up here." /></div>
            ) : (
              activity.map((a, i) => (
                <div key={i} className={cn("flex items-start gap-3 px-5 py-3.5", i > 0 && "border-t border-neutral-100 dark:border-neutral-800")}>
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-[#05EB54]" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-neutral-800 dark:text-neutral-200">{a.message}</span>
                    <span className="block text-xs text-neutral-400 dark:text-neutral-500">{fmtRelative(a.timestamp)} ago</span>
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </>
  )
}
