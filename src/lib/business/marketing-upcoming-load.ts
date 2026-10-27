/**
 * Marketing → Events rows for a venue scope: upcoming green events AND
 * upcoming Weekly Cover nights (one row each; a venue with only WC nights
 * must not empty-state). Shared by the Events tab and the composer's
 * `Add event link` picker so both offer exactly the same list.
 *
 * `venueId` null = every venue the operator can see.
 */

import type { EventListItem } from "./types.ts"
import { easternToday, fetchDoorAccessProgramsSafe, loadProgramsUpcomingNights } from "./door-access.ts"
import { marketingUpcomingRows, type MarketingEventRow } from "./marketing-events.ts"
import { marketingNightsFromSeries } from "./wc-upcoming.ts"

async function client() {
  const mod = await import("./api-client")
  return mod.apiClient
}

export async function loadMarketingUpcomingRows(venueId: number | null): Promise<MarketingEventRow[]> {
  const api = await client()
  const params = new URLSearchParams({ tab: "upcoming", limit: "50" })
  if (venueId != null) params.set("venue_id", String(venueId))
  const [eventsRes, programs] = await Promise.all([
    api.get<{ events: EventListItem[]; total: number }>(`/business/events?${params.toString()}`),
    fetchDoorAccessProgramsSafe(venueId),
  ])
  const loaded = await loadProgramsUpcomingNights(programs.filter((p) => p.is_active))
  return marketingUpcomingRows({
    events: eventsRes.events ?? [],
    programs,
    nights: marketingNightsFromSeries(loaded, easternToday()),
  })
}
