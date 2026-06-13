"use client"

import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"
import { apiClient, ApiError } from "@/lib/business/api-client"
import type { LineSkipInstance } from "@/lib/business/types"
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, DialogClose,
} from "@/components/business/v2/ui/dialog"
import { Button } from "@/components/business/v2/ui/button"
import { Input } from "@/components/business/v2/ui/input"
import { Label } from "@/components/business/v2/ui/label"
import { Textarea } from "@/components/business/v2/ui/input"

type ModalMode = "edit_price" | "edit_quantity" | "edit_details" | "cancel"

interface LineSkipRefundPreview {
  ticketCount: number
  totalRefundCents: number
  totalCustomerRefundCents: number
  transferReversalCents: number
  estimatedStripeFeesCents: number
  totalBusinessCostCents: number
  redeemedCount: number
  freeTicketCount: number
}

interface LineSkipInstanceModalProps {
  open: boolean
  mode: ModalMode
  instance: LineSkipInstance | null
  onClose: () => void
  onUpdated: () => void
}

function fmtDate(s: string): string {
  return new Date(s + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

const TITLES: Record<ModalMode, string> = {
  edit_price: "Edit price",
  edit_quantity: "Edit quantity",
  edit_details: "Edit details",
  cancel: "Cancel this night?",
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

  const [priceDisplay, setPriceDisplay] = useState("")
  const [newCapacity, setNewCapacity] = useState("")
  const [detailsForm, setDetailsForm] = useState({ capacity: "", start_time: "", end_time: "" })
  const [detailsPriceDisplay, setDetailsPriceDisplay] = useState("")

  const [cancellationReason, setCancellationReason] = useState("")
  const [cancelResult, setCancelResult] = useState("")
  const [refundPreview, setRefundPreview] = useState<LineSkipRefundPreview | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  useEffect(() => {
    if (instance) {
      setPriceDisplay((instance.price_cents / 100).toFixed(2))
      setNewCapacity(instance.capacity?.toString() ?? "")
      setDetailsForm({
        capacity: instance.capacity?.toString() ?? "",
        start_time: instance.start_time,
        end_time: instance.end_time,
      })
      setDetailsPriceDisplay((instance.price_cents / 100).toFixed(2))
      setCancellationReason("")
      setCancelResult("")
      setRefundPreview(null)
      setError("")
    }
  }, [instance, mode])

  useEffect(() => {
    if (!open || mode !== "cancel" || !instance) return
    setPreviewLoading(true)
    apiClient
      .get<LineSkipRefundPreview>(`/business/line-skips/instances/${instance.id}/refund-preview`)
      .then(setRefundPreview)
      .catch(() => setRefundPreview(null))
      .finally(() => setPreviewLoading(false))
  }, [open, mode, instance])

  if (!instance) return null

  const handleEditPrice = async () => {
    const dollars = parseFloat(priceDisplay)
    const cents = !isNaN(dollars) ? Math.round(dollars * 100) : 0
    if (cents <= 0) {
      setError("Price must be greater than $0")
      return
    }
    setLoading(true)
    setError("")
    try {
      await apiClient.patch(`/business/line-skips/instances/${instance.id}/price`, { price_cents: cents })
      onUpdated()
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update price")
    } finally {
      setLoading(false)
    }
  }

  const handleEditQuantity = async () => {
    if (newCapacity && parseInt(newCapacity) < instance.tickets_sold) {
      setError(`Quantity cannot be less than ${instance.tickets_sold} (tickets already sold)`)
      return
    }
    setLoading(true)
    setError("")
    try {
      await apiClient.patch(`/business/line-skips/instances/${instance.id}`, {
        capacity: newCapacity ? parseInt(newCapacity) : null,
      })
      onUpdated()
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update quantity")
    } finally {
      setLoading(false)
    }
  }

  const handleEditDetails = async () => {
    const dollars = parseFloat(detailsPriceDisplay)
    const cents = !isNaN(dollars) ? Math.round(dollars * 100) : 0
    if (cents <= 0) {
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
        price_cents: cents,
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
      const result = await apiClient.post<{ status: string; message: string }>(
        `/business/line-skips/instances/${instance.id}/request-cancellation`,
        { reason: cancellationReason.trim() }
      )
      const msg =
        result.status === "pending_approval"
          ? "Cancellation request submitted for admin approval. You will be notified when approved."
          : result.message
      setCancelResult(msg)
      setTimeout(() => {
        onUpdated()
        onClose()
      }, 2000)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to cancel night")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{TITLES[mode]}</DialogTitle>
          <DialogDescription>{fmtDate(instance.date)}</DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-2.5 text-xs text-red-700 dark:text-red-400">{error}</div>
        )}

        {/* Edit price */}
        {mode === "edit_price" && (
          <>
            <div className="space-y-1.5">
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Current price: ${(instance.price_cents / 100).toFixed(2)}</p>
              <Label htmlFor="ls_price">New price</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-500 dark:text-neutral-400">$</span>
                <Input
                  id="ls_price"
                  type="text"
                  inputMode="decimal"
                  value={priceDisplay}
                  onChange={(e) => setPriceDisplay(e.target.value)}
                  onBlur={() => {
                    const d = parseFloat(priceDisplay)
                    setPriceDisplay(!isNaN(d) && d > 0 ? (Math.round(d * 100) / 100).toFixed(2) : "")
                  }}
                  placeholder="0.00"
                  className="pl-7"
                />
              </div>
            </div>
            {instance.tickets_sold > 0 && (
              <div className="rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 p-2.5 text-xs text-amber-800 dark:text-amber-300">
                This applies to new purchases only. {instance.tickets_sold} ticket{instance.tickets_sold !== 1 ? "s" : ""} already sold at current price.
              </div>
            )}
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="secondary" disabled={loading}>Cancel</Button>
              </DialogClose>
              <Button onClick={handleEditPrice} disabled={loading}>
                {loading && <Loader2 className="size-4 animate-spin" />}
                Update price
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Edit quantity */}
        {mode === "edit_quantity" && (
          <>
            <div className="space-y-1.5">
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Current: {instance.capacity ? `${instance.tickets_sold} / ${instance.capacity}` : `${instance.tickets_sold} sold (unlimited)`}
              </p>
              <Label htmlFor="ls_qty">New quantity</Label>
              <Input
                id="ls_qty"
                type="number"
                min="1"
                value={newCapacity}
                onChange={(e) => setNewCapacity(e.target.value)}
                placeholder="Leave blank for unlimited"
              />
              {instance.tickets_sold > 0 && (
                <p className="text-xs text-neutral-400 dark:text-neutral-500">Minimum: {instance.tickets_sold} (already sold)</p>
              )}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="secondary" disabled={loading}>Cancel</Button>
              </DialogClose>
              <Button onClick={handleEditQuantity} disabled={loading}>
                {loading && <Loader2 className="size-4 animate-spin" />}
                Update quantity
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Edit details */}
        {mode === "edit_details" && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="ls_dprice">Price</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-500 dark:text-neutral-400">$</span>
                <Input
                  id="ls_dprice"
                  type="text"
                  inputMode="decimal"
                  value={detailsPriceDisplay}
                  onChange={(e) => setDetailsPriceDisplay(e.target.value)}
                  onBlur={() => {
                    const d = parseFloat(detailsPriceDisplay)
                    setDetailsPriceDisplay(!isNaN(d) && d > 0 ? (Math.round(d * 100) / 100).toFixed(2) : "")
                  }}
                  placeholder="0.00"
                  className="pl-7"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ls_dqty">Line skip quantity</Label>
              <Input
                id="ls_dqty"
                type="number"
                min="1"
                value={detailsForm.capacity}
                onChange={(e) => setDetailsForm((prev) => ({ ...prev, capacity: e.target.value }))}
                placeholder="Leave blank for unlimited"
              />
              {instance.tickets_sold > 0 && (
                <p className="text-xs text-neutral-400 dark:text-neutral-500">Minimum: {instance.tickets_sold} (already sold)</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ls_dstart">Start time</Label>
                <Input id="ls_dstart" type="time" value={detailsForm.start_time} onChange={(e) => setDetailsForm((prev) => ({ ...prev, start_time: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ls_dend">End time</Label>
                <Input id="ls_dend" type="time" value={detailsForm.end_time} onChange={(e) => setDetailsForm((prev) => ({ ...prev, end_time: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="secondary" disabled={loading}>Cancel</Button>
              </DialogClose>
              <Button onClick={handleEditDetails} disabled={loading}>
                {loading && <Loader2 className="size-4 animate-spin" />}
                Save changes
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Cancel */}
        {mode === "cancel" && (
          <>
            {cancelResult ? (
              <div className="rounded-lg border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/40 p-3 text-sm text-green-700 dark:text-green-400">{cancelResult}</div>
            ) : (
              <>
                {previewLoading ? (
                  <div className="space-y-2">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                    <div className="h-4 w-1/2 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                    <div className="h-20 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                  </div>
                ) : refundPreview && refundPreview.ticketCount > 0 ? (
                  <div className="rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 p-3 text-sm">
                    <p className="mb-2 font-semibold text-amber-800 dark:text-amber-300">
                      This night has {refundPreview.ticketCount} paid ticket{refundPreview.ticketCount !== 1 ? "s" : ""}.
                    </p>
                    <div className="flex justify-between text-sm text-amber-900 dark:text-amber-300">
                      <span>Customer receives:</span>
                      <span>${(refundPreview.totalCustomerRefundCents / 100).toFixed(2)}</span>
                    </div>
                    <div className="mb-1 flex justify-between text-sm font-bold text-amber-900 dark:text-amber-300">
                      <span>Your business pays:</span>
                      <span>${(refundPreview.totalBusinessCostCents / 100).toFixed(2)}</span>
                    </div>
                    <p className="mb-2 text-xs text-amber-700 dark:text-amber-400">
                      Ticket price plus Stripe processing fee. Bizzy absorbs its platform fee.
                    </p>
                    {refundPreview.freeTicketCount > 0 && (
                      <p className="mb-2 text-xs text-amber-600 dark:text-amber-400">
                        Plus {refundPreview.freeTicketCount} free ticket{refundPreview.freeTicketCount !== 1 ? "s" : ""} that will be cancelled (no refund needed).
                      </p>
                    )}
                    <p className="text-xs text-amber-600 dark:text-amber-400">Cancellation request will be submitted for admin approval.</p>
                  </div>
                ) : refundPreview && refundPreview.freeTicketCount > 0 ? (
                  <div className="rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 p-3 text-sm">
                    <p className="mb-1 font-semibold text-amber-800 dark:text-amber-300">
                      This night has {refundPreview.freeTicketCount} ticket{refundPreview.freeTicketCount !== 1 ? "s" : ""}.
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-400">No paid tickets to refund. Tickets will be cancelled immediately.</p>
                  </div>
                ) : (
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">This night has no tickets sold. It will be cancelled immediately.</p>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="ls_reason">Reason for cancellation</Label>
                  <Textarea
                    id="ls_reason"
                    value={cancellationReason}
                    onChange={(e) => setCancellationReason(e.target.value)}
                    rows={3}
                    placeholder="Reason for cancellation"
                    className="resize-none"
                  />
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="secondary" disabled={loading}>Keep</Button>
                  </DialogClose>
                  <Button variant="danger" onClick={handleCancel} disabled={loading || !cancellationReason.trim()}>
                    {loading && <Loader2 className="size-4 animate-spin" />}
                    {refundPreview && refundPreview.ticketCount > 0 ? "Submit cancellation request" : "Cancel night"}
                  </Button>
                </DialogFooter>
              </>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
