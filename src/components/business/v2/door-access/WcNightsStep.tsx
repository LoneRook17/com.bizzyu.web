"use client"

import { useState } from "react"
import { Check, Clock, Copy, Pencil } from "lucide-react"
import { cn } from "@/lib/v2/utils"
import { fmtTime } from "@/lib/business/door-access"
import {
  copyNightToDay,
  nightPriceSummary,
  seedNightDraft,
  type NightDraft,
  type WcProducts,
} from "@/lib/business/weekly-cover-nights"
import { ISO_DAYS, isoDayFull } from "@/components/business/v2/recurring/schedule"
import { Button } from "@/components/business/v2/ui/button"
import { NightEditorDialog } from "@/components/business/v2/door-access/NightEditorDialog"

/**
 * Step 2 — one card per picked weekday.
 *
 * The host sets prices and hours per night because that is how door cover
 * actually works: Thursday is not Saturday. A weekday with nothing set yet
 * offers "Copy Friday" from the first one that is done, which is the difference
 * between a five-night program taking one minute and taking five.
 *
 * The program's default window seeds each night, so a host who genuinely runs
 * the same hours every night still only touches prices.
 */
export function WcNightsStep({
  daysOfWeek,
  products,
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
  weekdayEdits: Record<number, NightDraft>
  onChange: (next: Record<number, NightDraft>) => void
  defaultStartTime: string
  defaultEndTime: string
  programIs21Plus: boolean
  venueName?: string
  inheritedFlyerUrl?: string
}) {
  const [editing, setEditing] = useState<number | null>(null)

  const sorted = [...daysOfWeek].sort((a, b) => a - b)

  const isSet = (day: number) => {
    const draft = weekdayEdits[day]
    return !!draft && draft.startTime !== "" && draft.endTime !== ""
  }

  /** The day to offer as a template: the first one the host finished. */
  const copySource = sorted.find(isSet) ?? null

  const seedFor = (day: number): NightDraft =>
    weekdayEdits[day] ??
    seedNightDraft({
      products,
      startTime: defaultStartTime,
      endTime: defaultEndTime,
      is21Plus: programIs21Plus,
      inheritedFlyerUrl,
      venueName,
      dayName: isoDayFull(day),
    })

  const copyFrom = (source: number, target: number) => {
    onChange({
      ...weekdayEdits,
      [target]: copyNightToDay(weekdayEdits[source], {
        venueName,
        dayName: isoDayFull(target),
      }),
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
          Set up each night
        </h2>
        <p className="mt-1 text-[15px] text-neutral-600 dark:text-neutral-400">
          Prices and hours for each day. They run every week. Set them once and never touch them again.
        </p>
      </div>

      {sorted.length === 0 && (
        <div className="rounded-xl border border-dashed border-neutral-300 px-4 py-6 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
          Go back and pick the nights this runs.
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        {sorted.map((day) => {
          const draft = weekdayEdits[day]
          const done = isSet(day)
          const summary = nightPriceSummary(draft)
          const canCopy = !done && copySource != null && copySource !== day
          return (
            <div
              key={day}
              className={cn(
                "flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3.5 transition-colors",
                done
                  ? "border-access/40 bg-access/[0.04]"
                  : "border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-900"
              )}
            >
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-lg text-[12px] font-bold uppercase",
                  done ? "bg-access text-white" : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
                )}
              >
                {done ? <Check className="size-4" /> : ISO_DAYS.find((d) => d.value === day)?.label}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-neutral-900 dark:text-neutral-100">
                  {isoDayFull(day)}
                </span>
                <span className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[13px] text-neutral-600 dark:text-neutral-400">
                  {done ? (
                    <>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3" />
                        {fmtTime(draft.startTime)} - {fmtTime(draft.endTime)}
                      </span>
                      {summary && <span className="font-medium text-neutral-700 dark:text-neutral-300">{summary}</span>}
                      {draft.flyerImageUrl && <span className="text-access">Own flyer</span>}
                    </>
                  ) : (
                    <span>Set doors open &amp; close</span>
                  )}
                </span>
              </span>

              <span className="flex shrink-0 items-center gap-2">
                {canCopy && (
                  <Button type="button" variant="secondary" size="sm" onClick={() => copyFrom(copySource, day)}>
                    <Copy /> Copy {ISO_DAYS.find((d) => d.value === copySource)?.label}
                  </Button>
                )}
                <Button
                  type="button"
                  variant={done ? "secondary" : "access"}
                  size="sm"
                  onClick={() => setEditing(day)}
                >
                  {done ? <Pencil /> : null}
                  {done ? "Edit" : "Set prices"}
                </Button>
              </span>
            </div>
          )
        })}
      </div>

      {editing != null && (
        <NightEditorDialog
          open
          onOpenChange={(open) => {
            if (!open) setEditing(null)
          }}
          title={`${isoDayFull(editing)} prices`}
          subtitle={`Every ${isoDayFull(editing)} gets these prices and hours. Game days you pick on the next screen keep their own.`}
          initial={seedFor(editing)}
          venueName={venueName}
          dayName={isoDayFull(editing)}
          saveLabel={`Save ${isoDayFull(editing)}`}
          onSave={(next) => onChange({ ...weekdayEdits, [editing]: next })}
        />
      )}
    </div>
  )
}
