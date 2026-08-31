"use client"

import { MapPin } from "lucide-react"
import { cn } from "@/lib/v2/utils"
import { ACCESS_ACCENT, ACCESS_INK } from "@/lib/business/door-access"
import { daysQuestion, type WcProducts } from "@/lib/business/weekly-cover-nights"
import { ISO_DAYS } from "@/components/business/v2/recurring/schedule"

/**
 * Flutter days step. MTWTFSS chips only. No name input, no description input,
 * no rename — create derives `{Venue} Cover`. No program 21+, hours, date
 * range, or flyer. The dashboard is already scoped to a venue, so the picker
 * is skipped and the venue shows as a read-only card.
 */
export function WcDaysStep({
  products,
  daysOfWeek,
  onToggleDay,
  venueName,
  venueAddress,
  error,
}: {
  products: WcProducts | null
  daysOfWeek: number[]
  onToggleDay: (day: number) => void
  venueName?: string
  venueAddress?: string
  error?: string
}) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
          {daysQuestion(products)}
        </h2>
        <p className="mt-1 text-[15px] text-neutral-600 dark:text-neutral-400">
          Starts as soon as you publish and runs every week until you end it.
        </p>
      </div>

      {venueName ? (
        <div className="flex items-start gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-800/50">
          <span
            className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${ACCESS_ACCENT}1f`, color: ACCESS_ACCENT }}
          >
            <MapPin className="size-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Venue
            </span>
            <span className="block text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {venueName}
            </span>
            {venueAddress ? (
              <span className="mt-0.5 block text-[13px] text-neutral-600 dark:text-neutral-400">
                {venueAddress}
              </span>
            ) : null}
          </span>
        </div>
      ) : null}

      <div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Days of the week">
          {ISO_DAYS.map((day) => {
            const active = daysOfWeek.includes(day.value)
            return (
              <button
                key={day.value}
                type="button"
                onClick={() => onToggleDay(day.value)}
                aria-pressed={active}
                aria-label={day.full}
                className={cn(
                  "flex size-11 items-center justify-center rounded-full border text-sm font-bold transition-colors",
                  !active &&
                    "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:border-neutral-600"
                )}
                style={
                  active
                    ? { borderColor: ACCESS_ACCENT, backgroundColor: ACCESS_ACCENT, color: ACCESS_INK }
                    : undefined
                }
              >
                {day.letter}
              </button>
            )
          })}
        </div>
        {error ? <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p> : null}
      </div>
    </div>
  )
}
