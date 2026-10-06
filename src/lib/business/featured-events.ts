/**
 * Knight "Featured on Knight app" — pure helpers for the dashboard section.
 *
 * Rows come from services `GET /business/featured-events` (the same
 * business_featured_events table Laravel's admin side-tab and the Knight
 * app's public GET read). Nothing here touches Bizzy's `is_featured`.
 */

export interface FeaturedEventSummary {
  event_id: number
  name: string
  start_date_time: string | null
  end_date_time: string | null
  venue_name?: string | null
  flyer_image_url?: string | null
  status?: string
  recurring_series_id?: number | null
}

export interface FeaturedEventRow {
  id: number
  event_id: number
  sort_order: number
  is_active: boolean
  note?: string | null
  live: boolean
  event: FeaturedEventSummary | null
}

export interface FeaturedEventsPayload {
  featured: FeaturedEventRow[]
  candidates: FeaturedEventSummary[]
  knight_only?: boolean
}

/** New row-id order after moving the row at `from` to `to` (clamped). */
export function moveRow(ids: number[], from: number, to: number): number[] {
  if (from < 0 || from >= ids.length) return ids.slice()
  const dest = Math.max(0, Math.min(ids.length - 1, to))
  if (dest === from) return ids.slice()
  const next = ids.slice()
  const [id] = next.splice(from, 1)
  next.splice(dest, 0, id)
  return next
}

/** Candidates minus anything already pinned, in start order. */
export function pinnable(
  candidates: FeaturedEventSummary[],
  pinnedEventIds: Iterable<number>,
): FeaturedEventSummary[] {
  const pinned = new Set(pinnedEventIds)
  return candidates
    .filter((e) => !pinned.has(e.event_id))
    .sort((a, b) => (a.start_date_time ?? "").localeCompare(b.start_date_time ?? ""))
}

/** Status pill copy for a pinned row. */
export function rowStatus(row: FeaturedEventRow): "live" | "hidden" | "not live" | "missing" {
  if (!row.event) return "missing"
  if (!row.is_active) return "hidden"
  return row.live ? "live" : "not live"
}

/** "Tue Oct 6 · 9:00 PM" from a naive wall-clock string. */
export function whenLabel(start: string | null | undefined): string {
  if (!start) return "—"
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(start)
  if (!m) return start
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]))
  const day = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  return `${day} · ${time}`
}
