/**
 * Create-from-template.
 *
 * L5: opening create with ?from= must actually apply the source (name, venue,
 * tickets/tiers, flyer, promoter/stock settings, artwork). The old Duplicate
 * call created a row that often arrived empty.
 *
 * L6: a Weekly Cover / door_access source stays on the Weekly Cover wizard
 * (`/business/door-access/new?from=`), never EventForm or /business/recurring.
 * After publish, DoorAccessWizard still routes through programHref().
 */

import { isDoorAccessKind, programHref, programIdFromOwnedEvent } from "./door-access.ts"
import type { DoorAccessProgram, DoorAccessTemplateTier } from "./door-access.ts"
import type { EventDetail, EventFormData, TicketTier } from "./types.ts"

export function eventCreateFromHref(eventId: number): string {
  return `/business/events/new?from=${eventId}`
}

export function programCreateFromHref(programId: number): string {
  return `/business/door-access/new?from=${programId}`
}

/**
 * Where "Use as template" / Duplicate should go.
 * Weekly Cover nights and programs stay on the door-access create path.
 */
export function createFromTemplateHref(source: {
  access_kind?: string | null
  recurring_series_id?: number | string | null
  event_id?: number | string | null
  program_id?: number | string | null
}): string {
  const explicitProgram = Number(source.program_id)
  if (Number.isFinite(explicitProgram) && explicitProgram > 0) {
    return programCreateFromHref(explicitProgram)
  }
  const fromNight = programIdFromOwnedEvent(source)
  if (fromNight != null) return programCreateFromHref(fromNight)
  const eventId = Number(source.event_id)
  if (Number.isFinite(eventId) && eventId > 0) return eventCreateFromHref(eventId)
  return "/business/create"
}

export function createFromTemplateStaysWeeklyCover(source: {
  access_kind?: string | null
  recurring_series_id?: number | string | null
  program_id?: number | string | null
}): boolean {
  if (Number(source.program_id) > 0) return true
  return programIdFromOwnedEvent(source) != null
}

export function stripTicketIds(tickets: TicketTier[]): TicketTier[] {
  return tickets.map((ticket) => {
    const rest = { ...ticket }
    delete rest.ticket_id
    delete rest.sold_count
    delete rest.available_quantity
    return rest
  })
}

/** Prefill EventForm from a named event. Dates stay blank so the host picks a new night. */
export function applyEventAsCreateTemplate(event: EventDetail): Partial<EventFormData> {
  return {
    name: event.name ?? "",
    description: event.description ?? "",
    venue_id: event.venue_id ?? null,
    venue_name: event.venue_name ?? "",
    venue_address: event.venue_address ?? "",
    start_date_time: "",
    end_date_time: "",
    type: event.type === "Free" ? "Free" : "Ticketed",
    is_21_plus: !!event.is_21_plus,
    flyer_image_url: event.flyer_image_url || "",
    tickets: stripTicketIds(event.tickets ?? []),
    promotion_enabled: !!event.promotion_enabled,
    promotion_commission_type: event.promotion_commission_type ?? "percent",
    promotion_commission_value: event.promotion_commission_value ?? null,
    lowstock_alerts_enabled: !!event.lowstock_alerts_enabled,
    lowstock_threshold_type: event.lowstock_threshold_type ?? "percent",
    lowstock_threshold_value: event.lowstock_threshold_value ?? null,
    lowstock_notify_business_team: !!event.lowstock_notify_business_team,
    artwork_template: event.artwork_template ?? null,
    artwork_accent: event.artwork_accent ?? null,
  }
}

export function stripTemplateTierKeys(tiers: DoorAccessTemplateTier[]): DoorAccessTemplateTier[] {
  return tiers.map((tier) => ({
    ...tier,
    tier_key: "",
  }))
}

/**
 * Prefill the Weekly Cover wizard from an existing program.
 * New series: today as start, open end, new tier keys minted on create.
 */
export function applyProgramAsCreateTemplate(
  program: DoorAccessProgram,
  today: string,
): DoorAccessProgram {
  return {
    ...program,
    date_range_start: today,
    date_range_end: null,
    template_tickets: stripTemplateTierKeys(program.template_tickets ?? []),
  }
}

export function createdProgramHref(programId: number): string {
  return programHref(programId)
}

export function shouldRedirectEventTemplateToWeeklyCover(event: {
  access_kind?: string | null
  recurring_series_id?: number | string | null
}): boolean {
  return isDoorAccessKind(event.access_kind) && programIdFromOwnedEvent(event) != null
}
