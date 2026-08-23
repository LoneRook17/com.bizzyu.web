import { looksLikeWeeklyCoverName, readAccessKind, resolveProgramImageUrl } from "./business/door-access.ts"

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
  /** tickets.id for this night. Needed so a tier chip can preselect checkout. */
  ticket_id?: number
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
  /** Program template tiers when the night row itself has no tickets. */
  template_tickets?: VenueAccessTier[]
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

  let accessKind = readAccessKind(row.access_kind)
  if (accessKind !== "door_access" && looksLikeWeeklyCoverName(name)) {
    accessKind = "door_access"
  }

  const price = firstUsdAmount(
    row.min_ticket_price,
    row.lowest_price,
    row.lowest_price_usd,
    row.price_usd,
    row.amount,
    centsToUsd(row.price_cents),
    centsToUsd(row.amount_cents),
  )

  const seriesRaw = row.recurring_series_id ?? row.series_id
  const seriesId = seriesRaw == null || seriesRaw === "" ? null : Number(seriesRaw)

  return {
    event_id: eventId,
    name,
    start_date_time: typeof row.start_date_time === "string" ? row.start_date_time : "",
    end_date_time: typeof row.end_date_time === "string" ? row.end_date_time : "",
    venue_name: typeof row.venue_name === "string" ? row.venue_name : "",
    flyer_image_url: typeof row.flyer_image_url === "string" ? row.flyer_image_url : null,
    min_ticket_price: price,
    access_kind: accessKind,
    status: typeof row.status === "string" ? row.status : null,
    venue_id: row.venue_id == null ? null : Number(row.venue_id),
    recurring_series_id: seriesId != null && Number.isFinite(seriesId) ? seriesId : null,
    tickets: parseVenueAccessTiers(row.tickets ?? row.ticket_tiers ?? row.tiers),
    template_tickets: parseVenueAccessTiers(
      row.template_tickets ?? row.program_tickets ?? row.program_template_tickets ?? row.tiers,
    ),
  }
}

/** Door-access nights stay listable even when core stamped them draft. */
export function shouldListOnVenuePage(event: VenueEvent): boolean {
  if (event.access_kind === "door_access") return true
  if (looksLikeWeeklyCoverName(event.name)) return true
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
    tickets: pickRicherTiers(a.tickets, b.tickets),
    template_tickets: pickRicherTiers(a.template_tickets ?? [], b.template_tickets ?? []),
  }
}

function ticketIdCount(tiers: VenueAccessTier[]): number {
  return tiers.filter((tier) => tier.ticket_id != null).length
}

/** Longer list wins. Same length prefers more checkout ticket ids. */
function pickRicherTiers(a: VenueAccessTier[], b: VenueAccessTier[]): VenueAccessTier[] {
  if (b.length === 0) return a
  if (a.length === 0) return b
  if (b.length !== a.length) return b.length > a.length ? b : a
  return ticketIdCount(b) > ticketIdCount(a) ? b : a
}

function isRicherTierList(incoming: VenueAccessTier[], current: VenueAccessTier[]): boolean {
  return pickRicherTiers(current, incoming) === incoming && incoming !== current
}

/** Single Cover (or blank name) is the venue / min-price fallback, not a full program. */
export function isCoverOnlyFallback(tiers: VenueAccessTier[]): boolean {
  if (tiers.length !== 1) return false
  const name = tiers[0].name.trim().toLowerCase()
  return name === "cover" || name === ""
}

/** Shared program prices may copy names across nights. Those ids belong to the source night. */
function withoutTicketIds(tiers: VenueAccessTier[]): VenueAccessTier[] {
  return tiers.map((tier) => ({ name: tier.name, price_usd: tier.price_usd }))
}

