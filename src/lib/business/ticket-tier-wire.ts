// ONE tier wire body for both dashboard editors (audit Wave 3, F15).
//
// Manage Tickets (`ManageSalesTickets.tsx`, one tier per PUT/POST on
// /business/events/:id/tickets[/:ticketId]) and Full Edit (`EventForm.tsx`,
// the whole tier list inside PUT /business/events/:id) used to build the
// per-tier body independently, and the two had drifted:
//
//   • Edit sent `quantity: t.quantity || null` for an unlimited tier. The
//     services contract is `0 = unlimited` (`parseUnlimitedQuantity`), and the
//     business update path creates a NEW tier with `tier.quantity || 100`, so
//     an unlimited tier added through Full Edit landed with capacity 100.
//   • Edit sent `max_per_person: t.max_per_person || undefined` (omitted when
//     cleared) while Manage sends an explicit null; Edit sent the raw
//     description / untrimmed name; Edit never echoed `is_hidden`, so a tier
//     the host hid on Manage Tickets travelled back with no visibility flag.
//
// The contract, now in one place:
//   • `ticket_id` only when the tier has one (Edit; Manage keys by URL).
//   • `name` trimmed; `description` trimmed, blank → null.
//   • `price_usd` is 0 unless `ticket_type === 'paid'` — a free (or guest)
//     tier never carries a price (services clamps the same way).
//   • `quantity`: `0 = unlimited`. Never null, never undefined.
//   • `max_per_person`: null = no cap (blank / 0); otherwise an integer ≥ 1.
//     Same meaning as `persistMaxPerPerson`.
//   • `valid_from` / `valid_until`: blank → null (clears the window).
//   • `is_21_plus` ONLY when the tier states one — omission keeps the stored
//     flag on update and inherits the event's own 21+ on create.
//   • `is_hidden` ONLY when the tier states one (a served row does; a tier
//     the host just added does not). Echoing it is what keeps a hidden tier
//     hidden through a Full Edit save: never unhide by omission.
//   • The surge PAIR always (`surge_enabled`, `surge_steps`) via
//     `tierSurgeToWire` — off is an explicit clear, omission means "leave the
//     stored ladder alone".

// Runtime relative imports carry `.ts` so the node:test runner can resolve them
// (same convention as event-tier-surge.ts → weekly-cover-nights.ts).
import { tierSurgeToWire, type SurgeStepDraft, type SurgeStepWire } from "./event-tier-surge.ts"
import { persistMaxPerPerson } from "./ticket-limits.ts"
import type { TicketTier } from "./types"

/**
 * What either editor hands over. Loosely typed on purpose: Manage holds text
 * inputs, Edit holds the served `TicketTier` row (whose numbers can be ""
 * mid-keystroke and whose flags come back from MySQL as 1/0).
 */
export type TicketTierWireInput = {
  ticket_id?: number | null
  name: string
  description?: string | null
  ticket_type: TicketTier["ticket_type"]
  price_usd?: number | string | null
  quantity?: number | string | null
  max_per_person?: number | string | null
  valid_from?: string | null
  valid_until?: string | null
  is_21_plus?: boolean | 0 | 1
  is_hidden?: boolean | 0 | 1
  surge_enabled?: boolean | 0 | 1
  surge?: SurgeStepDraft[]
  surge_base_price_usd?: number | null
}

export type TicketTierWire = {
  ticket_id?: number
  name: string
  description: string | null
  ticket_type: TicketTier["ticket_type"]
  price_usd: number
  quantity: number
  max_per_person: number | null
  valid_from: string | null
  valid_until: string | null
  is_21_plus?: boolean
  is_hidden?: boolean
  surge_enabled: boolean
  surge_steps: SurgeStepWire[]
}

/** `0 = unlimited`. Strings parse like Manage always did (`parseInt || 0`). */
export function wireQuantity(raw: number | string | null | undefined): number {
  if (raw == null) return 0
  if (typeof raw === "string") return parseInt(raw, 10) || 0
  return Number.isFinite(raw) ? Math.trunc(raw) : 0
}

/** null = no cap. Blank / 0 / anything below 1 is "no cap", same as `persistMaxPerPerson`. */
export function wireMaxPerPerson(raw: number | string | null | undefined): number | null {
  if (raw == null) return null
  if (typeof raw === "string") return persistMaxPerPerson(raw)
  const n = Math.trunc(raw)
  return Number.isFinite(n) && n >= 1 ? n : null
}

/** Paid tiers carry their price; free and guest tiers are always 0. */
export function wirePrice(ticketType: TicketTier["ticket_type"], raw: number | string | null | undefined): number {
  if (ticketType !== "paid") return 0
  if (raw == null) return 0
  const n = typeof raw === "string" ? parseFloat(raw) : raw
  return Number.isFinite(n) ? n || 0 : 0
}

export function ticketTierToWire(tier: TicketTierWireInput): TicketTierWire {
  const ticketId = Number(tier.ticket_id)
  const surge = tierSurgeToWire({
    name: tier.name,
    price_usd: wirePrice(tier.ticket_type, tier.price_usd),
    quantity: wireQuantity(tier.quantity),
    ticket_type: tier.ticket_type,
    surge_enabled: !!tier.surge_enabled,
    surge: tier.surge ?? [],
    surge_base_price_usd: tier.surge_base_price_usd ?? null,
  })
  return {
    ...(Number.isInteger(ticketId) && ticketId > 0 ? { ticket_id: ticketId } : {}),
    name: tier.name.trim(),
    description: (tier.description ?? "").trim() || null,
    ticket_type: tier.ticket_type,
    price_usd: wirePrice(tier.ticket_type, tier.price_usd),
    quantity: wireQuantity(tier.quantity),
    max_per_person: wireMaxPerPerson(tier.max_per_person),
    valid_from: tier.valid_from || null,
    valid_until: tier.valid_until || null,
    ...(tier.is_21_plus === undefined ? {} : { is_21_plus: !!tier.is_21_plus }),
    ...(tier.is_hidden === undefined ? {} : { is_hidden: !!tier.is_hidden }),
    ...surge,
  }
}
