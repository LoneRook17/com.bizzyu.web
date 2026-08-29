"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { ApiError } from "@/lib/business/api-client"
import { cancelWeeklyCoverProgram, WEEKLY_ACCESS_SECTION_LABEL } from "@/lib/business/door-access"
import { Button } from "@/components/business/v2/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, DialogClose,
} from "@/components/business/v2/ui/dialog"

/**
 * WC program / series-end. Calls the existing recurring-series suspend
 * path (core suspendSeries). Do not invent a money path or hard-delete
 * ticket rows. Sold nights stay until admin refunds complete; unsold
 * nights leave. Single-night cancel is a different control.
 */
export function CancelWeeklyCoverProgramDialog({
  open,
  programId,
  programName,
  onClose,
  onCancelled,
}: {
  open: boolean
  programId: number
  programName: string
  onClose: () => void
  onCancelled: () => void
}) {
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState("")

  const handleCancel = async () => {
    setCancelling(true)
    setError("")
    try {
      await cancelWeeklyCoverProgram(programId)
      onCancelled()
      onClose()
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 502
          ? "Cancelling isn't available right now. Nothing was changed. Please try again in a minute."
          : err instanceof ApiError
            ? err.message
            : "Failed to cancel the program. Nothing was changed.",
      )
    } finally {
      setCancelling(false)
    }
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      onClose()
      setTimeout(() => { setError("") }, 200)
    }
  }

  const name = programName.trim() || WEEKLY_ACCESS_SECTION_LABEL

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel this program?</DialogTitle>
          <DialogDescription>
            {name} will stop scheduling new nights. Upcoming nights with no sales leave.
            Nights that already sold stay until refunds complete.
          </DialogDescription>
        </DialogHeader>
        <p className="text-xs text-neutral-400 dark:text-neutral-500">
          This does not delete ticket rows. Cancelling one date is a Cancel on that night
          card, not this control.
        </p>
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
            {error}
          </div>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" disabled={cancelling}>Keep program</Button>
          </DialogClose>
          <Button variant="danger" onClick={handleCancel} disabled={cancelling}>
            {cancelling && <Loader2 className="size-4 animate-spin" />}
            Cancel program
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
