"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Loader2, Plus } from "lucide-react"
import { apiClient, ApiError } from "@/lib/business/api-client"
import { cn, money } from "@/lib/v2/utils"
import type { LineSkipDetail, LineSkipInstance } from "@/lib/business/types"
import { Button } from "@/components/business/v2/ui/button"
import { Input } from "@/components/business/v2/ui/input"
import { Label } from "@/components/business/v2/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/business/v2/ui/dialog"

// Calendar columns are Monday-first to match the rest of the dashboard.
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const WEEKDAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

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
function weekdayOf(ds: string): number {
  return new Date(ds + "T12:00:00Z").getUTCDay()
}

interface Props {
  lineSkip: LineSkipDetail | null
  venueId: number | null
  instances: LineSkipInstance[]
  canEdit: boolean
  canViewAnalytics: boolean
  onCloseNight: (i: LineSkipInstance) => void
  onChanged: () => void
}

type Selected = { date: string; instance: LineSkipInstance | null; runsByRule: boolean }

export default function LineSkipCalendar({
  lineSkip, venueId, instances, canEdit, canViewAnalytics, onCloseNight, onChanged,
}: Props) {
  const [anchor, setAnchor] = useState(() => {
    const d = new Date()
    d.setDate(1)
    d.setHours(0, 0, 0, 0)
    return d
  })
  const [selected, setSelected] = useState<Selected | null>(null)

  // Add-night dialog
  const [addDate, setAddDate] = useState<string | null>(null)
  const def = {
    price: lineSkip?.default_price_cents ?? 1500,
    start: lineSkip?.default_start_time ?? "22:00",
    end: lineSkip?.default_end_time ?? "02:00",
    cap: lineSkip?.default_capacity ?? null,
  }
  // Per-weekday recurring settings. A night that runs "by rule" but isn't
  // materialized yet should preview ITS weekday's price/hours, not the program
  // default. Falls back to `def` for weekdays without an override.
  const overrideByDay = useMemo(() => {
    const m: Record<number, { price: number; start: string; end: string; cap: number | null }> = {}
    for (const o of lineSkip?.day_overrides ?? []) {
      m[o.day_of_week] = { price: o.price_cents, start: o.start_time, end: o.end_time, cap: o.capacity }
    }
    return m
  }, [lineSkip])
  const defFor = (ds: string) => overrideByDay[weekdayOf(ds)] ?? def
  const [addPrice, setAddPrice] = useState("")
  const [addStart, setAddStart] = useState("22:00")
  const [addEnd, setAddEnd] = useState("02:00")
  const [addLimit, setAddLimit] = useState("")
  const [addRepeat, setAddRepeat] = useState(false)
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState("")

  const todayStr = ymd(new Date())
  const byDate = useMemo(() => {
    const m: Record<string, LineSkipInstance> = {}
    for (const i of instances) m[i.date] = i
    return m
  }, [instances])

  const ruleDays = useMemo(() => new Set(lineSkip?.days_of_week ?? []), [lineSkip])
  const inRange = (ds: string) => !lineSkip || (ds >= lineSkip.date_range_start && ds <= lineSkip.date_range_end)

  const year = anchor.getFullYear()
  const month = anchor.getMonth()
  const monthLabel = anchor.toLocaleDateString("en-US", { month: "long", year: "numeric" })

  const firstDow = new Date(year, month, 1).getDay()
  const leadBlanks = (firstDow + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: ({ date: string; day: number } | null)[] = []
  for (let i = 0; i < leadBlanks; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push({ date: ymd(new Date(year, month, d)), day: d })

  function info(ds: string) {
    const inst = byDate[ds] || null
    const runsByRule = !!lineSkip?.is_active && inRange(ds) && ruleDays.has(weekdayOf(ds))
    return { inst, runsByRule }
  }

  function openAdd(ds: string) {
    const d = defFor(ds)
    setAddDate(ds)
    setAddPrice((d.price / 100).toFixed(2))
    setAddStart(d.start.slice(0, 5))
    setAddEnd(d.end.slice(0, 5))
    setAddLimit(d.cap ? String(d.cap) : "")
    setAddRepeat(false)
    setAddError("")
  }

  async function submitAdd() {
    if (!addDate) return
    const dollars = parseFloat(addPrice)
    if (isNaN(dollars) || dollars <= 0) { setAddError("Enter a price greater than $0"); return }
    setAddLoading(true)
    setAddError("")
    try {
      await apiClient.post("/business/line-skips/night", {
        venue_id: venueId,
        date: addDate,
        price_cents: Math.round(dollars * 100),
        start_time: addStart,
        end_time: addEnd,
        capacity: addLimit ? parseInt(addLimit) : null,
        repeat: addRepeat,
      })
      setAddDate(null)
      onChanged()
    } catch (err) {
      setAddError(err instanceof ApiError ? err.message : "Couldn't add this night")
    } finally {
      setAddLoading(false)
    }
  }

  const usualLabel = lineSkip && lineSkip.days_of_week.length
    ? lineSkip.days_of_week.slice().sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((d) => WEEKDAYS[(d + 6) % 7]).join(", ")
    : null

  return (
    <div className="space-y-3">
      {/* Repeat chip + tip */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
          Tap a night to add a line skip. Doing it weekly? Turn on <span className="font-medium text-neutral-700 dark:text-neutral-300">Repeat</span> when you add one.
        </p>
        {usualLabel ? (
          <span className="inline-flex items-center gap-2 rounded-full border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 px-3 py-1 text-xs text-neutral-600 dark:text-neutral-300">
            Repeats: {usualLabel}
            {canEdit && lineSkip && (
              <Link href={`/business/line-skips/${lineSkip.id}/edit`} className="font-medium text-[#05EB54] hover:underline">Edit</Link>
            )}
          </span>
        ) : (
          <span className="text-xs text-neutral-400 dark:text-neutral-500">No repeat set</span>
        )}
      </div>

      {/* Month nav */}
      <div className="flex items-center justify-between px-1">
        <button type="button" onClick={() => setAnchor(new Date(year, month - 1, 1))} className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800" aria-label="Previous month">
          <ChevronLeft className="size-5" />
        </button>
        <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{monthLabel}</span>
        <button type="button" onClick={() => setAnchor(new Date(year, month + 1, 1))} className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800" aria-label="Next month">
          <ChevronRight className="size-5" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((w) => (
          <div key={w} className="pb-1 text-center text-[11px] font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">{w}</div>
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
          const empty = !inst && !runsByRule
          const addable = canEdit && empty && !isPast
          const dayDef = defFor(c.date)
          const price = inst ? inst.price_cents : dayDef.price
          const priceOverridden = !!inst && inst.price_cents !== dayDef.price
          const cap = inst ? inst.capacity : dayDef.cap
          const sold = inst ? inst.tickets_sold : 0
          const clickable = !!inst || (runsByRule && !isPast) || addable

          return (
            <button
              key={idx}
              type="button"
              disabled={!clickable}
              onClick={() => {
                if (inst || runsByRule) setSelected({ date: c.date, instance: inst, runsByRule })
                else if (addable) openAdd(c.date)
              }}
              className={cn(
                "group flex aspect-square sm:aspect-[4/3] flex-col items-start gap-0.5 rounded-lg border p-1.5 text-left transition-colors",
                clickable ? "cursor-pointer" : "cursor-default",
                isPast && "opacity-50",
                cancelled
                  ? "border-red-200 dark:border-red-900/60 bg-red-50/60 dark:bg-red-950/30"
                  : soldOut
                    ? "border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30"
                    : running
                      ? "border-[#05EB54]/40 bg-[#05EB54]/10 hover:bg-[#05EB54]/20"
                      : addable
                        ? "border-dashed border-neutral-200 dark:border-neutral-700 hover:border-[#05EB54]/50 hover:bg-[#05EB54]/5"
                        : "border-neutral-100 dark:border-neutral-800/60"
              )}
            >
              <span className={cn("text-[11px] font-semibold", running || cancelled ? "text-neutral-900 dark:text-neutral-100" : "text-neutral-400 dark:text-neutral-600")}>{c.day}</span>
              {cancelled ? (
                <span className="text-[10px] font-medium text-red-500 dark:text-red-400">Closed</span>
              ) : running ? (
                <>
                  <span className="text-[11px] font-semibold leading-none text-neutral-800 dark:text-neutral-200">{money(price)}{priceOverridden ? "*" : ""}</span>
                  {inst ? (
                    <span className={cn("text-[10px] leading-none", soldOut ? "text-amber-600 dark:text-amber-400" : "text-neutral-500 dark:text-neutral-400")}>{cap ? `${sold}/${cap}` : `${sold} sold`}</span>
                  ) : (
                    <span className="text-[10px] leading-none text-neutral-400 dark:text-neutral-500">usual</span>
                  )}
                </>
              ) : addable ? (
                <Plus className="mt-auto size-3.5 text-neutral-300 dark:text-neutral-600 group-hover:text-[#05EB54]" />
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
        <span>* = custom price · dashed = tap to add</span>
      </div>

      {/* Existing-night dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-sm">
          {selected && (() => {
            const inst = selected.instance
            const isPast = selected.date < todayStr
            const dayDef = defFor(selected.date)
            const cap = inst ? inst.capacity : dayDef.cap
            const price = inst ? inst.price_cents : dayDef.price
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
                    This night follows your repeat. Per-night controls (custom price, limit, closing it) open closer to the date. To change the repeat or default price, edit the repeat chip above.
                  </p>
                )}

                <DialogFooter className="flex-col gap-2 sm:flex-col sm:gap-2">
                  {inst && (canEdit || canViewAnalytics) && (
                    <Button asChild className="w-full"><Link href={`/business/line-skips/instances/${inst.id}`}>Manage this night</Link></Button>
                  )}
                  {inst && !isPast && inst.status !== "cancelled" && inst.cancellation_status !== "pending" && canEdit && (
                    <Button variant="subtle" className="w-full" onClick={() => { onCloseNight(inst); setSelected(null) }}>Close this night</Button>
                  )}
                  <DialogClose asChild><Button variant="ghost" className="w-full">Done</Button></DialogClose>
                </DialogFooter>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* Add-night dialog */}
      <Dialog open={!!addDate} onOpenChange={(o) => !o && setAddDate(null)}>
        <DialogContent className="max-w-sm">
          {addDate && (
            <>
              <DialogHeader>
                <DialogTitle>Add line skip</DialogTitle>
                <DialogDescription>{longDate(addDate)}</DialogDescription>
              </DialogHeader>
              {addError && <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-xs text-red-700 dark:text-red-400">{addError}</div>}
              <div className="space-y-3">
                <div>
                  <Label htmlFor="add-price" className="mb-1.5 block">Price</Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-500">$</span>
                    <Input id="add-price" type="text" inputMode="decimal" className="pl-7" value={addPrice} onChange={(e) => setAddPrice(e.target.value)} placeholder="0.00" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="add-start" className="mb-1.5 block">Doors open</Label>
                    <Input id="add-start" type="time" value={addStart} onChange={(e) => setAddStart(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="add-end" className="mb-1.5 block">Closes</Label>
                    <Input id="add-end" type="time" value={addEnd} onChange={(e) => setAddEnd(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="add-limit" className="mb-1.5 block">Limit <span className="font-normal text-neutral-400">(optional)</span></Label>
                  <Input id="add-limit" type="number" min="1" value={addLimit} onChange={(e) => setAddLimit(e.target.value)} placeholder="No limit" />
                </div>
                <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 p-3">
                  <input type="checkbox" checked={addRepeat} onChange={(e) => setAddRepeat(e.target.checked)} className="mt-0.5 size-4 rounded border-neutral-300 dark:border-neutral-700 text-[#05EB54] focus:ring-[#05EB54]" />
                  <span className="text-sm text-neutral-700 dark:text-neutral-300">
                    Repeat every {WEEKDAY_FULL[weekdayOf(addDate)]}
                    <span className="block text-xs text-neutral-500 dark:text-neutral-400">We&apos;ll auto-add this night every week.</span>
                  </span>
                </label>
              </div>
              <DialogFooter>
                <DialogClose asChild><Button variant="secondary" disabled={addLoading}>Cancel</Button></DialogClose>
                <Button onClick={submitAdd} disabled={addLoading}>
                  {addLoading && <Loader2 className="size-4 animate-spin" />} Add night
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