export function parseUsdAmount(raw: unknown): number | null {
  if (raw == null || raw === "") return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

function centsToUsd(raw: unknown): number | null {
  const cents = parseUsdAmount(raw)
  return cents == null ? null : cents / 100
}

function firstUsdAmount(...candidates: unknown[]): number | string | null {
  for (const raw of candidates) {
    if (raw == null || raw === "") continue
    if (typeof raw === "number" && Number.isFinite(raw)) return raw
    if (typeof raw === "string" && raw.trim() !== "") return raw
  }
  return null
}

/** Ticket / cover dollars from the field names public payloads actually use. */
export function parseTierPriceUsd(tier: Record<string, unknown>): number | null {
  const usd = parseUsdAmount(
    tier.price_usd ?? tier.price ?? tier.lowest_price ?? tier.lowest_price_usd ?? tier.amount,
  )
  if (usd != null) return usd
  return centsToUsd(tier.price_cents ?? tier.amount_cents)
}

/** tickets.id from the public event / checkout payload. Never invent a name. */
export function parseTicketId(tier: Record<string, unknown> | unknown): number | undefined {
  if (!tier || typeof tier !== "object") return parseTicketIdValue(tier)
  const row = tier as Record<string, unknown>
  return parseTicketIdValue(row.ticket_id ?? row.ticketId ?? row.id)
}

function parseTicketIdValue(raw: unknown): number | undefined {
  if (raw == null || raw === "") return undefined
  const n = Number(raw)
  if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) return undefined
  return n
}

