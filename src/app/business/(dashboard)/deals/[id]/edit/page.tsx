"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
import { apiClient, ApiError } from "@/lib/business/api-client"
import DealForm from "@/components/business/dashboard/DealForm"
import { DEAL_TYPE_TO_FREQUENCY } from "@/lib/business/constants"
import type { DealListItem, DealFormData } from "@/lib/business/types"

function toDateInput(dateStr: string) {
  if (!dateStr) return ""
  return new Date(dateStr).toISOString().split("T")[0]
}

export default function EditDealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [initialData, setInitialData] = useState<Partial<DealFormData> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    async function fetchDeal() {
      try {
        const deal = await apiClient.get<DealListItem>(`/business/deals/${id}`)
        // Year-2099 expirations are the "no expiration" sentinel — don't surface
        // that in the input; show blank instead so the field reads as optional.
        const expiredRaw = toDateInput(deal.expired_date)
        const expiredForForm = expiredRaw.startsWith("2099-") ? "" : expiredRaw
        setInitialData({
          deal_title: deal.deal_title,
          description: deal.description,
          total_saving: String(deal.total_saving || ""),
          redemption_frequency: DEAL_TYPE_TO_FREQUENCY[deal.deal_type] || "",
          start_date: toDateInput(deal.start_date),
          expired_date: expiredForForm,
          deal_image_path: deal.deal_image_path || "",
        })
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to load deal")
      } finally {
        setLoading(false)
      }
    }
    fetchDeal()
  }, [id])

  if (loading) {
    return (
      <div className="animate-pulse space-y-4 max-w-2xl">
        <div className="h-6 bg-gray-200 rounded w-32" />
        <div className="h-64 bg-gray-200 rounded-xl" />
      </div>
    )
  }

  if (error || !initialData) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-red-500 mb-4">{error || "Deal not found"}</p>
        <Link href="/business/deals" className="text-sm text-primary hover:underline">
          Back to Deals
        </Link>
      </div>
    )
  }

  return <DealForm initialData={initialData} dealId={Number(id)} />
}
