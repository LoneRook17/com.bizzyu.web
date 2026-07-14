"use client"

import { Fragment, useState, useEffect, useCallback } from "react"
import { Plus, Ticket, MapPin, ChevronRight } from "lucide-react"
import { useAuth } from "@/lib/business/auth-context"
import { useVenue } from "@/lib/business/venue-context"
import { apiClient, ApiError } from "@/lib/business/api-client"
import type { PromoCode, PromoEventBreakdown } from "@/lib/business/types"
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

// SUM()-derived fields arrive as strings ("3", "25.00") — always coerce.
function money(n: number | string) {
  return `$${Number(n ?? 0).toFixed(2)}`
}

type BreakdownState = { loading: boolean; error: string; data: PromoEventBreakdown | null }

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

  // Per-event breakdown expansion (universal codes only).
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [breakdowns, setBreakdowns] = useState<Record<number, BreakdownState>>({})

  const fetchCodes = useCallback(() => {
    // Codes (and their cached breakdowns) are venue-scoped — drop them on reload.
    setExpandedId(null)
    setBreakdowns({})
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

  const toggleExpand = (code: PromoCode) => {
    // Only universal (venue) codes have a per-event breakdown. Event-scoped codes
    // live on one event — no dead affordance for them.
    if (code.event_id !== null) return
    const id = code.promo_code_id
    if (expandedId === id) {
      setExpandedId(null)
      return
    }
    setExpandedId(id)
    if (!breakdowns[id]) {
      setBreakdowns((b) => ({ ...b, [id]: { loading: true, error: "", data: null } }))
      apiClient
        .get<PromoEventBreakdown>(`/business/venues/${selectedVenueId}/promo-codes/${id}/breakdown`)
        .then((data) => setBreakdowns((b) => ({ ...b, [id]: { loading: false, error: "", data } })))
        .catch((err) =>
          setBreakdowns((b) => ({
            ...b,
            [id]: { loading: false, error: err instanceof ApiError ? err.message : "Failed to load breakdown", data: null },
          })),
        )
    }
  }

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
            Codes here apply to <span className="font-medium text-neutral-900 dark:text-neutral-100">every event at {venueName}</span>, now and in
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
        <Card className="flex items-start gap-3 border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 p-4">
          <MapPin className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            Select a specific venue (not “All venues”) in the sidebar to manage its universal promo codes.
          </p>
        </Card>
      ) : (
        <>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

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
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30 text-xs text-neutral-500 dark:text-neutral-400">
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
                      // Every code on this page is universal (venue-scoped), so all
                      // expand; gate on event_id anyway so an event-scoped row never
                      // renders a dead affordance.
                      const canExpand = code.event_id === null
                      const isExpanded = expandedId === code.promo_code_id
                      return (
                        <Fragment key={code.promo_code_id}>
                        <tr className="border-b border-neutral-50 dark:border-neutral-800/60 last:border-0">
                          <td className="px-5 py-3 font-mono text-xs font-medium text-neutral-900 dark:text-neutral-100">
                            {canExpand ? (
                              <button
                                type="button"
                                onClick={() => toggleExpand(code)}
                                aria-expanded={isExpanded}
                                className="group inline-flex items-center gap-1.5 -ml-1 rounded px-1 py-0.5 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                title="Show per-event breakdown"
                              >
                                <ChevronRight className={`size-3.5 shrink-0 text-neutral-400 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                                {code.code}
                              </button>
                            ) : (
                              code.code
                            )}
                          </td>
                          <td className="px-5 py-3 text-neutral-600 dark:text-neutral-400">
                            {code.discount_type === "percentage" ? `${code.discount_value}%` : `$${code.discount_value}`}
                          </td>
                          <td className="px-5 py-3 text-right text-neutral-600 dark:text-neutral-400">
                            {code.current_redemptions}
                            {code.max_redemptions ? ` / ${code.max_redemptions}` : ""}
                          </td>
                          <td className="px-5 py-3">
                            <Badge variant={status === "Active" ? "success" : "neutral"} size="sm">
                              {status}
                            </Badge>
                          </td>
                          <td className="px-5 py-3 text-xs text-neutral-500 dark:text-neutral-400">
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
                                    className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-700 dark:hover:text-red-300"
                                    onClick={() => setConfirm({ kind: "delete", code })}
                                  >
                                    Delete
                                  </Button>
                                ) : (
                                  <span
                                    className="px-3 text-[13px] font-semibold text-neutral-300 dark:text-neutral-600"
                                    title="Has redemptions, deactivate instead"
                                  >
                                    Delete
                                  </span>
                                )}
                              </span>
                            )}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="border-b border-neutral-50 dark:border-neutral-800/60">
                            <td colSpan={6} className="bg-neutral-50/60 dark:bg-neutral-800/20 px-5 py-4">
                              <PromoBreakdown state={breakdowns[code.promo_code_id]} />
                            </td>
                          </tr>
                        )}
                        </Fragment>
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
              {editingId && <p className="mt-1 text-[11px] text-neutral-400 dark:text-neutral-500">Code can’t be changed after creation.</p>}
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

            {formError && <p className="text-sm text-red-600 dark:text-red-400 sm:col-span-2">{formError}</p>}

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
                <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-400">{confirmError}</div>
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

/**
 * Per-event breakdown of a universal code: one row per event it applied to —
 * INCLUDING zero-usage events — with the venue-wide total below, so a host can
 * see the rows add up. Numbers are coerced (SUM() fields may be strings).
 */
function PromoBreakdown({ state }: { state: BreakdownState | undefined }) {
  if (!state || state.loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    )
  }
  if (state.error) {
    return <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
  }
  const data = state.data
  if (!data) return null

  const rows = data.events
  const aggUses = Number(data.aggregate?.redemptions ?? 0)
  const aggRev = Number(data.aggregate?.revenue_generated ?? 0)
  // Sum the rows ourselves and compare to the API's venue-wide total, so the
  // "it adds up" claim is shown, not asserted. Compare revenue in cents.
  const sumUses = rows.reduce((s, r) => s + Number(r.redemptions ?? 0), 0)
  const sumRev = rows.reduce((s, r) => s + Number(r.revenue_generated ?? 0), 0)
  const reconciles = sumUses === aggUses && Math.round(sumRev * 100) === Math.round(aggRev * 100)

  if (rows.length === 0) {
    return <p className="text-sm text-neutral-500 dark:text-neutral-400">This code doesn’t apply to any events yet.</p>
  }

  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Per-event usage</p>
      <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-100 dark:border-neutral-800 text-xs text-neutral-500 dark:text-neutral-400">
              <th className="px-4 py-2 text-left font-medium">Event</th>
              <th className="px-4 py-2 text-left font-medium">Date</th>
              <th className="px-4 py-2 text-right font-medium">Uses</th>
              <th className="px-4 py-2 text-right font-medium">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const uses = Number(r.redemptions ?? 0)
              const rev = Number(r.revenue_generated ?? 0)
              const isZero = uses === 0 && rev === 0
              return (
                <tr
                  key={r.event_id}
                  className={`border-b border-neutral-50 dark:border-neutral-800/60 last:border-0 ${isZero ? "text-neutral-400 dark:text-neutral-500" : "text-neutral-700 dark:text-neutral-300"}`}
                >
                  <td className="px-4 py-2">{r.event_name ?? `Event #${r.event_id}`}</td>
                  <td className="px-4 py-2 text-xs">{r.event_date ? formatDate(r.event_date) : "—"}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{uses}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{money(rev)}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-neutral-200 dark:border-neutral-700 font-semibold text-neutral-900 dark:text-neutral-100">
              <td className="px-4 py-2" colSpan={2}>All events</td>
              <td className="px-4 py-2 text-right tabular-nums">{aggUses}</td>
              <td className="px-4 py-2 text-right tabular-nums">{money(aggRev)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className={`mt-2 text-[11px] ${reconciles ? "text-neutral-500 dark:text-neutral-400" : "text-amber-600 dark:text-amber-400"}`}>
        {reconciles
          ? `The ${rows.length} row${rows.length === 1 ? "" : "s"} above add up to ${aggUses} ${aggUses === 1 ? "use" : "uses"} · ${money(aggRev)}.`
          : `Rows sum to ${sumUses} · ${money(sumRev)} but the venue total is ${aggUses} · ${money(aggRev)} — these don’t reconcile.`}
      </p>
    </div>
  )
}
