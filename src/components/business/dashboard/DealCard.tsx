"use client"

import Link from "next/link"
import type { DealListItem } from "@/lib/business/types"

interface DealCardProps {
  deal: DealListItem
  tab?: string
  onReactivate?: (dealId: number) => void
}

function timeRemaining(expDate: string): string {
  if (!expDate || expDate === "2099-12-31") return ""
  const diff = new Date(expDate).getTime() - Date.now()
  if (diff <= 0) return "Expired"
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days > 0) return `${days}d left`
  const hours = Math.floor(diff / (1000 * 60 * 60))
  return `${hours}h left`
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ""
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export default function DealCard({ deal, tab, onReactivate }: DealCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 hover:shadow-sm transition-shadow">
      <div className="flex gap-4">
        {/* Deal image */}
        <div className="h-20 w-20 flex-shrink-0 rounded-lg bg-gray-100 overflow-hidden">
          {deal.deal_image_path ? (
            <img src={deal.deal_image_path} alt={deal.deal_title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-gray-400">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
              </svg>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link
                href={`/business/deals/${deal.id}`}
                className="text-sm font-semibold text-ink hover:text-primary transition-colors truncate block"
              >
                {deal.deal_title}
              </Link>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-gray-500">{deal.deal_category}</span>
                <span className="text-xs text-gray-400">&middot;</span>
                <span className="text-xs text-gray-500">{deal.deal_type}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {tab === "pending" ? (
                deal.moderation_reason ? (
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-700">
                    Under Review
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-700">
                    Pending Approval
                  </span>
                )
              ) : tab === "expired" ? (
                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600">
                  Expired
                </span>
              ) : tab === "deactivated" ? (
                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600">
                  Deactivated
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-green-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  Active
                </span>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
            <span>{deal.claim_count ?? 0} claims</span>
            {deal.supply_limit ? (
              <span>{deal.claim_count ?? 0}/{deal.supply_limit} used</span>
            ) : null}
            {tab === "expired" && deal.expired_date ? (
              <span>Expired {formatDate(deal.expired_date)}</span>
            ) : tab === "live" ? (
              <span>{timeRemaining(deal.expired_date)}</span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Action links */}
      <div className="flex gap-3 mt-3 pt-3 border-t border-gray-100">
        <Link
          href={`/business/deals/${deal.id}`}
          className="text-xs font-medium text-primary hover:underline"
        >
          View
        </Link>
        {tab !== "pending" && (
          <Link
            href={`/business/deals/${deal.id}/edit`}
            className="text-xs font-medium text-gray-600 hover:text-ink hover:underline"
          >
            Edit
          </Link>
        )}
        {tab === "deactivated" && onReactivate && (
          <button
            onClick={() => onReactivate(deal.id)}
            className="text-xs font-medium text-green-600 hover:underline cursor-pointer"
          >
            Reactivate
          </button>
        )}
      </div>
    </div>
  )
}
