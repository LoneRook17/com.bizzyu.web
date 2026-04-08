"use client"

import { useState, useEffect } from "react"
import { apiClient, ApiError } from "@/lib/business/api-client"
import type { LineSkipInstance } from "@/lib/business/types"

type ModalMode = "edit_price" | "edit_details" | "cancel"

interface LineSkipInstanceModalProps {
  open: boolean
  mode: ModalMode
  instance: LineSkipInstance | null
  onClose: () => void
  onUpdated: () => void
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export default function LineSkipInstanceModal({
  open,
  mode,
  instance,
  onClose,
  onUpdated,
}: LineSkipInstanceModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Edit price state
  const [newPriceCents, setNewPriceCents] = useState(0)

  // Edit details state
  const [detailsForm, setDetailsForm] = useState({
    price_cents: 0,
    capacity: "",
    start_time: "",
    end_time: "",
  })

  // Cancel state
  const [cancellationReason, setCancellationReason] = useState("")

  useEffect(() => {
    if (instance) {
      setNewPriceCents(instance.price_cents)
      setDetailsForm({
        price_cents: instance.price_cents,
        capacity: instance.capacity?.toString() ?? "",
        start_time: instance.start_time,
        end_time: instance.end_time,
      })
      setCancellationReason("")
      setError("")
    }
  }, [instance, mode])

  if (!open || !instance) return null

  const handleEditPrice = async () => {
    if (newPriceCents <= 0) {
      setError("Price must be greater than $0")
      return
    }
    setLoading(true)
    setError("")
    try {
      await apiClient.patch(`/business/line-skips/instances/${instance.id}/price`, {
        price_cents: newPriceCents,
      })
      onUpdated()
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update price")
    } finally {
      setLoading(false)
    }
  }

  const handleEditDetails = async () => {
    if (detailsForm.price_cents <= 0) {
      setError("Price must be greater than $0")
      return
    }
    if (detailsForm.capacity && parseInt(detailsForm.capacity) < instance.tickets_sold) {
      setError(`Capacity cannot be less than ${instance.tickets_sold} (tickets already sold)`)
      return
    }
    setLoading(true)
    setError("")
    try {
      await apiClient.patch(`/business/line-skips/instances/${instance.id}`, {
        price_cents: detailsForm.price_cents,
        capacity: detailsForm.capacity ? parseInt(detailsForm.capacity) : null,
        start_time: detailsForm.start_time,
        end_time: detailsForm.end_time,
      })
      onUpdated()
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update details")
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!cancellationReason.trim()) {
      setError("Cancellation reason is required")
      return
    }
    setLoading(true)
    setError("")
    try {
      await apiClient.post(`/business/line-skips/instances/${instance.id}/cancel`, {
        reason: cancellationReason.trim(),
      })
      onUpdated()
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to cancel night")
    } finally {
      setLoading(false)
    }
  }

  const titles: Record<ModalMode, string> = {
    edit_price: "Edit Price",
    edit_details: "Edit Details",
    cancel: "Cancel Night",
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative rounded-xl bg-white p-6 shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-ink mb-1">{titles[mode]}</h3>
        <p className="text-xs text-gray-500 mb-4">{formatDate(instance.date)}</p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-2.5 text-xs text-red-700">
            {error}
          </div>
        )}

        {/* Edit Price Mode */}
        {mode === "edit_price" && (
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Current price: ${(instance.price_cents / 100).toFixed(2)}</p>
              <label className="block text-sm font-medium text-ink mb-1">New Price</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={(newPriceCents / 100).toFixed(2)}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value)
                    setNewPriceCents(!isNaN(v) ? Math.round(v * 100) : 0)
                  }}
                  className="w-full rounded-lg border border-gray-300 pl-7 pr-3 py-2 text-sm text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
            {instance.tickets_sold > 0 && (
              <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-2.5 text-xs text-yellow-800">
                This applies to new purchases only. {instance.tickets_sold} ticket{instance.tickets_sold !== 1 ? "s" : ""} already sold at current price.
              </div>
            )}
            <div className="flex gap-3 justify-end pt-2">
              <button type="button" onClick={onClose} disabled={loading} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer">
                Cancel
              </button>
              <button type="button" onClick={handleEditPrice} disabled={loading} className="rounded-lg bg-gradient-to-br from-[#2ECB4E] to-[#05EB54] px-4 py-2 text-sm font-semibold text-white hover:brightness-110 transition-all disabled:opacity-60 cursor-pointer">
                {loading ? "Saving..." : "Update Price"}
              </button>
            </div>
          </div>
        )}

        {/* Edit Details Mode */}
        {mode === "edit_details" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Price</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={(detailsForm.price_cents / 100).toFixed(2)}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value)
                    setDetailsForm((prev) => ({ ...prev, price_cents: !isNaN(v) ? Math.round(v * 100) : 0 }))
                  }}
                  className="w-full rounded-lg border border-gray-300 pl-7 pr-3 py-2 text-sm text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Capacity</label>
              <input
                type="number"
                min="1"
                value={detailsForm.capacity}
                onChange={(e) => setDetailsForm((prev) => ({ ...prev, capacity: e.target.value }))}
                placeholder="Leave blank for unlimited"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
              {instance.tickets_sold > 0 && (
                <p className="mt-1 text-xs text-gray-400">Minimum: {instance.tickets_sold} (already sold)</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Start Time</label>
                <input
                  type="time"
                  value={detailsForm.start_time}
                  onChange={(e) => setDetailsForm((prev) => ({ ...prev, start_time: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">End Time</label>
                <input
                  type="time"
                  value={detailsForm.end_time}
                  onChange={(e) => setDetailsForm((prev) => ({ ...prev, end_time: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button type="button" onClick={onClose} disabled={loading} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer">
                Cancel
              </button>
              <button type="button" onClick={handleEditDetails} disabled={loading} className="rounded-lg bg-gradient-to-br from-[#2ECB4E] to-[#05EB54] px-4 py-2 text-sm font-semibold text-white hover:brightness-110 transition-all disabled:opacity-60 cursor-pointer">
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        )}

        {/* Cancel Mode */}
        {mode === "cancel" && (
          <div className="space-y-4">
            {instance.tickets_sold > 0 && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-2.5 text-xs text-red-700">
                This will cancel {instance.tickets_sold} sold ticket{instance.tickets_sold !== 1 ? "s" : ""} and issue refunds.
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Reason for cancellation</label>
              <textarea
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                rows={3}
                placeholder="Why is this night being cancelled?"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
              />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button type="button" onClick={onClose} disabled={loading} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer">
                Go Back
              </button>
              <button type="button" onClick={handleCancel} disabled={loading} className="rounded-lg bg-red-600 hover:bg-red-700 px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-60 cursor-pointer">
                {loading ? "Cancelling..." : "Cancel Night"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
