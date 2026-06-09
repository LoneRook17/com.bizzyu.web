"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Ticket, MapPin } from "lucide-react"
import { useAuth } from "@/lib/business/auth-context"
import { useVenue } from "@/lib/business/venue-context"
import { apiClient, ApiError } from "@/lib/business/api-client"
import type { PromoCode } from "@/lib/business/types"
import { PageHeader } from "@/components/business/v2/PageHeader"
import { Card } from "@/components/business/v2/ui/card"
import { Button } from "@/components/business/v2/ui/button"
import { Badge } from "@/components/business/v2/ui/badge"
import { Input, Select } from "@/components/business/v2/ui/input"
import { Label } from "@/components/business/v2/ui/label"
import { Skeleton } from "@/components/business/v2/ui/skeleton"
import { EmptyState } from "@/components/business/v2/ui/empty-state"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/business/v2/ui/dialog"

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

const EMPTY_FORM = {
  code: "",
  discount_type: "percentage" as "percentage" | "flat",
  discount_value: "",
  max_redemptions: "",
  max_per_user: "1",
  expires_at: "",
}

type ConfirmState =
  | { kind: "toggle"; code: PromoCode }
  | { kind: "delete"; code: PromoCode }
  | null

export default function UniversalPromoCodesPage() {
  const { user } = useAuth()
  const { selectedVenue, selectedVenueId, isAllVenues } = useVenue()

  const canManage = user?.business_role === "owner" || user?.business_role === "manager"
  const venueReady = !isAllVenues && selectedVenueId !== null && typeof selectedVenueId === "number"

  const [codes, setCodes] = useState<PromoCode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState("")

  const [confirm, setConfirm] = useState<ConfirmState>(null)
  const [confirmBusy, setConfirmBusy] = useState(false)
  const [confirmError, setConfirmError] = useState("")

  const fetchCodes = useCallback(() => {
    if (!venueReady) {
      setCodes([])
      setLoading(false)
      return
    }
    setLoading(true)
    apiClient
      .get<{ promo_codes: PromoCode[] }>(`/business/venues/${selectedVenueId}/promo-codes`)
      .then((data) => setCodes(data.promo_codes))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load promo codes"))
      .finally(() => setLoading(false))
  }, [venueReady, selectedVenueId])

  useEffect(() => {
    setError("")
    fetchCodes()
  }, [fetchCodes])

  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError("")
    setFormOpen(true)
  }

  const openEdit = (code: PromoCode) => {
    setEditingId(code.promo_code_id)
    setForm({
      code: code.code,
      discount_type: code.discount_type,
      discount_value: String(code.discount_value),
      max_redemptions: code.max_redemptions != null ? String(code.max_redemptions) : "",
      max_per_user: String(code.max_per_user),
      expires_at: code.expires_at ? code.expires_at.slice(0, 16) : "",
    })
    setFormError("")
    setFormOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.discount_value || (!editingId && !form.code.trim())) return
    setSaving(true)
    setFormError("")
    const payload = {
      discount_type: form.discount_type,
      discount_value: parseFloat(form.discount_value),
      max_redemptions: form.max_redemptions ? parseInt(form.max_redemptions) : null,
      max_per_user: parseInt(form.max_per_user) || 1,
      expires_at: form.expires_at || null,
    }
    try {
      if (editingId) {
        await apiClient.put(`/business/venues/${selectedVenueId}/promo-codes/${editingId}`, payload)
      } else {
        await apiClient.post(`/business/venues/${selectedVenueId}/promo-codes`, {
          code: form.code.trim().toUpperCase(),
          ...payload,
        })
      }
      setFormOpen(false)
      setEditingId(null)
      fetchCodes()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Failed to save promo code")
    } finally {
      setSaving(false)
    }
  }

  const runConfirm = async () => {
    if (!confirm) return
    setConfirmBusy(true)
    setConfirmError("")
    try {
      if (confirm.kind === "toggle") {
        await apiClient.put(`/business/venues/${selectedVenueId}/promo-codes/${confirm.code.promo_code_id}`, {
          is_active: !confirm.code.is_active,
        })
      } else {
        await apiClient.delete(`/business/venues/${selectedVenueId}/promo-codes/${confirm.code.promo_code_id}`)
      }
      setConfirm(null)
      fetchCodes()
    } catch (err) {
      // 409 on delete → has redemptions; surface message, suggest deactivate.
      setConfirmError(err instanceof ApiError ? err.message : "Something went wrong")
    } finally {
      setConfirmBusy(false)
    }
  }

  const venueName = selectedVenue ? selectedVenue.name : "this venue"

  return (
    <>
      <PageHeader
        title="Universal promo codes"
        description={
          <>
            Codes here apply to <span className="font-medium text-neutral-900">every event at {venueName}</span> — now and in
            the future. Usage limits count across all of those events.
          </>
        }
        actions={
          canManage && venueReady ? (
            <Button onClick={openCreate}>
              <Plus /> Create code
            </Button>
          ) : undefined
        }
      />

      {!venueReady ? (
        <Card className="flex items-start gap-3 border-amber-200 bg-amber-50 p-4">
          <MapPin className="mt-0.5 size-5 shrink-0 text-amber-600" />
          <p className="text-sm text-amber-800">
            Select a specific venue (not “All venues”) in the sidebar to manage its universal promo codes.
          </p>
        </Card>
      ) : (
        <>
          {error && <p className="text-sm text-red-600">{error}</p>}

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-48 w-full rounded-xl" />
            </div>
          ) : codes.length === 0 ? (
            <EmptyState
              icon={Ticket}
              title="No universal promo codes yet"
              description="Create one to offer a discount on every event at this venue."
              action={
                canManage ? (
                  <Button onClick={openCreate}>
                    <Plus /> Create code
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-100 bg-neutral-50/50 text-xs text-neutral-500">
                      <th className="px-5 py-3 text-left font-medium">Code</th>
                      <th className="px-5 py-3 text-left font-medium">Discount</th>
                      <th className="px-5 py-3 text-right font-medium">Uses</th>
                      <th className="px-5 py-3 text-left font-medium">Status</th>
                      <th className="px-5 py-3 text-left font-medium">Expires</th>
                      <th className="px-5 py-3 text-right font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {codes.map((code) => {
                      const isExpired = code.expires_at && new Date(code.expires_at) < new Date()
                      const isMaxed = code.max_redemptions && code.current_redemptions >= code.max_redemptions
                      const status = !code.is_active ? "Inactive" : isExpired ? "Expired" : isMaxed ? "Maxed" : "Active"
                      return (
                        <tr key={code.promo_code_id} className="border-b border-neutral-50 last:border-0">
                          <td className="px-5 py-3 font-mono text-xs font-medium text-neutral-900">{code.code}</td>
                          <td className="px-5 py-3 text-neutral-600">
                            {code.discount_type === "percentage" ? `${code.discount_value}%` : `$${code.discount_value}`}
                          </td>
                          <td className="px-5 py-3 text-right text-neutral-600">
                            {code.current_redemptions}
                            {code.max_redemptions ? ` / ${code.max_redemptions}` : ""}
                          </td>
                          <td className="px-5 py-3">
                            <Badge variant={status === "Active" ? "success" : "neutral"} size="sm">
                              {status}
                            </Badge>
                          </td>
                          <td className="px-5 py-3 text-xs text-neutral-500">
                            {code.expires_at ? formatDate(code.expires_at) : "Never"}
                          </td>
                          <td className="px-5 py-3 text-right whitespace-nowrap">
                            {canManage && (
                              <span className="inline-flex items-center gap-1">
                                <Button variant="ghost" size="sm" onClick={() => openEdit(code)}>
                                  Edit
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => setConfirm({ kind: "toggle", code })}>
                                  {code.is_active ? "Deactivate" : "Reactivate"}
                                </Button>
                                {code.current_redemptions === 0 ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                    onClick={() => setConfirm({ kind: "delete", code })}
                                  >
                                    Delete
                                  </Button>
                                ) : (
                                  <span
                                    className="px-3 text-[13px] font-semibold text-neutral-300"
                                    title="Has redemptions — deactivate instead"
                                  >
                                    Delete
                                  </span>
                                )}
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Create / edit dialog */}
      <Dialog open={formOpen} onOpenChange={(o) => !o && setFormOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit promo code" : "New universal promo code"}</DialogTitle>
            <DialogDescription>
              {editingId
                ? "Update the discount terms for this code."
                : `This code will work on every event at ${venueName}.`}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="pc-code" className="mb-1.5 block">Code</Label>
              <Input
                id="pc-code"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="e.g. FREE"
                disabled={!!editingId}
                className="font-mono"
                autoFocus={!editingId}
              />
              {editingId && <p className="mt-1 text-[11px] text-neutral-400">Code can’t be changed after creation.</p>}
            </div>

            <div>
              <Label htmlFor="pc-type" className="mb-1.5 block">Discount type</Label>
              <Select
                id="pc-type"
                value={form.discount_type}
                onChange={(e) => setForm((f) => ({ ...f, discount_type: e.target.value as "percentage" | "flat" }))}
              >
                <option value="percentage">Percentage (%)</option>
                <option value="flat">Flat ($)</option>
              </Select>
            </div>

            <div>
              <Label htmlFor="pc-value" className="mb-1.5 block">
                Discount value {form.discount_type === "percentage" ? "(%)" : "($)"}
              </Label>
              <Input
                id="pc-value"
                type="number"
                min="0"
                max={form.discount_type === "percentage" ? "100" : undefined}
                step="0.01"
                value={form.discount_value}
                onChange={(e) => setForm((f) => ({ ...f, discount_value: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="pc-max" className="mb-1.5 block">Max redemptions</Label>
              <Input
                id="pc-max"
                type="number"
                min="0"
                value={form.max_redemptions}
                onChange={(e) => setForm((f) => ({ ...f, max_redemptions: e.target.value }))}
                placeholder="Unlimited"
              />
            </div>

            <div>
              <Label htmlFor="pc-per-user" className="mb-1.5 block">Max per user</Label>
              <Input
                id="pc-per-user"
                type="number"
                min="1"
                value={form.max_per_user}
                onChange={(e) => setForm((f) => ({ ...f, max_per_user: e.target.value }))}
              />
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="pc-expires" className="mb-1.5 block">Expires at</Label>
              <Input
                id="pc-expires"
                type="datetime-local"
                value={form.expires_at}
                onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))}
              />
            </div>

            {formError && <p className="text-sm text-red-600 sm:col-span-2">{formError}</p>}

            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="secondary" onClick={() => setFormOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !form.discount_value || (!editingId && !form.code.trim())}>
                {saving ? "Saving…" : editingId ? "Save changes" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm (toggle / delete) dialog */}
      <Dialog
        open={confirm !== null}
        onOpenChange={(o) => {
          if (!o) {
            setConfirm(null)
            setConfirmError("")
          }
        }}
      >
        <DialogContent>
          {confirm && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {confirm.kind === "delete"
                    ? `Delete ${confirm.code.code}?`
                    : confirm.code.is_active
                      ? `Deactivate ${confirm.code.code}?`
                      : `Reactivate ${confirm.code.code}?`}
                </DialogTitle>
                <DialogDescription>
                  {confirm.kind === "delete"
                    ? "This permanently removes the code and can’t be undone."
                    : confirm.code.is_active
                      ? "Students won’t be able to use this code until you reactivate it."
                      : "This code will work again on every event at this venue."}
                </DialogDescription>
              </DialogHeader>

              {confirmError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{confirmError}</div>
              )}

              <DialogFooter>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setConfirm(null)
                    setConfirmError("")
                  }}
                  disabled={confirmBusy}
                >
                  Cancel
                </Button>
                <Button
                  variant={confirm.kind === "delete" ? "danger" : "primary"}
                  onClick={runConfirm}
                  disabled={confirmBusy}
                >
                  {confirmBusy
                    ? "Working…"
                    : confirm.kind === "delete"
                      ? "Delete"
                      : confirm.code.is_active
                        ? "Deactivate"
                        : "Reactivate"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
