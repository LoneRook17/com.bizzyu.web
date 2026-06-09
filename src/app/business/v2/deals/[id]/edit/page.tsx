"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
import { apiClient, ApiError } from "@/lib/business/api-client"
import { DEAL_TYPE_TO_FREQUENCY } from "@/lib/business/constants"
import type { DealListItem, DealFormData } from "@/lib/business/types"
import DealForm from "@/components/business/v2/deals/DealForm"
import { Button } from "@/components/business/v2/ui/button"
import { Skeleton } from "@/components/business/v2/ui/skeleton"

function toDateInput(s: string) {
  if (!s) return ""
  return new Date(s).toISOString().split("T")[0]
}

export default function EditDealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [initialData, setInitialData] = useState<Partial<DealFormData> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const deal = await apiClient.get<DealListItem>(`/business/deals/${id}`)
        if (cancelled) return
        setInitialData({
          deal_title: deal.deal_title,
          description: deal.description,
          total_saving: String(deal.total_saving || ""),
          redemption_frequency: DEAL_TYPE_TO_FREQUENCY[deal.deal_type] || "",
          start_date: toDateInput(deal.start_date),
          deal_image_path: deal.deal_image_path || "",
        })
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Failed to load deal")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id])

  if (loading) {
    return (
      <>
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-96 rounded-xl" />
      </>
    )
  }

  if (error || !initialData) {
    return (
      <div className="py-16 text-center">
        <p className="mb-4 text-sm text-red-500">{error || "Deal not found"}</p>
        <Button variant="link" asChild>
          <Link href="/business/v2/deals">Back to deals</Link>
        </Button>
      </div>
    )
  }

  return <DealForm initialData={initialData} dealId={Number(id)} />
}
