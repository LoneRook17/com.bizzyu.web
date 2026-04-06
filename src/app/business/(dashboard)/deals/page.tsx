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

interface DealCounts {
  pending: number
  live: number
  expired: number
  deactivated: number
}

const TAB_EMPTY_MESSAGES: Record<string, { title: string; message: string }> = {
  pending: { title: "No deals pending approval", message: "New deals you create will appear here until approved by our team." },
  live: { title: "No live deals", message: "Create your first deal to get started." },
  expired: { title: "No expired deals", message: "Deals that have passed their expiration date will appear here." },
  deactivated: { title: "No deactivated deals", message: "Deals you deactivate will appear here." },
}

export default function DealsPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState("live")
  const [deals, setDeals] = useState<DealListItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [counts, setCounts] = useState<DealCounts>({ pending: 0, live: 0, expired: 0, deactivated: 0 })
  const limit = 20

  const canCreate =
    user?.business_role === "owner" ||
    user?.business_role === "manager" ||
    user?.business_role === "staff"

  const canManage =
    user?.business_role === "owner" ||
    user?.business_role === "manager"

  const fetchCounts = useCallback(async () => {
    try {
      const data = await apiClient.get<DealCounts>("/business/deals/counts")
      setCounts(data)
    } catch {
      // ignore — counts are supplementary
    }
  }, [])

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
    fetchCounts()
  }, [fetchDeals, fetchCounts])

  const handleTabChange = (newTab: string) => {
    setTab(newTab)
    setPage(1)
  }

  const handleReactivate = async (dealId: number) => {
    try {
      await apiClient.patch(`/business/deals/${dealId}/toggle`)
      fetchDeals()
      fetchCounts()
    } catch {
      // ignore
    }
  }

  const emptyConfig = TAB_EMPTY_MESSAGES[tab] || TAB_EMPTY_MESSAGES.live

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

      {/* Tabs with counts */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {DEAL_TABS.map((t) => {
          const count = counts[t.value as keyof DealCounts] ?? 0
          return (
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
              {count > 0 && (
                <span className={`ml-1.5 inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-medium leading-none
                  ${tab === t.value ? "bg-primary/10 text-primary" : "bg-gray-100 text-gray-500"}`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Info banner for pending tab */}
      {tab === "pending" && !loading && deals.length > 0 && (
        <div className="mb-4 rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-800">
          These deals are under review and will be visible to students once approved by our team.
        </div>
      )}

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
          title={emptyConfig.title}
          message={emptyConfig.message}
          actionLabel={canCreate && tab === "live" ? "Create Deal" : undefined}
          actionHref={canCreate && tab === "live" ? "/business/deals/new" : undefined}
        />
      ) : (
        <div className="space-y-3">
          {deals.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              tab={tab}
              onReactivate={canManage ? handleReactivate : undefined}
            />
          ))}
        </div>
      )}

      <Pagination page={page} total={total} limit={limit} onPageChange={setPage} />
    </div>
  )
}
