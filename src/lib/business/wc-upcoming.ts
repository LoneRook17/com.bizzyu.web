/**
 * Upcoming Weekly Cover nights for Home, Events, and Marketing.
 * One-off / Custom nights must stay visible no matter how far out.
 */

import type { DoorAccessNight, DoorAccessProgramSummary } from "./door-access.ts"
import type { OneOffUpcomingNight } from "./home-upcoming.ts"
import { isHostCustomNight } from "./host-custom-night.ts"
import type { MarketingNightInput } from "./marketing-events.ts"
import { hostShowsWeeklyCoverNight } from "./series-nights-window.ts"
import { isApprovedCanceledStatus } from "./weekly-cover-visibility.ts"

export function isUpcomingNightDate(date: string, today: string): boolean {
  return date >= today
}

export function isCustomUpcomingNight(
  night: Pick<DoorAccessNight, "occurrence_date" | "is_closed" | "status"> & {
    series_customized_at?: string | null
    flyer_image_url_override?: string | null
    override_scope?: string | null
    product_kind?: string | null
    access_kind?: string | null
  },
  today: string,
): boolean {
  if (!isHostCustomNight({
    product_kind: night.product_kind ?? "weekly_cover",
    access_kind: night.access_kind,
    series_customized_at: night.series_customized_at,
    flyer_image_url_override: night.flyer_image_url_override,
    override_scope: night.override_scope,
    occurrence_date: night.occurrence_date,
  })) return false
  if (!isUpcomingNightDate(night.occurrence_date, today)) return false
  if (night.is_closed) return false
  if (isApprovedCanceledStatus(night.status)) return false
  return true
}

export function oneOffNightsFromSeries(
  loaded: Array<{ program: DoorAccessProgramSummary; nights: DoorAccessNight[] }>,
  today: string,
): OneOffUpcomingNight[] {
  const out: OneOffUpcomingNight[] = []
  for (const { program, nights } of loaded) {
    if (!program.is_active) continue
    for (const night of nights) {
      if (isCustomUpcomingNight(night, today)) {
        out.push({ program, date: night.occurrence_date })
      }
    }
  }
  return out
}

export function customUpcomingNightsFromSeries(
  loaded: Array<{ program: DoorAccessProgramSummary; nights: DoorAccessNight[] }>,
  today: string,
): Array<{ program: DoorAccessProgramSummary; night: DoorAccessNight }> {
  const out: Array<{ program: DoorAccessProgramSummary; night: DoorAccessNight }> = []
  for (const { program, nights } of loaded) {
    if (!program.is_active) continue
    for (const night of nights) {
      if (isCustomUpcomingNight(night, today)) out.push({ program, night })
    }
  }
  return out
}

/**
 * Upcoming WC nights for Marketing → Events. The nights arrive on a far
 * fetch (180d so one-offs are not clipped), but the LIST paints only the
 * shared month window for generated series nights — Custom / one-off /
 * override dates still list no matter how far (hostShowsWeeklyCoverNight,
 * the same rule as the Host grid). Before this, Marketing dumped every
 * fetched template night — a five-month pile.
 */
export function marketingNightsFromSeries(
  loaded: Array<{ program: DoorAccessProgramSummary; nights: DoorAccessNight[] }>,
  today: string,
): MarketingNightInput[] {
  const out: MarketingNightInput[] = []
  for (const { program, nights } of loaded) {
    if (!program.is_active) continue
    for (const night of nights) {
      if (!isUpcomingNightDate(night.occurrence_date, today)) continue
      if (!hostShowsWeeklyCoverNight(night, today)) continue
      if (isApprovedCanceledStatus(night.status)) continue
      out.push({
        programId: program.id,
        programName: program.name,
        venueName: program.venue_name || "",
        date: night.occurrence_date,
        eventId: night.event_id,
        ticketsSold: night.passes_sold ?? 0,
        status: night.status,
      })
    }
  }
  return out
}
