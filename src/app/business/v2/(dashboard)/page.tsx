"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Plus, ArrowUpRight, CalendarDays, TrendingUp, Ticket, Sparkles, ChevronRight, Tag,
} from "lucide-react"
import { useAuth } from "@/lib/business/auth-context"
import { useVenue, useVenueParam } from "@/lib/business/venue-context"
import { useDashboardMode } from "@/lib/v2/mode"
import { apiClient } from "@/lib/business/api-client"
import type {
  DashboardSummary, QuickStats, ActivityFeedItem, EventListItem, DealListItem,
} from "@/lib/business/types"
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
  const { selectedVenue, isAllVenues, venues, isLoading: venuesLoading } = useVenue()
  const venueParam = useVenueParam()
  const { config } = useDashboardMode()

  // The setup checklist owns Home until the business is BOTH approved and has a
  // venue — a venue is the hard requirement for being visible to students.
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
      if (res[0].status === "fulfilled") setSummary(res[0].value)
      if (res[1].status === "fulfilled") setStats(res[1].value)
      if (res[2].status === "fulfilled") setActivity(res[2].value)
      if (res[3].status === "fulfilled") setEvents(res[3].value.events ?? [])
      if (res[4].status === "fulfilled") setDeals(res[4].value.deals ?? [])
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [venueParam, needsSetup, venuesLoading])

  if (needsSetup) return <TrialHome />

  const firstName = user?.full_name?.split(" ")[0]
  const venueLabel = isAllVenues ? "all your venues" : selectedVenue?.name ?? "your venue"

  // Attention items derived from real data
  const attention: { icon: React.ElementType; tint: string; title: string; sub: string; href: string; cta: string }[] = []
  const nextEvent = config.showEvents ? events[0] : undefined
  if (nextEvent) {
    attention.push({
      icon: TrendingUp, tint: "bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400",
      title: `${nextEvent.name} is coming up`,
      sub: `${fmtDate(nextEvent.start_date_time)} · ${nextEvent.ticket_sales_count} sold`,
      href: `/business/v2/events/${nextEvent.event_id}/manage`, cta: "Manage",
    })
  }
  if (config.showDeals && (stats?.active_deals_count ?? 0) > 0) {
    attention.push({
      icon: Ticket, tint: "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400",
      title: `${stats!.active_deals_count} deals live right now`,
      sub: `${stats?.claims_this_week ?? 0} claims this week`,
      href: "/business/v2/deals", cta: "View",
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
                <Link href="/business/v2/events/new"><Plus /> New event</Link>
              </Button>
            )}
            {config.showDeals && (
              <Button asChild>
                <Link href="/business/v2/deals/new"><Plus /> New deal</Link>
              </Button>
            )}
          </div>
        }
      />

      {/* metric tiles — filtered by dashboard mode */}
      <div className={cn("grid grid-cols-2 gap-4", config.showDeals && config.showEvents ? "lg:grid-cols-4" : "lg:grid-cols-3")}>
        {loading ? (
          [0, 1, 2, 3].slice(0, config.showDeals && config.showEvents ? 4 : 3).map((i) => <Skeleton key={i} className="h-[104px] rounded-xl" />)
        ) : (
          <>
            <MetricTile label="Revenue (all-time)" value={usd(summary?.total_revenue)} />
            {config.showDeals && (
              <MetricTile label="Active deals" value={stats?.active_deals_count ?? 0} sub={`${stats?.claims_this_week ?? 0} claims this week`} />
            )}
            {config.showDeals && !config.showEvents && (
              <MetricTile label="Claims this week" value={stats?.claims_this_week ?? 0} sub="Across all live deals" />
            )}
            {config.showEvents && (
              <MetricTile label="Total attendees" value={(summary?.total_attendees ?? 0).toLocaleString()} />
            )}
            {config.showEvents && (
              <MetricTile label="Upcoming events" value={stats?.upcoming_events_count ?? 0} sub={stats?.next_event_date ? `Next ${fmtDate(stats.next_event_date)}` : "None scheduled"} />
            )}
          </>
        )}
      </div>

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

      {/* bento — first card follows the dashboard mode */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {config.showEvents ? (
          <Card className="overflow-hidden">
            <div className="flex items-center px-5 py-4">
              <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Upcoming events</h2>
              <Link href="/business/v2/events" className="ml-auto inline-flex items-center gap-1 text-[13px] font-semibold text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100">
                View all <ArrowUpRight className="size-3.5" />
              </Link>
            </div>
            <div className="border-t border-neutral-100 dark:border-neutral-800">
              {loading ? (
                [0, 1, 2].map((i) => <div key={i} className="border-t border-neutral-100 dark:border-neutral-800 px-5 py-3.5 first:border-t-0"><Skeleton className="h-5 w-40" /></div>)
              ) : events.length === 0 ? (
                <div className="p-5"><EmptyState icon={CalendarDays} title="No upcoming events" description="Create an event to start selling tickets." action={<Button asChild size="sm"><Link href="/business/v2/events/new"><Plus /> Create event</Link></Button>} /></div>
              ) : (
                events.map((e, i) => {
                  const b = eventBadge(e.status)
                  return (
                    <Link key={e.event_id} href={`/business/v2/events/${e.event_id}/manage`} className={cn("flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/60", i > 0 && "border-t border-neutral-100 dark:border-neutral-800")}>
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
        ) : (
          <Card className="overflow-hidden">
            <div className="flex items-center px-5 py-4">
              <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Live deals</h2>
              <Link href="/business/v2/deals" className="ml-auto inline-flex items-center gap-1 text-[13px] font-semibold text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100">
                View all <ArrowUpRight className="size-3.5" />
              </Link>
            </div>
            <div className="border-t border-neutral-100 dark:border-neutral-800">
              {loading ? (
                [0, 1, 2].map((i) => <div key={i} className="border-t border-neutral-100 dark:border-neutral-800 px-5 py-3.5 first:border-t-0"><Skeleton className="h-5 w-40" /></div>)
              ) : deals.length === 0 ? (
                <div className="p-5"><EmptyState icon={Tag} title="No live deals" description="Create a deal to start reaching students." action={<Button asChild size="sm"><Link href="/business/v2/deals/new"><Plus /> Create deal</Link></Button>} /></div>
              ) : (
                deals.map((d, i) => (
                  <Link key={d.id} href={`/business/v2/deals/${d.id}`} className={cn("flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/60", i > 0 && "border-t border-neutral-100 dark:border-neutral-800")}>
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
        )}

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
