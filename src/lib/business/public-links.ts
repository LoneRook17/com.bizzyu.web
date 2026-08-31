// DASH2-D — THE public link builders. One file, one shape per surface.
//
// Before this, `${WEB_BASE_URL}/event/${id}/checkout` was inlined in the event
// manage page and nowhere else, so Door Access nights had no way to hand out a
// link without inventing a second format. Nights ARE events (core stamps one
// `events` row per occurrence, flagged access_kind='door_access'), so a night's
// share link is the EVENT link — same builder, same URL shape, same AASA path.
// Inventing `/night/:programId/:date` would have produced a URL nothing in the
// pipeline resolves.
//
// VERIFIED PATH (DASH2-D task 2), for eventCheckoutUrl():
//   bizzyu.com/event/:id/checkout
//     → app/event/[id]/checkout/page.tsx  (OG tags from services GET /ui/events/:id,
//       which is models.events.getById — no access_kind filter, no status filter)
//     → meta-refresh + location.replace
//     → /checkout/:id (named events and Weekly Cover share EventCheckoutClient)
//     → ?ticket_id= preselects the venue-selected ticket.
// Nothing on that path reads access_kind, so a door_access night resolves
// exactly as a one-off event does. No /cover buy path.
//
// venuePageUrl() is the program-level surface: bizzyu.com/venue/:id lists the
// venue's `status='published'` future events (again no access_kind filter), so
// a program's nights appear there as they generate. Same builder the settings
// VenuePageSection already hands out — this is not a new public page.

export const WEB_BASE_URL = process.env.NEXT_PUBLIC_WEB_BASE_URL || "https://bizzyu.com"

/**
 * The canonical public checkout link for ONE event — the AASA-claimed
 * Universal Link shape shared with the app and promoter tracking links.
 *
 * Stays BARE on purpose. Promoter links append ?ref for attribution; an
 * operator's own share must not, or their sales would count as promoter-
 * attributed.
 */
export function eventCheckoutUrl(eventId: number | string): string {
  return `${WEB_BASE_URL}/event/${eventId}/checkout`
}

/** The public venue page — every published upcoming night/event at one venue. */
export function venuePageUrl(venueId: number | string): string {
  return `${WEB_BASE_URL}/venue/${venueId}`
}

/**
 * Whether an event id may be handed out publicly yet.
 *
 * Same rule the event manage page has always used: a draft/pending event's
 * checkout page dead-ends, so the link is withheld rather than shared broken.
 * Core stamps door-access occurrences 'published' (RecurringEventGenerator::
 * resolveStampStatus) — or 'draft' when the business can't sell — so nights
 * pass through this predicate unchanged.
 */
export function isPubliclyLinkable(status: string | null | undefined): boolean {
  return ["published", "approved", "active"].includes((status ?? "").toLowerCase())
}

/** Why a night has no shareable link yet — the row renders the reason, not a dead link. */
export type NightLinkState =
  | { kind: "ready"; url: string }
  /** Core's generator hasn't materialised the `events` row, so there is no id to link to. */
  | { kind: "not_generated" }
  /** Stamped, but not sellable — business unapproved, or paid tiers with no payout account. */
  | { kind: "not_live" }

/**
 * One night's share state. Takes the two fields it actually needs rather than
 * a DoorAccessNight so the predicate stays pure and testable without the
 * door-access type graph.
 */
export function nightLinkState(night: {
  event_id: number | null
  status: string | null
}): NightLinkState {
  if (night.event_id == null) return { kind: "not_generated" }
  if (!isPubliclyLinkable(night.status)) return { kind: "not_live" }
  return { kind: "ready", url: eventCheckoutUrl(night.event_id) }
}
