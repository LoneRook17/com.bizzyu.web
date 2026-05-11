"use client"

import { useEffect, useMemo, useState } from "react"
import { apiClient } from "@/lib/business/api-client"
import { useAuth } from "@/lib/business/auth-context"
import EventsTab from "@/components/business/dashboard/marketing/EventsTab"
import FollowingTab from "@/components/business/dashboard/marketing/FollowingTab"

type TabKey = "events" | "followers"

interface VenueOption {
  id: number
  name: string
}

/**
 * Marketing dashboard — two send-paths surface to owners and managers.
 *
 *   • Events    — pick one event, blast that event's audience via the
 *                 existing per-event composers under /business/events/[id]/manage/.
 *   • Followers — blast everyone who follows the selected venue (May 2026
 *                 venue-scope update). Multi-venue businesses pick one
 *                 venue from the top dropdown; "All Venues" rolls up
 *                 unique followers across every venue.
 *
 * Per-event Announcement + SMS Blast menu items stay on each event's manage
 * page as a power-user shortcut.
 */
export default function MarketingPage() {
  const { user } = useAuth()
  const role = user?.business_role
  const canSend = role === "owner" || role === "manager"

  const [tab, setTab] = useState<TabKey>("events")
  const [venues, setVenues] = useState<VenueOption[]>([])
  const [selectedVenueId, setSelectedVenueId] = useState<number | null>(null)

  useEffect(() => {
    if (!canSend) return
    apiClient
      .get<{ venues: VenueOption[] }>("/user/business/venues")
      .then((res) => setVenues(res.venues ?? []))
      .catch(() => {})
  }, [canSend])

  const venueIds = useMemo(() => venues.map((v) => v.id), [venues])
  const venueLabel = useMemo(() => {
    if (selectedVenueId == null) return "All venues"
    return venues.find((v) => v.id === selectedVenueId)?.name ?? "Venue"
  }, [selectedVenueId, venues])

  if (!canSend) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-center">
        <p className="text-sm text-gray-600">
          Only owners and managers can send marketing blasts.
        </p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="mb-3 text-xl font-bold text-ink">Marketing</h1>

      {venues.length > 1 && (
        <div className="mb-3">
          <label className="mb-1 block text-xs font-semibold text-gray-500">
            Venue
          </label>
          <select
            value={selectedVenueId ?? ""}
            onChange={(e) =>
              setSelectedVenueId(e.target.value === "" ? null : Number(e.target.value))
            }
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">All Venues</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div role="tablist" className="mb-4 flex gap-1 rounded-lg bg-gray-100 p-1">
        <TabPill active={tab === "events"} onClick={() => setTab("events")}>
          Events
        </TabPill>
        <TabPill
          active={tab === "followers"}
          onClick={() => setTab("followers")}
        >
          Followers
        </TabPill>
      </div>
      {tab === "events" ? (
        <EventsTab />
      ) : (
        <FollowingTab
          venueId={selectedVenueId}
          venueIds={venueIds}
          venueLabel={venueLabel}
        />
      )}
    </div>
  )
}

function TabPill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex-1 rounded-md px-4 py-1.5 text-sm font-semibold transition-colors ${
        active
          ? "bg-white text-primary shadow-sm"
          : "text-gray-600 hover:text-ink"
      }`}
    >
      {children}
    </button>
  )
}
