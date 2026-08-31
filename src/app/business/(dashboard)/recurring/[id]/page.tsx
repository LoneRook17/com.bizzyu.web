"use client"

import { useCallback, useEffect, useMemo, useState, use } from "react"
import Link from "next/link"
import {
  ArrowLeft, CalendarOff, CheckCircle2, ChevronRight, MapPin, PauseCircle, Pencil, Repeat, TriangleAlert,
} from "lucide-react"
import { useAuth } from "@/lib/business/auth-context"
import { apiClient, ApiError } from "@/lib/business/api-client"
import type {
  RecurringGenerationSummary, RecurringOccurrence, RecurringSeriesDetail,
} from "@/lib/business/types"
import { Badge } from "@/components/business/v2/ui/badge"
import { Button } from "@/components/business/v2/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/business/v2/ui/card"
import { EmptyState } from "@/components/business/v2/ui/empty-state"
import { Skeleton } from "@/components/business/v2/ui/skeleton"
import { HOST_CUSTOM_CHIP_LABEL, isHostCustomNight } from "@/lib/business/host-custom-night"
import { eventStatusBadge, fmtTime } from "@/components/business/v2/events/eventStatus"
import { WeekdayChips } from "@/components/business/v2/recurring/WeekdayChips"
import {
  fmtDateOnly, fmtDateOnlyLong, fmtTimeOfDay, scheduleSentence,
} from "@/components/business/v2/recurring/schedule"
import { SuspendSeriesDialog } from "@/components/business/v2/recurring/SuspendSeriesDialog"

