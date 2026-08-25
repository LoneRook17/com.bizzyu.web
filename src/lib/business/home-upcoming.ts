// Home's "what's coming up" list, across BOTH types (D2-6).
//
// Before this, Home answered "what's next?" with events only — a venue whose
// next thing on the calendar was a Thursday door night saw an events card that
// either skipped it or said "no upcoming events" while the night was live and
// selling. The list has to interleave, or it isn't an overview.
//
// A program contributes exactly ONE entry: its next night. A weekly program has
// a night every week; letting it enumerate would push every event off a
// four-row card. The row links to the SERIES (D-F11.1) because that is where a
// program is managed, and the full night list is one click in.
//
// Pure, so `npm test` can pin the interleave without a browser.

// isDoorAccessKind is a pure helper in door-access.ts (api-client stays behind
// a lazy import), so `node --test` can load this module without a browser.
import type { EventListItem } from "./types"
import { isWeeklyCoverProduct, type DoorAccessProgramSummary } from "./door-access.ts"

export type UpcomingEntry =
  | { kind: "event"; key: string; sortKey: string; event: EventListItem }
  | { kind: "access"; key: string; sortKey: string; program: DoorAccessProgramSummary; date: string }

/** The next night of a program, or null when nothing is stamped ahead. */
export function nextAccessNight(
  program: DoorAccessProgramSummary,
): { program: DoorAccessProgramSummary; date: string } | null {
  if (!program.is_active) return null
  if (!program.next_night_date) return null
  return { program, date: program.next_night_date }
}

/**
 * Merge upcoming events and next-nights into one chronological list.
 *
 * Sorting is on the raw strings on purpose. Event starts are
 * "YYYY-MM-DD HH:MM:SS" (or ISO) and nights are "YYYY-MM-DD"; both compare
 * lexicographically in the same order they compare chronologically, and a
 * date-only night sorts to the START of its day — which is the honest place
 * for it, since a door program opens before the ticketed show it shares a
 * night with. Parsing to Date() here would re-introduce the US/Eastern vs UTC
 * skew this codebase keeps getting bitten by, for no gain.
 */
export function homeUpcoming(
  events: EventListItem[],
  programs: DoorAccessProgramSummary[],
  limit = 4,
): UpcomingEntry[] {
  const entries: UpcomingEntry[] = events
    .filter((event) => !isWeeklyCoverProduct(event))
    .map((event) => ({
      kind: "event",
      key: `event-${event.event_id}`,
      sortKey: event.start_date_time ?? "",
      event,
    }))

  for (const program of programs) {
    const next = nextAccessNight(program)
    if (!next) continue
    entries.push({
      kind: "access",
      key: `access-${program.id}`,
      sortKey: next.date,
      program,
      date: next.date,
    })
  }

  entries.sort((a, b) => a.sortKey.localeCompare(b.sortKey))
  return entries.slice(0, limit)
}
