"use client"

import Link from "next/link"
import { CheckCircle2, TriangleAlert } from "lucide-react"
import type { RecurringGenerationSummary, RecurringRestampSummary } from "@/lib/business/types"

/**
 * Plain-language rendering of the generator's restamp summary — the
 * operator's only signal for what a template edit actually did (R3.5).
 * `dateByEventId` maps occurrence event ids to readable night labels
 * (captured before the save); ids without a label still link by number.
 */

export function NightLinks({
  ids,
  dateByEventId,
}: {
  ids: number[]
  dateByEventId: Record<number, string>
}) {
  return (
    <span className="inline-flex flex-wrap gap-x-2 gap-y-0.5">
      {ids.map((id) => (
        <Link
          key={id}
          href={`/business/events/${id}`}
          className="font-medium text-[#05EB54] underline-offset-2 hover:underline"
        >
          {dateByEventId[id] ?? `Night #${id}`}
        </Link>
      ))}
    </span>
  )
}

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`
}

export function RestampReport({
  restamp,
  restampError,
  generation,
  dateByEventId,
}: {
  restamp: RecurringRestampSummary | null
  restampError: string | null
  generation?: RecurringGenerationSummary | null
  dateByEventId: Record<number, string>
}) {
  // Degraded path: the template IS saved; core just couldn't update existing
  // nights right now. Never present this as data loss.
  if (restampError || !restamp) {
    return (
      <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900 dark:bg-amber-950/40">
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="text-sm text-amber-800 dark:text-amber-300">
          <p className="font-semibold">Template saved. Occurrence updates pending.</p>
          <p className="mt-0.5">
            Your changes are saved, but the scheduled nights couldn&apos;t be updated just now. They&apos;ll be
            brought up to date automatically, or you can retry by saving again.
          </p>
        </div>
      </div>
    )
  }

  const removedCancelled = restamp.removed_from_pattern_cancelled ?? []
  const removedWithSales = restamp.removed_from_pattern_skipped_with_sales ?? []
  const removedCustomized = restamp.removed_from_pattern_skipped_customized ?? []
  const removedTotal = removedCancelled.length + removedWithSales.length + removedCustomized.length

  const restamped = restamp.restamped ?? []
  const skippedCustomized = restamp.skipped_customized ?? []
  const skippedTiersWithSales = restamp.skipped_tiers_with_sales ?? []
  const newNights = generation?.stamped ?? []

  const nothingToReport =
    restamped.length === 0 && skippedCustomized.length === 0 && removedTotal === 0 && newNights.length === 0

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2.5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 dark:border-green-900 dark:bg-green-950/40">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green-600 dark:text-green-400" />
        <div className="space-y-1 text-sm text-green-800 dark:text-green-300">
          <p className="font-semibold">Series saved.</p>
          {restamped.length > 0 && (
            <p>{plural(restamped.length, "upcoming night")} updated with your new details.</p>
          )}
          {newNights.length > 0 && <p>{plural(newNights.length, "new night")} added to the schedule.</p>}
          {nothingToReport && <p>No scheduled nights needed changes.</p>}
        </div>
      </div>

      {skippedTiersWithSales.length > 0 && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-400">
          <p>
            {plural(skippedTiersWithSales.length, "night")} already {skippedTiersWithSales.length === 1 ? "has" : "have"}{" "}
            ticket sales, so the tickets people bought were left exactly as they are. Everything else (name, times,
            details) was still updated:
          </p>
          <p className="mt-1">
            <NightLinks ids={skippedTiersWithSales} dateByEventId={dateByEventId} />
          </p>
        </div>
      )}

      {skippedCustomized.length > 0 && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-400">
          <p>
            {plural(skippedCustomized.length, "night")} you&apos;ve edited individually{" "}
            {skippedCustomized.length === 1 ? "keeps its" : "keep their"} changes and {skippedCustomized.length === 1 ? "was" : "were"} left alone:
          </p>
          <p className="mt-1">
            <NightLinks ids={skippedCustomized} dateByEventId={dateByEventId} />
          </p>
        </div>
      )}

      {/* Pattern shrink — the one place a template edit can take nights off the
          calendar, so it gets the loudest treatment. */}
      {removedTotal > 0 && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900 dark:bg-amber-950/40">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="space-y-1.5 text-sm text-amber-800 dark:text-amber-300">
            <p className="font-semibold">
              {plural(removedTotal, "night")} no longer {removedTotal === 1 ? "matches" : "match"} your schedule:
            </p>
            <ul className="list-disc space-y-1 pl-4">
              {removedCancelled.length > 0 && (
                <li>
                  {plural(removedCancelled.length, "night")} cancelled (no ticket sales):{" "}
                  <NightLinks ids={removedCancelled} dateByEventId={dateByEventId} />
                </li>
              )}
              {removedWithSales.length > 0 && (
                <li>
                  {plural(removedWithSales.length, "night")} kept live because {removedWithSales.length === 1 ? "it has" : "they have"}{" "}
                  ticket sales. Manage {removedWithSales.length === 1 ? "it" : "them"} from{" "}
                  {removedWithSales.length === 1 ? "its" : "their"} event page:{" "}
                  <NightLinks ids={removedWithSales} dateByEventId={dateByEventId} />
                </li>
              )}
              {removedCustomized.length > 0 && (
                <li>
                  {plural(removedCustomized.length, "night")} kept live because you edited{" "}
                  {removedCustomized.length === 1 ? "it" : "them"} individually:{" "}
                  <NightLinks ids={removedCustomized} dateByEventId={dateByEventId} />
                </li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
