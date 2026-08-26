"use client"

import { useState } from "react"
import { Loader2, TriangleAlert } from "lucide-react"
import { apiClient, ApiError } from "@/lib/business/api-client"
import type { RecurringSuspendSummary } from "@/lib/business/types"
import { Button } from "@/components/business/v2/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, DialogClose,
} from "@/components/business/v2/ui/dialog"
import { NightLinks } from "./RestampReport"

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`
}

/**
 * Two-phase suspend flow: a plain-language confirm, then the generator's
 * suspend report (cancelled vs kept-with-sales vs kept-customized) so the
 * operator knows exactly which nights still need attention.
 */
export function SuspendSeriesDialog({
  open,
  seriesId,
  seriesName,
  dateByEventId,
  onClose,
  onSuspended,
}: {
  open: boolean
  seriesId: number
  seriesName: string
  dateByEventId: Record<number, string>
  onClose: () => void
  onSuspended: () => void
}) {
  const [suspending, setSuspending] = useState(false)
  const [error, setError] = useState("")
  const [report, setReport] = useState<RecurringSuspendSummary | null>(null)

  const handleSuspend = async () => {
    setSuspending(true)
    setError("")
    try {
      const summary = await apiClient.post<RecurringSuspendSummary>(
        `/business/recurring-series/${seriesId}/suspend`
      )
      setReport(summary)
      onSuspended()
    } catch (err) {
      // Core owns the whole state change — on failure nothing was modified.
      setError(
        err instanceof ApiError && err.status === 502
          ? "Suspending isn't available right now. Nothing was changed. Please try again in a minute."
          : err instanceof ApiError
            ? err.message
            : "Failed to suspend the series. Nothing was changed."
      )
    } finally {
      setSuspending(false)
    }
  }

  const handleOpenChange = (o: boolean) => {
    if (!o) {
      onClose()
      // Reset after the close animation so a re-open starts at the confirm step.
      setTimeout(() => { setReport(null); setError("") }, 200)
    }
  }

  const keptWithSales = report?.skipped_with_sales ?? []
  const keptCustomized = report?.skipped_customized ?? []

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        {report === null ? (
          <>
            <DialogHeader>
              <DialogTitle>Suspend this series?</DialogTitle>
              <DialogDescription>
                {seriesName} will stop scheduling new nights. Upcoming nights with no ticket sales that you
                haven&apos;t edited individually will be cancelled.
              </DialogDescription>
            </DialogHeader>
            <p className="text-xs text-neutral-400 dark:text-neutral-500">
              Nights that already sold tickets (and nights you&apos;ve customized) stay live so nobody loses a
              ticket. You&apos;ll get a summary of exactly what happened.
            </p>
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
                {error}
              </div>
            )}
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="secondary" disabled={suspending}>Keep it running</Button>
              </DialogClose>
              <Button variant="danger" onClick={handleSuspend} disabled={suspending}>
                {suspending && <Loader2 className="size-4 animate-spin" />}
                Suspend series
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Series suspended</DialogTitle>
              <DialogDescription>
                {report.cancelled.length > 0
                  ? `${plural(report.cancelled.length, "upcoming night")} cancelled. No new nights will be scheduled.`
                  : "No new nights will be scheduled."}
              </DialogDescription>
            </DialogHeader>

            {(keptWithSales.length > 0 || keptCustomized.length > 0) && (
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900 dark:bg-amber-950/40">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="space-y-1.5 text-sm text-amber-800 dark:text-amber-300">
                  <p className="font-semibold">Some nights are still live:</p>
                  <ul className="list-disc space-y-1 pl-4">
                    {keptWithSales.length > 0 && (
                      <li>
                        {plural(keptWithSales.length, "night")} {keptWithSales.length === 1 ? "has" : "have"} ticket
                        sales, so {keptWithSales.length === 1 ? "it wasn't" : "they weren't"} cancelled. To cancel{" "}
                        {keptWithSales.length === 1 ? "it" : "them"}, open the event page. That starts the
                        cancellation &amp; refund process:{" "}
                        <NightLinks ids={keptWithSales} dateByEventId={dateByEventId} />
                      </li>
                    )}
                    {keptCustomized.length > 0 && (
                      <li>
                        {plural(keptCustomized.length, "night")} you edited individually{" "}
                        {keptCustomized.length === 1 ? "was" : "were"} kept. Manage{" "}
                        {keptCustomized.length === 1 ? "it" : "them"} from{" "}
                        {keptCustomized.length === 1 ? "its" : "their"} event page:{" "}
                        <NightLinks ids={keptCustomized} dateByEventId={dateByEventId} />
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            )}

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="primary">Done</Button>
              </DialogClose>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