function accessTier(name: string, priceUsd: number, ticketId?: number): VenueAccessTier {
  return ticketId != null ? { name, price_usd: priceUsd, ticket_id: ticketId } : { name, price_usd: priceUsd }
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
      const price = parseTierPriceUsd(tier)
      return accessTier(name, price ?? 0, parseTicketId(tier))
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

/** "Cover $5" / "Skip the Line $10" from the payload name. Do not invent names. */
export function formatAccessTierLabel(tier: VenueAccessTier): string {
  const formatted = formatAccessPrice(Number(tier.price_usd))
  if (!formatted) return ""
  const name = tier.name.trim() || "Cover"
  return name.toLowerCase() === "cover" ? `Cover ${formatted}` : `${name} ${formatted}`
}

/**
 * Laravel checkout preselect. Sibling core reads this exact query name.
 * Example: /checkout/621?ticket_id=678
 */
export const VENUE_CHECKOUT_TICKET_PARAM = "ticket_id"

export function venueNightCheckoutHref(
  checkoutBaseUrl: string,
  eventId: number,
  ticketId?: number | null,
): string {
  const base = `${checkoutBaseUrl.replace(/\/$/, "")}/checkout/${eventId}`
  const id = ticketId == null ? undefined : parseTicketIdValue(ticketId)
  return id != null ? `${base}?${VENUE_CHECKOUT_TICKET_PARAM}=${id}` : base
}

function finitePrices(tiers: VenueAccessTier[]): number[] {
  return tiers.map((tier) => Number(tier.price_usd)).filter((n) => Number.isFinite(n))
}

/** Cover tier first, otherwise the cheapest listed tier. */
export function coverTierFromTemplate(tiers: VenueAccessTier[]): VenueAccessTier | null {
  const named = tiers.find((tier) => tier.name.trim().toLowerCase() === "cover")
  if (named && Number.isFinite(Number(named.price_usd))) return named
  const prices = finitePrices(tiers)
  if (prices.length === 0) return null
  const min = Math.min(...prices)
  return tiers.find((tier) => Number(tier.price_usd) === min) ?? null
}

/**
 * Richest of night tickets, that night's template, and the program tier list.
 * A 1-item Cover list is not complete when checkout/program has more tickets.
 * min_ticket_price is a Cover fallback only when no tier list exists.
 * Never collapse Cover + Skip the Line to Cover-only because a min price is set.
 */
export function resolveNightTiers(
  night: Pick<VenueEvent, "min_ticket_price" | "tickets" | "template_tickets">,
  programTiers: VenueAccessTier[] = [],
): VenueAccessTier[] {
  const fromNight = night.tickets
  const best = richestTierList([fromNight, night.template_tickets ?? [], programTiers])
  if (best.length > 0) {
    // Same-length night tickets win so ?ticket_id= stays this night's tickets.id.
    if (fromNight.length === best.length) return fromNight
    return best
  }
  if (night.min_ticket_price != null && night.min_ticket_price !== "") {
    const n = Number(night.min_ticket_price)
    if (Number.isFinite(n)) return [{ name: "Cover", price_usd: n }]
  }
  return []
}

function richestTierList(lists: VenueAccessTier[][]): VenueAccessTier[] {
  let best: VenueAccessTier[] = []
  for (const list of lists) {
    if (list.length > best.length) {
      best = list
      continue
    }
    if (list.length === best.length && ticketIdCount(list) > ticketIdCount(best)) {
      best = list
    }
  }
  return best
}

/** Shared Cover / tier list for one Weekly Cover program. */
export function programTemplateTiers(
  nights: Array<Pick<VenueEvent, "tickets" | "template_tickets" | "min_ticket_price">>,
): VenueAccessTier[] {
  const fromTickets = richestTierList(nights.map((night) => night.tickets))
  if (fromTickets.length > 0) return fromTickets
  const fromTemplate = richestTierList(nights.map((night) => night.template_tickets ?? []))
  if (fromTemplate.length > 0) return fromTemplate
  const priced = nights.find((night) => night.min_ticket_price != null && night.min_ticket_price !== "")
  if (priced) {
    const n = Number(priced.min_ticket_price)
    if (Number.isFinite(n)) return [{ name: "Cover", price_usd: n }]
  }
  return []
}

/**
 * Price on one night chip. A single Cover (or only a min price) is "Cover $5".
 * Two or more tiers is "From $5". Never a hardcoded 5.
 */
export function nightChipPrice(
  night: Pick<VenueEvent, "min_ticket_price" | "tickets" | "template_tickets">,
  programTiers: VenueAccessTier[] = [],
): string {
  const tiers = resolveNightTiers(night, programTiers)
  const prices = finitePrices(tiers)
  if (prices.length === 0) return ""
  const formatted = formatAccessPrice(Math.min(...prices))
  if (!formatted) return ""
  if (prices.length > 1) return `From ${formatted}`
  const name = tiers[0]?.name.trim().toLowerCase() ?? ""
  return name === "cover" || name === "" ? `Cover ${formatted}` : formatted
}

/** Happening-today / event-row price. One number is still "From $5". */
export function eventFromPrice(
  event: Pick<VenueEvent, "min_ticket_price" | "tickets" | "template_tickets">,
  programTiers: VenueAccessTier[] = [],
): string {
  const tiers = resolveNightTiers(event, programTiers)
  const prices = finitePrices(tiers)
  if (prices.length === 0) return ""
  const formatted = formatAccessPrice(Math.min(...prices))
  if (!formatted) return ""
  if (formatted === "Free") return "Free"
  return `From ${formatted}`
}

/**
 * One program card's price lines.
 * A single Cover (or only a min price) reads "Cover $5".
 * Two or more real tiers list each name + price.
 */
export function weeklyAccessPriceLines(
  nights: VenueEvent[],
  programTiers: VenueAccessTier[] = [],
): string[] {
  const template = programTiers.length > 0 ? programTiers : programTemplateTiers(nights)
  const withTiers = nights.find((night) => resolveNightTiers(night, template).length > 0)
  const tiers = withTiers ? resolveNightTiers(withTiers, template) : template
  return tiers.map(formatAccessTierLabel).filter(Boolean)
}

/** Copy a program Cover onto nights that still have no price. */
export function applySharedProgramPrices(events: VenueEvent[]): VenueEvent[] {
  const doorNights = events.filter((event) => event.access_kind === "door_access")
  const groups = groupWeeklyAccessNights(doorNights)
  const byId = new Map(events.map((event) => [event.event_id, event]))
  for (const nights of groups) {
    const template = programTemplateTiers(nights)
    if (template.length === 0) continue
    for (const night of nights) {
      const resolved = resolveNightTiers(night, template)
      if (resolved.length === 0) continue
      const current = byId.get(night.event_id)
      if (!current) continue
      if (current.tickets.length > 0 && current.min_ticket_price != null && current.min_ticket_price !== "") {
        continue
      }
      const min = Math.min(...finitePrices(resolved))
      byId.set(night.event_id, {
        ...current,
        tickets: current.tickets.length > 0 ? current.tickets : withoutTicketIds(resolved),
        min_ticket_price:
          current.min_ticket_price != null && current.min_ticket_price !== ""
            ? current.min_ticket_price
            : Number.isFinite(min)
              ? min
              : current.min_ticket_price,
      })
    }
  }
  return events.map((event) => byId.get(event.event_id) ?? event)
}

/** Same-origin reader for Laravel checkout cards (browser poll cannot CORS). */
export const VENUE_CHECKOUT_TIERS_PATH = "/api/venue-checkout-tiers"

export function venueCheckoutTiersUrl(eventId: number): string {
  return `${VENUE_CHECKOUT_TIERS_PATH}/${eventId}`
}

function parseTiersFromCheckoutJson(raw: unknown): VenueAccessTier[] {
  if (!raw || typeof raw !== "object") return []
  const row = raw as Record<string, unknown>
  return parseVenueAccessTiers(row.tickets ?? row.tiers)
}

/**
 * Ticket cards on the Laravel checkout HTML (draft Weekly Cover nights).
 * Matches a ticket-card whether `data-price` sits on the same tag or just
 * after it. CSS `.ticket-card {` rules do not count.
 */
function ticketIdFromCheckoutHtml(chunk: string): number | undefined {
  return parseTicketIdValue(/data-ticket-id="([^"]+)"/.exec(chunk)?.[1])
}

