"use client"

import Link from "next/link"
import type { LineSkipAnalyticsOverview, LineSkipOverviewInstance } from "@/lib/business/types"

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
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

function AggregateStats({ data }: { data: LineSkipAnalyticsOverview }) {
  const stats = [
    { label: "Active Schedules", value: String(data.total_active_schedules) },
    { label: "Upcoming (7d)", value: String(data.total_upcoming_instances) },
    { label: "Tickets This Week", value: data.total_tickets_this_week.toLocaleString() },
    { label: "Revenue This Week", value: formatPrice(data.total_revenue_this_week_cents) },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {stats.map((s) => (
        <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">{s.label}</p>
          <p className="mt-1 text-2xl font-bold text-ink">{s.value}</p>
        </div>
      ))}
    </div>
  )
}

function InstanceCard({ instance }: { instance: LineSkipOverviewInstance }) {
  const upcoming = isUpcoming(instance.date)

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-4">
        {/* Date badge */}
        <div className="flex flex-col items-center justify-center rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 min-w-[52px]">
          <span className="text-xs text-amber-600 uppercase font-medium">
            {new Date(instance.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" })}
          </span>
          <span className="text-lg font-bold text-ink leading-tight">
            {new Date(instance.date + "T00:00:00").getDate()}
          </span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-ink truncate">{instance.line_skip_name}</p>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
              instance.status === "active"
                ? upcoming ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                : instance.status === "cancelled"
                ? "bg-red-100 text-red-700"
                : "bg-orange-100 text-orange-700"
            }`}>
              {!upcoming && instance.status === "active" ? "Past" : instance.status === "sold_out" ? "Sold Out" : instance.status.charAt(0).toUpperCase() + instance.status.slice(1)}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {formatDate(instance.date)} &middot; {formatTime(instance.start_time)} – {formatTime(instance.end_time)}
          </p>
        </div>

        {/* Stats */}
        <div className="hidden sm:flex items-center gap-6 flex-shrink-0">
          <div className="text-right">
            <p className="text-xs text-gray-500">Tickets</p>
            <p className="text-sm font-semibold text-ink">
              {instance.tickets_sold}
              {instance.capacity !== null ? ` / ${instance.capacity}` : ""}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Revenue</p>
            <p className="text-sm font-semibold text-ink">{formatPrice(instance.revenue_cents)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Check-In</p>
            <p className="text-sm font-semibold text-ink">{instance.check_in_rate}%</p>
          </div>
        </div>

        {/* Mobile stats */}
        <div className="flex sm:hidden items-center gap-3 flex-shrink-0">
          <div className="text-right">
            <p className="text-xs text-gray-500">Tickets</p>
            <p className="text-sm font-semibold text-ink">{instance.tickets_sold}</p>
          </div>
        </div>

        {/* Link */}
        {instance.tickets_sold > 0 && (
          <Link
            href={`/business/line-skips/instances/${instance.instance_id}`}
            className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors flex-shrink-0"
          >
            Details
          </Link>
        )}
      </div>
    </div>
  )
}

export default function LineSkipsOverview({ data }: { data: LineSkipAnalyticsOverview }) {
  if (data.instances.length === 0) {
    return (
      <div>
        <AggregateStats data={data} />
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
          No line skip instances yet. Create a Line Skip schedule to see analytics here.
        </div>
      </div>
    )
  }

  return (
    <div>
      <AggregateStats data={data} />
      <div className="space-y-3">
        {data.instances.map((instance) => (
          <InstanceCard key={instance.instance_id} instance={instance} />
        ))}
      </div>
    </div>
  )
}
