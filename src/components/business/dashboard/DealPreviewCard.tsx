"use client"

import Link from "next/link"
import type { DealListItem } from "@/lib/business/types"

export default function DealPreviewCard({ deal, showVenue }: { deal: DealListItem; showVenue?: boolean }) {
  const isUnderReview = deal.moderation_status === "pending_review"
  const isRejected = deal.moderation_status === "rejected"
  const isActive = !isUnderReview && !isRejected && deal.is_active

  const dotColor = isUnderReview ? "bg-orange-400" : isActive ? "bg-green-500" : "bg-gray-400"
  const statusText = isUnderReview ? "Under Review" : isActive ? "Active" : isRejected ? "Rejected" : "Inactive"

  return (
    <Link
      href={`/business/deals/${deal.id}`}
      className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 hover:shadow-sm transition-shadow min-w-0"
    >
      {/* Thumbnail */}
      <div className="h-12 w-12 flex-shrink-0 rounded-lg bg-gray-100 overflow-hidden">
        {deal.deal_image_path ? (
          <img src={deal.deal_image_path} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-300">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
            </svg>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-ink truncate">{deal.deal_title}</p>
        {showVenue && (deal.venue_name || deal.business_name) && (
          <p className="text-xs text-gray-400 truncate">{deal.venue_name || deal.business_name}</p>
        )}
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
          <span className="text-xs text-gray-400">{statusText}</span>
        </div>
        <p className="text-[11px] text-gray-400 mt-0.5">{deal.claim_count ?? 0} claims</p>
      </div>
    </Link>
  )
}
