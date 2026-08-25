import Link from "next/link"
import { Repeat } from "lucide-react"
import type { EventDetail } from "@/lib/business/types"
import {
  programHref,
  programIdFromOwnedEvent,
  weeklyCoverNightEditHref,
} from "@/lib/business/door-access"

/**
 * What the banner reads. The date fields are optional extras: pages that pass
 * the full EventDetail (event view) let the Weekly Cover branch link the
 * exact night editor; a slimmer pick (the edit page, which never shows this
 * banner for WC nights anyway because they redirect) falls back to the
 * program page link.
 */
export type SeriesNightBannerEvent = Pick<
  EventDetail,
  "recurring_series_id" | "series_customized_at" | "product_kind" | "access_kind"
> &
  Partial<Pick<EventDetail, "occurrence_date" | "start_date_time">>

/**
 * Decision-2 explainer shown on a normal event page when the event is one
 * night of a recurring series: edits here are this-night-only, always.
 *
 * WC FLAW 3 — a Weekly Cover night gets its own branch. The named-series copy
 * ("edit this night only") is exactly the wrong coaching for a program night:
 * editing it as an event stamps series_customized_at and the program's
 * weekday-global restamp skips it forever. Binding decision: a WC night edit
 * is Custom WC on the WC/series path, never a green named-Event edit, and
 * Custom is not a forever fork — so the branch is the same for a night that
 * already carries the stamp. Links go to the night editor and the program
 * page (D-F11.1), never /business/recurring/:id.
 */
export function SeriesNightBanner({ event }: { event: SeriesNightBannerEvent }) {
  if (!event.recurring_series_id) return null

  const wcProgramId = programIdFromOwnedEvent(event)
  if (wcProgramId != null) {
    const nightEditHref = weeklyCoverNightEditHref(event) ?? programHref(wcProgramId)
    return (
      <div className="flex items-start gap-2.5 rounded-xl border border-blue-100 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 px-4 py-3">
        <Repeat className="mt-0.5 size-4 shrink-0 text-blue-600 dark:text-blue-400" />
        <p className="text-sm text-blue-700 dark:text-blue-400">
          <span className="font-semibold">This is one night of your Weekly Cover program.</span>{" "}
          Change prices or hours on{" "}
          <Link href={nightEditHref} className="font-semibold underline-offset-2 hover:underline">
            the night page
          </Link>
          . Edits there are Custom for this date only, and program-wide edits still apply to
          this night.{" "}
          <Link
            href={programHref(wcProgramId)}
            className="font-semibold underline-offset-2 hover:underline"
          >
            View the program
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-blue-100 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 px-4 py-3">
      <Repeat className="mt-0.5 size-4 shrink-0 text-blue-600 dark:text-blue-400" />
      <p className="text-sm text-blue-700 dark:text-blue-400">
        <span className="font-semibold">This is one night of a recurring series.</span> Edit this night only.
        Changes here never touch the series
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
