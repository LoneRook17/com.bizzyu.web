"use client"

import { useState, useEffect, useCallback, useRef, use } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { apiClient, ApiError } from "@/lib/business/api-client"
import { useAuth } from "@/lib/business/auth-context"
import type { LineSkipInstanceAnalytics } from "@/lib/business/types"

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(":")
  const hour = parseInt(h)
  const ampm = hour >= 12 ? "PM" : "AM"
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${hour12}:${m} ${ampm}`
}

function formatHour(hour: number): string {
  const ampm = hour >= 12 ? "PM" : "AM"
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${hour12}${ampm}`
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

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

interface InstanceInfo {
  id: number
  line_skip_id: number
  date: string
  start_time: string
  end_time: string
  price_cents: number
  capacity: number | null
  status: string
  tickets_sold: number
}

export default function InstanceDetailPage({ params }: { params: Promise<{ instanceId: string }> }) {
  const { instanceId } = use(params)
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const analyticsRef = useRef<HTMLDivElement>(null)
  const [analytics, setAnalytics] = useState<LineSkipInstanceAnalytics | null>(null)
  const [instanceInfo, setInstanceInfo] = useState<InstanceInfo | null>(null)
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Expandable sections
  const [attendeesExpanded, setAttendeesExpanded] = useState(false)
  const [promoExpanded, setPromoExpanded] = useState(false)

  // Create promo form
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

  // Edit promo form
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

  // Edit quantity
  const [editingQuantity, setEditingQuantity] = useState(false)
  const [newCapacity, setNewCapacity] = useState("")
  const [quantityLoading, setQuantityLoading] = useState(false)
  const [quantityError, setQuantityError] = useState("")

  const canEdit = user?.business_role === "owner" || user?.business_role === "manager"
  const canViewAnalytics = canEdit
  const canEditPrice = canEdit

  const fetchData = useCallback(async () => {
    try {
      const promoData = await apiClient.get<{ promo_codes: PromoCode[] }>(
        `/business/line-skips/instances/${instanceId}/promo-codes`
      )
      setPromoCodes(promoData.promo_codes)

      if (canViewAnalytics) {
        const analyticsData = await apiClient.get<LineSkipInstanceAnalytics>(
          `/business/line-skips/instances/${instanceId}/analytics`
        )
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

  // Scroll to analytics section when ?tab=analytics
  useEffect(() => {
    if (searchParams.get("tab") === "analytics" && !loading && analyticsRef.current) {
      analyticsRef.current.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }, [searchParams, loading])

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
      // Refresh promo codes
      const promoData = await apiClient.get<{ promo_codes: PromoCode[] }>(
        `/business/line-skips/instances/${instanceId}/promo-codes`
      )
      setPromoCodes(promoData.promo_codes)
    } catch (err) {
      setPromoError(err instanceof ApiError ? err.message : "Failed to create promo code")
    } finally {
      setPromoLoading(false)
    }
  }

  const handleDeactivatePromo = async (promoId: number) => {
    try {
      await apiClient.delete(`/business/line-skips/promo-codes/${promoId}`)
      setPromoCodes((prev) => prev.map((p) => p.id === promoId ? { ...p, is_active: false } : p))
    } catch (err) {
      // Refresh to get real state
      const promoData = await apiClient.get<{ promo_codes: PromoCode[] }>(
        `/business/line-skips/instances/${instanceId}/promo-codes`
      )
      setPromoCodes(promoData.promo_codes)
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
      payload.max_redemptions = editPromoForm.max_redemptions
        ? parseInt(editPromoForm.max_redemptions)
        : null
      if (editPromoForm.expires_at) payload.expires_at = editPromoForm.expires_at
      else payload.expires_at = null

      await apiClient.put(`/business/line-skips/promo-codes/${promoId}`, payload)
      setEditingPromoId(null)
      const promoData = await apiClient.get<{ promo_codes: PromoCode[] }>(
        `/business/line-skips/instances/${instanceId}/promo-codes`
      )
      setPromoCodes(promoData.promo_codes)
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
      await apiClient.patch(`/business/line-skips/instances/${instanceId}`, {
        capacity: cap,
      })
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
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-gray-200 rounded w-48" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-20 bg-gray-200 rounded-xl" />)}
        </div>
        <div className="h-48 bg-gray-200 rounded-xl" />
      </div>
    )
  }

  if (error || (canViewAnalytics && !analytics)) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-red-500 mb-4">{error || "Analytics not available"}</p>
        <Link href="/business/line-skips" className="text-sm text-primary hover:underline">
          Back to Line Skips
        </Link>
      </div>
    )
  }

  const totalTickets = analytics ? analytics.channel_split.app + analytics.channel_split.web : 0
  const appPct = analytics && totalTickets > 0 ? Math.round((analytics.channel_split.app / totalTickets) * 100) : 0
  const webPct = totalTickets > 0 ? 100 - appPct : 0

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link href="/business/line-skips" className="text-xs text-gray-500 hover:text-primary mb-2 inline-block">
          &larr; Back to Line Skips
        </Link>
        <h1 className="text-xl font-bold text-ink">Night Details</h1>
        <p className="text-sm text-gray-500 mt-1">Instance #{instanceId}</p>
      </div>

      {/* Stats cards — matching Flutter layout */}
      {analytics && (
      <div ref={analyticsRef} className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Revenue</p>
          <p className="text-lg font-semibold text-ink">{formatPrice(analytics.total_revenue_cents)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Tickets Sold</p>
          <p className="text-lg font-semibold text-ink">{analytics.tickets_sold}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Line Skip Quantity</p>
          {editingQuantity ? (
            <div className="mt-1">
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  value={newCapacity}
                  onChange={(e) => setNewCapacity(e.target.value)}
                  placeholder="Unlimited"
                  className="w-full rounded border border-gray-300 px-2 py-1 text-sm text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              {quantityError && <p className="text-xs text-red-500 mt-1">{quantityError}</p>}
              <div className="flex gap-2 mt-1.5">
                <button
                  onClick={handleUpdateQuantity}
                  disabled={quantityLoading}
                  className="text-xs font-medium text-primary hover:underline cursor-pointer disabled:opacity-50"
                >
                  {quantityLoading ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => { setEditingQuantity(false); setQuantityError("") }}
                  className="text-xs text-gray-500 hover:underline cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-baseline gap-1.5">
              <p className="text-lg font-semibold text-ink">
                {analytics.capacity !== null
                  ? `${analytics.tickets_sold} / ${analytics.capacity}`
                  : "Unlimited"}
              </p>
              {canEditPrice && (
                <button
                  onClick={() => {
                    setNewCapacity(analytics.capacity?.toString() ?? "")
                    setEditingQuantity(true)
                  }}
                  className="text-xs text-primary hover:underline cursor-pointer font-medium"
                >
                  Edit
                </button>
              )}
            </div>
          )}
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Check-in Rate</p>
          <p className="text-lg font-semibold text-ink">{analytics.check_in_rate}%</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Checked In</p>
          <p className="text-lg font-semibold text-ink">{analytics.checked_in}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Current Price</p>
          <p className="text-lg font-semibold text-ink">
            {analytics.tickets.length > 0
              ? formatPrice(analytics.tickets[analytics.tickets.length - 1]?.price_paid_cents ?? 0)
              : analytics.capacity !== null ? "—" : "—"}
          </p>
        </div>
      </div>
      )}

      {/* Channel split + Purchase time row */}
      {analytics && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Channel split */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-ink mb-3">Purchase Channel</h3>
          {totalTickets === 0 ? (
            <p className="text-sm text-gray-400">No purchases yet</p>
          ) : (
            <>
              <div className="flex rounded-full h-6 overflow-hidden mb-3">
                {appPct > 0 && (
                  <div
                    className="bg-primary flex items-center justify-center text-white text-xs font-medium"
                    style={{ width: `${appPct}%` }}
                  >
                    {appPct}%
                  </div>
                )}
                {webPct > 0 && (
                  <div
                    className="bg-blue-500 flex items-center justify-center text-white text-xs font-medium"
                    style={{ width: `${webPct}%` }}
                  >
                    {webPct}%
                  </div>
                )}
              </div>
              <div className="flex gap-4 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                  App: {analytics.channel_split.app}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  Web: {analytics.channel_split.web}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Purchase time distribution */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-ink mb-3">Purchase Time</h3>
          {analytics.purchase_by_hour.length === 0 ? (
            <p className="text-sm text-gray-400">No purchases yet</p>
          ) : (
            <div className="flex items-end gap-1 h-24">
              {(() => {
                const maxCount = Math.max(...analytics.purchase_by_hour.map(r => r.count), 1)
                return analytics.purchase_by_hour.map((r) => (
                  <div
                    key={r.hour}
                    className="flex-1 flex flex-col items-center gap-0.5 min-w-0"
                    title={`${formatHour(r.hour)}: ${r.count} purchases`}
                  >
                    <span className="text-[9px] text-gray-500">{r.count}</span>
                    <div
                      className="w-full bg-primary/70 rounded-t min-h-[2px]"
                      style={{ height: `${(r.count / maxCount) * 100}%` }}
                    />
                    <span className="text-[9px] text-gray-400">{formatHour(r.hour)}</span>
                  </div>
                ))
              })()}
            </div>
          )}
        </div>
      </div>
      )}

      {/* Attendees — expandable */}
      {analytics && (
      <div className="rounded-xl border border-gray-200 bg-white p-4 mb-4">
        <button
          onClick={() => setAttendeesExpanded(!attendeesExpanded)}
          className="flex items-center justify-between w-full cursor-pointer"
        >
          <h3 className="text-sm font-semibold text-ink">Attendees ({analytics.tickets.length})</h3>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${attendeesExpanded ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {attendeesExpanded && (
          <div className="mt-3">
            {analytics.tickets.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No tickets sold yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 border-b border-gray-100">
                      <th className="text-left py-2 font-medium">Name</th>
                      <th className="text-left py-2 font-medium">Phone</th>
                      <th className="text-left py-2 font-medium">Purchased</th>
                      <th className="text-right py-2 font-medium">Paid</th>
                      <th className="text-center py-2 font-medium">Status</th>
                      <th className="text-left py-2 font-medium">Redeemed At</th>
                      <th className="text-left py-2 font-medium">Promo</th>
                      <th className="text-left py-2 font-medium">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.tickets.map((t) => (
                      <tr key={t.id} className="border-b border-gray-50">
                        <td className="py-2">{t.attendee_name}</td>
                        <td className="py-2 text-gray-500 text-xs">{t.phone_number || "—"}</td>
                        <td className="py-2 text-gray-500 text-xs">{formatDateTime(t.created_at)}</td>
                        <td className="py-2 text-right">{formatPrice(t.price_paid_cents)}</td>
                        <td className="py-2 text-center">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            t.is_redeemed
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-600"
                          }`}>
                            {t.is_redeemed ? "Checked In" : "Active"}
                          </span>
                        </td>
                        <td className="py-2 text-xs text-gray-500">
                          {t.redeemed_at ? formatDateTime(t.redeemed_at) : "—"}
                        </td>
                        <td className="py-2 text-xs text-gray-500">{t.promo_code || "—"}</td>
                        <td className="py-2 text-xs text-gray-500">{t.user_id ? "App" : "Web"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
      )}

      {/* Promo Codes — expandable with CRUD */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 mb-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPromoExpanded(!promoExpanded)}
            className="flex items-center gap-2 cursor-pointer"
          >
            <h3 className="text-sm font-semibold text-ink">Promo Codes ({promoCodes.length})</h3>
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform ${promoExpanded ? "rotate-180" : ""}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {canEdit && (
            <button
              onClick={() => { setShowPromoForm(true); setPromoExpanded(true) }}
              className="text-xs font-medium text-primary hover:underline cursor-pointer flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Create
            </button>
          )}
        </div>

        {promoExpanded && (
          <div className="mt-3">
            {/* Create form */}
            {showPromoForm && (
              <form onSubmit={handleCreatePromo} className="rounded-lg border border-gray-200 bg-gray-50 p-4 mb-4">
                <h4 className="text-sm font-medium text-ink mb-3">New Promo Code</h4>
                {promoError && (
                  <div className="mb-3 rounded-lg bg-red-50 border border-red-200 p-2 text-xs text-red-700">
                    {promoError}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Code</label>
                    <input
                      type="text"
                      value={promoForm.code}
                      onChange={(e) => setPromoForm((p) => ({ ...p, code: e.target.value }))}
                      placeholder="e.g. VIP20"
                      required
                      className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Discount Type</label>
                    <select
                      value={promoForm.discount_type}
                      onChange={(e) => setPromoForm((p) => ({ ...p, discount_type: e.target.value as "percentage" | "flat" }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="flat">Flat ($)</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {promoForm.discount_type === "percentage" ? "Discount (%)" : "Discount ($)"}
                    </label>
                    <input
                      type="number"
                      step={promoForm.discount_type === "percentage" ? "1" : "0.01"}
                      min={promoForm.discount_type === "percentage" ? "1" : "0.01"}
                      max={promoForm.discount_type === "percentage" ? "100" : undefined}
                      value={promoForm.discount_value}
                      onChange={(e) => setPromoForm((p) => ({ ...p, discount_value: e.target.value }))}
                      required
                      className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Max Redemptions</label>
                    <input
                      type="number"
                      min="1"
                      value={promoForm.max_redemptions}
                      onChange={(e) => setPromoForm((p) => ({ ...p, max_redemptions: e.target.value }))}
                      placeholder="Unlimited"
                      className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Max Per User</label>
                    <input
                      type="number"
                      min="1"
                      value={promoForm.max_per_user}
                      onChange={(e) => setPromoForm((p) => ({ ...p, max_per_user: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Expires</label>
                    <input
                      type="date"
                      value={promoForm.expires_at}
                      onChange={(e) => setPromoForm((p) => ({ ...p, expires_at: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => { setShowPromoForm(false); setPromoError("") }}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={promoLoading}
                    className="rounded-lg bg-gradient-to-br from-[#2ECB4E] to-[#05EB54] px-4 py-1.5 text-xs font-semibold text-white hover:brightness-110 transition-all disabled:opacity-60 cursor-pointer"
                  >
                    {promoLoading ? "Creating..." : "Create Promo Code"}
                  </button>
                </div>
              </form>
            )}

            {/* Promo codes list */}
            {promoCodes.length === 0 && !showPromoForm ? (
              <p className="text-sm text-gray-400 py-4 text-center">No promo codes yet</p>
            ) : (
              promoCodes.length > 0 && (
                <div className="space-y-2">
                  {promoCodes.map((p) => {
                    const isExpired = p.expires_at && new Date(p.expires_at) < new Date()
                    const isMaxedOut = p.max_redemptions !== null && p.current_redemptions >= p.max_redemptions
                    const isUsable = p.is_active && !isExpired
                    const statusLabel = !p.is_active ? "Inactive" : isExpired ? "Expired" : isMaxedOut ? "Maxed Out" : "Active"
                    const statusClass = !p.is_active
                      ? "bg-gray-100 text-gray-600"
                      : isExpired || isMaxedOut
                        ? "bg-orange-100 text-orange-700"
                        : "bg-green-100 text-green-700"

                    return (
                      <div key={p.id} className="rounded-lg border border-gray-200 bg-white p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-xs font-semibold bg-gray-50 border border-gray-200 rounded px-2 py-1">{p.code}</span>
                            <span className="text-sm text-gray-600">
                              {p.discount_type === "percentage"
                                ? `${p.discount_value}% off`
                                : `${formatPrice(p.discount_value * 100)} off`}
                            </span>
                          </div>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusClass}`}>
                            {statusLabel}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span>
                            {p.max_redemptions
                              ? `${p.current_redemptions} / ${p.max_redemptions} used`
                              : `${p.current_redemptions} used`}
                          </span>
                          <span>{p.max_per_user} per user</span>
                          <span>
                            {p.expires_at
                              ? `Expires ${new Date(p.expires_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                              : "No expiry"}
                          </span>
                        </div>
                        {canEdit && isUsable && editingPromoId !== p.id && (
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => startEditPromo(p)}
                              className="text-xs font-medium text-primary hover:underline cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeactivatePromo(p.id)}
                              className="text-xs font-medium text-red-500 hover:underline cursor-pointer"
                            >
                              Deactivate
                            </button>
                          </div>
                        )}
                        {editingPromoId === p.id && (
                          <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                            {editPromoError && (
                              <div className="mb-3 rounded-lg bg-red-50 border border-red-200 p-2 text-xs text-red-700">
                                {editPromoError}
                              </div>
                            )}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Discount Type</label>
                                <select
                                  value={editPromoForm.discount_type}
                                  onChange={(e) => setEditPromoForm((f) => ({ ...f, discount_type: e.target.value as "percentage" | "flat" }))}
                                  className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                                >
                                  <option value="percentage">Percentage (%)</option>
                                  <option value="flat">Flat ($)</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                  {editPromoForm.discount_type === "percentage" ? "Discount (%)" : "Discount ($)"}
                                </label>
                                <input
                                  type="number"
                                  step={editPromoForm.discount_type === "percentage" ? "1" : "0.01"}
                                  min={editPromoForm.discount_type === "percentage" ? "1" : "0.01"}
                                  max={editPromoForm.discount_type === "percentage" ? "100" : undefined}
                                  value={editPromoForm.discount_value}
                                  onChange={(e) => setEditPromoForm((f) => ({ ...f, discount_value: e.target.value }))}
                                  className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Max Redemptions</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={editPromoForm.max_redemptions}
                                  onChange={(e) => setEditPromoForm((f) => ({ ...f, max_redemptions: e.target.value }))}
                                  placeholder="Unlimited"
                                  className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Max Per User</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={editPromoForm.max_per_user}
                                  onChange={(e) => setEditPromoForm((f) => ({ ...f, max_per_user: e.target.value }))}
                                  className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 mb-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Expires</label>
                                <input
                                  type="date"
                                  value={editPromoForm.expires_at}
                                  onChange={(e) => setEditPromoForm((f) => ({ ...f, expires_at: e.target.value }))}
                                  className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                                />
                              </div>
                            </div>
                            <div className="flex gap-2 justify-end">
                              <button
                                type="button"
                                onClick={() => { setEditingPromoId(null); setEditPromoError("") }}
                                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleUpdatePromo(p.id)}
                                disabled={editPromoLoading}
                                className="rounded-lg bg-gradient-to-br from-[#2ECB4E] to-[#05EB54] px-4 py-1.5 text-xs font-semibold text-white hover:brightness-110 transition-all disabled:opacity-60 cursor-pointer"
                              >
                                {editPromoLoading ? "Saving..." : "Save Changes"}
                              </button>
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
      </div>

      {/* Promo usage analytics (if any promos were used) */}
      {analytics && analytics.promo_breakdown.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 mb-6">
          <h3 className="text-sm font-semibold text-ink mb-3">Promo Code Usage Analytics</h3>
          <div className="flex items-center gap-4 mb-3 text-xs text-gray-500">
            <span>{analytics.promo_usage.tickets_with_promo} tickets used a promo</span>
            <span>{formatPrice(analytics.promo_usage.total_discount_cents)} total discount</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-100">
                <th className="text-left py-2 font-medium">Code</th>
                <th className="text-left py-2 font-medium">Discount</th>
                <th className="text-right py-2 font-medium">Used</th>
                <th className="text-right py-2 font-medium">Total Discount</th>
              </tr>
            </thead>
            <tbody>
              {analytics.promo_breakdown.map((p) => (
                <tr key={p.promo_code_id} className="border-b border-gray-50">
                  <td className="py-2 font-mono text-xs">{p.code}</td>
                  <td className="py-2 text-gray-600">
                    {p.discount_type === "percentage" ? `${p.discount_value}%` : formatPrice(p.discount_value * 100)}
                  </td>
                  <td className="py-2 text-right">{p.times_used}</td>
                  <td className="py-2 text-right">{formatPrice(p.total_discount_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
