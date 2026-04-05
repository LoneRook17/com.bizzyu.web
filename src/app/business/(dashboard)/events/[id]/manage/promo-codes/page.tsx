"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
import { apiClient, ApiError } from "@/lib/business/api-client"
import type { PromoCode } from "@/lib/business/types"

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export default function PromoCodesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [codes, setCodes] = useState<PromoCode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    code: "",
    discount_type: "percentage" as "percentage" | "flat",
    discount_value: "",
    max_redemptions: "",
    max_per_user: "1",
    expires_at: "",
  })
  const [createError, setCreateError] = useState("")

  const fetchCodes = () => {
    apiClient
      .get<{ promo_codes: PromoCode[] }>(`/business/events/${id}/promo-codes`)
      .then((data) => setCodes(data.promo_codes))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load promo codes"))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchCodes() }, [id])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.code.trim() || !form.discount_value) return
    setCreating(true)
    setCreateError("")
    try {
      await apiClient.post(`/business/events/${id}/promo-codes`, {
        code: form.code.trim().toUpperCase(),
        discount_type: form.discount_type,
        discount_value: parseFloat(form.discount_value),
        max_redemptions: form.max_redemptions ? parseInt(form.max_redemptions) : null,
        max_per_user: parseInt(form.max_per_user) || 1,
        expires_at: form.expires_at || null,
      })
      setForm({ code: "", discount_type: "percentage", discount_value: "", max_redemptions: "", max_per_user: "1", expires_at: "" })
      setShowCreate(false)
      fetchCodes()
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : "Failed to create promo code")
    } finally {
      setCreating(false)
    }
  }

  const handleDeactivate = async (promoId: number) => {
    if (!confirm("Deactivate this promo code?")) return
    try {
      await apiClient.delete(`/business/events/${id}/promo-codes/${promoId}`)
      fetchCodes()
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to deactivate")
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl animate-pulse space-y-4">
        <div className="h-6 bg-gray-200 rounded w-48" />
        <div className="h-48 bg-gray-200 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl">
      <Link href={`/business/events/${id}/manage`} className="text-xs text-gray-500 hover:text-primary mb-2 inline-block">
        &larr; Back to Manage
      </Link>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-ink">Promo Codes</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors cursor-pointer"
        >
          Create Code
        </button>
      </div>

      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

      {/* Create form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="rounded-xl border border-gray-200 bg-white p-5 mb-4">
          <h3 className="text-sm font-semibold text-ink mb-3">New Promo Code</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Code</label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="e.g. EARLYBIRD"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary font-mono"
                autoFocus
              />
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
          {createError && <p className="text-xs text-red-500 mb-3">{createError}</p>}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={creating || !form.code.trim() || !form.discount_value}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-60"
            >
              {creating ? "Creating..." : "Create"}
            </button>
            <button
              type="button"
              onClick={() => { setShowCreate(false); setCreateError("") }}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Promo codes list */}
      {codes.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-sm text-gray-500">No promo codes yet.</p>
          <p className="text-xs text-gray-400 mt-1">Create a code to offer discounts on this event.</p>
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
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColor}`}>
                        {status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">
                      {code.expires_at ? formatDate(code.expires_at) : "Never"}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {code.is_active && (
                        <button
                          onClick={() => handleDeactivate(code.promo_code_id)}
                          className="text-xs text-red-500 hover:text-red-700 cursor-pointer"
                        >
                          Deactivate
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
