"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/business/auth-context"
import { useVenue } from "@/lib/business/venue-context"
import { apiClient, ApiError } from "@/lib/business/api-client"
import type { PromoCode } from "@/lib/business/types"

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

export default function UniversalPromoCodesPage() {
  const { user } = useAuth()
  const { selectedVenue, selectedVenueId, isAllVenues } = useVenue()

  const canManage = user?.business_role === "owner" || user?.business_role === "manager"
  const venueReady = !isAllVenues && selectedVenueId !== null && typeof selectedVenueId === "number"

  const [codes, setCodes] = useState<PromoCode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState("")

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
    setShowForm(true)
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
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingId(null)
    setFormError("")
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
      closeForm()
      fetchCodes()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Failed to save promo code")
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (code: PromoCode) => {
    const verb = code.is_active ? "Deactivate" : "Reactivate"
    if (!confirm(`${verb} promo code ${code.code}?`)) return
    try {
      await apiClient.put(`/business/venues/${selectedVenueId}/promo-codes/${code.promo_code_id}`, {
        is_active: !code.is_active,
      })
      fetchCodes()
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to update")
    }
  }

  const handleDelete = async (code: PromoCode) => {
    if (!confirm(`Permanently delete promo code ${code.code}? This cannot be undone.`)) return
    try {
      await apiClient.delete(`/business/venues/${selectedVenueId}/promo-codes/${code.promo_code_id}`)
      fetchCodes()
    } catch (err) {
      // 409 → has redemptions; suggest deactivate instead
      alert(err instanceof ApiError ? err.message : "Failed to delete")
    }
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-xl font-bold text-ink">Universal Promo Codes</h1>
        {canManage && venueReady && !showForm && (
          <button
            onClick={openCreate}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors cursor-pointer"
          >
            Create Code
          </button>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Codes here apply to <strong>every event at {selectedVenue ? selectedVenue.name : "this venue"}</strong> — now
        and in the future. Usage limits count across all of those events.
      </p>

      {!venueReady ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
          <p className="text-sm text-amber-800">Select a specific venue (not “All venues”) to manage its universal promo codes.</p>
        </div>
      ) : (
        <>
          {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

          {showForm && (
            <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-5 mb-4">
              <h3 className="text-sm font-semibold text-ink mb-3">
                {editingId ? "Edit Promo Code" : "New Universal Promo Code"}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Code</label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                    placeholder="e.g. BUFF10"
                    disabled={!!editingId}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary font-mono disabled:bg-gray-100 disabled:text-gray-500"
                    autoFocus={!editingId}
                  />
                  {editingId && <p className="text-[10px] text-gray-400 mt-1">Code can’t be changed after creation.</p>}
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Discount Type</label>
                  <select
                    value={form.discount_type}
                    onChange={(e) => setForm((f) => ({ ...f, discount_type: e.target.value as "percentage" | "flat" }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat ($)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Discount Value {form.discount_type === "percentage" ? "(%)" : "($)"}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={form.discount_type === "percentage" ? "100" : undefined}
                    step="0.01"
                    value={form.discount_value}
                    onChange={(e) => setForm((f) => ({ ...f, discount_value: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Max Redemptions</label>
                  <input
                    type="number"
                    min="0"
                    value={form.max_redemptions}
                    onChange={(e) => setForm((f) => ({ ...f, max_redemptions: e.target.value }))}
                    placeholder="Unlimited"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Max Per User</label>
                  <input
                    type="number"
                    min="1"
                    value={form.max_per_user}
                    onChange={(e) => setForm((f) => ({ ...f, max_per_user: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Expires At</label>
                  <input
                    type="datetime-local"
                    value={form.expires_at}
                    onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
              {formError && <p className="text-xs text-red-500 mb-3">{formError}</p>}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving || !form.discount_value || (!editingId && !form.code.trim())}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-60"
                >
                  {saving ? "Saving..." : editingId ? "Save Changes" : "Create"}
                </button>
                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {loading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-6 bg-gray-200 rounded w-48" />
              <div className="h-48 bg-gray-200 rounded-xl" />
            </div>
          ) : codes.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
              <p className="text-sm text-gray-500">No universal promo codes yet.</p>
              <p className="text-xs text-gray-400 mt-1">Create one to offer a discount on every event at this venue.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-5 py-3 font-medium">Code</th>
                    <th className="text-left px-5 py-3 font-medium">Discount</th>
                    <th className="text-right px-5 py-3 font-medium">Uses</th>
                    <th className="text-left px-5 py-3 font-medium">Status</th>
                    <th className="text-left px-5 py-3 font-medium">Expires</th>
                    <th className="text-right px-5 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {codes.map((code) => {
                    const isExpired = code.expires_at && new Date(code.expires_at) < new Date()
                    const isMaxed = code.max_redemptions && code.current_redemptions >= code.max_redemptions
                    const status = !code.is_active ? "Inactive" : isExpired ? "Expired" : isMaxed ? "Maxed" : "Active"
                    const statusColor = status === "Active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                    return (
                      <tr key={code.promo_code_id} className="border-b border-gray-50 last:border-0">
                        <td className="px-5 py-3 font-mono text-xs font-medium text-ink">{code.code}</td>
                        <td className="px-5 py-3 text-gray-600">
                          {code.discount_type === "percentage" ? `${code.discount_value}%` : `$${code.discount_value}`}
                        </td>
                        <td className="px-5 py-3 text-right text-gray-600">
                          {code.current_redemptions}{code.max_redemptions ? ` / ${code.max_redemptions}` : ""}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColor}`}>{status}</span>
                        </td>
                        <td className="px-5 py-3 text-xs text-gray-500">
                          {code.expires_at ? formatDate(code.expires_at) : "Never"}
                        </td>
                        <td className="px-5 py-3 text-right whitespace-nowrap">
                          {canManage && (
                            <span className="inline-flex gap-3">
                              <button onClick={() => openEdit(code)} className="text-xs text-gray-500 hover:text-primary cursor-pointer">
                                Edit
                              </button>
                              <button onClick={() => handleToggleActive(code)} className="text-xs text-amber-600 hover:text-amber-800 cursor-pointer">
                                {code.is_active ? "Deactivate" : "Reactivate"}
                              </button>
                              {code.current_redemptions === 0 ? (
                                <button onClick={() => handleDelete(code)} className="text-xs text-red-500 hover:text-red-700 cursor-pointer">
                                  Delete
                                </button>
                              ) : (
                                <span className="text-xs text-gray-300" title="Has redemptions — deactivate instead">Delete</span>
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
          )}
        </>
      )}
    </div>
  )
}
