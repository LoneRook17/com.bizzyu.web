"use client"

import { ISO_DAYS } from "./schedule"
import { Label } from "@/components/business/v2/ui/label"
import { cn } from "@/lib/v2/utils"

/** Flutter "Repeats on" weekday checker. ISO 1=Mon … 7=Sun. Green Event only. */
export function RepeatsOnDays({
  days,
  onToggle,
  error,
}: {
  days: number[]
  onToggle: (day: number) => void
  error?: string
}) {
  return (
    <div>
      <Label className="mb-1.5 block">Repeats on</Label>
      <div className="flex flex-wrap gap-2">
        {ISO_DAYS.map((day) => {
          const active = days.includes(day.value)
          return (
            <button
              key={day.value}
              type="button"
              onClick={() => onToggle(day.value)}
              aria-pressed={active}
              aria-label={day.full}
              className={cn(
                "flex size-10 items-center justify-center rounded-lg border text-sm font-semibold transition-colors",
                active
                  ? "border-[#05EB54] bg-[#05EB54] text-white"
                  : "border-neutral-300 bg-white text-neutral-600 hover:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400",
              )}
            >
              {day.letter}
            </button>
          )
        })}
      </div>
      {error ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p> : null}
    </div>
  )
}
