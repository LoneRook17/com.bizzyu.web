"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
import { apiClient, ApiError } from "@/lib/business/api-client"
import type { LineSkipInstanceAnalytics } from "@/lib/business/types"

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(":")
  const hour = parseInt(h)
  const ampm = hour >= 12 ? "PM" : "AM"
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${hour12}:${m} ${ampm}`
}

function formatHour(hour: number): string {
  const ampm = hour >= 12 ? "PM" : "AM"
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${hour12}${ampm}`
}

export default function InstanceAnalyticsPage({ params }: { params: Promise<{ instanceId: string }> }) {
  const { instanceId } = use(params)
  const [analytics, setAnalytics] = useState<LineSkipInstanceAnalytics | null>(null)
  const [instanceInfo, setInstanceInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    async function fetch() {
      try {
        // Fetch analytics
        const data = await apiClient.get<LineSkipInstanceAnalytics>(
          `/business/line-skips/instances/${instanceId}/analytics`
        )
        setAnalytics(data)

        // Also fetch instance info for header context
        // The analytics endpoint returns what we need but instance details come from the detail endpoint
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to load analytics")
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [instanceId])

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-gray-200 rounded w-48" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-gray-200 rounded-xl" />)}
        </div>
        <div className="h-48 bg-gray-200 rounded-xl" />
      </div>
    )
  }

  if (error || !analytics) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-red-500 mb-4">{error || "Analytics not available"}</p>
        <Link href="/business/line-skips" className="text-sm text-primary hover:underline">
          Back to Line Skips
        </Link>
      </div>
    )
  }

  const totalTickets = analytics.channel_split.app + analytics.channel_split.web
  const appPct = totalTickets > 0 ? Math.round((analytics.channel_split.app / totalTickets) * 100) : 0
  const webPct = totalTickets > 0 ? 100 - appPct : 0

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link href="/business/line-skips" className="text-xs text-gray-500 hover:text-primary mb-2 inline-block">
          &larr; Back to Line Skips
        </Link>
        <h1 className="text-xl font-bold text-ink">Night Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">Instance #{instanceId}</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Tickets Sold</p>
          <p className="text-lg font-semibold text-ink">{analytics.tickets_sold}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Revenue</p>
          <p className="text-lg font-semibold text-ink">{formatPrice(analytics.total_revenue_cents)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Capacity Used</p>
          <p className="text-lg font-semibold text-ink">
            {analytics.capacity_utilization !== null ? `${analytics.capacity_utilization}%` : "Unlimited"}
          </p>
          {analytics.capacity !== null && (
            <p className="text-xs text-gray-400">{analytics.tickets_sold} / {analytics.capacity}</p>
          )}
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Check-in Rate</p>
          <p className="text-lg font-semibold text-ink">{analytics.check_in_rate}%</p>
          <p className="text-xs text-gray-400">{analytics.checked_in} / {analytics.tickets_sold} checked in</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Channel split */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-ink mb-3">Purchase Channel</h3>
          {totalTickets === 0 ? (
            <p className="text-sm text-gray-400">No purchases yet</p>
          ) : (
            <>
              <div className="flex rounded-full h-6 overflow-hidden mb-3">
                {appPct > 0 && (
                  <div
                    className="bg-primary flex items-center justify-center text-white text-xs font-medium"
                    style={{ width: `${appPct}%` }}
                  >
                    {appPct}%
                  </div>
                )}
                {webPct > 0 && (
                  <div
                    className="bg-blue-500 flex items-center justify-center text-white text-xs font-medium"
                    style={{ width: `${webPct}%` }}
                  >
                    {webPct}%
                  </div>
                )}
              </div>
              <div className="flex gap-4 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                  App: {analytics.channel_split.app}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  Web: {analytics.channel_split.web}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Purchase time distribution */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-ink mb-3">Purchase Time</h3>
          {analytics.purchase_by_hour.length === 0 ? (
            <p className="text-sm text-gray-400">No purchases yet</p>
          ) : (
            <div className="flex items-end gap-1 h-24">
              {(() => {
                const maxCount = Math.max(...analytics.purchase_by_hour.map(r => r.count), 1)
                return analytics.purchase_by_hour.map((r) => (
                  <div
                    key={r.hour}
                    className="flex-1 flex flex-col items-center gap-0.5 min-w-0"
                    title={`${formatHour(r.hour)}: ${r.count} purchases`}
                  >
                    <span className="text-[9px] text-gray-500">{r.count}</span>
                    <div
                      className="w-full bg-primary/70 rounded-t min-h-[2px]"
                      style={{ height: `${(r.count / maxCount) * 100}%` }}
                    />
                    <span className="text-[9px] text-gray-400">{formatHour(r.hour)}</span>
                  </div>
                ))
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Promo code breakdown */}
      {analytics.promo_breakdown.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 mb-6">
          <h3 className="text-sm font-semibold text-ink mb-3">Promo Code Usage</h3>
          <div className="flex items-center gap-4 mb-3 text-xs text-gray-500">
            <span>{analytics.promo_usage.tickets_with_promo} tickets used a promo</span>
            <span>{formatPrice(analytics.promo_usage.total_discount_cents)} total discount</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-100">
                <th className="text-left py-2 font-medium">Code</th>
                <th className="text-left py-2 font-medium">Discount</th>
                <th className="text-right py-2 font-medium">Used</th>
                <th className="text-right py-2 font-medium">Total Discount</th>
              </tr>
            </thead>
            <tbody>
              {analytics.promo_breakdown.map((p) => (
                <tr key={p.promo_code_id} className="border-b border-gray-50">
                  <td className="py-2 font-mono text-xs">{p.code}</td>
                  <td className="py-2 text-gray-600">
                    {p.discount_type === "percentage" ? `${p.discount_value}%` : formatPrice(p.discount_value * 100)}
                  </td>
                  <td className="py-2 text-right">{p.times_used}</td>
                  <td className="py-2 text-right">{formatPrice(p.total_discount_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Ticket list */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-ink mb-3">Tickets ({analytics.tickets.length})</h3>
        {analytics.tickets.length === 0 ? (
          <p className="text-sm text-gray-400">No tickets purchased</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-100">
                  <th className="text-left py-2 font-medium">Name</th>
                  <th className="text-left py-2 font-medium">Phone</th>
                  <th className="text-right py-2 font-medium">Paid</th>
                  <th className="text-center py-2 font-medium">Status</th>
                  <th className="text-left py-2 font-medium">Promo</th>
                  <th className="text-left py-2 font-medium">Source</th>
                </tr>
              </thead>
              <tbody>
                {analytics.tickets.map((t) => (
                  <tr key={t.id} className="border-b border-gray-50">
                    <td className="py-2">{t.attendee_name}</td>
                    <td className="py-2 text-gray-500 text-xs">{t.phone_number}</td>
                    <td className="py-2 text-right">{formatPrice(t.price_paid_cents)}</td>
                    <td className="py-2 text-center">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        t.is_redeemed
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}>
                        {t.is_redeemed ? "Checked In" : "Not Scanned"}
                      </span>
                    </td>
                    <td className="py-2 text-xs text-gray-500">{t.promo_code || "—"}</td>
                    <td className="py-2 text-xs text-gray-500">{t.user_id ? "App" : "Web"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
