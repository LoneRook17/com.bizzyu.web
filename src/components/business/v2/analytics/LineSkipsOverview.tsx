"use client"

import Link from "next/link"
import { Zap } from "lucide-react"
import type { LineSkipAnalyticsOverview, LineSkipOverviewInstance } from "@/lib/business/types"
import { money } from "@/lib/v2/utils"
import { Card } from "@/components/business/v2/ui/card"
import { Badge } from "@/components/business/v2/ui/badge"
import { Button } from "@/components/business/v2/ui/button"
import { EmptyState } from "@/components/business/v2/ui/empty-state"
import { StatTile, StatGrid, Section, VenueGroupLabel, RowStat } from "./shared"

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
}

function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(":")
  const hour = parseInt(h)
  const ampm = hour >= 12 ? "PM" : "AM"
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${hour12}:${m} ${ampm}`
}

function isUpcoming(dateStr: string): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(dateStr + "T00:00:00") >= today
}

function instanceBadge(instance: LineSkipOverviewInstance): { variant: "success" | "neutral" | "warning" | "danger"; label: string } {
  const upcoming = isUpcoming(instance.date)
  if (instance.status === "cancelled") return { variant: "danger", label: "Cancelled" }
  if (instance.status === "sold_out") return { variant: "warning", label: "Sold out" }
  if (instance.status === "active") return upcoming ? { variant: "success", label: "Active" } : { variant: "neutral", label: "Past" }
  return { variant: "neutral", label: instance.status.charAt(0).toUpperCase() + instance.status.slice(1) }
}

function InstanceCard({ instance }: { instance: LineSkipOverviewInstance }) {
  const b = instanceBadge(instance)
  const dt = new Date(instance.date + "T00:00:00")

  return (
    <Card className="p-4">
      <div className="flex items-center gap-4">
        <div className="flex min-w-[52px] flex-col items-center justify-center rounded-lg border border-amber-100 bg-amber-50 px-3 py-2">
          <span className="text-xs font-medium uppercase text-amber-600">
            {dt.toLocaleDateString("en-US", { weekday: "short" })}
          </span>
          <span className="text-lg font-bold leading-tight text-neutral-900">{dt.getDate()}</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-neutral-900">{instance.line_skip_name}</p>
            <Badge variant={b.variant} size="sm">{b.label}</Badge>
          </div>
          <p className="mt-0.5 text-xs text-neutral-500">
            {formatDate(instance.date)} · {formatTime(instance.start_time)} – {formatTime(instance.end_time)}
          </p>
        </div>

        <div className="hidden flex-shrink-0 items-center gap-6 sm:flex">
          <RowStat label="Tickets" value={`${instance.tickets_sold}${instance.capacity !== null ? ` / ${instance.capacity}` : ""}`} />
          <RowStat label="Revenue" value={money(instance.revenue_cents)} />
          <RowStat label="Check-in" value={`${instance.check_in_rate}%`} />
        </div>
        <div className="flex flex-shrink-0 items-center gap-3 sm:hidden">
          <RowStat label="Tickets" value={instance.tickets_sold} />
        </div>

        {instance.tickets_sold > 0 && (
          <Button variant="secondary" size="sm" asChild>
            <Link href={`/business/v2/line-skips/instances/${instance.instance_id}`}>Details</Link>
          </Button>
        )}
      </div>
    </Card>
  )
}

function groupByVenue(instances: LineSkipOverviewInstance[]): { venue: string; items: LineSkipOverviewInstance[] }[] {
  const map = new Map<string, LineSkipOverviewInstance[]>()
  for (const inst of instances) {
    const key = inst.venue_name || "Unknown venue"
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(inst)
  }
  return Array.from(map.entries()).map(([venue, items]) => ({ venue, items }))
}

function InstanceList({ instances, isAllVenues }: { instances: LineSkipOverviewInstance[]; isAllVenues: boolean }) {
  if (instances.length === 0) return null

  if (isAllVenues) {
    return (
      <>
        {groupByVenue(instances).map((g) => (
          <div key={g.venue} className="mb-4">
            <VenueGroupLabel venue={g.venue} count={g.items.length} />
            <div className="ml-5 space-y-2">
              {g.items.map((instance) => (
                <InstanceCard key={instance.instance_id} instance={instance} />
              ))}
            </div>
          </div>
        ))}
      </>
    )
  }

  return (
    <div className="space-y-3">
      {instances.map((instance) => (
        <InstanceCard key={instance.instance_id} instance={instance} />
      ))}
    </div>
  )
}

export default function LineSkipsOverviewView({
  data,
  isAllVenues = false,
}: {
  data: LineSkipAnalyticsOverview
  isAllVenues?: boolean
}) {
  const activeInstances = data.instances.filter((inst) => inst.status === "active" && isUpcoming(inst.date))
  const pastInstances = data.instances.filter((inst) => inst.status !== "active" || !isUpcoming(inst.date))

  return (
    <div>
      <StatGrid>
        <StatTile label="Active schedules" value={data.total_active_schedules} />
        <StatTile label="Upcoming (7d)" value={data.total_upcoming_instances} />
        <StatTile label="Tickets this week" value={data.total_tickets_this_week.toLocaleString()} />
        <StatTile label="Revenue this week" value={money(data.total_revenue_this_week_cents)} />
      </StatGrid>

      {data.instances.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon={Zap} title="No line skip instances yet" description="Create a line skip schedule to see analytics here." />
        </div>
      ) : (
        <>
          {activeInstances.length > 0 && (
            <Section title="Active line skips" count={activeInstances.length} defaultOpen>
              <InstanceList instances={activeInstances} isAllVenues={isAllVenues} />
            </Section>
          )}
          {pastInstances.length > 0 && (
            <Section title="Past line skips" count={pastInstances.length} defaultOpen={false}>
              <InstanceList instances={pastInstances} isAllVenues={isAllVenues} />
            </Section>
          )}
        </>
      )}
    </div>
  )
}
