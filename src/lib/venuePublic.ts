// Public /venue/:id board data.
//
// GET /ui/venues/venue/:id is the page's original source. On current services
// it returns the venue/business shell plus status=published events only, so a
// Weekly Cover night stamped draft (escrow / no-payout) never arrives there.
// GET /ui/events is the same published-only list, keyed by venue_id.
// GET /ui/events/:id has neither a status filter nor an access_kind filter
// (same contract the event checkout page already uses).
//
// This module keeps the existing venue payload, then fills events from those
// two public event endpoints. It does not invent a second marketing site.

export const VENUE_EVENT_LOOKAHEAD = 20

const LIVE_ONE_OFF_STATUSES = new Set(["published", "approved", "active"])

export interface VenueEvent {
  event_id: number
  name: string
  start_date_time: string
  end_date_time: string
  venue_name: string
  flyer_image_url: string | null
  min_ticket_price: number | string | null
  access_kind?: "event" | "door_access" | null
  status?: string | null
  venue_id?: number | null
}

export interface VenueData {
  venue: {
    id: number
    name: string
    address: string
    description: string | null
    venuePhotoUrl: string | null
    website: string | null
    instagram: string | null
  }
  business: {
    business_id: number
    name: string
    logo_image_url: string | null
    instagram: string | null
    website: string | null
  }
  events: VenueEvent[]
  deals: Array<{
    id: number
    deal_title: string
    description: string | null
    deal_image_path: string | null
    deal_category: string
    deal_type: string
  }>
  line_skips: Array<{
    id: number
    date: string
    start_time: string
    end_time: string
    price_cents: number
    capacity: number | null
    tickets_sold: number
    status: string
    line_skip_name: string
    line_skip_description: string | null
  }>
}

export function eventMatchesVenue(
  row: { venue_id?: number | string | null },
  venueId: string | number,
): boolean {
  if (row.venue_id == null || row.venue_id === "") return false
  return Number(row.venue_id) === Number(venueId)
}

export function toVenueEvent(row: Record<string, unknown>): VenueEvent | null {
  const eventId = Number(row.event_id)
  const name = typeof row.name === "string" ? row.name : ""
  if (!eventId || !name) return null

  const access = row.access_kind
  const accessKind =
    access === "door_access" || access === "event" ? access : null

  const price =
    row.min_ticket_price ?? row.lowest_price ?? null

  return {
    event_id: eventId,
    name,
    start_date_time: typeof row.start_date_time === "string" ? row.start_date_time : "",
    end_date_time: typeof row.end_date_time === "string" ? row.end_date_time : "",
    venue_name: typeof row.venue_name === "string" ? row.venue_name : "",
    flyer_image_url: typeof row.flyer_image_url === "string" ? row.flyer_image_url : null,
    min_ticket_price: price as number | string | null,
    access_kind: accessKind,
    status: typeof row.status === "string" ? row.status : null,
    venue_id: row.venue_id == null ? null : Number(row.venue_id),
  }
}

/** Door-access nights stay listable even when core stamped them draft. */
export function shouldListOnVenuePage(event: VenueEvent): boolean {
  if (event.access_kind === "door_access") return true
  if (!event.status) return true
  return LIVE_ONE_OFF_STATUSES.has(event.status.toLowerCase())
}

export function mergeVenueEvents(...groups: Array<VenueEvent[] | undefined>): VenueEvent[] {
  const byId = new Map<number, VenueEvent>()
  for (const group of groups) {
    for (const raw of group ?? []) {
      if (!shouldListOnVenuePage(raw)) continue
      const prev = byId.get(raw.event_id)
      byId.set(raw.event_id, prev ? pickRicherEvent(prev, raw) : raw)
    }
  }
  return [...byId.values()].sort((a, b) =>
    a.start_date_time.localeCompare(b.start_date_time),
  )
}

function pickRicherEvent(a: VenueEvent, b: VenueEvent): VenueEvent {
  return {
    ...a,
    ...b,
    flyer_image_url: b.flyer_image_url || a.flyer_image_url,
    min_ticket_price: b.min_ticket_price ?? a.min_ticket_price,
    access_kind: b.access_kind ?? a.access_kind,
    status: b.status ?? a.status,
    venue_id: b.venue_id ?? a.venue_id,
  }
}

export function lookaheadIds(seed: number, count = VENUE_EVENT_LOOKAHEAD): number[] {
  if (!Number.isFinite(seed) || seed <= 0 || count <= 0) return []
  return Array.from({ length: count }, (_, i) => seed + i + 1)
}

export function eventIdSeeds(events: Array<{ event_id?: number }>): number[] {
  const ids = events
    .map((e) => Number(e.event_id))
    .filter((id) => Number.isFinite(id) && id > 0)
  return [...new Set(ids)]
}

async function fetchJson(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, { cache: "no-store" })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

function asEventList(raw: unknown): VenueEvent[] {
  const rows = Array.isArray(raw) ? raw : []
  return rows
    .filter((row): row is Record<string, unknown> => !!row && typeof row === "object")
    .map(toVenueEvent)
    .filter((e): e is VenueEvent => e != null)
}

/**
 * Venue shell from GET /ui/venues/venue/:id, events filled from that payload
 * plus GET /ui/events (by venue_id) plus GET /ui/events/:id after the newest
 * id we already have. The detail route is what still returns draft Weekly
 * Cover nights when both list endpoints omit them.
 */
export async function fetchVenuePublicData(
  venueId: string,
  apiBase: string,
): Promise<VenueData | null> {
  const base = apiBase.replace(/\/$/, "")
  const venueRaw = await fetchJson(`${base}/ui/venues/venue/${venueId}`)
  if (!venueRaw || typeof venueRaw !== "object" || !("venue" in venueRaw)) {
    return null
  }

  const venue = venueRaw as VenueData
  const listed = asEventList((venueRaw as { events?: unknown }).events)
  const catalog = asEventList(await fetchJson(`${base}/ui/events`))
  const forVenue = catalog.filter((e) => eventMatchesVenue(e, venueId))

  const seeds = eventIdSeeds([...listed, ...forVenue, ...catalog])
  const venueSeed = Math.max(0, ...eventIdSeeds([...listed, ...forVenue]))
  const catalogSeed = Math.max(0, ...eventIdSeeds(catalog))
  const ids = new Set<number>([
    ...lookaheadIds(venueSeed),
    ...lookaheadIds(catalogSeed),
  ])
  for (const id of seeds) ids.delete(id)

  const details = await Promise.all(
    [...ids].map(async (id) => {
      const raw = await fetchJson(`${base}/ui/events/${id}`)
      if (!raw || typeof raw !== "object") return null
      const event = toVenueEvent(raw as Record<string, unknown>)
      if (!event || !eventMatchesVenue(event, venueId)) return null
      return event
    }),
  )

  return {
    ...venue,
    events: mergeVenueEvents(listed, forVenue, details.filter((e): e is VenueEvent => e != null)),
    deals: Array.isArray(venue.deals) ? venue.deals : [],
    line_skips: Array.isArray(venue.line_skips) ? venue.line_skips : [],
  }
}
