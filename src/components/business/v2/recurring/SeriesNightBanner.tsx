import Link from "next/link"
import { Repeat } from "lucide-react"
import type { EventDetail } from "@/lib/business/types"

/**
 * Decision-2 explainer shown on a normal event page when the event is one
 * night of a recurring series: edits here are this-night-only, always.
 */
export function SeriesNightBanner({ event }: { event: Pick<EventDetail, "recurring_series_id" | "series_customized_at"> }) {
  if (!event.recurring_series_id) return null
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-blue-100 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 px-4 py-3">
      <Repeat className="mt-0.5 size-4 shrink-0 text-blue-600 dark:text-blue-400" />
      <p className="text-sm text-blue-700 dark:text-blue-400">
        <span className="font-semibold">This is one night of a recurring series.</span> Edit this night only —
        changes here never touch the series
        {event.series_customized_at
          ? ", and since you've customized it, series edits will leave it alone too."
          : ". Once you edit it, future series edits will leave this night alone."}{" "}
        <Link
          href={`/business/recurring/${event.recurring_series_id}`}
          className="font-semibold underline-offset-2 hover:underline"
        >
          View the series
        </Link>
      </p>
    </div>
  )
}
