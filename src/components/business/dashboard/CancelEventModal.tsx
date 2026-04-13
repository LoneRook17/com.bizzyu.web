"use client"

import { useState, useEffect } from "react"
import { apiClient, ApiError } from "@/lib/business/api-client"

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
  onClose: () => void
  eventId: number
  eventName: string
  onCancelled: () => void
}

export default function CancelEventModal({
  open,
  onClose,
  eventId,
  eventName,
  onCancelled,
}: CancelEventModalProps) {
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
        { reason: reason.trim() },
      )
      setSuccess(result.message)
      setTimeout(() => {
        onCancelled()
        onClose()
      }, 1500)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to submit cancellation request")
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  const hasPaidOrders = preview && preview.orderCount > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-lg font-bold text-ink mb-1">Cancel {eventName}?</h2>

          {success ? (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
              {success}
            </div>
          ) : (
            <>
              {previewLoading ? (
                <div className="mt-4 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                </div>
              ) : hasPaidOrders ? (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                  <p className="font-semibold text-amber-800 mb-2">
                    This event has {preview.orderCount} paid order{preview.orderCount !== 1 ? "s" : ""}.
                  </p>
                  <p className="text-xs text-amber-700 mb-2">
                    Your business is responsible for reimbursing customers for the ticket price plus fees.
                  </p>
                  <div className="flex justify-between text-sm font-bold text-amber-900 mb-2">
                    <span>Total refund cost:</span>
                    <span>${preview.totalRefundAmount.toFixed(2)}</span>
                  </div>
                  {preview.freeOrderCount > 0 && (
                    <p className="text-xs text-amber-600 mb-2">
                      Plus {preview.freeOrderCount} free order{preview.freeOrderCount !== 1 ? "s" : ""} that will be cancelled (no refund needed).
                    </p>
                  )}
                  <p className="text-xs text-amber-600">
                    Cancellation request will be submitted for admin approval.
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-sm text-gray-600">
                  This event has no paid ticket sales. It will be cancelled immediately.
                </p>
              )}

              <div className="mt-4">
                <label htmlFor="cancel-reason" className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for cancellation
                </label>
                <textarea
                  id="cancel-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Minimum 10 characters..."
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none"
                />
              </div>

              {error && (
                <p className="mt-2 text-sm text-red-600">{error}</p>
              )}

              <div className="mt-6 flex gap-3 justify-end">
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Keep Event
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading || reason.trim().length < 10}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  {loading
                    ? "Submitting..."
                    : hasPaidOrders
                      ? "Submit Cancellation Request"
                      : "Cancel Event"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
