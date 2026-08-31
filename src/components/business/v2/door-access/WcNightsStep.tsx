"use client"

import { useState } from "react"
import { Clock, Copy } from "lucide-react"
import { cn } from "@/lib/v2/utils"
import { ACCESS_ACCENT, ACCESS_INK, fmtTime } from "@/lib/business/door-access"
import {
  copyNightToDay,
  nightLabelFor,
  nightPriceSummary,
  nightUnsetSubtitle,
  seedNightDraft,
  type NightDraft,
  type WcProducts,
} from "@/lib/business/weekly-cover-nights"
import { ISO_DAYS, isoDayFull } from "@/components/business/v2/recurring/schedule"
import { Button } from "@/components/business/v2/ui/button"
import { NightEditorDialog } from "@/components/business/v2/door-access/NightEditorDialog"

/**
 * Flutter "Set up each night".
 *
 * Row title is "{Monday} Cover & Skip the Line". Unset subtitle keeps the $0
 * placeholders. After save: hours + prices. Copy the first finished day onto
 * the rest. Continue stays blocked in the wizard until every day has hours.
 */
export function WcNightsStep({
  daysOfWeek,
  products,
  weekdayEdits,
  onChange,
  venueName,
  inheritedFlyerUrl,
  onEditorOpenChange,
}: {
  daysOfWeek: number[]
  products: WcProducts | null
  weekdayEdits: Record<number, NightDraft>
  onChange: (next: Record<number, NightDraft>) => void
  venueName?: string
  inheritedFlyerUrl?: string
  onEditorOpenChange?: (open: boolean) => void
}) {
  const [editing, setEditing] = useState<number | null>(null)

  const sorted = [...daysOfWeek].sort((a, b) => a - b)
  const productLabel = nightLabelFor(products)
  const unset = nightUnsetSubtitle(products)

  const isSet = (day: number) => {
    const draft = weekdayEdits[day]
    return !!draft && draft.startTime !== "" && draft.endTime !== ""
  }

  const copySource = sorted.find(isSet) ?? null

  const seedFor = (day: number): NightDraft =>
    weekdayEdits[day] ??
    seedNightDraft({
      products,
      startTime: "",
      endTime: "",
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

  const openEditor = (day: number) => {
    setEditing(day)
    onEditorOpenChange?.(true)
  }

  const closeEditor = () => {
    setEditing(null)
    onEditorOpenChange?.(false)
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
          Set up each night
        </h2>
        <p className="mt-1 text-[15px] text-neutral-600 dark:text-neutral-400">
          Doors and prices for each day. They run every week until you end it.
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
          const copyName = copySource != null ? isoDayFull(copySource) : ""
          return (
            <button
              key={day}
              type="button"
              onClick={() => openEditor(day)}
              className={cn(
                "flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition-colors",
                done
                  ? "border-access/40 bg-access/[0.04]"
                  : "border-neutral-300 bg-white hover:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900"
              )}
            >
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-lg text-[12px] font-bold uppercase",
                  !done && "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
                )}
                style={done ? { backgroundColor: ACCESS_ACCENT, color: ACCESS_INK } : undefined}
              >
                {ISO_DAYS.find((d) => d.value === day)?.letter}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-neutral-900 dark:text-neutral-100">
                  {isoDayFull(day)} {productLabel}
                </span>
                <span className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[13px] text-neutral-600 dark:text-neutral-400">
                  {done && draft ? (
                    <>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3" />
                        {fmtTime(draft.startTime)} - {fmtTime(draft.endTime)}
                      </span>
                      {summary && <span className="font-medium text-neutral-700 dark:text-neutral-300">{summary}</span>}
                    </>
                  ) : (
                    <span>{unset}</span>
                  )}
                </span>
              </span>

              <span className="flex shrink-0 items-center gap-2">
                {canCopy && (
                  <span
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      copyFrom(copySource, day)
                    }}
                  >
                    <Button type="button" variant="secondary" size="sm">
                      <Copy /> Copy {copyName}
                    </Button>
                  </span>
                )}
                <span
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    openEditor(day)
                  }}
                >
                  <Button type="button" variant="secondary" size="sm">
                    Edit
                  </Button>
                </span>
              </span>
            </button>
          )
        })}
      </div>

      {editing != null && (
        <NightEditorDialog
          open
          onOpenChange={(open) => {
            if (!open) closeEditor()
          }}
          title={`${isoDayFull(editing)} Prices`}
          subtitle={`Every ${isoDayFull(editing)} gets these prices and hours.`}
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