export function parseCheckoutTicketTiers(html: string): VenueAccessTier[] {
  if (!html) return []
  const tiers: VenueAccessTier[] = []
  const tagRe = /<div\b[^>]*\bticket-card\b[^>]*>/gi
  let tag: RegExpExecArray | null
  while ((tag = tagRe.exec(html))) {
    const nearby = html.slice(tag.index, tag.index + 2500)
    const priceMatch = /data-price="([^"]+)"/.exec(tag[0]) ?? /data-price="([^"]+)"/.exec(nearby)
    if (!priceMatch) continue
    const price = Number(priceMatch[1])
    if (!Number.isFinite(price)) continue
    const nameMatch = /<h4[^>]*>\s*([^<]+?)\s*<\/h4>/i.exec(nearby)
    const name = nameMatch?.[1].trim() || "Cover"
    if (name.toLowerCase() === "order summary") continue
    tiers.push(accessTier(name, price, ticketIdFromCheckoutHtml(tag[0]) ?? ticketIdFromCheckoutHtml(nearby)))
  }
  if (tiers.length > 0) return tiers
  const cardRe =
    /class="[^"]*ticket-card[^"]*"[\s\S]*?data-price="([^"]+)"[\s\S]*?<h4[^>]*>\s*([^<]+?)\s*<\/h4>/gi
  let match: RegExpExecArray | null
  while ((match = cardRe.exec(html))) {
    const price = Number(match[1])
    const name = match[2].trim() || "Cover"
    if (name.toLowerCase() === "order summary") continue
    if (Number.isFinite(price)) {
      tiers.push(accessTier(name, price, ticketIdFromCheckoutHtml(match[0])))
    }
  }
  if (tiers.length > 0) return tiers
  const priceMatch = /data-price="([^"]+)"/.exec(html)
  const coverMatch = /<h4[^>]*>\s*([^<]+?)\s*<\/h4>/i.exec(html)
  if (priceMatch && coverMatch) {
    const price = Number(priceMatch[1])
    const name = coverMatch[1].trim() || "Cover"
    if (Number.isFinite(price) && name.toLowerCase() !== "order summary") {
      return [accessTier(name, price, ticketIdFromCheckoutHtml(html))]
    }
  }
  return []
}

