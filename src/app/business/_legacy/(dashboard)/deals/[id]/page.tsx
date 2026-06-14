"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/business/auth-context"
import { apiClient, ApiError } from "@/lib/business/api-client"
import StatusBadge from "@/components/business/dashboard/StatusBadge"
import ConfirmModal from "@/components/business/dashboard/ConfirmModal"
import { MODERATION_STATUS_COLORS } from "@/lib/business/constants"
import type { DealListItem } from "@/lib/business/types"

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

function formatCurrency(val: number) {
  return `$${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function DealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { user } = useAuth()
  const [deal, setDeal] = useState<DealListItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [confirmAction, setConfirmAction] = useState<"deactivate" | "delete" | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const canManage = user?.business_role === "owner" || user?.business_role === "manager"

  useEffect(() => {
    async function fetchDeal() {
      try {
        const data = await apiClient.get<DealListItem>(`/business/deals/${id}`)
        setDeal(data)
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to load deal")
      } finally {
        setLoading(false)
      }
    }
    fetchDeal()
  }, [id])

  const handleConfirmAction = async () => {
    if (!confirmAction) return
    setActionLoading(true)
    try {
      if (confirmAction === "deactivate") {
        await apiClient.patch(`/business/deals/${id}/deactivate`)
      } else {
        await apiClient.delete(`/business/deals/${id}`)
      }
      router.push("/business/deals")
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Action failed")
    } finally {
      setActionLoading(false)
      setConfirmAction(null)
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-gray-200 rounded w-48" />
        <div className="h-48 bg-gray-200 rounded-xl" />
      </div>
    )
  }

  if (error || !deal) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-red-500 mb-4">{error || "Deal not found"}</p>
        <Link href="/business/deals" className="text-sm text-primary hover:underline">
          Back to Deals
        </Link>
      </div>
    )
  }

  const moderationColors = deal.moderation_status
    ? MODERATION_STATUS_COLORS[deal.moderation_status]
    : null

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link href="/business/deals" className="text-xs text-gray-500 hover:text-primary mb-2 inline-block">
            &larr; Back to Deals
          </Link>
          <h1 className="text-xl font-bold text-ink">{deal.deal_title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-500">{deal.deal_category}</span>
            <span className="text-xs text-gray-400">·</span>
            <span className="text-xs text-gray-500">{deal.deal_type}</span>
            {deal.is_active ? (
              <span className="inline-flex items-center gap-1 text-xs text-green-600">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                Active
              </span>
            ) : (
              <StatusBadge status="draft" />
            )}
            {deal.moderation_status === "pending_review" && moderationColors && (
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${moderationColors.bg} ${moderationColors.text}`}>
                Under Review
              </span>
            )}
          </div>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Link
              href={`/business/deals/${deal.id}/edit`}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Edit
            </Link>
            {deal.is_active && (
              <button
                onClick={() => setConfirmAction("deactivate")}
                className="rounded-lg border border-yellow-400 px-3 py-1.5 text-sm font-medium text-yellow-700 hover:bg-yellow-50 transition-colors cursor-pointer"
              >
                Deactivate
              </button>
            )}
            <button
              onClick={() => setConfirmAction("delete")}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 transition-colors cursor-pointer"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Moderation notice */}
      {deal.moderation_status === "pending_review" && deal.moderation_reason && (
        <div className="mb-6 rounded-lg bg-orange-50 border border-orange-200 p-4 text-sm text-orange-800">
          <strong>Under review:</strong> {deal.moderation_reason}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — image + description */}
        <div className="lg:col-span-2 space-y-6">
          {deal.deal_image_path && (
            <div className="rounded-xl overflow-hidden border border-gray-200">
              <img src={deal.deal_image_path} alt={deal.deal_title} className="w-full max-h-80 object-cover" />
            </div>
          )}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-ink mb-2">Description</h2>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{deal.description}</p>
          </div>
        </div>

        {/* Right — meta + stats */}
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Dates</p>
              <p className="text-sm text-ink">{formatDate(deal.start_date)} – {formatDate(deal.expired_date)}</p>
            </div>
            {deal.location && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Location</p>
                <p className="text-sm text-ink">{deal.location}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Total Saving</p>
              <p className="text-sm text-ink">{formatCurrency(deal.total_saving)}</p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="text-xs text-gray-500 uppercase tracking-wide mb-3">Performance</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Claims</span>
                <span className="text-sm font-medium text-ink">{deal.claim_count ?? 0}</span>
              </div>
              {deal.supply_limit ? (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Supply</span>
                  <span className="text-sm font-medium text-ink">{deal.claim_count ?? 0} / {deal.supply_limit}</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Confirm modals */}
      <ConfirmModal
        open={confirmAction === "deactivate"}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirmAction}
        title="Deactivate Deal"
        message="This will hide the deal from students. You can reactivate it later."
        confirmLabel="Deactivate"
        variant="warning"
        loading={actionLoading}
      />
      <ConfirmModal
        open={confirmAction === "delete"}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirmAction}
        title="Delete Deal"
        message="Are you sure you want to delete this deal? This action cannot be undone."
        confirmLabel="Delete Deal"
        variant="danger"
        loading={actionLoading}
      />
    </div>
  )
}
