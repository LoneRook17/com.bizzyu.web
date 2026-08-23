// Analytics Events vs Weekly Access bucketing.
//
// Weekly Cover nights are real `events` rows with access_kind='door_access'.
// GET /business/insights/events/overview historically returned them in the
// Events tab (Total events 6 = 3 one-offs + 3 covers) while the Weekly Access
// tab fetched the legacy line-skip overview and rendered empty.
//
// This module is the client filter: Events = one-off only, Weekly Access =
// door_access nights. Totals are recomputed from the filtered rows so Weekly
// Cover cannot inflate Events. Metrics formulas stay the same; the API path
// is unchanged.
//
// Identification, in order:
//   1. access_kind === 'door_access' on the overview row
//   2. event_id is a stamped night from GET /business/door-access/:id
// A missing access_kind on an older payload falls through to (2).

import type { EventOverviewItem, EventsOverview } from "./types"

export const EMPTY_EVENTS_OVERVIEW: EventsOverview = {
  total_events: 0,
  total_tickets_sold: 0,
  total_revenue: 0,
  total_checked_in: 0,
  average_checkin_rate: 0,
  events: [],
}

export function isWeeklyAccessEvent(
  event: { event_id: number; access_kind?: string | null },
  weeklyEventIds: Iterable<number> = [],
): boolean {
  if (event.access_kind === "door_access") return true
  const ids = weeklyEventIds instanceof Set ? weeklyEventIds : new Set(weeklyEventIds)
  return ids.has(event.event_id)
}

export function weeklyEventIdsFromNights(
  nights: Array<{ event_id: number | null | undefined }>,
): number[] {
  const ids: number[] = []
  for (const night of nights) {
    if (night.event_id != null) ids.push(night.event_id)
  }
  return ids
}

export function splitOverviewEvents<T extends { event_id: number; access_kind?: string | null }>(
  events: T[],
  weeklyEventIds: Iterable<number> = [],
): { oneOff: T[]; weekly: T[] } {
  const ids = weeklyEventIds instanceof Set ? weeklyEventIds : new Set(weeklyEventIds)
  const oneOff: T[] = []
  const weekly: T[] = []
  for (const event of events) {
    if (isWeeklyAccessEvent(event, ids)) weekly.push(event)
    else oneOff.push(event)
  }
  return { oneOff, weekly }
}

/** Checked-in headcount implied by a row's sold * rate. Overview has no raw count. */
export function impliedCheckedIn(event: Pick<EventOverviewItem, "tickets_sold" | "checkin_rate">): number {
  if (event.tickets_sold <= 0 || event.checkin_rate <= 0) return 0
  return Math.round((event.tickets_sold * event.checkin_rate) / 100)
}

export function recomputeEventsOverview(events: EventOverviewItem[]): EventsOverview {
  const total_tickets_sold = events.reduce((sum, event) => sum + (event.tickets_sold || 0), 0)
  const total_revenue = events.reduce((sum, event) => sum + (event.revenue || 0), 0)
  const total_checked_in = events.reduce((sum, event) => sum + impliedCheckedIn(event), 0)
  const average_checkin_rate =
    total_tickets_sold > 0 ? Math.round((total_checked_in / total_tickets_sold) * 1000) / 10 : 0
  return {
    total_events: events.length,
    total_tickets_sold,
    total_revenue,
    total_checked_in,
    average_checkin_rate,
    events,
  }
}

/**
 * Split one overview payload into the Events tab and the Weekly Access tab.
 * When nothing is weekly, Events keeps the server totals (checked-in is
 * more precise than the implied row math). The moment any cover night is
 * stripped, both sides recompute so Total events matches the visible list.
 */
export function bucketEventsOverview(
  data: EventsOverview,
  weeklyEventIds: Iterable<number> = [],
): { events: EventsOverview; weekly: EventsOverview } {
  const { oneOff, weekly } = splitOverviewEvents(data.events, weeklyEventIds)
  if (weekly.length === 0) {
    return { events: { ...data, events: oneOff }, weekly: EMPTY_EVENTS_OVERVIEW }
  }
  return {
    events: recomputeEventsOverview(oneOff),
    weekly: recomputeEventsOverview(weekly),
  }
}
