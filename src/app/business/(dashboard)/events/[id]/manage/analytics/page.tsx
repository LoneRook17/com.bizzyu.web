"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
import { apiClient, ApiError } from "@/lib/business/api-client"
import EventAnalyticsView from "@/components/business/dashboard/EventAnalyticsView"
import type { EventAnalytics } from "@/lib/business/types"

export default function EventAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [data, setData] = useState<EventAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    apiClient
      .get<EventAnalytics>(`/business/analytics/events/${id}`)
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load analytics"))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="max-w-3xl animate-pulse space-y-4">
        <div className="h-6 bg-gray-200 rounded w-48" />
        <div className="h-48 bg-gray-200 rounded-xl" />
        <div className="h-32 bg-gray-200 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl">
      <Link href={`/business/events/${id}/manage`} className="text-xs text-gray-500 hover:text-primary mb-2 inline-block">
        &larr; Back to Manage
      </Link>
      <h1 className="text-xl font-bold text-ink mb-6">Event Analytics</h1>

      {error ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-sm text-red-500">{error}</p>
        </div>
      ) : data ? (
        <EventAnalyticsView data={data} />
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-sm text-gray-500">No analytics data available yet.</p>
        </div>
      )}
    </div>
  )
}
