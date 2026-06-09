"use client"

import { useState, useEffect, useCallback, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, BarChart3, Loader2, Pencil } from "lucide-react"
import { apiClient, ApiError } from "@/lib/business/api-client"
import { useAuth } from "@/lib/business/auth-context"
import { cn, money } from "@/lib/v2/utils"
import type { LineSkipDetail, LineSkipInstance, LineSkipAggregateAnalytics } from "@/lib/business/types"
import { PageHeader } from "@/components/business/v2/PageHeader"
import { Card, CardContent } from "@/components/business/v2/ui/card"
import { Badge } from "@/components/business/v2/ui/badge"
import { Button } from "@/components/business/v2/ui/button"
import { Skeleton } from "@/components/business/v2/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/business/v2/ui/tabs"
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, DialogClose,
} from "@/components/business/v2/ui/dialog"
import LineSkipInstanceModal from "@/components/business/v2/line-skips/LineSkipInstanceModal"

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function formatDays(days: number[]): string {
  return days.slice().sort((a, b) => a - b).map((d) => DAY_LABELS[d]).join(", ")
}
function formatDate(s: string): string {
  return new Date(s + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })
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
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-0.5 text-lg font-semibold text-neutral-900">{value}</p>
      {sub && <p className="text-xs text-neutral-400">{sub}</p>}
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
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming")
  const [analytics, setAnalytics] = useState<LineSkipAggregateAnalytics | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [selectedInstance, setSelectedInstance] = useState<LineSkipInstance | null>(null)

  const [deactivating, setDeactivating] = useState(false)
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false)
  const [deactivateError, setDeactivateError] = useState<{ message: string; blockingTicketCount?: number; blockingInstanceIds?: number[] } | null>(null)

  const canEdit = user?.business_role === "owner" || user?.business_role === "manager"
  const canEditPrice = canEdit || user?.business_role === "staff"
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
      router.push("/business/v2/line-skips")
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

  const upcomingInstances = lineSkip?.instances?.filter((i) => isUpcoming(i.date)).sort((a, b) => a.date.localeCompare(b.date)) ?? []
  const pastInstances = lineSkip?.instances?.filter((i) => !isUpcoming(i.date)).sort((a, b) => b.date.localeCompare(a.date)) ?? []
  const displayedInstances = tab === "upcoming" ? upcomingInstances : pastInstances

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
        <p className="mb-4 text-sm text-red-500">{error || "Line skip not found"}</p>
        <Button variant="link" asChild>
          <Link href="/business/v2/line-skips">Back to line skips</Link>
        </Button>
      </div>
    )
  }

  return (
    <>
      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link href="/business/v2/line-skips" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-neutral-500 hover:text-neutral-900">
            <ArrowLeft className="size-4" /> Back to line skips
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900">{lineSkip.name}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[13px] text-neutral-500">
            <Badge variant={lineSkip.is_active ? "success" : "neutral"}>{lineSkip.is_active ? "Active" : "Inactive"}</Badge>
            <span>{formatDays(lineSkip.days_of_week)}</span>
            <span className="text-neutral-300">·</span>
            <span>{formatDateRange(lineSkip.date_range_start, lineSkip.date_range_end)}</span>
          </div>
          {lineSkip.description && <p className="mt-2 text-sm text-neutral-500">{lineSkip.description}</p>}
        </div>
        {canEdit && (
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="secondary" asChild>
              <Link href={`/business/v2/line-skips/${id}/edit`}>
                <Pencil className="size-4" /> Edit schedule
              </Link>
            </Button>
            {lineSkip.is_active && (
              <Button variant="subtle" onClick={() => { setDeactivateError(null); setShowDeactivateConfirm(true) }}>
                Deactivate
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
            <StatTile label="Line skip quantity" value={lineSkip.default_capacity ?? "Unlimited"} />
            <StatTile label="Upcoming nights" value={upcomingInstances.length} />
            <StatTile label="Time" value={`${formatTime(lineSkip.default_start_time)} – ${formatTime(lineSkip.default_end_time)}`} />
          </>
        )}
      </div>

      {/* revenue trend */}
      {analytics && analytics.revenue_trend.length > 1 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="mb-3 text-sm font-semibold text-neutral-900">Revenue trend</h3>
            <div className="flex h-32 items-end gap-1">
              {(() => {
                const maxRev = Math.max(...analytics.revenue_trend.map((r) => r.revenue_cents), 1)
                return analytics.revenue_trend.map((r) => (
                  <div
                    key={r.instance_id}
                    className="flex min-w-0 flex-1 flex-col items-center gap-1"
                    title={`${new Date(r.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}: ${money(r.revenue_cents)} (${r.tickets_sold} tickets)`}
                  >
                    <div className="min-h-[2px] w-full rounded-t bg-[#079455]/80" style={{ height: `${(r.revenue_cents / maxRev) * 100}%` }} />
                    {analytics.revenue_trend.length <= 20 && (
                      <span className="w-full truncate text-center text-[9px] text-neutral-400">
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

      {/* rolling info */}
      {lineSkip.is_active && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-2.5">
          <p className="text-xs text-blue-600">
            Upcoming nights are generated automatically on a rolling 2-week basis. New nights appear as earlier ones pass.
          </p>
        </div>
      )}

      {/* tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as "upcoming" | "past")}>
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming ({upcomingInstances.length})</TabsTrigger>
          <TabsTrigger value="past">Past ({pastInstances.length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* instances */}
      {displayedInstances.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-neutral-500">No {tab} nights.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedInstances.map((instance) => {
            const trendData = analytics?.revenue_trend.find((r) => r.instance_id === instance.id)
            const revenueCents = instance.revenue ?? trendData?.revenue_cents ?? 0
            const checkinRate = instance.checkin_rate
            const day = new Date(instance.date + "T00:00:00")

            return (
              <Card key={instance.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {/* date badge */}
                      <div className="flex min-w-[56px] flex-col items-center justify-center rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-2">
                        <span className="text-xs uppercase text-neutral-500">{day.toLocaleDateString("en-US", { weekday: "short" })}</span>
                        <span className="text-lg font-bold leading-tight text-neutral-900">{day.getDate()}</span>
                        <span className="text-xs text-neutral-400">{day.toLocaleDateString("en-US", { month: "short" })}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-neutral-900">{formatDate(instance.date)}</p>
                        <p className="mt-0.5 text-xs text-neutral-500">{formatTime(instance.start_time)} – {formatTime(instance.end_time)}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-3">
                          <span className="text-xs font-medium text-neutral-600">{money(instance.price_cents)}</span>
                          <span className="text-xs text-neutral-500">
                            {instance.capacity ? `${instance.tickets_sold} / ${instance.capacity} sold` : `${instance.tickets_sold} sold (unlimited)`}
                          </span>
                          {instance.tickets_sold > 0 && revenueCents > 0 && (
                            <span className="text-xs text-neutral-400">{money(revenueCents)} revenue</span>
                          )}
                          {checkinRate !== undefined && checkinRate > 0 && (
                            <span className="text-xs text-neutral-400">{checkinRate.toFixed(0)}% checked in</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                      <Badge
                        variant={instance.status === "active" ? "success" : instance.status === "cancelled" ? "danger" : "warning"}
                      >
                        {instance.status === "sold_out" ? "Sold out" : instance.status.charAt(0).toUpperCase() + instance.status.slice(1)}
                      </Badge>
                      {instance.cancellation_status === "pending" && <Badge variant="warning">Pending cancellation</Badge>}

                      {instance.status !== "cancelled" && (canEditPrice || canEdit) && (
                        <Button size="sm" asChild>
                          <Link href={`/business/v2/line-skips/instances/${instance.id}`}>Manage</Link>
                        </Button>
                      )}
                      {canViewAnalytics && instance.tickets_sold > 0 && (
                        <Button variant="secondary" size="sm" asChild>
                          <Link href={`/business/v2/line-skips/instances/${instance.id}?tab=analytics`}>
                            <BarChart3 className="size-3.5" /> Analytics
                          </Link>
                        </Button>
                      )}
                      {tab === "upcoming" && instance.status !== "cancelled" && instance.cancellation_status !== "pending" && canEdit && (
                        <Button variant="subtle" size="sm" onClick={() => openCancel(instance)}>
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>

                  {instance.status === "cancelled" && instance.cancellation_reason && (
                    <p className="ml-[68px] mt-2 text-xs text-red-500">Cancelled: {instance.cancellation_reason}</p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* deactivate confirm */}
      <Dialog open={showDeactivateConfirm} onOpenChange={(o) => !o && setShowDeactivateConfirm(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Deactivate this line skip?</DialogTitle>
            <DialogDescription>
              This stops new nights from being generated for {lineSkip.name} and cancels any future nights with no paid tickets.
            </DialogDescription>
          </DialogHeader>
          <p className="text-xs text-neutral-400">
            To deactivate a line skip with paid future tickets, cancel those nights individually first. Each individual cancellation goes through our refund policy.
          </p>
          {deactivateError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
              <p className="text-xs font-medium text-red-700">{deactivateError.message}</p>
              {deactivateError.blockingTicketCount !== undefined && deactivateError.blockingInstanceIds && (
                <p className="mt-1 text-xs text-red-600">
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
              Deactivate
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
