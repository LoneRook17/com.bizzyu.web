"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn, money } from "@/lib/v2/utils"
import type { LineSkipDetail, LineSkipInstance } from "@/lib/business/types"
import { Button } from "@/components/business/v2/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/business/v2/ui/dialog"

// Calendar columns are Monday-first to match the create form's day pills.
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

function ymd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}
function fmtTime(s: string): string {
  const [h, m] = s.split(":")
  const hh = parseInt(h)
  const ap = hh >= 12 ? "PM" : "AM"
  const h12 = hh === 0 ? 12 : hh > 12 ? hh - 12 : hh
  return `${h12}:${m} ${ap}`
}
function longDate(ds: string): string {
  return new Date(ds + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
}

interface Props {
  lineSkip: LineSkipDetail
  instances: LineSkipInstance[]
  canEdit: boolean
  canViewAnalytics: boolean
  onCloseNight: (i: LineSkipInstance) => void
}

type Selected = { date: string; instance: LineSkipInstance | null; runsByRule: boolean }

export default function LineSkipCalendar({ lineSkip, instances, canEdit, canViewAnalytics, onCloseNight }: Props) {
  const [anchor, setAnchor] = useState(() => {
    const d = new Date()
    d.setDate(1)
    d.setHours(0, 0, 0, 0)
    return d
  })
  const [selected, setSelected] = useState<Selected | null>(null)

  const todayStr = ymd(new Date())
  const byDate = useMemo(() => {
    const m: Record<string, LineSkipInstance> = {}
    for (const i of instances) m[i.date] = i
    return m
  }, [instances])

  const ruleDays = useMemo(() => new Set(lineSkip.days_of_week), [lineSkip.days_of_week])
  const inRange = (ds: string) => ds >= lineSkip.date_range_start && ds <= lineSkip.date_range_end

  const year = anchor.getFullYear()
  const month = anchor.getMonth()
  const monthLabel = anchor.toLocaleDateString("en-US", { month: "long", year: "numeric" })

  const firstDow = new Date(year, month, 1).getDay() // 0=Sun
  const leadBlanks = (firstDow + 6) % 7 // shift to Monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: ({ date: string; day: number } | null)[] = []
  for (let i = 0; i < leadBlanks; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push({ date: ymd(new Date(year, month, d)), day: d })

  function info(ds: string) {
    const inst = byDate[ds] || null
    const dow = new Date(ds + "T12:00:00Z").getUTCDay()
    const runsByRule = !!lineSkip.is_active && inRange(ds) && ruleDays.has(dow)
    return { inst, runsByRule }
  }

  const limitLabel = lineSkip.default_capacity ? `limit ${lineSkip.default_capacity}` : "no limit"

  return (
    <div className="space-y-3">
      {/* "Your usual" bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 px-4 py-2.5">
        <p className="text-sm text-neutral-700 dark:text-neutral-300">
          <span className="font-medium text-neutral-900 dark:text-neutral-100">Your usual:</span>{" "}
          {lineSkip.days_of_week.length
            ? lineSkip.days_of_week.slice().sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((d) => WEEKDAYS[(d + 6) % 7]).join(", ")
            : "no nights set"}{" "}
          · {money(lineSkip.default_price_cents)} · {limitLabel} · {fmtTime(lineSkip.default_start_time)}–{fmtTime(lineSkip.default_end_time)}
        </p>
        {canEdit && (
          <Button variant="secondary" size="sm" asChild>
            <Link href={`/business/line-skips/${lineSkip.id}/edit`}>Edit usual</Link>
          </Button>
        )}
      </div>

      {/* Month nav */}
      <div className="flex items-center justify-between px-1">
        <button
          type="button"
          onClick={() => setAnchor(new Date(year, month - 1, 1))}
          className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          aria-label="Previous month"
        >
          <ChevronLeft className="size-5" />
        </button>
        <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{monthLabel}</span>
        <button
          type="button"
          onClick={() => setAnchor(new Date(year, month + 1, 1))}
          className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          aria-label="Next month"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((w) => (
          <div key={w} className="pb-1 text-center text-[11px] font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
            {w}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((c, idx) => {
          if (!c) return <div key={idx} className="aspect-square sm:aspect-[4/3]" />
          const { inst, runsByRule } = info(c.date)
          const isPast = c.date < todayStr
          const cancelled = inst?.status === "cancelled"
          const soldOut = inst?.status === "sold_out"
          const running = (inst && !cancelled) || (!inst && runsByRule)
          const price = inst ? inst.price_cents : lineSkip.default_price_cents
          const priceOverridden = !!inst && inst.price_cents !== lineSkip.default_price_cents
          const cap = inst ? inst.capacity : lineSkip.default_capacity
          const sold = inst ? inst.tickets_sold : 0
          const clickable = !!inst || (runsByRule && !isPast)

          return (
            <button
              key={idx}
              type="button"
              disabled={!clickable}
              onClick={() => clickable && setSelected({ date: c.date, instance: inst, runsByRule })}
              className={cn(
                "flex aspect-square sm:aspect-[4/3] flex-col items-start gap-0.5 rounded-lg border p-1.5 text-left transition-colors",
                clickable ? "cursor-pointer" : "cursor-default",
                isPast && "opacity-50",
                cancelled
                  ? "border-red-200 dark:border-red-900/60 bg-red-50/60 dark:bg-red-950/30"
                  : soldOut
                    ? "border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30"
                    : running
                      ? "border-[#05EB54]/40 bg-[#05EB54]/10 hover:bg-[#05EB54]/20 dark:bg-[#05EB54]/10"
                      : "border-neutral-100 dark:border-neutral-800/60 bg-transparent"
              )}
            >
              <span className={cn("text-[11px] font-semibold", running || cancelled ? "text-neutral-900 dark:text-neutral-100" : "text-neutral-400 dark:text-neutral-600")}>
                {c.day}
              </span>
              {cancelled ? (
                <span className="text-[10px] font-medium text-red-500 dark:text-red-400">Closed</span>
              ) : running ? (
                <>
                  <span className="text-[11px] font-semibold leading-none text-neutral-800 dark:text-neutral-200">
                    {money(price)}{priceOverridden ? "*" : ""}
                  </span>
                  {inst ? (
                    <span className={cn("text-[10px] leading-none", soldOut ? "text-amber-600 dark:text-amber-400" : "text-neutral-500 dark:text-neutral-400")}>
                      {cap ? `${sold}/${cap}` : `${sold} sold`}
                    </span>
                  ) : (
                    <span className="text-[10px] leading-none text-neutral-400 dark:text-neutral-500">usual</span>
                  )}
                </>
              ) : null}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[11px] text-neutral-500 dark:text-neutral-400">
        <span className="inline-flex items-center gap-1"><span className="size-2.5 rounded-sm bg-[#05EB54]/40" /> Running</span>
        <span className="inline-flex items-center gap-1"><span className="size-2.5 rounded-sm bg-amber-300" /> Sold out</span>
        <span className="inline-flex items-center gap-1"><span className="size-2.5 rounded-sm bg-red-300" /> Closed</span>
        <span>* = custom price for that night</span>
      </div>

      {/* Night action dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-sm">
          {selected && (() => {
            const inst = selected.instance
            const isPast = selected.date < todayStr
            const cap = inst ? inst.capacity : lineSkip.default_capacity
            const price = inst ? inst.price_cents : lineSkip.default_price_cents
            return (
              <>
                <DialogHeader>
                  <DialogTitle>{longDate(selected.date)}</DialogTitle>
                  <DialogDescription>
                    {inst
                      ? inst.status === "cancelled"
                        ? `Closed${inst.cancellation_reason ? ` — ${inst.cancellation_reason}` : ""}`
                        : `${money(price)} · ${cap ? `${inst.tickets_sold}/${cap} sold` : `${inst.tickets_sold} sold`} · ${fmtTime(inst.start_time)}–${fmtTime(inst.end_time)}`
                      : `Runs your usual — ${money(price)}${cap ? ` · limit ${cap}` : ""}`}
                  </DialogDescription>
                </DialogHeader>

                {!inst && (
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    This night follows your usual schedule. Per-night controls (custom price, limit, closing it) unlock closer to the date. To change the pattern or default price, use <span className="font-medium">Edit usual</span>.
                  </p>
                )}

                <DialogFooter className="flex-col gap-2 sm:flex-col sm:gap-2">
                  {inst && (canEdit || canViewAnalytics) && (
                    <Button asChild className="w-full">
                      <Link href={`/business/line-skips/instances/${inst.id}`}>Manage this night</Link>
                    </Button>
                  )}
                  {inst && !isPast && inst.status !== "cancelled" && inst.cancellation_status !== "pending" && canEdit && (
                    <Button
                      variant="subtle"
                      className="w-full"
                      onClick={() => { onCloseNight(inst); setSelected(null) }}
                    >
                      Close this night
                    </Button>
                  )}
                  {!inst && canEdit && (
                    <Button variant="secondary" asChild className="w-full">
                      <Link href={`/business/line-skips/${lineSkip.id}/edit`}>Edit usual</Link>
                    </Button>
                  )}
                  <DialogClose asChild>
                    <Button variant="ghost" className="w-full">Close</Button>
                  </DialogClose>
                </DialogFooter>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}
