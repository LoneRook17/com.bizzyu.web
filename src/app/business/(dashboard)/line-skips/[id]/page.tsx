"use client"

import { useState, useEffect, useCallback, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/business/auth-context"
import { apiClient, ApiError } from "@/lib/business/api-client"
import LineSkipInstanceModal from "@/components/business/dashboard/LineSkipInstanceModal"
import type { LineSkipDetail, LineSkipInstance, LineSkipAggregateAnalytics } from "@/lib/business/types"

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function formatDays(days: number[]): string {
  return days
    .slice()
    .sort((a, b) => a - b)
    .map((d) => DAY_LABELS[d])
    .join(", ")
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatDateRange(start: string, end: string): string {
  const s = new Date(start + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  const e = new Date(end + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  return `${s} – ${e}`
}

function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(":")
  const hour = parseInt(h)
  const ampm = hour >= 12 ? "PM" : "AM"
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${hour12}:${m} ${ampm}`
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function isUpcoming(dateStr: string): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const date = new Date(dateStr + "T00:00:00")
  return date >= today
}

type ModalMode = "edit_price" | "edit_quantity" | "edit_details" | "cancel"

export default function LineSkipDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { user } = useAuth()
  const [lineSkip, setLineSkip] = useState<LineSkipDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming")

  const [analytics, setAnalytics] = useState<LineSkipAggregateAnalytics | null>(null)

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<ModalMode>("edit_price")
  const [selectedInstance, setSelectedInstance] = useState<LineSkipInstance | null>(null)

  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const canEdit = user?.business_role === "owner" || user?.business_role === "manager"
  const canEditPrice = canEdit || user?.business_role === "staff"
  const canViewAnalytics = user?.business_role === "owner" || user?.business_role === "manager"

  const fetchLineSkip = useCallback(async () => {
    try {
      const data = await apiClient.get<{ line_skip: LineSkipDetail }>(`/business/line-skips/${id}`)
      setLineSkip(data.line_skip)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load Line Skip")
    } finally {
      setLoading(false)
    }
  }, [id])

  const fetchAnalytics = useCallback(async () => {
    if (!canViewAnalytics) return
    try {
      const data = await apiClient.get<LineSkipAggregateAnalytics>(`/business/line-skips/${id}/analytics`)
      setAnalytics(data)
    } catch {
      // Non-critical — analytics just won't display
    }
  }, [id, canViewAnalytics])

  useEffect(() => {
    fetchLineSkip()
    fetchAnalytics()
  }, [fetchLineSkip, fetchAnalytics])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await apiClient.delete(`/business/line-skips/${id}`)
      router.push("/business/line-skips")
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete Line Skip")
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const openModal = (instance: LineSkipInstance, mode: ModalMode) => {
    setSelectedInstance(instance)
    setModalMode(mode)
    setModalOpen(true)
  }

  const upcomingInstances = lineSkip?.instances
    ?.filter((i) => isUpcoming(i.date))
    .sort((a, b) => a.date.localeCompare(b.date)) ?? []

  const pastInstances = lineSkip?.instances
    ?.filter((i) => !isUpcoming(i.date))
    .sort((a, b) => b.date.localeCompare(a.date)) ?? []

  const displayedInstances = tab === "upcoming" ? upcomingInstances : pastInstances

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-gray-200 rounded w-48" />
        <div className="h-48 bg-gray-200 rounded-xl" />
      </div>
    )
  }

  if (error || !lineSkip) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-red-500 mb-4">{error || "Line Skip not found"}</p>
        <Link href="/business/line-skips" className="text-sm text-primary hover:underline">
          Back to Line Skips
        </Link>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link href="/business/line-skips" className="text-xs text-gray-500 hover:text-primary mb-2 inline-block">
            &larr; Back to Line Skips
          </Link>
          <h1 className="text-xl font-bold text-ink">{lineSkip.name}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              lineSkip.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
            }`}>
              {lineSkip.is_active ? "Active" : "Inactive"}
            </span>
            <span className="text-xs text-gray-500">{formatDays(lineSkip.days_of_week)}</span>
            <span className="text-xs text-gray-400">&middot;</span>
            <span className="text-xs text-gray-500">{formatDateRange(lineSkip.date_range_start, lineSkip.date_range_end)}</span>
          </div>
          {lineSkip.description && (
            <p className="text-sm text-gray-500 mt-2">{lineSkip.description}</p>
          )}
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Link
              href={`/business/line-skips/${id}/edit`}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Edit Schedule
            </Link>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {analytics ? (
          <>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500">Total Revenue</p>
              <p className="text-lg font-semibold text-ink">{formatPrice(analytics.total_revenue_cents)}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500">Total Tickets Sold</p>
              <p className="text-lg font-semibold text-ink">{analytics.total_tickets_sold}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500">Avg per Night</p>
              <p className="text-lg font-semibold text-ink">{analytics.avg_tickets_per_night} tickets</p>
              <p className="text-xs text-gray-400">{formatPrice(analytics.avg_revenue_per_night_cents)} rev</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500">Busiest Day</p>
              <p className="text-lg font-semibold text-ink">
                {analytics.busiest_day ? DAY_LABELS[analytics.busiest_day.day_of_week] : "—"}
              </p>
              {analytics.busiest_day && (
                <p className="text-xs text-gray-400">{analytics.busiest_day.avg_tickets} avg tickets</p>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500">Default Price</p>
              <p className="text-lg font-semibold text-ink">{formatPrice(lineSkip.default_price_cents)}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500">Line Skip Quantity</p>
              <p className="text-lg font-semibold text-ink">{lineSkip.default_capacity ?? "Unlimited"}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500">Upcoming Nights</p>
              <p className="text-lg font-semibold text-ink">{upcomingInstances.length}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500">Time</p>
              <p className="text-lg font-semibold text-ink">{formatTime(lineSkip.default_start_time)} – {formatTime(lineSkip.default_end_time)}</p>
            </div>
          </>
        )}
      </div>

      {/* Revenue trend (simple bar chart) */}
      {analytics && analytics.revenue_trend.length > 1 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 mb-6">
          <h3 className="text-sm font-semibold text-ink mb-3">Revenue Trend</h3>
          <div className="flex items-end gap-1 h-32">
            {(() => {
              const maxRev = Math.max(...analytics.revenue_trend.map(r => r.revenue_cents), 1)
              return analytics.revenue_trend.map((r) => (
                <div
                  key={r.instance_id}
                  className="flex-1 flex flex-col items-center gap-1 min-w-0"
                  title={`${new Date(r.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}: ${formatPrice(r.revenue_cents)} (${r.tickets_sold} tickets)`}
                >
                  <div
                    className="w-full bg-primary/80 rounded-t min-h-[2px]"
                    style={{ height: `${(r.revenue_cents / maxRev) * 100}%` }}
                  />
                  {analytics.revenue_trend.length <= 20 && (
                    <span className="text-[9px] text-gray-400 truncate w-full text-center">
                      {new Date(r.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  )}
                </div>
              ))
            })()}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {(["upcoming", "past"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer -mb-px capitalize
              ${tab === t
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
          >
            {t} ({t === "upcoming" ? upcomingInstances.length : pastInstances.length})
          </button>
        ))}
      </div>

      {/* Instances */}
      {displayedInstances.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-gray-500">No {tab} nights.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedInstances.map((instance) => {
            const trendData = analytics?.revenue_trend.find(r => r.instance_id === instance.id)
            const revenueCents = instance.revenue ?? trendData?.revenue_cents ?? 0
            const checkinRate = instance.checkin_rate

            return (
              <div
                key={instance.id}
                className="rounded-xl border border-gray-200 bg-white p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {/* Date badge */}
                    <div className="flex flex-col items-center justify-center rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 min-w-[56px]">
                      <span className="text-xs text-gray-500 uppercase">
                        {new Date(instance.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" })}
                      </span>
                      <span className="text-lg font-bold text-ink leading-tight">
                        {new Date(instance.date + "T00:00:00").getDate()}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(instance.date + "T00:00:00").toLocaleDateString("en-US", { month: "short" })}
                      </span>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-ink">{formatDate(instance.date)}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatTime(instance.start_time)} – {formatTime(instance.end_time)}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="text-xs text-gray-600 font-medium inline-flex items-center gap-1">
                          {formatPrice(instance.price_cents)}
                          {tab === "upcoming" && instance.status !== "cancelled" && canEditPrice && (
                            <button
                              onClick={(e) => { e.stopPropagation(); openModal(instance, "edit_price") }}
                              className="inline-flex items-center justify-center w-4 h-4 rounded text-gray-400 hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                              title="Quick edit price"
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                              </svg>
                            </button>
                          )}
                        </span>
                        <span className="text-xs text-gray-500 inline-flex items-center gap-1">
                          {instance.capacity
                            ? `${instance.tickets_sold} / ${instance.capacity} sold`
                            : `${instance.tickets_sold} sold (unlimited)`}
                          {tab === "upcoming" && instance.status !== "cancelled" && canEditPrice && (
                            <button
                              onClick={(e) => { e.stopPropagation(); openModal(instance, "edit_quantity") }}
                              className="inline-flex items-center justify-center w-4 h-4 rounded text-gray-400 hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                              title="Quick edit quantity"
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                              </svg>
                            </button>
                          )}
                        </span>
                        {instance.tickets_sold > 0 && revenueCents > 0 && (
                          <span className="text-xs text-gray-400">{formatPrice(revenueCents)} revenue</span>
                        )}
                        {checkinRate !== undefined && checkinRate > 0 && (
                          <span className="text-xs text-gray-400">{checkinRate.toFixed(0)}% checked in</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Status badge */}
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        instance.status === "active"
                          ? "bg-green-100 text-green-700"
                          : instance.status === "cancelled"
                          ? "bg-red-100 text-red-700"
                          : "bg-orange-100 text-orange-700"
                      }`}
                    >
                      {instance.status === "sold_out" ? "Sold Out" : instance.status.charAt(0).toUpperCase() + instance.status.slice(1)}
                    </span>

                    {/* Analytics link */}
                    {instance.tickets_sold > 0 && (
                      <Link
                        href={`/business/line-skips/instances/${instance.id}`}
                        className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        Details
                      </Link>
                    )}

                    {/* Actions (upcoming only) */}
                    {tab === "upcoming" && instance.status !== "cancelled" && (
                      <div className="flex items-center gap-1 ml-1">
                        {canEditPrice && (
                          <>
                            <button
                              onClick={() => openModal(instance, "edit_price")}
                              className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                            >
                              Edit Price
                            </button>
                            <button
                              onClick={() => openModal(instance, "edit_quantity")}
                              className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                            >
                              Edit Qty
                            </button>
                          </>
                        )}
                        {canEdit && (
                          <>
                            <button
                              onClick={() => openModal(instance, "edit_details")}
                              className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                            >
                              Edit Details
                            </button>
                            <button
                              onClick={() => openModal(instance, "cancel")}
                              className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Cancellation reason */}
                {instance.status === "cancelled" && instance.cancellation_reason && (
                  <p className="text-xs text-red-500 mt-2 ml-[68px]">Cancelled: {instance.cancellation_reason}</p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full mx-4 p-6">
            <h3 className="text-lg font-bold text-ink mb-2">Delete Line Skip?</h3>
            <p className="text-sm text-gray-600 mb-1">
              This will deactivate <strong>{lineSkip.name}</strong> and cancel all future nights.
            </p>
            <p className="text-xs text-gray-400 mb-5">
              Past nights and sold tickets are preserved. This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-60 cursor-pointer"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      <LineSkipInstanceModal
        open={modalOpen}
        mode={modalMode}
        instance={selectedInstance}
        onClose={() => setModalOpen(false)}
        onUpdated={fetchLineSkip}
      />
    </div>
  )
}
