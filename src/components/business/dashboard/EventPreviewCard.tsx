"use client"

import Link from "next/link"
import type { EventListItem } from "@/lib/business/types"

function formatSmartDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const time = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })

  if (date.toDateString() === now.toDateString()) return `Today ${time}`
  if (date.toDateString() === tomorrow.toDateString()) return `Tomorrow ${time}`

  const month = date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  return `${month}, ${time}`
}

export default function EventPreviewCard({ event }: { event: EventListItem }) {
  const isPublished = event.status === "published"
  const statusLabel =
    event.status === "draft" ? "Draft"
    : event.status === "cancelled" ? "Cancelled"
    : event.status === "pending_review" || event.status === "pending_approval" ? "Pending"
    : null

  return (
    <Link
      href={`/business/events/${event.event_id}`}
      className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 hover:shadow-sm transition-shadow min-w-0"
    >
      {/* Thumbnail */}
      <div className="h-12 w-12 flex-shrink-0 rounded-lg bg-gray-100 overflow-hidden">
        {event.flyer_image_url ? (
          <img src={event.flyer_image_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-300">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-ink truncate">{event.name}</p>
          {!isPublished && statusLabel && (
            <span className="flex-shrink-0 inline-flex items-center rounded-full bg-yellow-100 px-1.5 py-0.5 text-[10px] font-medium text-yellow-700">
              {statusLabel}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-0.5">{formatSmartDate(event.start_date_time)}</p>
        <p className="text-[11px] text-gray-400 mt-0.5">
          {event.ticket_sales_count} sold · {Math.round(event.checkin_rate)}% checked in
        </p>
      </div>
    </Link>
  )
}
