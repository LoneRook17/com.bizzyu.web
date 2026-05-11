"use client"

import { useMemo, useState } from "react"
import { useAuth } from "@/lib/business/auth-context"
import { useVenue } from "@/lib/business/venue-context"
import EventsTab from "@/components/business/dashboard/marketing/EventsTab"
import FollowingTab from "@/components/business/dashboard/marketing/FollowingTab"

type TabKey = "events" | "followers"

/**
 * Marketing dashboard — two send-paths surface to owners and managers.
 *
 *   • Events    — pick one event, blast that event's audience via the
 *                 existing per-event composers under /business/events/[id]/manage/.
 *   • Followers — blast everyone who follows the selected venue (May 2026
 *                 venue-scope update). Multi-venue businesses use the global
 *                 venue switcher in the sidebar to scope; "All Venues"
 *                 rolls up unique followers across every venue.
 *
 * The venue scope comes from the global `useVenue()` context (the
 * sidebar's venue switcher), NOT a page-local dropdown — keeps the
 * Marketing tab consistent with Line Skips / Team / etc.
 */
export default function MarketingPage() {
  const { user } = useAuth()
  const role = user?.business_role
  const canSend = role === "owner" || role === "manager"

  const { venues, selectedVenueId, selectedVenue, isAllVenues } = useVenue()

  const [tab, setTab] = useState<TabKey>("events")

  // Single venue id (null when "All Venues" is active). Followers tab uses
  // venueIds for the All-Venues rollup; EventsTab passes venueId through to
  // /business/events?venue_id=.
  const scopedVenueId = useMemo(() => {
    if (isAllVenues || selectedVenueId === null || selectedVenueId === "all") return null
    return typeof selectedVenueId === "number" ? selectedVenueId : null
  }, [isAllVenues, selectedVenueId])

  const allVenueIds = useMemo(() => venues.map((v) => v.id), [venues])
  const venueLabel = scopedVenueId == null ? "All venues" : selectedVenue?.name ?? "Venue"

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
        <EventsTab venueId={scopedVenueId} />
      ) : (
        <FollowingTab
          venueId={scopedVenueId}
          venueIds={allVenueIds}
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
