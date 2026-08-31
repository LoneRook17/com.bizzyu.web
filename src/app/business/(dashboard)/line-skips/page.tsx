"use client"

import { useState, useEffect, useCallback } from "react"
import { ChevronRight, MapPin, Loader2 } from "lucide-react"
import { useAuth } from "@/lib/business/auth-context"
import { useVenue } from "@/lib/business/venue-context"
import { apiClient, ApiError } from "@/lib/business/api-client"
import { money } from "@/lib/v2/utils"
import type { LineSkipDetail, LineSkipInstance, LineSkipAggregateAnalytics } from "@/lib/business/types"
import { PageHeader } from "@/components/business/v2/PageHeader"
import { Skeleton } from "@/components/business/v2/ui/skeleton"
import { Card, CardContent } from "@/components/business/v2/ui/card"
import { Button } from "@/components/business/v2/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, DialogClose,
} from "@/components/business/v2/ui/dialog"
import LineSkipCalendar from "@/components/business/v2/line-skips/LineSkipCalendar"
import LineSkipInstanceModal from "@/components/business/v2/line-skips/LineSkipInstanceModal"

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function StatTile({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className="mt-0.5 text-lg font-semibold text-neutral-900 dark:text-neutral-100">{value}</p>
      {sub && <p className="text-xs text-neutral-400 dark:text-neutral-500">{sub}</p>}
    </Card>
  )
}

export default function LineSkipsPage() {
  const { user } = useAuth()
  const { venues, selectedVenue, setSelectedVenue } = useVenue()

  const [program, setProgram] = useState<LineSkipDetail | null>(null)
  const [instances, setInstances] = useState<LineSkipInstance[]>([])
  const [analytics, setAnalytics] = useState<LineSkipAggregateAnalytics | null>(null)
  const [loading, setLoading] = useState(true)

  const [modalOpen, setModalOpen] = useState(false)
  const [selectedInstance, setSelectedInstance] = useState<LineSkipInstance | null>(null)

  const [deactivating, setDeactivating] = useState(false)
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false)
  const [deactivateError, setDeactivateError] = useState<{ message: string; blockingTicketCount?: number; blockingInstanceIds?: number[] } | null>(null)

  const canEdit = user?.business_role === "owner" || user?.business_role === "manager"
  const canViewAnalytics = canEdit

  // The calendar is per-venue. Use the selected venue, or the only venue.
  const venueId = selectedVenue?.id ?? (venues.length === 1 ? venues[0].id : null)

  const fetchProgram = useCallback(async () => {
    if (venueId == null) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const { line_skips } = await apiClient.get<{ line_skips: Array<LineSkipDetail & { venue_id?: number | null }> }>(
        `/business/line-skips`
      )
      const active = line_skips.filter((l) => l.is_active)
      const prog =
        active.find((l) => l.venue_id === venueId) ??
        active.find((l) => l.venue_id == null) ??
        null
      if (prog) {
        const detail = await apiClient.get<{ line_skip: LineSkipDetail; instances: LineSkipInstance[] }>(
          `/business/line-skips/${prog.id}`
        )
        setProgram(detail.line_skip)
        setInstances(detail.instances ?? [])
        if (canViewAnalytics) {
          try {
            const a = await apiClient.get<LineSkipAggregateAnalytics>(`/business/line-skips/${prog.id}/analytics`)
            setAnalytics(a)
          } catch {
            setAnalytics(null)
          }
        }
      } else {
        setProgram(null)
        setInstances([])
        setAnalytics(null)
      }
    } catch {
      setProgram(null)
      setInstances([])
      setAnalytics(null)
    } finally {
      setLoading(false)
    }
  }, [venueId, canViewAnalytics])

  useEffect(() => {
    fetchProgram()
  }, [fetchProgram])

  const openCancel = (i: LineSkipInstance) => {
    setSelectedInstance(i)
    setModalOpen(true)
  }

  const handleDeactivate = async () => {
    if (!program) return
    setDeactivating(true)
    setDeactivateError(null)
    try {
      await apiClient.delete(`/business/line-skips/${program.id}`)
      setShowDeactivateConfirm(false)
      fetchProgram()
    } catch (err) {
      if (err instanceof ApiError) {
        const body = err.body as { blocking_instance_ids?: number[]; blocking_ticket_count?: number }
        setDeactivateError({
          message: err.message,
          blockingTicketCount: body?.blocking_ticket_count,
          blockingInstanceIds: body?.blocking_instance_ids,
        })
      } else {
        setDeactivateError({ message: "Failed to turn off line skip" })
      }
    } finally {
      setDeactivating(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Line skips"
        description="Let customers skip the line and pay cover in advance."
        actions={
          canEdit && program?.is_active ? (
            <Button variant="subtle" onClick={() => { setDeactivateError(null); setShowDeactivateConfirm(true) }}>
              Turn off line skip
            </Button>
          ) : undefined
        }
      />

      {/* Venue picker when there's more than one and none is selected */}
      {venueId == null ? (
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-5">
          <p className="mb-3 text-sm text-neutral-600 dark:text-neutral-400">Pick a venue to manage its line skips:</p>
          <div className="space-y-2">
            {venues.map((v) => (
              <button
                key={v.id}
                onClick={() => setSelectedVenue(v.id)}
                className="flex w-full items-center justify-between rounded-lg border border-neutral-200 dark:border-neutral-800 px-4 py-3 text-left text-sm font-medium text-neutral-800 dark:text-neutral-200 transition-colors hover:border-[#05EB54]/40 hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
              >
                <span className="inline-flex items-center gap-2"><MapPin className="size-4 text-neutral-400" /> {v.name}</span>
                <ChevronRight className="size-4 text-neutral-300 dark:text-neutral-600" />
              </button>
            ))}
          </div>
        </div>
      ) : loading ? (
        <div className="space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      ) : (
        <>
          <LineSkipCalendar
            lineSkip={program}
            venueId={venueId}
            instances={instances}
            canEdit={canEdit}
            canViewAnalytics={canViewAnalytics}
            onCloseNight={openCancel}
            onChanged={fetchProgram}
          />

          {/* Performance - below the calendar */}
          {program && canViewAnalytics && analytics && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatTile label="Total revenue" value={money(analytics.total_revenue_cents)} />
                <StatTile label="Total tickets sold" value={analytics.total_tickets_sold} />
                <StatTile label="Avg per night" value={`${analytics.avg_tickets_per_night} tickets`} sub={`${money(analytics.avg_revenue_per_night_cents)} rev`} />
                <StatTile
                  label="Busiest day"
                  value={analytics.busiest_day ? DAY_LABELS[analytics.busiest_day.day_of_week] : "-"}
                  sub={analytics.busiest_day ? `${analytics.busiest_day.avg_tickets} avg tickets` : undefined}
                />
              </div>

              {analytics.revenue_trend.length > 1 && (
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
            </>
          )}
        </>
      )}

      {/* turn-off confirm */}
      <Dialog open={showDeactivateConfirm} onOpenChange={(o) => !o && setShowDeactivateConfirm(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Turn off this line skip?</DialogTitle>
            <DialogDescription>
              This stops {program?.name ?? "the line skip"} from running and closes any future nights with no paid tickets.
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

      <LineSkipInstanceModal
        open={modalOpen}
        mode="cancel"
        instance={selectedInstance}
        onClose={() => setModalOpen(false)}
        onUpdated={fetchProgram}
      />
    </>
  )
}
