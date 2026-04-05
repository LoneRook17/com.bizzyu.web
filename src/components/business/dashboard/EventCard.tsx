"use client"

import Link from "next/link"
import StatusBadge from "./StatusBadge"
import type { EventListItem } from "@/lib/business/types"

interface EventCardProps {
  event: EventListItem
  showActions?: boolean
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })
}

function formatCurrency(val: number) {
  return `$${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function EventCard({ event, showActions = true }: EventCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 hover:shadow-sm transition-shadow">
      <div className="flex gap-4">
        {/* Flyer thumbnail */}
        <div className="h-20 w-20 flex-shrink-0 rounded-lg bg-gray-100 overflow-hidden">
          {event.flyer_image_url ? (
            <img src={event.flyer_image_url} alt={event.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-gray-400">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link
                href={`/business/events/${event.event_id}`}
                className="text-sm font-semibold text-ink hover:text-primary transition-colors truncate block"
              >
                {event.name}
              </Link>
              <p className="text-xs text-gray-500 mt-0.5">
                {formatDate(event.start_date_time)} at {formatTime(event.start_date_time)}
              </p>
              <p className="text-xs text-gray-400 truncate">{event.venue_name}</p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <StatusBadge status={event.status} />
              {event.status === "pending_review" && event.moderation_reason && (
                <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700" title={event.moderation_reason}>
                  Moderated
                </span>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
            <span>{event.ticket_sales_count} tickets</span>
            <span>{event.total_attendees} attendees</span>
            <span>{formatCurrency(event.total_revenue)}</span>
            {event.type !== "Free" && (
              <span className="text-gray-400">{event.type}</span>
            )}
          </div>
        </div>
      </div>

      {/* Action links */}
      {showActions && (
        <div className="flex gap-3 mt-3 pt-3 border-t border-gray-100">
          <Link
            href={`/business/events/${event.event_id}`}
            className="text-xs font-medium text-primary hover:underline"
          >
            View
          </Link>
          <Link
            href={`/business/events/${event.event_id}/manage`}
            className="text-xs font-medium text-gray-600 hover:text-ink hover:underline"
          >
            Manage
          </Link>
          <Link
            href="/business/scanner"
            className="text-xs font-medium text-gray-600 hover:text-ink hover:underline flex items-center gap-1"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
            </svg>
            Scan
          </Link>
        </div>
      )}
    </div>
  )
}
