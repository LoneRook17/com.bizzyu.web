"use client"

import { useState, useEffect, useCallback, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2, Pencil } from "lucide-react"
import { apiClient, ApiError } from "@/lib/business/api-client"
import { useAuth } from "@/lib/business/auth-context"
import { money } from "@/lib/v2/utils"
import type { LineSkipDetail, LineSkipInstance, LineSkipAggregateAnalytics } from "@/lib/business/types"
import { Card, CardContent } from "@/components/business/v2/ui/card"
import { Badge } from "@/components/business/v2/ui/badge"
import { Button } from "@/components/business/v2/ui/button"
import { Skeleton } from "@/components/business/v2/ui/skeleton"
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, DialogClose,
} from "@/components/business/v2/ui/dialog"
import LineSkipInstanceModal from "@/components/business/v2/line-skips/LineSkipInstanceModal"
import LineSkipCalendar from "@/components/business/v2/line-skips/LineSkipCalendar"

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function formatDays(days: number[]): string {
  return days.slice().sort((a, b) => a - b).map((d) => DAY_LABELS[d]).join(", ")
}
function formatDateRange(start: string, end: string): string {
  const s = new Date(start + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  const endDate = new Date(end + "T00:00:00")
  if (endDate.getFullYear() >= 2099) return `${s} – Ongoing`
  const e = endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  return `${s} – ${e}`
}
function formatTime(s: string): string {
  const [h, m] = s.split(":")
  const hour = parseInt(h)
  const ampm = hour >= 12 ? "PM" : "AM"
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${hour12}:${m} ${ampm}`
}
function isUpcoming(s: string): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(s + "T00:00:00") >= today
}

function StatTile({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className="mt-0.5 text-lg font-semibold text-neutral-900 dark:text-neutral-100">{value}</p>
      {sub && <p className="text-xs text-neutral-400 dark:text-neutral-500">{sub}</p>}
    </Card>
  )
}

export default function LineSkipDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { user } = useAuth()
  const [lineSkip, setLineSkip] = useState<LineSkipDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [analytics, setAnalytics] = useState<LineSkipAggregateAnalytics | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [selectedInstance, setSelectedInstance] = useState<LineSkipInstance | null>(null)

  const [deactivating, setDeactivating] = useState(false)
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false)
  const [deactivateError, setDeactivateError] = useState<{ message: string; blockingTicketCount?: number; blockingInstanceIds?: number[] } | null>(null)

  const canEdit = user?.business_role === "owner" || user?.business_role === "manager"
  const canViewAnalytics = user?.business_role === "owner" || user?.business_role === "manager"

  const fetchLineSkip = useCallback(async () => {
    try {
      const data = await apiClient.get<{ line_skip: LineSkipDetail; instances: LineSkipInstance[] }>(`/business/line-skips/${id}`)
      setLineSkip({ ...data.line_skip, instances: data.instances ?? data.line_skip.instances ?? [] })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load line skip")
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
      // non-critical
    }
  }, [id, canViewAnalytics])

  useEffect(() => {
    fetchLineSkip()
    fetchAnalytics()
  }, [fetchLineSkip, fetchAnalytics])

  const handleDeactivate = async () => {
    setDeactivating(true)
    setDeactivateError(null)
    try {
      await apiClient.delete(`/business/line-skips/${id}`)
      router.push("/business/line-skips")
    } catch (err) {
      if (err instanceof ApiError) {
        const body = err.body as { blocking_instance_ids?: number[]; blocking_ticket_count?: number }
        setDeactivateError({
          message: err.message,
          blockingTicketCount: body?.blocking_ticket_count,
          blockingInstanceIds: body?.blocking_instance_ids,
        })
      } else {
        setDeactivateError({ message: "Failed to deactivate line skip" })
      }
      setDeactivating(false)
    }
  }

  const openCancel = (instance: LineSkipInstance) => {
    setSelectedInstance(instance)
    setModalOpen(true)
  }

  const upcomingInstances = lineSkip?.instances?.filter((i) => isUpcoming(i.date)) ?? []

  if (loading) {
    return (
      <>
        <Skeleton className="h-7 w-56" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <Skeleton className="h-48 rounded-xl" />
      </>
    )
  }

  if (error || !lineSkip) {
    return (
      <div className="py-16 text-center">
        <p className="mb-4 text-sm text-red-500 dark:text-red-400">{error || "Line skip not found"}</p>
        <Button variant="link" asChild>
          <Link href="/business/line-skips">Back to line skips</Link>
        </Button>
      </div>
    )
  }

  return (
    <>
      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link href="/business/line-skips" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100">
            <ArrowLeft className="size-4" /> Back to line skips
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">{lineSkip.name}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[13px] text-neutral-500 dark:text-neutral-400">
            <Badge variant={lineSkip.is_active ? "success" : "neutral"}>{lineSkip.is_active ? "Active" : "Inactive"}</Badge>
            <span>{formatDays(lineSkip.days_of_week)}</span>
            <span className="text-neutral-300 dark:text-neutral-600">·</span>
            <span>{formatDateRange(lineSkip.date_range_start, lineSkip.date_range_end)}</span>
          </div>
          {lineSkip.description && <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">{lineSkip.description}</p>}
        </div>
        {canEdit && (
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="secondary" asChild>
              <Link href={`/business/line-skips/${id}/edit`}>
                <Pencil className="size-4" /> Edit schedule
              </Link>
            </Button>
            {lineSkip.is_active && (
              <Button variant="subtle" onClick={() => { setDeactivateError(null); setShowDeactivateConfirm(true) }}>
                Turn off line skip
              </Button>
            )}
          </div>
        )}
      </div>

      {/* summary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {analytics ? (
          <>
            <StatTile label="Total revenue" value={money(analytics.total_revenue_cents)} />
            <StatTile label="Total tickets sold" value={analytics.total_tickets_sold} />
            <StatTile label="Avg per night" value={`${analytics.avg_tickets_per_night} tickets`} sub={`${money(analytics.avg_revenue_per_night_cents)} rev`} />
            <StatTile
              label="Busiest day"
              value={analytics.busiest_day ? DAY_LABELS[analytics.busiest_day.day_of_week] : "—"}
              sub={analytics.busiest_day ? `${analytics.busiest_day.avg_tickets} avg tickets` : undefined}
            />
          </>
        ) : (
          <>
            <StatTile label="Default price" value={money(lineSkip.default_price_cents)} />
            <StatTile label="Limit per night" value={lineSkip.default_capacity ?? "Unlimited"} />
            <StatTile label="Upcoming nights" value={upcomingInstances.length} />
            <StatTile label="Time" value={`${formatTime(lineSkip.default_start_time)} – ${formatTime(lineSkip.default_end_time)}`} />
          </>
        )}
      </div>

      {/* revenue trend */}
      {analytics && analytics.revenue_trend.length > 1 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Revenue trend</h3>
            <div className="flex h-32 items-end gap-1">
              {(() => {
                const maxRev = Math.max(...analytics.revenue_trend.map((r) => r.revenue_cents), 1)
                return analytics.revenue_trend.map((r) => (
                  <div
                    key={r.instance_id}
                    className="flex min-w-0 flex-1 flex-col items-center gap-1"
                    title={`${new Date(r.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}: ${money(r.revenue_cents)} (${r.tickets_sold} tickets)`}
                  >
                    <div className="min-h-[2px] w-full rounded-t bg-[#05EB54]/80" style={{ height: `${(r.revenue_cents / maxRev) * 100}%` }} />
                    {analytics.revenue_trend.length <= 20 && (
                      <span className="w-full truncate text-center text-[9px] text-neutral-400 dark:text-neutral-500">
                        {new Date(r.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    )}
                  </div>
                ))
              })()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* calendar */}
      <LineSkipCalendar
        lineSkip={lineSkip}
        venueId={(lineSkip as { venue_id?: number | null }).venue_id ?? null}
        instances={lineSkip.instances ?? []}
        canEdit={canEdit}
        canViewAnalytics={canViewAnalytics}
        onCloseNight={openCancel}
        onChanged={() => { fetchLineSkip(); fetchAnalytics() }}
      />

      {/* deactivate confirm */}
      <Dialog open={showDeactivateConfirm} onOpenChange={(o) => !o && setShowDeactivateConfirm(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Turn off this line skip?</DialogTitle>
            <DialogDescription>
              This stops {lineSkip.name} from running and closes any future nights with no paid tickets.
            </DialogDescription>
          </DialogHeader>
          <p className="text-xs text-neutral-400 dark:text-neutral-500">
            To turn off a line skip that has paid future tickets, close those nights individually first. Each individual cancellation goes through our refund policy.
          </p>
          {deactivateError && (
            <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-3 py-2">
              <p className="text-xs font-medium text-red-700 dark:text-red-400">{deactivateError.message}</p>
              {deactivateError.blockingTicketCount !== undefined && deactivateError.blockingInstanceIds && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {deactivateError.blockingTicketCount} paid ticket{deactivateError.blockingTicketCount === 1 ? "" : "s"} across{" "}
                  {deactivateError.blockingInstanceIds.length} night{deactivateError.blockingInstanceIds.length === 1 ? "" : "s"}.
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary" disabled={deactivating}>Cancel</Button>
            </DialogClose>
            <Button variant="danger" onClick={handleDeactivate} disabled={deactivating}>
              {deactivating && <Loader2 className="size-4 animate-spin" />}
              Turn it off
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* cancel-night modal */}
      <LineSkipInstanceModal
        open={modalOpen}
        mode="cancel"
        instance={selectedInstance}
        onClose={() => setModalOpen(false)}
        onUpdated={fetchLineSkip}
      />
    </>
  )
}
