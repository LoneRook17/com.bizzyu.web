"use client"

import { useState, useEffect, useCallback, useRef, use, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, ChevronDown, Loader2, Plus } from "lucide-react"
import { apiClient, ApiError } from "@/lib/business/api-client"
import { useAuth } from "@/lib/business/auth-context"
import { cn, money } from "@/lib/v2/utils"
import type { LineSkipInstanceAnalytics } from "@/lib/business/types"
import { PageHeader } from "@/components/business/v2/PageHeader"
import { Card, CardContent } from "@/components/business/v2/ui/card"
import { Badge } from "@/components/business/v2/ui/badge"
import { Button } from "@/components/business/v2/ui/button"
import { Skeleton } from "@/components/business/v2/ui/skeleton"
import { Input, Select } from "@/components/business/v2/ui/input"
import { Label } from "@/components/business/v2/ui/label"

interface PromoCode {
  id: number
  code: string
  discount_type: "percentage" | "flat"
  discount_value: number
  max_redemptions: number | null
  current_redemptions: number
  max_per_user: number
  is_active: boolean
  expires_at: string | null
  created_at: string
}

function formatHour(hour: number): string {
  const ampm = hour >= 12 ? "PM" : "AM"
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${hour12}${ampm}`
}
function formatDateTime(s: string): string {
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
}

function StatTile({ label, value, children }: { label: string; value?: string | number; children?: React.ReactNode }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-neutral-500 dark:text-neutral-400">{label}</p>
      {children ?? <p className="mt-0.5 text-lg font-semibold text-neutral-900 dark:text-neutral-100">{value}</p>}
    </Card>
  )
}

export default function InstanceDetailPage(props: { params: Promise<{ instanceId: string }> }) {
  return (
    <Suspense fallback={null}>
      <InstanceDetailInner {...props} />
    </Suspense>
  )
}

function InstanceDetailInner({ params }: { params: Promise<{ instanceId: string }> }) {
  const { instanceId } = use(params)
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const analyticsRef = useRef<HTMLDivElement>(null)
  const [analytics, setAnalytics] = useState<LineSkipInstanceAnalytics | null>(null)
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [attendeesExpanded, setAttendeesExpanded] = useState(false)
  const [promoExpanded, setPromoExpanded] = useState(false)

  const [showPromoForm, setShowPromoForm] = useState(false)
  const [promoForm, setPromoForm] = useState({
    code: "",
    discount_type: "percentage" as "percentage" | "flat",
    discount_value: "",
    max_redemptions: "",
    max_per_user: "1",
    expires_at: "",
  })
  const [promoLoading, setPromoLoading] = useState(false)
  const [promoError, setPromoError] = useState("")

  const [editingPromoId, setEditingPromoId] = useState<number | null>(null)
  const [editPromoForm, setEditPromoForm] = useState({
    discount_type: "percentage" as "percentage" | "flat",
    discount_value: "",
    max_redemptions: "",
    max_per_user: "1",
    expires_at: "",
  })
  const [editPromoLoading, setEditPromoLoading] = useState(false)
  const [editPromoError, setEditPromoError] = useState("")

  const [editingQuantity, setEditingQuantity] = useState(false)
  const [newCapacity, setNewCapacity] = useState("")
  const [quantityLoading, setQuantityLoading] = useState(false)
  const [quantityError, setQuantityError] = useState("")

  const canEdit = user?.business_role === "owner" || user?.business_role === "manager"
  const canViewAnalytics = canEdit
  const canEditPrice = canEdit

  const fetchData = useCallback(async () => {
    try {
      const promoData = await apiClient.get<{ promo_codes: PromoCode[] }>(`/business/line-skips/instances/${instanceId}/promo-codes`)
      setPromoCodes(promoData.promo_codes)
      if (canViewAnalytics) {
        const analyticsData = await apiClient.get<LineSkipInstanceAnalytics>(`/business/line-skips/instances/${instanceId}/analytics`)
        setAnalytics(analyticsData)
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load data")
    } finally {
      setLoading(false)
    }
  }, [instanceId, canViewAnalytics])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (searchParams.get("tab") === "analytics" && !loading && analyticsRef.current) {
      analyticsRef.current.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }, [searchParams, loading])

  const refreshPromos = async () => {
    const promoData = await apiClient.get<{ promo_codes: PromoCode[] }>(`/business/line-skips/instances/${instanceId}/promo-codes`)
    setPromoCodes(promoData.promo_codes)
  }

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault()
    setPromoLoading(true)
    setPromoError("")
    try {
      const payload: Record<string, unknown> = {
        code: promoForm.code.trim().toUpperCase(),
        discount_type: promoForm.discount_type,
        discount_value: parseFloat(promoForm.discount_value),
      }
      if (promoForm.max_redemptions) payload.max_redemptions = parseInt(promoForm.max_redemptions)
      if (promoForm.max_per_user) payload.max_per_user = parseInt(promoForm.max_per_user)
      if (promoForm.expires_at) payload.expires_at = promoForm.expires_at
      await apiClient.post(`/business/line-skips/instances/${instanceId}/promo-codes`, payload)
      setShowPromoForm(false)
      setPromoForm({ code: "", discount_type: "percentage", discount_value: "", max_redemptions: "", max_per_user: "1", expires_at: "" })
      await refreshPromos()
    } catch (err) {
      setPromoError(err instanceof ApiError ? err.message : "Failed to create promo code")
    } finally {
      setPromoLoading(false)
    }
  }

  const handleDeactivatePromo = async (promoId: number) => {
    try {
      await apiClient.delete(`/business/line-skips/promo-codes/${promoId}`)
      setPromoCodes((prev) => prev.map((p) => (p.id === promoId ? { ...p, is_active: false } : p)))
    } catch {
      await refreshPromos()
    }
  }

  const startEditPromo = (p: PromoCode) => {
    setEditingPromoId(p.id)
    setEditPromoForm({
      discount_type: p.discount_type,
      discount_value: p.discount_value.toString(),
      max_redemptions: p.max_redemptions?.toString() ?? "",
      max_per_user: p.max_per_user.toString(),
      expires_at: p.expires_at ? p.expires_at.split("T")[0] : "",
    })
    setEditPromoError("")
  }

  const handleUpdatePromo = async (promoId: number) => {
    setEditPromoLoading(true)
    setEditPromoError("")
    try {
      const payload: Record<string, unknown> = {
        discount_type: editPromoForm.discount_type,
        discount_value: parseFloat(editPromoForm.discount_value),
        max_per_user: parseInt(editPromoForm.max_per_user) || 1,
      }
      payload.max_redemptions = editPromoForm.max_redemptions ? parseInt(editPromoForm.max_redemptions) : null
      payload.expires_at = editPromoForm.expires_at ? editPromoForm.expires_at : null
      await apiClient.put(`/business/line-skips/promo-codes/${promoId}`, payload)
      setEditingPromoId(null)
      await refreshPromos()
    } catch (err) {
      setEditPromoError(err instanceof ApiError ? err.message : "Failed to update promo code")
    } finally {
      setEditPromoLoading(false)
    }
  }

  const handleUpdateQuantity = async () => {
    setQuantityLoading(true)
    setQuantityError("")
    try {
      const cap = newCapacity ? parseInt(newCapacity) : null
      if (cap !== null && analytics && cap < analytics.tickets_sold) {
        setQuantityError(`Cannot be less than ${analytics.tickets_sold} (already sold)`)
        setQuantityLoading(false)
        return
      }
      await apiClient.patch(`/business/line-skips/instances/${instanceId}`, { capacity: cap })
      setEditingQuantity(false)
      fetchData()
    } catch (err) {
      setQuantityError(err instanceof ApiError ? err.message : "Failed to update quantity")
    } finally {
      setQuantityLoading(false)
    }
  }

  if (loading) {
    return (
      <>
        <Skeleton className="h-7 w-44" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <Skeleton className="h-48 rounded-xl" />
      </>
    )
  }

  if (error || (canViewAnalytics && !analytics)) {
    return (
      <div className="py-16 text-center">
        <p className="mb-4 text-sm text-red-500 dark:text-red-400">{error || "Analytics not available"}</p>
        <Button variant="link" asChild>
          <Link href="/business/v2/line-skips">Back to line skips</Link>
        </Button>
      </div>
    )
  }

  const totalTickets = analytics ? analytics.channel_split.app + analytics.channel_split.web : 0
  const appPct = analytics && totalTickets > 0 ? Math.round((analytics.channel_split.app / totalTickets) * 100) : 0
  const webPct = totalTickets > 0 ? 100 - appPct : 0

  return (
    <>
      <PageHeader title="Night details" description={`Instance #${instanceId}`} />
      <Link href="/business/v2/line-skips" className="-mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100">
        <ArrowLeft className="size-4" /> Back to line skips
      </Link>

      {/* stat tiles */}
      {analytics && (
        <div ref={analyticsRef} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatTile label="Revenue" value={money(analytics.total_revenue_cents)} />
          <StatTile label="Tickets sold" value={analytics.tickets_sold} />
          <StatTile label="Line skip quantity">
            {editingQuantity ? (
              <div className="mt-1">
                <Input type="number" min="1" value={newCapacity} onChange={(e) => setNewCapacity(e.target.value)} placeholder="Unlimited" className="h-8" />
                {quantityError && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{quantityError}</p>}
                <div className="mt-1.5 flex gap-2">
                  <button onClick={handleUpdateQuantity} disabled={quantityLoading} className="text-xs font-medium text-[#05EB54] hover:underline disabled:opacity-50">
                    {quantityLoading ? "Saving..." : "Save"}
                  </button>
                  <button onClick={() => { setEditingQuantity(false); setQuantityError("") }} className="text-xs text-neutral-500 dark:text-neutral-400 hover:underline">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-0.5 flex items-baseline gap-1.5">
                <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  {analytics.capacity !== null ? `${analytics.tickets_sold} / ${analytics.capacity}` : "Unlimited"}
                </p>
                {canEditPrice && (
                  <button
                    onClick={() => { setNewCapacity(analytics.capacity?.toString() ?? ""); setEditingQuantity(true) }}
                    className="text-xs font-medium text-[#05EB54] hover:underline"
                  >
                    Edit
                  </button>
                )}
              </div>
            )}
          </StatTile>
          <StatTile label="Check-in rate" value={`${analytics.check_in_rate}%`} />
          <StatTile label="Checked in" value={analytics.checked_in} />
          <StatTile
            label="Current price"
            value={analytics.tickets.length > 0 ? money(analytics.tickets[analytics.tickets.length - 1]?.price_paid_cents ?? 0) : "—"}
          />
        </div>
      )}

      {/* channel split + purchase time */}
      {analytics && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardContent className="p-4">
              <h3 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Purchase channel</h3>
              {totalTickets === 0 ? (
                <p className="text-sm text-neutral-400 dark:text-neutral-500">No purchases yet</p>
              ) : (
                <>
                  <div className="mb-3 flex h-6 overflow-hidden rounded-full">
                    {appPct > 0 && (
                      <div className="flex items-center justify-center bg-[#05EB54] text-xs font-medium text-white" style={{ width: `${appPct}%` }}>
                        {appPct}%
                      </div>
                    )}
                    {webPct > 0 && (
                      <div className="flex items-center justify-center bg-blue-500 text-xs font-medium text-white" style={{ width: `${webPct}%` }}>
                        {webPct}%
                      </div>
                    )}
                  </div>
                  <div className="flex gap-4 text-xs">
                    <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-[#05EB54]" /> App: {analytics.channel_split.app}</span>
                    <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-blue-500" /> Web: {analytics.channel_split.web}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h3 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Purchase time</h3>
              {analytics.purchase_by_hour.length === 0 ? (
                <p className="text-sm text-neutral-400 dark:text-neutral-500">No purchases yet</p>
              ) : (
                <div className="flex h-24 items-end gap-1">
                  {(() => {
                    const maxCount = Math.max(...analytics.purchase_by_hour.map((r) => r.count), 1)
                    return analytics.purchase_by_hour.map((r) => (
                      <div key={r.hour} className="flex min-w-0 flex-1 flex-col items-center gap-0.5" title={`${formatHour(r.hour)}: ${r.count} purchases`}>
                        <span className="text-[9px] text-neutral-500 dark:text-neutral-400">{r.count}</span>
                        <div className="min-h-[2px] w-full rounded-t bg-[#05EB54]/70" style={{ height: `${(r.count / maxCount) * 100}%` }} />
                        <span className="text-[9px] text-neutral-400 dark:text-neutral-500">{formatHour(r.hour)}</span>
                      </div>
                    ))
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* attendees */}
      {analytics && (
        <Card>
          <CardContent className="p-4">
            <button onClick={() => setAttendeesExpanded(!attendeesExpanded)} className="flex w-full items-center justify-between">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Attendees ({analytics.tickets.length})</h3>
              <ChevronDown className={cn("size-5 text-neutral-400 dark:text-neutral-500 transition-transform", attendeesExpanded && "rotate-180")} />
            </button>
            {attendeesExpanded && (
              <div className="mt-3">
                {analytics.tickets.length === 0 ? (
                  <p className="py-4 text-center text-sm text-neutral-400 dark:text-neutral-500">No tickets sold yet</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-neutral-100 dark:border-neutral-800 text-xs text-neutral-500 dark:text-neutral-400">
                          <th className="py-2 text-left font-medium">Name</th>
                          <th className="py-2 text-left font-medium">Phone</th>
                          <th className="py-2 text-left font-medium">Purchased</th>
                          <th className="py-2 text-right font-medium">Paid</th>
                          <th className="py-2 text-center font-medium">Status</th>
                          <th className="py-2 text-left font-medium">Redeemed at</th>
                          <th className="py-2 text-left font-medium">Promo</th>
                          <th className="py-2 text-left font-medium">Source</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.tickets.map((t) => (
                          <tr key={t.id} className="border-b border-neutral-50 dark:border-neutral-800/60">
                            <td className="py-2 text-neutral-800 dark:text-neutral-200">{t.attendee_name}</td>
                            <td className="py-2 text-xs text-neutral-500 dark:text-neutral-400">{t.phone_number || "—"}</td>
                            <td className="py-2 text-xs text-neutral-500 dark:text-neutral-400">{formatDateTime(t.created_at)}</td>
                            <td className="py-2 text-right text-neutral-800 dark:text-neutral-200">{money(t.price_paid_cents)}</td>
                            <td className="py-2 text-center">
                              <Badge variant={t.is_redeemed ? "success" : "neutral"}>{t.is_redeemed ? "Checked in" : "Active"}</Badge>
                            </td>
                            <td className="py-2 text-xs text-neutral-500 dark:text-neutral-400">{t.redeemed_at ? formatDateTime(t.redeemed_at) : "—"}</td>
                            <td className="py-2 text-xs text-neutral-500 dark:text-neutral-400">{t.promo_code || "—"}</td>
                            <td className="py-2 text-xs text-neutral-500 dark:text-neutral-400">{t.user_id ? "App" : "Web"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* promo codes */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <button onClick={() => setPromoExpanded(!promoExpanded)} className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Promo codes ({promoCodes.length})</h3>
              <ChevronDown className={cn("size-5 text-neutral-400 dark:text-neutral-500 transition-transform", promoExpanded && "rotate-180")} />
            </button>
            {canEdit && (
              <Button variant="ghost" size="sm" onClick={() => { setShowPromoForm(true); setPromoExpanded(true) }}>
                <Plus className="size-3.5" /> Create
              </Button>
            )}
          </div>

          {promoExpanded && (
            <div className="mt-3">
              {/* create form */}
              {showPromoForm && (
                <form onSubmit={handleCreatePromo} className="mb-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 p-4">
                  <h4 className="mb-3 text-sm font-medium text-neutral-900 dark:text-neutral-100">New promo code</h4>
                  {promoError && <div className="mb-3 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-2 text-xs text-red-700 dark:text-red-400">{promoError}</div>}
                  <div className="mb-3 grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Code</Label>
                      <Input value={promoForm.code} onChange={(e) => setPromoForm((p) => ({ ...p, code: e.target.value }))} placeholder="e.g. VIP20" required className="h-8 uppercase" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Discount type</Label>
                      <Select value={promoForm.discount_type} onChange={(e) => setPromoForm((p) => ({ ...p, discount_type: e.target.value as "percentage" | "flat" }))} className="h-8">
                        <option value="percentage">Percentage (%)</option>
                        <option value="flat">Flat ($)</option>
                      </Select>
                    </div>
                  </div>
                  <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="space-y-1">
                      <Label className="text-xs">{promoForm.discount_type === "percentage" ? "Discount (%)" : "Discount ($)"}</Label>
                      <Input
                        type="number"
                        step={promoForm.discount_type === "percentage" ? "1" : "0.01"}
                        min={promoForm.discount_type === "percentage" ? "1" : "0.01"}
                        max={promoForm.discount_type === "percentage" ? "100" : undefined}
                        value={promoForm.discount_value}
                        onChange={(e) => setPromoForm((p) => ({ ...p, discount_value: e.target.value }))}
                        required
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Max redemptions</Label>
                      <Input type="number" min="1" value={promoForm.max_redemptions} onChange={(e) => setPromoForm((p) => ({ ...p, max_redemptions: e.target.value }))} placeholder="Unlimited" className="h-8" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Max per user</Label>
                      <Input type="number" min="1" value={promoForm.max_per_user} onChange={(e) => setPromoForm((p) => ({ ...p, max_per_user: e.target.value }))} className="h-8" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Expires</Label>
                      <Input type="date" value={promoForm.expires_at} onChange={(e) => setPromoForm((p) => ({ ...p, expires_at: e.target.value }))} className="h-8" />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="secondary" size="sm" onClick={() => { setShowPromoForm(false); setPromoError("") }}>Cancel</Button>
                    <Button type="submit" size="sm" disabled={promoLoading}>
                      {promoLoading && <Loader2 className="size-3.5 animate-spin" />}
                      Create promo code
                    </Button>
                  </div>
                </form>
              )}

              {/* list */}
              {promoCodes.length === 0 && !showPromoForm ? (
                <p className="py-4 text-center text-sm text-neutral-400 dark:text-neutral-500">No promo codes yet</p>
              ) : (
                promoCodes.length > 0 && (
                  <div className="space-y-2">
                    {promoCodes.map((p) => {
                      const isExpired = p.expires_at && new Date(p.expires_at) < new Date()
                      const isMaxedOut = p.max_redemptions !== null && p.current_redemptions >= p.max_redemptions
                      const isUsable = p.is_active && !isExpired
                      const statusLabel = !p.is_active ? "Inactive" : isExpired ? "Expired" : isMaxedOut ? "Maxed out" : "Active"
                      const statusVariant: "neutral" | "warning" | "success" = !p.is_active ? "neutral" : isExpired || isMaxedOut ? "warning" : "success"

                      return (
                        <div key={p.id} className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="rounded border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 px-2 py-1 font-mono text-xs font-semibold">{p.code}</span>
                              <span className="text-sm text-neutral-600 dark:text-neutral-400">
                                {p.discount_type === "percentage" ? `${p.discount_value}% off` : `${money(p.discount_value * 100)} off`}
                              </span>
                            </div>
                            <Badge variant={statusVariant}>{statusLabel}</Badge>
                          </div>
                          <div className="mt-2 flex items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400">
                            <span>{p.max_redemptions ? `${p.current_redemptions} / ${p.max_redemptions} used` : `${p.current_redemptions} used`}</span>
                            <span>{p.max_per_user} per user</span>
                            <span>{p.expires_at ? `Expires ${new Date(p.expires_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : "No expiry"}</span>
                          </div>
                          {canEdit && isUsable && editingPromoId !== p.id && (
                            <div className="mt-2 flex gap-3">
                              <button onClick={() => startEditPromo(p)} className="text-xs font-medium text-[#05EB54] hover:underline">Edit</button>
                              <button onClick={() => handleDeactivatePromo(p.id)} className="text-xs font-medium text-red-500 dark:text-red-400 hover:underline">Deactivate</button>
                            </div>
                          )}
                          {editingPromoId === p.id && (
                            <div className="mt-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 p-3">
                              {editPromoError && <div className="mb-3 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-2 text-xs text-red-700 dark:text-red-400">{editPromoError}</div>}
                              <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                                <div className="space-y-1">
                                  <Label className="text-xs">Discount type</Label>
                                  <Select value={editPromoForm.discount_type} onChange={(e) => setEditPromoForm((f) => ({ ...f, discount_type: e.target.value as "percentage" | "flat" }))} className="h-8">
                                    <option value="percentage">Percentage (%)</option>
                                    <option value="flat">Flat ($)</option>
                                  </Select>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">{editPromoForm.discount_type === "percentage" ? "Discount (%)" : "Discount ($)"}</Label>
                                  <Input
                                    type="number"
                                    step={editPromoForm.discount_type === "percentage" ? "1" : "0.01"}
                                    min={editPromoForm.discount_type === "percentage" ? "1" : "0.01"}
                                    max={editPromoForm.discount_type === "percentage" ? "100" : undefined}
                                    value={editPromoForm.discount_value}
                                    onChange={(e) => setEditPromoForm((f) => ({ ...f, discount_value: e.target.value }))}
                                    className="h-8"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Max redemptions</Label>
                                  <Input type="number" min="1" value={editPromoForm.max_redemptions} onChange={(e) => setEditPromoForm((f) => ({ ...f, max_redemptions: e.target.value }))} placeholder="Unlimited" className="h-8" />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Max per user</Label>
                                  <Input type="number" min="1" value={editPromoForm.max_per_user} onChange={(e) => setEditPromoForm((f) => ({ ...f, max_per_user: e.target.value }))} className="h-8" />
                                </div>
                              </div>
                              <div className="mb-3 grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <Label className="text-xs">Expires</Label>
                                  <Input type="date" value={editPromoForm.expires_at} onChange={(e) => setEditPromoForm((f) => ({ ...f, expires_at: e.target.value }))} className="h-8" />
                                </div>
                              </div>
                              <div className="flex justify-end gap-2">
                                <Button type="button" variant="secondary" size="sm" onClick={() => { setEditingPromoId(null); setEditPromoError("") }}>Cancel</Button>
                                <Button size="sm" onClick={() => handleUpdatePromo(p.id)} disabled={editPromoLoading}>
                                  {editPromoLoading && <Loader2 className="size-3.5 animate-spin" />}
                                  Save changes
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* promo usage analytics */}
      {analytics && analytics.promo_breakdown.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Promo code usage analytics</h3>
            <div className="mb-3 flex items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400">
              <span>{analytics.promo_usage.tickets_with_promo} tickets used a promo</span>
              <span>{money(analytics.promo_usage.total_discount_cents)} total discount</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 dark:border-neutral-800 text-xs text-neutral-500 dark:text-neutral-400">
                  <th className="py-2 text-left font-medium">Code</th>
                  <th className="py-2 text-left font-medium">Discount</th>
                  <th className="py-2 text-right font-medium">Used</th>
                  <th className="py-2 text-right font-medium">Total discount</th>
                </tr>
              </thead>
              <tbody>
                {analytics.promo_breakdown.map((p) => (
                  <tr key={p.promo_code_id} className="border-b border-neutral-50 dark:border-neutral-800/60">
                    <td className="py-2 font-mono text-xs">{p.code}</td>
                    <td className="py-2 text-neutral-600 dark:text-neutral-400">{p.discount_type === "percentage" ? `${p.discount_value}%` : money(p.discount_value * 100)}</td>
                    <td className="py-2 text-right">{p.times_used}</td>
                    <td className="py-2 text-right">{money(p.total_discount_cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </>
  )
}
