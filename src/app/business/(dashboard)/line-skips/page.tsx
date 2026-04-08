"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/business/auth-context"
import { apiClient } from "@/lib/business/api-client"
import EmptyState from "@/components/business/dashboard/EmptyState"
import type { LineSkip } from "@/lib/business/types"

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function formatDays(days: number[]): string {
  return days
    .slice()
    .sort((a, b) => a - b)
    .map((d) => DAY_LABELS[d])
    .join(", ")
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export default function LineSkipsPage() {
  const { user } = useAuth()
  const [lineSkips, setLineSkips] = useState<LineSkip[]>([])
  const [loading, setLoading] = useState(true)

  const canCreate = user?.business_role === "owner" || user?.business_role === "manager"

  const fetchLineSkips = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiClient.get<{ line_skips: LineSkip[] }>("/business/line-skips")
      setLineSkips(data.line_skips)
    } catch {
      setLineSkips([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLineSkips()
  }, [fetchLineSkips])

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-ink">Line Skips</h1>
        {canCreate && (
          <Link
            href="/business/line-skips/new"
            className="rounded-lg bg-gradient-to-br from-[#2ECB4E] to-[#05EB54] px-4 py-2 text-sm font-semibold text-white shadow-md shadow-primary/25 hover:brightness-110 transition-all"
          >
            Create Line Skip
          </Link>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 animate-pulse">
              <div className="flex gap-4">
                <div className="h-12 w-12 rounded-lg bg-gray-200" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-48 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-32 mb-1" />
                  <div className="h-3 bg-gray-200 rounded w-24" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : lineSkips.length === 0 ? (
        <EmptyState
          title="No Line Skips yet"
          message="Set up Line Skips to let customers skip the line at your venue."
          actionLabel={canCreate ? "Create Line Skip" : undefined}
          actionHref={canCreate ? "/business/line-skips/new" : undefined}
        />
      ) : (
        <div className="space-y-3">
          {lineSkips.map((ls) => (
            <Link
              key={ls.id}
              href={`/business/line-skips/${ls.id}`}
              className="block rounded-xl border border-gray-200 bg-white p-4 hover:border-gray-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
                    <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-ink">{ls.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatDays(ls.days_of_week)} &middot; {formatDate(ls.date_range_start)} – {formatDate(ls.date_range_end)}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatPrice(ls.default_price_cents)} &middot;{" "}
                      {ls.default_capacity ? `${ls.default_capacity} capacity` : "Unlimited"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      ls.is_active
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {ls.is_active ? "Active" : "Inactive"}
                  </span>
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
