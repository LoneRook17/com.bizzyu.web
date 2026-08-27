"use client"

import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/v2/utils"
import {
  cloneNightDraft,
  fmtGameDay,
  isoWeekdayOfDate,
  nightPriceSummary,
  scheduledDates,
  seedNightDraft,
  WC_LOOKAHEAD_DAYS,
  type NightDraft,
  type WcProducts,
} from "@/lib/business/weekly-cover-nights"
import { isoDayFull } from "@/components/business/v2/recurring/schedule"
import { NightEditorDialog } from "@/components/business/v2/door-access/NightEditorDialog"

/**
 * Step 3 — the game-day calendar.
 *
 * Every date the program will actually run, month by month. Tap one to give THAT
 * date its own prices; nothing else on the week moves. This is how a bar prices
 * a rivalry game or a holiday weekend in advance instead of scrambling that
 * afternoon — the thing the dashboard previously could not do at all, because
 * per-night overrides only existed after the program was created.
 *
 * Dates are plain Y-m-d strings throughout. Nothing here routes one through a
 * timezone: `new Date("2026-08-29")` is UTC midnight and renders as the 28th for
 * every US viewer, which would put a Saturday's price on a Friday.
 */
export function WcDatesStep({
  daysOfWeek,
  products,
  rangeStart,
  rangeEnd,
  dateEdits,
  weekdayEdits,
  onChange,
  defaultStartTime,
  defaultEndTime,
  programIs21Plus,
  venueName,
  inheritedFlyerUrl,
}: {
  daysOfWeek: number[]
  products: WcProducts | null
  rangeStart: string
  rangeEnd: string
  dateEdits: Record<string, NightDraft>
  weekdayEdits: Record<number, NightDraft>
  onChange: (next: Record<string, NightDraft>) => void
  defaultStartTime: string
  defaultEndTime: string
  programIs21Plus: boolean
  venueName?: string
  inheritedFlyerUrl?: string
}) {
  const [editing, setEditing] = useState<string | null>(null)
  const [monthOffset, setMonthOffset] = useState(0)

  const runs = useMemo(
    () =>
      new Set(
        scheduledDates({
          daysOfWeek,
          rangeStart,
          rangeEnd,
          lookaheadDays: WC_LOOKAHEAD_DAYS,
        })
      ),
    [daysOfWeek, rangeStart, rangeEnd]
  )

  const today = new Date()
  const shown = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1)
  const monthLabel = shown.toLocaleDateString("en-US", { month: "long", year: "numeric" })

  // Leading blanks so the 1st lands under its weekday. Monday-first, matching
  // the ISO weekday numbering used everywhere else on this surface.
  const firstWeekday = ((shown.getDay() + 6) % 7) + 1
  const daysInMonth = new Date(shown.getFullYear(), shown.getMonth() + 1, 0).getDate()
  const cells: (string | null)[] = [
    ...Array.from({ length: firstWeekday - 1 }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1
      return `${shown.getFullYear()}-${String(shown.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    }),
  ]

  const seedFor = (date: string): NightDraft => {
    const existing = dateEdits[date]
    if (existing) return cloneNightDraft(existing)
    const weekday = isoWeekdayOfDate(date)
    // Seed from that weekday's own setup, so the host only changes what differs.
    const fromWeekday = weekday == null ? undefined : weekdayEdits[weekday]
    if (fromWeekday) return cloneNightDraft(fromWeekday)
    return seedNightDraft({
      products,
      startTime: defaultStartTime || "",
      endTime: defaultEndTime || "",
      is21Plus: programIs21Plus,
      inheritedFlyerUrl,
      venueName,
      dayName: weekday == null ? undefined : isoDayFull(weekday),
    })
  }

  const overrideCount = Object.keys(dateEdits).length

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
          Need higher prices on specific days?
        </h2>
        <p className="mt-1 text-[15px] text-neutral-600 dark:text-neutral-400">
          Game days, holidays, big weekends. Skip for now and every night uses its weekly price.
        </p>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setMonthOffset((m) => m - 1)}
            disabled={monthOffset <= 0}
            aria-label="Previous month"
            className="rounded-lg p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-neutral-800"
          >
            <ChevronLeft className="size-4" />
          </button>
          <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{monthLabel}</p>
          <button
            type="button"
            onClick={() => setMonthOffset((m) => m + 1)}
            disabled={monthOffset >= 4}
            aria-label="Next month"
            className="rounded-lg p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-neutral-800"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
            <div
              key={i}
              className="pb-1 text-center text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500"
            >
              {d}
            </div>
          ))}
          {cells.map((date, i) => {
            if (date == null) return <div key={`blank-${i}`} />
            const runsTonight = runs.has(date)
            const hasOverride = !!dateEdits[date]
            const dayNumber = Number(date.slice(8, 10))
            const past = date < today.toLocaleDateString("en-CA")
            return (
              <button
                key={date}
                type="button"
                disabled={past}
                onClick={() => setEditing(date)}
                aria-label={`${fmtGameDay(date)}${hasOverride ? " (has its own prices)" : runsTonight ? "" : " (one-off)"}`}
                className={cn(
                  "relative flex aspect-square items-center justify-center rounded-lg text-[13px] font-medium tabular-nums transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-access/40",
                  past && "text-neutral-300 dark:text-neutral-700",
                  !past &&
                    !runsTonight &&
                    !hasOverride &&
                    "border border-dashed border-neutral-300 text-neutral-500 hover:border-access hover:text-access dark:border-neutral-700",
                  !past &&
                    runsTonight &&
                    !hasOverride &&
                    "border border-neutral-200 text-neutral-700 hover:border-access hover:text-access dark:border-neutral-700 dark:text-neutral-300",
                  hasOverride && "bg-access font-bold text-white"
                )}
              >
                {dayNumber}
                {runsTonight && !hasOverride && (
                  <span className="absolute bottom-1 size-1 rounded-full bg-access/50" />
                )}
              </button>
            )
          })}
        </div>

        <p className="mt-3 text-[12px] text-neutral-500 dark:text-neutral-400">
          Dotted nights are the weekly series. Any other future day can be a one-off. Filled ones have their own prices.
        </p>
      </div>

      {overrideCount > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[13px] font-semibold text-access">
            {overrideCount} {overrideCount === 1 ? "date has" : "dates have"} their own prices
          </p>
          {Object.keys(dateEdits)
            .sort()
            .map((date) => (
              <div
                key={date}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-access/30 bg-access/[0.04] px-3 py-2 text-[13px]"
              >
                <span className="font-medium text-neutral-900 dark:text-neutral-100">{fmtGameDay(date)}</span>
                <span className="flex items-center gap-3">
                  <span className="text-neutral-600 dark:text-neutral-400">
                    {nightPriceSummary(dateEdits[date])}
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditing(date)}
                    className="font-semibold text-access hover:underline"
                  >
                    Edit
                  </button>
                </span>
              </div>
            ))}
        </div>
      )}

      {editing != null && (
        <NightEditorDialog
          open
          onOpenChange={(open) => {
            if (!open) setEditing(null)
          }}
          title={fmtGameDay(editing)}
          subtitle={`Only ${fmtGameDay(editing)} changes. Every other ${
            isoWeekdayOfDate(editing) == null ? "night" : isoDayFull(isoWeekdayOfDate(editing)!)
          } keeps its weekly price.`}
          initial={seedFor(editing)}
          venueName={venueName}
          dayName={isoWeekdayOfDate(editing) == null ? undefined : isoDayFull(isoWeekdayOfDate(editing)!)}
          saveLabel="Save this date"
          showClosedToggle
          onReset={
            dateEdits[editing]
              ? () => {
                  const next = { ...dateEdits }
                  delete next[editing]
                  onChange(next)
                }
              : undefined
          }
          onSave={(next) => onChange({ ...dateEdits, [editing]: next })}
        />
      )}
    </div>
  )
}
