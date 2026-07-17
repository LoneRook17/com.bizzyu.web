"use client"

// Per-deal impressions → views → claims funnel + daily chart + range picker.
// Split into a presentational view (DealFunnelView, pure props) and a fetch
// container (DealFunnel) that reads the DI-B3s aggregates through the typed
// client (@/lib/business/deal-stats). Degrades to the locked zero-state copy
// when the endpoint isn't deployed (404) or no tracking data exists yet —
// never an error wall for that case.

import { useCallback, useEffect, useState } from "react"
import { cn } from "@/lib/v2/utils"
import { Card, CardContent } from "@/components/business/v2/ui/card"
import { Skeleton } from "@/components/business/v2/ui/skeleton"
import { nf } from "@/components/business/dashboard/DealStatColumn"
import {
  fetchDealStats,
  fetchDealDailyStats,
  indexStatsByDeal,
  emptyStatRow,
  computeFunnel,
  formatRate,
  rangeForDays,
  RANGE_PRESETS,
  DEFAULT_RANGE_DAYS,
  TRACKING_ZERO_STATE_COPY,
  type Funnel,
  type DealDailyStat,
} from "@/lib/business/deal-stats"

function RangePicker({
  value,
  onChange,
  disabled,
}: {
  value: number
  onChange: (days: number) => void
  disabled?: boolean
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-neutral-50 p-0.5 dark:border-neutral-800 dark:bg-neutral-900">
      {RANGE_PRESETS.map((p) => (
        <button
          key={p.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(p.value)}
          aria-pressed={value === p.value}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50",
            value === p.value
              ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-neutral-100"
              : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200",
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}

/** One row of the 3-stage funnel: a proportional bar + count + unique sub-text. */
function FunnelStage({
  label,
  count,
  unique,
  widthPct,
  tone,
}: {
  label: string
  count: number
  unique?: number
  widthPct: number
  tone: "impressions" | "views" | "claims"
}) {
  const barColor =
    tone === "impressions"
      ? "bg-[#05EB54]/30"
      : tone === "views"
        ? "bg-[#05EB54]/55"
        : "bg-[#05EB54]"
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</span>
        <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          {nf(count)}
          {unique !== undefined && (
            <span className="ml-1.5 text-xs font-normal text-neutral-400 dark:text-neutral-500">
              {nf(unique)} unique
            </span>
          )}
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
        <div
          className={cn("h-full rounded-full transition-all", barColor)}
          style={{ width: `${Math.max(widthPct, count > 0 ? 4 : 0)}%` }}
        />
      </div>
    </div>
  )
}

function DailyChart({ days }: { days: DealDailyStat[] }) {
  const withActivity = days.some((d) => d.impressions > 0 || d.views > 0)
  if (days.length === 0 || !withActivity) {
    return (
      <p className="py-6 text-center text-sm text-neutral-400 dark:text-neutral-500">
        No daily activity in this range yet.
      </p>
    )
  }
  const maxImp = Math.max(...days.map((d) => d.impressions), 1)
  return (
    <div>
      <div className="flex h-28 items-end gap-px overflow-hidden">
        {days.map((d) => {
          const impH = (d.impressions / maxImp) * 100
          // views render as the filled base of the impressions bar (views ≤ impressions).
          const viewsPctOfBar = d.impressions > 0 ? (d.views / d.impressions) * 100 : 0
          return (
            <div
              key={d.date}
              className="flex h-full min-w-0 flex-1 items-end"
              title={`${d.date}: ${nf(d.impressions)} impressions · ${nf(d.views)} views · ${nf(d.claims)} claims`}
            >
              <div
                className="relative w-full rounded-t bg-[#05EB54]/25"
                style={{ height: `${Math.max(impH, d.impressions > 0 ? 2 : 0)}%` }}
              >
                <div
                  className="absolute bottom-0 w-full rounded-t bg-[#05EB54]/70"
                  style={{ height: `${viewsPctOfBar}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[11px] text-neutral-400 dark:text-neutral-500">{days[0]?.date}</span>
        <div className="flex items-center gap-3 text-[11px] text-neutral-500 dark:text-neutral-400">
          <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-[#05EB54]/25" /> Impressions</span>
          <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-[#05EB54]/70" /> Views</span>
        </div>
        <span className="text-[11px] text-neutral-400 dark:text-neutral-500">{days[days.length - 1]?.date}</span>
      </div>
    </div>
  )
}

function ZeroState() {
  return (
    <div className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50/60 px-5 py-8 text-center dark:border-neutral-800 dark:bg-neutral-900/40">
      <p className="mx-auto max-w-md text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
        {TRACKING_ZERO_STATE_COPY}
      </p>
    </div>
  )
}

// ── Presentational view (pure props — no data fetching) ─────────────────────
export function DealFunnelView({
  funnel,
  days,
  rangeDays,
  onRangeChange,
  loading = false,
  error = false,
  unavailable = false,
  onRetry,
}: {
  funnel: Funnel | null
  days: DealDailyStat[]
  rangeDays: number
  onRangeChange: (days: number) => void
  loading?: boolean
  error?: boolean
  unavailable?: boolean
  onRetry?: () => void
}) {
  const showZeroState = unavailable || (funnel !== null && !funnel.hasTrackingData)

  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Engagement funnel</h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Impressions → views → claims</p>
          </div>
          <RangePicker value={rangeDays} onChange={onRangeChange} disabled={loading} />
        </div>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-2.5 rounded-full" />
            <Skeleton className="h-2.5 w-2/3 rounded-full" />
            <Skeleton className="h-2.5 w-1/3 rounded-full" />
            <Skeleton className="mt-4 h-28 rounded-lg" />
          </div>
        ) : error ? (
          <div className="py-6 text-center">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Couldn&apos;t load engagement stats.{" "}
              {onRetry && (
                <button onClick={onRetry} className="font-medium text-[#05EB54] hover:underline">
                  Retry
                </button>
              )}
            </p>
          </div>
        ) : showZeroState ? (
          <ZeroState />
        ) : funnel ? (
          <>
            <div className="space-y-4">
              <FunnelStage
                label="Impressions"
                count={funnel.impressions}
                unique={funnel.uniqueImpressions}
                widthPct={100}
                tone="impressions"
              />
              <div className="pl-1 text-xs text-neutral-400 dark:text-neutral-500">
                {formatRate(funnel.viewRate)} viewed
              </div>
              <FunnelStage
                label="Views"
                count={funnel.views}
                unique={funnel.uniqueViews}
                widthPct={funnel.impressions > 0 ? (funnel.views / funnel.impressions) * 100 : 0}
                tone="views"
              />
              <div className="pl-1 text-xs text-neutral-400 dark:text-neutral-500">
                {formatRate(funnel.claimRate)} claimed
              </div>
              <FunnelStage
                label="Claims"
                count={funnel.claims}
                widthPct={funnel.impressions > 0 ? (funnel.claims / funnel.impressions) * 100 : 0}
                tone="claims"
              />
            </div>
            <div className="mt-6 border-t border-neutral-100 pt-5 dark:border-neutral-800">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                Daily trend
              </h3>
              <DailyChart days={days} />
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}

// ── Fetch container ─────────────────────────────────────────────────────────
export function DealFunnel({ dealId }: { dealId: number }) {
  const [rangeDays, setRangeDays] = useState(DEFAULT_RANGE_DAYS)
  const [funnel, setFunnel] = useState<Funnel | null>(null)
  const [days, setDays] = useState<DealDailyStat[]>([])
  const [loading, setLoading] = useState(true)
  const [unavailable, setUnavailable] = useState(false)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    const { from, to } = rangeForDays(rangeDays, new Date())
    try {
      const [stats, daily] = await Promise.all([
        fetchDealStats(from, to),
        fetchDealDailyStats(dealId, from, to),
      ])
      // Either endpoint 404 (not deployed) → degrade to zero-state, not an error.
      if (stats === null || daily === null) {
        setUnavailable(true)
        setFunnel(null)
        setDays([])
        return
      }
      setUnavailable(false)
      const row = indexStatsByDeal(stats).get(dealId) ?? emptyStatRow(dealId)
      setFunnel(computeFunnel(row))
      setDays(daily.days)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [dealId, rangeDays])

  useEffect(() => {
    load()
  }, [load])

  return (
    <DealFunnelView
      funnel={funnel}
      days={days}
      rangeDays={rangeDays}
      onRangeChange={setRangeDays}
      loading={loading}
      error={error}
      unavailable={unavailable}
      onRetry={load}
    />
  )
}
