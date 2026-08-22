import { resolveProgramImageUrl } from "./business/door-access.ts"

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

export interface VenueAccessTier {
  name: string
  price_usd: number
}

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
  recurring_series_id?: number | null
  tickets: VenueAccessTier[]
}

export interface VenueData {
  venue: {
    id: number
    name: string
    address: string
    description: string | null
    venuePhotoUrl: string | null
    /** Snake_case alias some venue payloads still send. Prefer venuePhotoUrl. */
    photo_url?: string | null
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

  const seriesRaw = row.recurring_series_id ?? row.series_id
  const seriesId = seriesRaw == null || seriesRaw === "" ? null : Number(seriesRaw)

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
    recurring_series_id: seriesId != null && Number.isFinite(seriesId) ? seriesId : null,
    tickets: parseVenueAccessTiers(row.tickets ?? row.ticket_tiers),
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
    recurring_series_id: b.recurring_series_id ?? a.recurring_series_id,
    tickets: b.tickets.length > 0 ? b.tickets : a.tickets,
  }
}

export function parseVenueAccessTiers(raw: unknown): VenueAccessTier[] {
  let rows = raw
  if (typeof rows === "string") {
    try {
      rows = JSON.parse(rows)
    } catch {
      return []
    }
  }
  if (!Array.isArray(rows)) return []
  return rows
    .filter((tier): tier is Record<string, unknown> => !!tier && typeof tier === "object")
    .filter((tier) => tier.is_hidden !== true && tier.is_hidden !== 1 && tier.is_hidden !== "1")
    .map((tier) => {
      const name =
        typeof tier.name === "string" && tier.name.trim() ? tier.name.trim() : "Cover"
      const price = Number(tier.price_usd ?? tier.price ?? tier.lowest_price ?? 0)
      return { name, price_usd: Number.isFinite(price) ? price : 0 }
    })
}

const CHIP_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

/** Calendar date from a wall-clock datetime. Never timezone-shifted. */
export function eventCalendarDate(dateStr: string): string {
  return dateStr.slice(0, 10)
}

/** "Mon 24" from "2026-08-24 21:00:00". Parsed as a calendar date, not a Date(). */
export function formatNightChipLabel(dateStr: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(eventCalendarDate(dateStr))
  if (!match) return dateStr
  const y = Number(match[1])
  const m = Number(match[2])
  const d = Number(match[3])
  if (m < 1 || m > 12 || d < 1 || d > 31) return dateStr
  const weekday = CHIP_WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
  return `${weekday} ${d}`
}