async function fetchCheckoutTicketTiers(
  eventId: number,
  checkoutBase?: string,
): Promise<VenueAccessTier[]> {
  if (typeof window !== "undefined") {
    const fromApi = parseTiersFromCheckoutJson(await fetchJson(venueCheckoutTiersUrl(eventId)))
    if (fromApi.length > 0) return fromApi
  }
  if (checkoutBase) {
    const html = await fetchText(`${checkoutBase.replace(/\/$/, "")}/checkout/${eventId}`)
    if (html) {
      const parsed = parseCheckoutTicketTiers(html)
      if (parsed.length > 0) return parsed
    }
  }
  return []
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

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { cache: "no-store" })
    if (!res.ok) return null
    return await res.text()
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
  checkoutBase?: string,
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
  events = await enrichWeeklyAccessTiers(base, events, checkoutBase)
  events = applySharedProgramPrices(events)
  events = await fillMissingTicketIds(base, events, checkoutBase)

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
  if (!base.tiers && Array.isArray(row.tiers)) base.tiers = row.tiers
  if (!base.template_tickets && Array.isArray(row.template_tickets)) {
    base.template_tickets = row.template_tickets
  }
  return base
}

function programTiersFromPayload(raw: unknown): VenueAccessTier[] {
  if (!raw || typeof raw !== "object") return []
  const row = raw as Record<string, unknown>
  const nested = row.program && typeof row.program === "object" ? (row.program as Record<string, unknown>) : row
  return parseVenueAccessTiers(
    nested.template_tickets ??
      nested.program_tickets ??
      nested.tickets ??
      row.template_tickets ??
      row.tickets,
  )
}

async function fetchProgramTemplateTiers(
  base: string,
  seriesId: number,
): Promise<VenueAccessTier[]> {
  const paths = [
    `/ui/door-access/${seriesId}`,
    `/ui/recurring/${seriesId}`,
    `/ui/recurring-event-series/${seriesId}`,
  ]
  for (const path of paths) {
    const tiers = programTiersFromPayload(await fetchJson(`${base}${path}`))
    if (tiers.length > 0) return tiers
  }
  return []
}

function needsPriceEnrichment(event: VenueEvent): boolean {
  return (
    event.tickets.length === 0 &&
    (event.min_ticket_price == null || event.min_ticket_price === "") &&
    (event.template_tickets?.length ?? 0) === 0
  )
}

/**
 * Weekly Cover nights hydrate from checkout unless we already have 2+
 * named tiers each with tickets.id. A 1-item Cover list is not complete.
 */
export function needsWeeklyAccessTierEnrichment(event: VenueEvent): boolean {
  if (event.access_kind !== "door_access") return false
  if (event.tickets.length < 2) return true
  if (event.tickets.some((tier) => tier.ticket_id == null)) return true
  if (isCoverOnlyFallback(event.tickets)) return true
  return false
}

/** Door-access nights missing prices, a second tier, or tickets.id. */
function needsTicketIdEnrichment(event: VenueEvent): boolean {
  return needsWeeklyAccessTierEnrichment(event)
}

function withResolvedTiers(event: VenueEvent, tickets: VenueAccessTier[]): VenueEvent {
  const min = Math.min(...finitePrices(tickets))
  return {
    ...event,
    tickets,
    template_tickets: event.template_tickets?.length ? event.template_tickets : tickets,
    min_ticket_price:
      event.min_ticket_price != null && event.min_ticket_price !== ""
        ? event.min_ticket_price
        : Number.isFinite(min)
          ? min
          : event.min_ticket_price,
  }
}