/** The create flow stashes its generation result here (see SeriesForm). */
function readCreationReport(seriesId: string): { generation: RecurringGenerationSummary | null; error: string | null } | null {
  try {
    const key = `bizzy:series-created:${seriesId}`
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    sessionStorage.removeItem(key)
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export default function RecurringSeriesDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user } = useAuth()

  const [series, setSeries] = useState<RecurringSeriesDetail | null>(null)
  const [occurrences, setOccurrences] = useState<RecurringOccurrence[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [suspendOpen, setSuspendOpen] = useState(false)
  const [creationBanner, setCreationBanner] = useState<{ generation: RecurringGenerationSummary | null; error: string | null } | null>(null)

  const canEdit = user?.business_role === "owner" || user?.business_role === "manager"

  const fetchSeries = useCallback(async () => {
    try {
      const data = await apiClient.get<{ series: RecurringSeriesDetail; occurrences: RecurringOccurrence[] }>(
        `/business/recurring-series/${id}`
      )
      setSeries(data.series)
      setOccurrences(data.occurrences ?? [])
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load the series")
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchSeries() }, [fetchSeries])
  useEffect(() => {
    // Only set when present: the stash is consumed on read, so a second effect
    // run (dev StrictMode) must not overwrite the banner with null.
    const report = readCreationReport(id)
    if (report) setCreationBanner(report)
  }, [id])

  const todayStr = new Date().toLocaleDateString("en-CA")
  const upcoming = useMemo(
    () => occurrences.filter((o) => o.occurrence_date.slice(0, 10) >= todayStr),
    [occurrences, todayStr]
  )
  const past = useMemo(
    () => occurrences.filter((o) => o.occurrence_date.slice(0, 10) < todayStr).reverse(),
    [occurrences, todayStr]
  )

  const dateByEventId = useMemo(() => {
    const map: Record<number, string> = {}
    for (const o of occurrences) map[o.event_id] = fmtDateOnlyLong(o.occurrence_date)
    return map
  }, [occurrences])

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  if (error || !series) {
    return (
      <EmptyState
        icon={CalendarOff}
        title={error || "Series not found"}
        action={<Button asChild variant="secondary"><Link href="/business/recurring">Back to recurring</Link></Button>}
      />
    )
  }

  const active = !!series.is_active

  return (
    <>
      <Link
        href="/business/recurring"
        className="inline-flex w-fit items-center gap-1.5 text-[13px] font-medium text-neutral-500 dark:text-neutral-400 transition-colors hover:text-neutral-900 dark:hover:text-neutral-100"
      >
        <ArrowLeft className="size-3.5" /> Back to recurring
      </Link>

      {/* Fresh-off-the-create-form banner: how the first generation went. */}
      {creationBanner && (
        creationBanner.error || !creationBanner.generation ? (
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900 dark:bg-amber-950/40">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-sm text-amber-800 dark:text-amber-300">
              <span className="font-semibold">Series created. Nights are on the way.</span> The first nights
              couldn&apos;t be scheduled just now; they&apos;ll be created automatically soon and show up below.
            </p>
          </div>
        ) : (
          <div className="flex items-start gap-2.5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 dark:border-green-900 dark:bg-green-950/40">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green-600 dark:text-green-400" />
            <p className="text-sm text-green-800 dark:text-green-300">
              <span className="font-semibold">Series created.</span>{" "}
              {creationBanner.generation.stamped.length > 0
                ? `${creationBanner.generation.stamped.length} night${creationBanner.generation.stamped.length === 1 ? "" : "s"} scheduled. Each one is a normal event you can open below.`
                : "Upcoming nights will appear below as they're scheduled."}
            </p>
          </div>
        )
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">{series.name}</h1>
            <Badge variant={active ? "success" : "neutral"}>{active ? "Active" : "Suspended"}</Badge>
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-neutral-600 dark:text-neutral-400">
            <span className="inline-flex items-center gap-1.5">
              <Repeat className="size-3.5" />
              {scheduleSentence(series.days_of_week)} · {fmtTimeOfDay(series.start_time)} - {fmtTimeOfDay(series.end_time)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-3.5" /> {series.venue_name}
            </span>
          </p>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Runs from {fmtDateOnly(series.date_range_start)}
            {series.date_range_end ? ` until ${fmtDateOnly(series.date_range_end)}` : " until you suspend it"}
          </p>
          <div className="mt-2"><WeekdayChips days={series.days_of_week} /></div>
        </div>

        {canEdit && active && (
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="subtle" onClick={() => setSuspendOpen(true)}>
              <PauseCircle className="size-4" /> Suspend series
            </Button>
            <Button asChild>
              <Link href={`/business/recurring/${series.id}/edit`}><Pencil className="size-4" /> Edit the series</Link>
            </Button>
          </div>
        )}
      </div>

      {!active && (
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-400">
          This series is suspended. No new nights are being scheduled. Nights that stayed live below can still be
          managed from their event pages.
        </div>
      )}

      {/* Decision-2 explainer: the one rule of recurring events, in plain words. */}
      <div className="rounded-xl border border-blue-100 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 px-4 py-3 text-sm text-blue-700 dark:text-blue-400">
        <p className="font-semibold">Every night below is its own event.</p>
        <p className="mt-1">
          <strong>Want to change one night?</strong> Open it. You&apos;ll edit it like any normal event, and your
          changes never touch the series. <strong>Want to change every future night?</strong> Use{" "}
          <em>Edit the series</em>. It updates future nights that haven&apos;t been customized, and nights
          you&apos;ve edited individually keep their changes.
        </p>
      </div>

      {/* Upcoming nights */}
      <Card>
        <CardHeader><CardTitle>Upcoming nights</CardTitle></CardHeader>
        <CardContent className="pt-0">
          {upcoming.length === 0 ? (
            <p className="py-4 text-sm text-neutral-500 dark:text-neutral-400">
              {active
                ? "No upcoming nights yet. They're created automatically a few weeks ahead."
                : "No upcoming nights. The series is suspended."}
            </p>
          ) : (
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {upcoming.map((o) => <OccurrenceRow key={o.event_id} occurrence={o} seriesId={series.id} />)}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past nights */}
      {past.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Past nights</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {past.map((o) => <OccurrenceRow key={o.event_id} occurrence={o} seriesId={series.id} past />)}
            </div>
          </CardContent>
        </Card>
      )}

      <SuspendSeriesDialog
        open={suspendOpen}
        seriesId={series.id}
        seriesName={series.name}
        dateByEventId={dateByEventId}
        onClose={() => setSuspendOpen(false)}
        onSuspended={fetchSeries}
      />
    </>
  )
}

function OccurrenceRow({
  occurrence: o,
  seriesId,
  past = false,
}: {
  occurrence: RecurringOccurrence
  seriesId: number
  past?: boolean
}) {
  const status = eventStatusBadge(o.status)
  const custom = isHostCustomNight({
    product_kind: "event",
    recurring_series_id: seriesId,
    is_customized: o.is_customized,
    series_customized_at: (o as { series_customized_at?: string | null }).series_customized_at,
    override_scope: (o as { override_scope?: string | null }).override_scope,
  })
  return (
    <Link
      href={`/business/events/${o.event_id}`}
      className={cnRow(past)}
      title="Open this night. Edits there apply to this night only and never touch the series"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
            {fmtDateOnlyLong(o.occurrence_date)}
          </span>
          <Badge variant={status.variant} size="sm">{status.label}</Badge>
          {custom && (
            <Badge
              variant="custom"
              size="sm"
              title="You edited this night directly. Series edits leave it alone"
            >
              {HOST_CUSTOM_CHIP_LABEL}
            </Badge>
          )}
        </div>
        <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
          {fmtTime(o.start_date_time)} · {o.tickets_sold} ticket{o.tickets_sold === 1 ? "" : "s"} sold
        </p>
      </div>
      <span className="hidden shrink-0 text-xs font-medium text-neutral-400 dark:text-neutral-500 sm:inline">
        Edit this night only
      </span>
      <ChevronRight className="size-4 shrink-0 text-neutral-300 dark:text-neutral-600" />
    </Link>
  )
}

function cnRow(past: boolean) {
  return [
    "flex items-center gap-3 py-3 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/40 -mx-2 px-2 rounded-lg",
    past ? "opacity-70" : "",
  ].join(" ")
}
