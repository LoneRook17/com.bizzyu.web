"use client"

import { useMemo } from "react"
import { Lock } from "lucide-react"
import { useAuth } from "@/lib/business/auth-context"
import { useVenue } from "@/lib/business/venue-context"
import { PageHeader } from "@/components/business/v2/PageHeader"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/business/v2/ui/tabs"
import { EmptyState } from "@/components/business/v2/ui/empty-state"
import EventsTab from "@/components/business/v2/marketing/EventsTab"
import FollowingTab from "@/components/business/v2/marketing/FollowingTab"

/**
 * Marketing dashboard — two send-paths surface to owners and managers.
 *
 *   • Events    — pick one event, blast that event's audience via the
 *                 per-event composers under /business/v2/events/[id]/manage/.
 *   • Followers — blast everyone who follows the selected venue (May 2026
 *                 venue-scope update). "All venues" rolls up unique
 *                 followers across every venue.
 *
 * Venue scope comes from the global `useVenue()` context (sidebar switcher),
 * not a page-local dropdown.
 */
export default function MarketingPage() {
  const { user } = useAuth()
  const role = user?.business_role
  const canSend = role === "owner" || role === "manager"

  const { venues, selectedVenueId, selectedVenue, isAllVenues } = useVenue()

  // Single venue id (null when "All venues" is active).
  const scopedVenueId = useMemo(() => {
    if (isAllVenues || selectedVenueId === null || selectedVenueId === "all") return null
    return typeof selectedVenueId === "number" ? selectedVenueId : null
  }, [isAllVenues, selectedVenueId])

  const allVenueIds = useMemo(() => venues.map((v) => v.id), [venues])
  const venueLabel = scopedVenueId == null ? "All venues" : selectedVenue?.name ?? "Venue"

  if (!canSend) {
    return (
      <>
        <PageHeader title="Marketing" description="Reach your attendees and followers." />
        <EmptyState
          icon={Lock}
          title="Marketing is owner & manager only"
          description="Ask an owner or manager on your team to send announcements and SMS blasts."
        />
      </>
    )
  }

  return (
    <>
      <PageHeader title="Marketing" description="Send announcements and SMS blasts to your audience." />

      <Tabs defaultValue="events">
        <TabsList>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="followers">Followers</TabsTrigger>
        </TabsList>

        <TabsContent value="events">
          <EventsTab venueId={scopedVenueId} />
        </TabsContent>
        <TabsContent value="followers">
          <FollowingTab venueId={scopedVenueId} venueIds={allVenueIds} venueLabel={venueLabel} />
        </TabsContent>
      </Tabs>
    </>
  )
}
