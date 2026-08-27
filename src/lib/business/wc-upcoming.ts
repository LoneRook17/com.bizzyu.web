/**
 * Upcoming Weekly Cover nights for Home, Events, and Marketing.
 * One-off / Custom nights must stay visible no matter how far out.
 */

import type { DoorAccessNight, DoorAccessProgramSummary } from "./door-access.ts"
import type { OneOffUpcomingNight } from "./home-upcoming.ts"
import type { MarketingNightInput } from "./marketing-events.ts"
import { isApprovedCanceledStatus } from "./weekly-cover-visibility.ts"

export function isUpcomingNightDate(date: string, today: string): boolean {
  return date >= today
}

export function isCustomUpcomingNight(
  night: Pick<DoorAccessNight, "is_customized" | "occurrence_date" | "is_closed" | "status">,
  today: string,
): boolean {
  if (!night.is_customized) return false
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

/** Every upcoming WC night — series and one-off — for Marketing → Events. */
export function marketingNightsFromSeries(
  loaded: Array<{ program: DoorAccessProgramSummary; nights: DoorAccessNight[] }>,
  today: string,
): MarketingNightInput[] {
  const out: MarketingNightInput[] = []
  for (const { program, nights } of loaded) {
    if (!program.is_active) continue
    for (const night of nights) {
      if (!isUpcomingNightDate(night.occurrence_date, today)) continue
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
