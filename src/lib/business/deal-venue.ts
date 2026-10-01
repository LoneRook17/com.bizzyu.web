// Venue rules for deals only. Events, line skips, door access, and recurring
// series stay behind RequireVenue. The services POST /business/deals handler
// already accepts a body with no venue_id: it falls back to the business
// address and campus, and category defaults to "Other".

export interface DealVenueInput {
  isEditing: boolean
  /** Active venue ids the business can attach. */
  venueIds: number[]
  /** Switcher selection. Null when "All venues" or nothing is chosen. */
  selectedVenueId: number | null
}

/**
 * Venue id to send on create/update, or undefined so the key is omitted.
 *
 * Create:
 *   0 venues  → omit (API uses the business address)
 *   1 venue   → that venue, even if the switcher is still on All
 *   2+ venues → the selected venue; undefined when none is chosen
 *               (the form blocks submit in that case)
 * Edit:
 *   send the switcher selection when one is set, otherwise omit. Editing must
 *   not invent a venue for a deal that was saved without one, and must not
 *   fail when the business has zero venues.
 */
export function dealSubmitVenueId(input: DealVenueInput): number | undefined {
  if (input.selectedVenueId != null) return input.selectedVenueId
  if (!input.isEditing && input.venueIds.length === 1) return input.venueIds[0]
  return undefined
}

/** Create with two or more venues and nothing chosen. Edit is never blocked. */
export function dealVenueError(input: DealVenueInput): string | null {
  if (input.isEditing) return null
  if (input.venueIds.length > 1 && input.selectedVenueId == null) {
    return "Please select a venue"
  }
  return null
}

/** Picker only when creating and there is a real choice. One venue is attached for them. */
export function showDealVenuePicker(input: Pick<DealVenueInput, "isEditing" | "venueIds">): boolean {
  return !input.isEditing && input.venueIds.length > 1
}

/**
 * Setup-home first-offer card. A venueless events business stays locked
 * (events still need a venue). Deals and hybrid can open New Deal with none.
 */
export function trialFirstOfferLocked(mode: "deals" | "events" | "hybrid", venueCount: number): boolean {
  return mode === "events" && venueCount === 0
}