/** Checkout JSON, then Laravel checkout HTML, for nights missing prices or ticket ids. */
async function fillMissingTicketIds(
  base: string,
  events: VenueEvent[],
  checkoutBase?: string,
): Promise<VenueEvent[]> {
  const need = events.filter(needsTicketIdEnrichment)
  if (need.length === 0) return events

  const extras = await Promise.all(
    need.map(async (event) => {
      const raw = await fetchJson(`${base}/checkout/event/${event.event_id}`)
      if (raw && typeof raw === "object") {
        const mapped = toVenueEvent(eventPayload(raw))
        if (
          mapped &&
          mapped.event_id === event.event_id &&
          isRicherTierList(mapped.tickets, event.tickets)
        ) {
          return withResolvedTiers(event, mapped.tickets)
        }
      }
      const tickets = await fetchCheckoutTicketTiers(event.event_id, checkoutBase)
      if (!isRicherTierList(tickets, event.tickets)) return null
      return withResolvedTiers(event, tickets)
    }),
  )

  return mergeVenueEvents(
    events,
    extras.filter((e): e is VenueEvent => e != null),
  )
}

/** Checkout JSON, program template, then Laravel checkout HTML for draft nights. */
async function enrichWeeklyAccessTiers(
  base: string,
  events: VenueEvent[],
  checkoutBase?: string,
): Promise<VenueEvent[]> {
  const need = events.filter(
    (event) => needsPriceEnrichment(event) || needsWeeklyAccessTierEnrichment(event),
  )
  if (need.length === 0) {
    return fillMissingTicketIds(base, events, checkoutBase)
  }

  const extras = await Promise.all(
    need.map(async (event) => {
      const raw = await fetchJson(`${base}/checkout/event/${event.event_id}`)
      if (!raw || typeof raw !== "object") return null
      const mapped = toVenueEvent(eventPayload(raw))
      if (!mapped || mapped.event_id !== event.event_id) return null
      if (event.access_kind === "door_access") {
        const tickets = pickRicherTiers(event.tickets, mapped.tickets)
        if (tickets.length > 0) return withResolvedTiers(event, tickets)
        return mapped.min_ticket_price != null ? mapped : null
      }
      return mapped.tickets.length > 0 || mapped.min_ticket_price != null ? mapped : null
    }),
  )

  let merged = mergeVenueEvents(events, extras.filter((e): e is VenueEvent => e != null))

  const stillNeed = merged.filter(
    (event) => event.access_kind === "door_access" && needsWeeklyAccessTierEnrichment(event),
  )
  const seriesIds = [
    ...new Set(
      stillNeed
        .map((event) => event.recurring_series_id)
        .filter((id): id is number => id != null && Number.isFinite(id)),
    ),
  ]
  const templates = await Promise.all(
    seriesIds.map(async (id) => [id, await fetchProgramTemplateTiers(base, id)] as const),
  )
  const templateBySeries = new Map(templates.filter(([, tiers]) => tiers.length > 0))
  if (templateBySeries.size > 0) {
    merged = merged.map((event) => {
      const tiers = event.recurring_series_id != null ? templateBySeries.get(event.recurring_series_id) : undefined
      if (!tiers?.length) return event
      const template = pickRicherTiers(event.template_tickets ?? [], tiers)
      if ((event.template_tickets?.length ?? 0) >= template.length && (event.template_tickets?.length ?? 0) > 0) {
        return event
      }
      return { ...event, template_tickets: template }
    })
  }

  const htmlNeed = merged.filter(
    (event) => needsPriceEnrichment(event) || needsWeeklyAccessTierEnrichment(event),
  )
  if (htmlNeed.length > 0) {
    const fromHtml = await Promise.all(
      htmlNeed.map(async (event) => {
        const tickets = await fetchCheckoutTicketTiers(event.event_id, checkoutBase)
        if (tickets.length === 0) return null
        return withResolvedTiers(event, tickets)
      }),
    )
    merged = mergeVenueEvents(
      merged,
      fromHtml.filter((e): e is VenueEvent => e != null),
    )
  }

  return merged
}
