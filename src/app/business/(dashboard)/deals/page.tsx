"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/business/auth-context"
import { apiClient } from "@/lib/business/api-client"
import { DEAL_TABS } from "@/lib/business/constants"
import DealCard from "@/components/business/dashboard/DealCard"
import EmptyState from "@/components/business/dashboard/EmptyState"
import Pagination from "@/components/business/dashboard/Pagination"
import type { DealListItem } from "@/lib/business/types"

export default function DealsPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState("live")
  const [deals, setDeals] = useState<DealListItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const limit = 20

  const canCreate =
    user?.business_role === "owner" ||
    user?.business_role === "manager" ||
    user?.business_role === "staff"

  const fetchDeals = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiClient.get<{ deals: DealListItem[]; total: number }>(
        `/business/deals?tab=${tab}&page=${page}&limit=${limit}`
      )
      setDeals(data.deals)
      setTotal(data.total)
    } catch {
      setDeals([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [tab, page])

  useEffect(() => {
    fetchDeals()
  }, [fetchDeals])

  const handleTabChange = (newTab: string) => {
    setTab(newTab)
    setPage(1)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-ink">Deals</h1>
        {canCreate && (
          <Link
            href="/business/deals/new"
            className="rounded-lg bg-gradient-to-br from-[#2ECB4E] to-[#05EB54] px-4 py-2 text-sm font-semibold text-white shadow-md shadow-primary/25 hover:brightness-110 transition-all"
          >
            Create Deal
          </Link>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {DEAL_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => handleTabChange(t.value)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer -mb-px
              ${tab === t.value
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 animate-pulse">
              <div className="flex gap-4">
                <div className="h-20 w-20 rounded-lg bg-gray-200" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-48 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-32 mb-1" />
                  <div className="h-3 bg-gray-200 rounded w-24" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : deals.length === 0 ? (
        <EmptyState
          title="No deals yet"
          message={tab === "live" ? "Create your first deal to get started." : `No ${tab} deals found.`}
          actionLabel={canCreate && tab === "live" ? "Create Deal" : undefined}
          actionHref={canCreate && tab === "live" ? "/business/deals/new" : undefined}
        />
      ) : (
        <div className="space-y-3">
          {deals.map((deal) => (
            <DealCard key={deal.id} deal={deal} />
          ))}
        </div>
      )}

      <Pagination page={page} total={total} limit={limit} onPageChange={setPage} />
    </div>
  )
}