export function formatAccessPrice(n: number): string {
  if (!Number.isFinite(n)) return ""
  if (n === 0) return "Free"
  return Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`
}

/**
 * Price on one night chip. Uses that night's min ticket / cover, never a
 * hardcoded 5. A single price is "$5"; two or more tiers is "From $5".
 */
export function nightChipPrice(night: Pick<VenueEvent, "min_ticket_price" | "tickets">): string {
  const tierPrices = night.tickets
    .map((tier) => Number(tier.price_usd))
    .filter((n) => Number.isFinite(n))
  if (tierPrices.length > 0) {
    const formatted = formatAccessPrice(Math.min(...tierPrices))
    if (!formatted) return ""
    return tierPrices.length > 1 ? `From ${formatted}` : formatted
  }
  if (night.min_ticket_price == null || night.min_ticket_price === "") return ""
  return formatAccessPrice(Number(night.min_ticket_price))
}

/**
 * One program card's price lines.
 * A single Cover (or only a min price) reads "Cover $5".
 * Two or more real tiers list each name + price.
 */
export function weeklyAccessPriceLines(nights: VenueEvent[]): string[] {
  const withTiers = nights.find((night) => night.tickets.length > 0)
  if (withTiers && withTiers.tickets.length > 0) {
    return withTiers.tickets.map(
      (tier) => `${tier.name} ${formatAccessPrice(tier.price_usd)}`.trim(),
    )
  }
  const priced = nights.find((night) => night.min_ticket_price != null && night.min_ticket_price !== "")
  if (!priced) return []
  const n = Number(priced.min_ticket_price)
  if (!Number.isFinite(n)) return []
  return [`Cover ${formatAccessPrice(n)}`]
}

/**
 * Group weekly nights into programs. Prefer recurring_series_id; if the
 * public payload omits it, nights with the same name at the same venue
 * are one program (The Dungeon's three Weekly Cover nights).
 */
export function groupWeeklyAccessNights(nights: VenueEvent[]): VenueEvent[][] {
  const groups = new Map<string, VenueEvent[]>()
  const order: string[] = []
  for (const night of nights) {
    const key =
      night.recurring_series_id != null
        ? `series:${night.recurring_series_id}`
        : `name:${night.venue_id ?? ""}:${night.name.trim().toLowerCase()}`
    const existing = groups.get(key)
    if (existing) {
      existing.push(night)
      continue
    }
    groups.set(key, [night])
    order.push(key)
  }
  return order.map((key) =>
    (groups.get(key) ?? []).slice().sort((a, b) => a.start_date_time.localeCompare(b.start_date_time)),
  )
}

function nonemptyPhotoUrl(v: string | null | undefined): string | null {
  if (typeof v !== "string") return null
  const trimmed = v.trim()
  return trimmed.length > 0 ? trimmed : null
}

/** Venue photo from either camelCase or snake_case on the public payload. */
export function coalesceVenuePhotoUrl(venue: {
  venuePhotoUrl?: string | null
  photo_url?: string | null
}): string | null {
  return nonemptyPhotoUrl(venue.venuePhotoUrl) ?? nonemptyPhotoUrl(venue.photo_url)
}

/**
 * Weekly Access card image: program flyer first, then the venue photo.
 * Reuses the same fallback helper the host dashboard already uses.
 */
export function resolveVenueEventImageUrl(
  event: Pick<VenueEvent, "flyer_image_url" | "venue_id">,
  venue: { id: number; venuePhotoUrl?: string | null; photo_url?: string | null },
): string | null {
  const venuePhoto = coalesceVenuePhotoUrl(venue)
  return resolveProgramImageUrl(
    {
      flyer_image_url: event.flyer_image_url,
      photo_url: venuePhoto,
      venue_id: event.venue_id ?? venue.id,
    },
    [{ id: venue.id, photo_url: venuePhoto }],
  )
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
  const doorAccessIds = [...listed, ...forVenue]
    .filter((event) => event.access_kind === "door_access")
    .map((event) => event.event_id)
  const ids = new Set<number>([
    ...lookaheadIds(venueSeed),
    ...lookaheadIds(catalogSeed),
    ...doorAccessIds,
  ])
  for (const id of seeds) {
    if (!doorAccessIds.includes(id)) ids.delete(id)
  }

  const details = await Promise.all(
    [...ids].map(async (id) => {
      const raw = await fetchJson(`${base}/ui/events/${id}`)
      if (!raw || typeof raw !== "object") return null
      const event = toVenueEvent(eventPayload(raw))
      if (!event || !eventMatchesVenue(event, venueId)) return null
      return event
    }),
  )

  let events = mergeVenueEvents(listed, forVenue, details.filter((e): e is VenueEvent => e != null))
  events = await enrichWeeklyAccessTiers(base, events)

  return {
    ...venue,
    venue: {
      ...venue.venue,
      venuePhotoUrl: coalesceVenuePhotoUrl(venue.venue),
    },
    events,
    deals: Array.isArray(venue.deals) ? venue.deals : [],
    line_skips: Array.isArray(venue.line_skips) ? venue.line_skips : [],
  }
}

function eventPayload(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object") return {}
  const row = raw as Record<string, unknown>
  const nested = row.event
  const base =
    nested && typeof nested === "object" ? { ...(nested as Record<string, unknown>) } : { ...row }
  if (!base.tickets && Array.isArray(row.tickets)) base.tickets = row.tickets
  if (!base.ticket_tiers && Array.isArray(row.ticket_tiers)) base.ticket_tiers = row.ticket_tiers
  return base
}

/** Checkout payload has the real tiers when /ui/events/:id only has a lowest price. */
async function enrichWeeklyAccessTiers(base: string, events: VenueEvent[]): Promise<VenueEvent[]> {
  const need = events.filter(
    (event) => event.access_kind === "door_access" && event.tickets.length === 0,
  )
  if (need.length === 0) return events

  const extras = await Promise.all(
    need.map(async (event) => {
      const raw = await fetchJson(`${base}/checkout/event/${event.event_id}`)
      if (!raw || typeof raw !== "object") return null
      const mapped = toVenueEvent(eventPayload(raw))
      if (!mapped || mapped.event_id !== event.event_id) return null
      return mapped.tickets.length > 0 || mapped.min_ticket_price != null ? mapped : null
    }),
  )

  return mergeVenueEvents(events, extras.filter((e): e is VenueEvent => e != null))
}
