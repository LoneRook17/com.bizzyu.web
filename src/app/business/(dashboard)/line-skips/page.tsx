"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/business/auth-context"
import { useVenue, useVenueParam } from "@/lib/business/venue-context"
import { apiClient } from "@/lib/business/api-client"
import EmptyState from "@/components/business/dashboard/EmptyState"
import VenueSelectModal from "@/components/business/dashboard/VenueSelectModal"
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

export default function LineSkipsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { venues, isAllVenues, setSelectedVenue } = useVenue()
  const venueParam = useVenueParam()
  const [showVenueModal, setShowVenueModal] = useState(false)
  const [lineSkips, setLineSkips] = useState<LineSkip[]>([])
  const [loading, setLoading] = useState(true)
  const [deactivating, setDeactivating] = useState<number | null>(null)

  const canCreate = user?.business_role === "owner" || user?.business_role === "manager"
  const canManage = canCreate

  const handleCreate = () => {
    if (isAllVenues && venues.length > 1) {
      setShowVenueModal(true)
    } else {
      if (isAllVenues && venues.length === 1) {
        setSelectedVenue(venues[0].id)
      }
      router.push("/business/line-skips/new")
    }
  }

  const fetchLineSkips = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiClient.get<{ line_skips: LineSkip[] }>(`/business/line-skips?_=1${venueParam}`)
      setLineSkips(data.line_skips)
    } catch {
      setLineSkips([])
    } finally {
      setLoading(false)
    }
  }, [venueParam])

  useEffect(() => {
    fetchLineSkips()
  }, [fetchLineSkips])

  const handleDeactivate = async (id: number, name: string) => {
    if (!confirm(`Stop "${name}"? This will cancel all future nights. This cannot be undone.`)) return
    setDeactivating(id)
    try {
      await apiClient.delete(`/business/line-skips/${id}`)
      await fetchLineSkips()
    } catch {
      alert("Failed to deactivate line skip")
    } finally {
      setDeactivating(null)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-ink">Line Skips</h1>
        {canCreate && (
          <button
            onClick={handleCreate}
            className="rounded-lg bg-gradient-to-br from-[#2ECB4E] to-[#05EB54] px-4 py-2 text-sm font-semibold text-white shadow-md shadow-primary/25 hover:brightness-110 transition-all cursor-pointer"
          >
            Create Line Skip
          </button>
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
          message={
            "Line Skips let students pay to skip the line at your venue during peak hours.\nYou set the price, capacity, and which nights it runs — students claim through Bizzy and present a QR code at the door."
          }
          actionLabel={canCreate ? "Create Line Skip" : undefined}
          onAction={canCreate ? handleCreate : undefined}
          learnMoreHref="/business/help#line-skips"
          learnMoreLabel="How line skips work"
        />
      ) : (
        <div className="space-y-3">
          {lineSkips.map((ls) => (
            <div
              key={ls.id}
              className="rounded-xl border border-gray-200 bg-white p-4 hover:border-gray-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between">
                <Link href={`/business/line-skips/${ls.id}`} className="flex items-start gap-3 flex-1 min-w-0">
                  {/* Icon */}
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 flex-shrink-0">
                    <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-ink">{ls.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatDays(ls.days_of_week)} &middot; {formatPrice(ls.default_price_cents)} &middot;{" "}
                      {ls.default_capacity ? `${ls.default_capacity} capacity` : "Unlimited"}
                    </p>
                  </div>
                </Link>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      ls.is_active
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {ls.is_active ? "Active" : "Stopped"}
                  </span>
                  {ls.is_active && canManage && (
                    <button
                      onClick={() => handleDeactivate(ls.id, ls.name)}
                      disabled={deactivating === ls.id}
                      className="inline-flex items-center rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {deactivating === ls.id ? "Stopping..." : "Stop"}
                    </button>
                  )}
                  <Link href={`/business/line-skips/${ls.id}`}>
                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showVenueModal && (
        <VenueSelectModal
          venues={venues}
          onSelect={(venue) => {
            setSelectedVenue(venue.id)
            setShowVenueModal(false)
            router.push("/business/line-skips/new")
          }}
          onClose={() => setShowVenueModal(false)}
        />
      )}
    </div>
  )
}
