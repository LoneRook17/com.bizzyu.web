"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { apiClient, ApiError } from "@/lib/business/api-client"
import { usd } from "@/lib/v2/utils"
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
} from "@/components/business/v2/ui/dialog"
import { Button } from "@/components/business/v2/ui/button"
import { Textarea } from "@/components/business/v2/ui/input"
import { Label } from "@/components/business/v2/ui/label"
import { Skeleton } from "@/components/business/v2/ui/skeleton"

interface RefundPreview {
  orderCount: number
  totalRefundAmount: number
  totalFees: number
  estimatedStripeFees: number
  transferReversalAmount: number
  totalBusinessCost: number
  freeOrderCount: number
}

interface CancelEventModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventId: number
  eventName: string
  onCancelled: () => void
}

export function CancelEventModal({ open, onOpenChange, eventId, eventName, onCancelled }: CancelEventModalProps) {
  const [reason, setReason] = useState("")
  const [preview, setPreview] = useState<RefundPreview | null>(null)
  const [loading, setLoading] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    if (!open) {
      setReason("")
      setError("")
      setSuccess("")
      return
    }
    setPreviewLoading(true)
    apiClient
      .get<RefundPreview>(`/business/events/${eventId}/refund-preview`)
      .then(setPreview)
      .catch(() => setPreview(null))
      .finally(() => setPreviewLoading(false))
  }, [open, eventId])

  const handleSubmit = async () => {
    if (reason.trim().length < 10) {
      setError("Reason must be at least 10 characters")
      return
    }
    setLoading(true)
    setError("")
    try {
      const result = await apiClient.post<{ status: string; message: string }>(
        `/business/events/${eventId}/request-cancellation`,
        { reason: reason.trim() }
      )
      setSuccess(result.message)
      setTimeout(() => {
        onCancelled()
        onOpenChange(false)
      }, 1500)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to submit cancellation request")
    } finally {
      setLoading(false)
    }
  }

  const hasPaidOrders = preview && preview.orderCount > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel {eventName}?</DialogTitle>
          {!success && !previewLoading && (
            <DialogDescription>
              {hasPaidOrders
                ? "This event has paid sales — cancelling needs admin approval and refunds all ticket holders."
                : "This event has no paid ticket sales. It will be cancelled immediately."}
            </DialogDescription>
          )}
        </DialogHeader>

        {success ? (
          <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-700">{success}</div>
        ) : (
          <>
            {previewLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : hasPaidOrders ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
                <p className="mb-2 font-semibold text-amber-800">
                  Cancelling a paid event requires reimbursing customers for the full ticket price plus processing fees.
                </p>
                <p className="mb-2 text-amber-900">
                  This event has {preview!.orderCount} paid order{preview!.orderCount !== 1 ? "s" : ""} totaling{" "}
                  <span className="font-semibold">{usd(preview!.totalRefundAmount)}</span> including fees.
                </p>
                <ul className="mb-2 list-disc space-y-0.5 pl-5 text-amber-900">
                  <li>All {preview!.orderCount} ticket holder{preview!.orderCount !== 1 ? "s" : ""} will receive full refunds</li>
                  <li>Your Stripe account will be debited (ticket revenue + processing fees, minus any clawed-back promoter commission)</li>
                  <li>This action cannot be undone</li>
                </ul>
                {preview!.freeOrderCount > 0 && (
                  <p className="mb-2 text-xs text-amber-600">
                    Plus {preview!.freeOrderCount} free order{preview!.freeOrderCount !== 1 ? "s" : ""} that will be cancelled (no refund needed).
                  </p>
                )}
                <p className="text-xs text-amber-600">Cancellation request will be submitted for admin approval.</p>
              </div>
            ) : null}

            <div>
              <Label htmlFor="cancel-reason" className="mb-1.5 block">Reason for cancellation</Label>
              <Textarea
                id="cancel-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Minimum 10 characters…"
                rows={3}
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <DialogFooter>
              <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={loading}>Keep event</Button>
              <Button variant="danger" onClick={handleSubmit} disabled={loading || reason.trim().length < 10}>
                {loading && <Loader2 className="animate-spin" />}
                {hasPaidOrders ? "Submit cancellation request" : "Cancel event"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
