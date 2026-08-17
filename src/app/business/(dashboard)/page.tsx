"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Plus, ArrowUpRight, CalendarDays, TrendingUp, Ticket, Sparkles, ChevronRight, Tag,
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
import { cn, usd } from "@/lib/v2/utils"
import { PageHeader } from "@/components/business/v2/PageHeader"
import { Card, CardContent } from "@/components/business/v2/ui/card"
import { Badge } from "@/components/business/v2/ui/badge"
import { Button } from "@/components/business/v2/ui/button"
import { Skeleton } from "@/components/business/v2/ui/skeleton"
import { EmptyState } from "@/components/business/v2/ui/empty-state"
import TrialHome from "@/components/business/v2/TrialHome"

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

  if (needsSetup) return <TrialHome />

  const firstName = user?.full_name?.split(" ")[0]
  const venueLabel = isAllVenues ? "all your venues" : selectedVenue?.name ?? "your venue"

  // LSK-19 — each product section appears only if this business actually RUNS
  // that product. A venue that only sells line skips was being shown Revenue $0,
  // Attendees 0, Upcoming events 0 and a "Create an event" button for a product
  // it does not run, which made a venue that sold three passes this morning look
  // identical to one that has never sold anything.
  //
  // The gate is PRESENCE, never revenue: `total_events` counts every event the
  // business has ever posted (past or upcoming, any status but deleted) and
  // `has_line_skip_nights` counts every night ever scheduled, sold or not. A
  // venue with 27 nights and no sales must see a real $0, not a blank page.
  //
  // Still ANDed with the dashboard mode, which stays the operator's own switch:
  // presence decides whether a product is REAL for this business, mode decides
  // whether they want to see it. `?? false`/`> 0` mean a failed fetch reads as
  // "no product" rather than throwing.
  const hasEvents = (summary?.total_events ?? 0) > 0
  const hasLineSkips = stats?.has_line_skip_nights ?? false
  const showEventsSection = config.showEvents && hasEvents
  const showLineSkipSection = config.showLineSkips && hasLineSkips
  // "Total attendees" and "Upcoming events" are event counts; they already only
  // rendered under config.showEvents and now also need an event to count. For a
  // line-skip-only venue both were a truthful-but-useless zero.
  const showEventTiles = showEventsSection
  // "Revenue (all-time)" is ALSO an event figure, but it rendered in every mode,
  // so dropping it on `showEventTiles` alone would quietly take it off a
  // deals-only business's page too — a change nobody asked for. It goes only in
  // the case that motivated LSK-19: a venue with no events and no deals, where
  // it can only ever read $0. The Skip the Line row below carries its money.
  const showRevenueTile = showEventsSection || config.showDeals
  // Every tile is conditional, so the row's own presence and its column count
  // follow what actually renders rather than being hardcoded per mode — a
  // hybrid venue with no events would otherwise leave two holes in a 4-up grid.
  const tileCount =
    (showRevenueTile ? 1 : 0) +
    (config.showDeals ? 1 : 0) +
    (config.showDeals && !config.showEvents ? 1 : 0) +
    (showEventTiles ? 2 : 0)
  // Line-skip money is owner/manager only (the server omits the field for
  // staff) — `null` renders as "—" through usd(), same as event revenue does.
  const lineSkipRevenue =
    stats?.line_skip_revenue_cents == null ? null : stats.line_skip_revenue_cents / 100

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
      <PageHeader
        title={`Good to see you${firstName ? `, ${firstName}` : ""}`}
        description={`Here's what's happening at ${venueLabel}.`}
        actions={
          <div className="flex items-center gap-2">
            {config.showEvents && (
              <Button variant={config.showDeals ? "secondary" : "primary"} asChild>
                <Link href="/business/events/new"><Plus /> New event</Link>
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

      {/* metric tiles - filtered by dashboard mode AND by what this business runs */}
      {(loading || tileCount > 0) && (
        <div className={cn("grid grid-cols-2 gap-4", loading
          ? (config.showDeals && config.showEvents ? "lg:grid-cols-4" : "lg:grid-cols-3")
          : tileCount >= 4 ? "lg:grid-cols-4" : tileCount === 3 ? "lg:grid-cols-3" : "lg:grid-cols-2")}>
          {loading ? (
            [0, 1, 2, 3].slice(0, config.showDeals && config.showEvents ? 4 : 3).map((i) => <Skeleton key={i} className="h-[104px] rounded-xl" />)
          ) : (
            <>
              {/* This is the EVENT revenue figure. It is never blended with the
                  line-skip take below — Backroads is $171,782 of events against
                  $12 of line skips, and one total would erase the $12. */}
              {showRevenueTile && <MetricTile label="Revenue (all-time)" value={usd(summary?.total_revenue)} />}
              {config.showDeals && (
                <MetricTile label="Active deals" value={stats?.active_deals_count ?? 0} sub={`${stats?.claims_this_week ?? 0} claims this week`} />
              )}
              {config.showDeals && !config.showEvents && (
                <MetricTile label="Claims this week" value={stats?.claims_this_week ?? 0} sub="Across all live deals" />
              )}
              {showEventTiles && (
                <MetricTile label="Total attendees" value={(summary?.total_attendees ?? 0).toLocaleString()} />
              )}
              {showEventTiles && (
                <MetricTile label="Upcoming events" value={stats?.upcoming_events_count ?? 0} sub={stats?.next_event_date ? `Next ${fmtDate(stats.next_event_date)}` : "None scheduled"} />
              )}
            </>
          )}
        </div>
      )}

      {/* LSK-19 — the line-skip figures, as their OWN labelled row so they can
          never be read as part of (or blended into) the event totals above. */}
      {!loading && showLineSkipSection && (
        <section data-testid="line-skip-section">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{LINE_SKIP_LABEL}</h2>
            <Link href="/business/line-skips" className="ml-auto inline-flex items-center gap-1 text-[13px] font-semibold text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100">
              View all <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-3">
            <MetricTile label="Revenue (all-time)" value={usd(lineSkipRevenue)} />
            <MetricTile label="Passes sold" value={(stats?.line_skip_passes_sold ?? 0).toLocaleString()} />
            <MetricTile
              label="Next night"
              value={stats?.next_line_skip_date ? fmtDate(stats.next_line_skip_date) : "—"}
              sub={stats?.next_line_skip_date ? undefined : "None scheduled"}
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
        {showEventsSection ? (
          <Card className="overflow-hidden">
            <div className="flex items-center px-5 py-4">
              <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Upcoming events</h2>
              <Link href="/business/events" className="ml-auto inline-flex items-center gap-1 text-[13px] font-semibold text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100">
                View all <ArrowUpRight className="size-3.5" />
              </Link>
            </div>
            <div className="border-t border-neutral-100 dark:border-neutral-800">
              {loading ? (
                [0, 1, 2].map((i) => <div key={i} className="border-t border-neutral-100 dark:border-neutral-800 px-5 py-3.5 first:border-t-0"><Skeleton className="h-5 w-40" /></div>)
              ) : events.length === 0 ? (
                <div className="p-5"><EmptyState icon={CalendarDays} title="No upcoming events" description="Create an event to start selling tickets." action={<Button asChild size="sm"><Link href="/business/events/new"><Plus /> Create event</Link></Button>} /></div>
              ) : (
                events.map((e, i) => {
                  const b = eventBadge(e.status)
                  return (
                    <Link key={e.event_id} href={`/business/events/${e.event_id}/manage`} className={cn("flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/60", i > 0 && "border-t border-neutral-100 dark:border-neutral-800")}>
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
        ) : config.showDeals ? (
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
