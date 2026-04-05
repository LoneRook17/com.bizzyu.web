"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
import { apiClient, ApiError } from "@/lib/business/api-client"
import type { TrackingLink } from "@/lib/business/types"

export default function TrackingLinksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [links, setLinks] = useState<TrackingLink[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [promoterName, setPromoterName] = useState("")
  const [creating, setCreating] = useState(false)

  const fetchLinks = () => {
    apiClient
      .get<{ tracking_links: TrackingLink[] }>(`/business/events/${id}/tracking-links`)
      .then((data) => setLinks(data.tracking_links))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load tracking links"))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchLinks() }, [id])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!promoterName.trim()) return
    setCreating(true)
    try {
      await apiClient.post(`/business/events/${id}/tracking-links`, { promoter_name: promoterName.trim() })
      setPromoterName("")
      setShowCreate(false)
      fetchLinks()
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to create tracking link")
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (linkId: number) => {
    if (!confirm("Delete this tracking link?")) return
    try {
      await apiClient.delete(`/business/events/${id}/tracking-links/${linkId}`)
      setLinks((prev) => prev.filter((l) => l.id !== linkId))
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to delete")
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
        <h1 className="text-xl font-bold text-ink">Tracking Links</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors cursor-pointer"
        >
          Create Link
        </button>
      </div>

      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

      {/* Create form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="rounded-xl border border-gray-200 bg-white p-5 mb-4">
          <h3 className="text-sm font-semibold text-ink mb-3">New Tracking Link</h3>
          <div className="flex gap-3">
            <input
              type="text"
              value={promoterName}
              onChange={(e) => setPromoterName(e.target.value)}
              placeholder="Promoter name"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              autoFocus
            />
            <button
              type="submit"
              disabled={creating || !promoterName.trim()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-60"
            >
              {creating ? "Creating..." : "Create"}
            </button>
            <button
              type="button"
              onClick={() => { setShowCreate(false); setPromoterName("") }}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Links table */}
      {links.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-sm text-gray-500">No tracking links yet.</p>
          <p className="text-xs text-gray-400 mt-1">Create a link to track promoter performance.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-5 py-3 font-medium">Promoter</th>
                <th className="text-left px-5 py-3 font-medium">Code</th>
                <th className="text-right px-5 py-3 font-medium">Clicks</th>
                <th className="text-right px-5 py-3 font-medium">Sales</th>
                <th className="text-right px-5 py-3 font-medium">CTR</th>
                <th className="text-right px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {links.map((link) => {
                const ctr = link.clicks > 0 ? ((link.sales_count / link.clicks) * 100).toFixed(1) : "0.0"
                return (
                  <tr key={link.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-3 text-ink font-medium">{link.promoter_name}</td>
                    <td className="px-5 py-3 text-gray-500 font-mono text-xs">{link.code}</td>
                    <td className="px-5 py-3 text-right text-gray-600">{link.clicks}</td>
                    <td className="px-5 py-3 text-right font-medium text-ink">{link.sales_count}</td>
                    <td className="px-5 py-3 text-right text-gray-600">{ctr}%</td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => handleDelete(link.id)}
                        className="text-xs text-red-500 hover:text-red-700 cursor-pointer"
                      >
                        Delete
                      </button>
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
