// #9 venue-stripe: structured block error raised by the services API when an
// event's venue is matched to a Connect account that can't take charges yet
// (locked decision 2: sales PAUSE — never a silent fallback to the default
// account). Shape per services feat/venue-stripe-services (StripeManager
// venueStripeAccountBlockedError): a Boom 400 payload carrying `code` +
// `details.{reason, venue_id, business_stripe_account_id}`.

export const VENUE_STRIPE_BLOCK_CODE = "venue_stripe_account_not_ready"

export type VenueStripeBlockReason =
  | "dangling_account" // venue points at a deleted/missing account row
  | "no_connect_account" // account row exists but Stripe onboarding never started
  | "not_onboarded" // Stripe onboarding started but can't take charges/payouts yet

export interface VenueStripeBlock {
  reason: VenueStripeBlockReason
  venue_id: number | null
  business_stripe_account_id: number | null
}

const REASONS: VenueStripeBlockReason[] = [
  "dangling_account",
  "no_connect_account",
  "not_onboarded",
]

/**
 * Returns the parsed block when an API error body is the venue-stripe pause
 * error, else null. Tolerant of a missing/partial `details` object so an
 * older or newer services build still renders the generic pause copy instead
 * of a raw error.
 */
export function parseVenueStripeBlock(body: unknown): VenueStripeBlock | null {
  if (!body || typeof body !== "object") return null
  const b = body as Record<string, unknown>
  if (b.code !== VENUE_STRIPE_BLOCK_CODE) return null
  const details = (b.details ?? {}) as Record<string, unknown>
  const reason = REASONS.includes(details.reason as VenueStripeBlockReason)
    ? (details.reason as VenueStripeBlockReason)
    : "not_onboarded"
  return {
    reason,
    venue_id: typeof details.venue_id === "number" ? details.venue_id : null,
    business_stripe_account_id:
      typeof details.business_stripe_account_id === "number"
        ? details.business_stripe_account_id
        : null,
  }
}

/**
 * Buyer-facing copy per block reason. `not_onboarded`/`no_connect_account`
 * are the same story to a buyer (setup in progress); `dangling_account` is a
 * configuration problem only the organizer can resolve, so it doesn't promise
 * automatic reopening.
 */
export function venueStripeBlockCopy(reason: VenueStripeBlockReason): {
  title: string
  message: string
} {
  if (reason === "dangling_account") {
    return {
      title: "Ticket sales are paused at this venue",
      message:
        "This venue's payout account needs attention from the event organizer. Sales will reopen once they've fixed the account settings — please check back, or contact the organizer.",
    }
  }
  return {
    title: "Ticket sales are paused at this venue",
    message:
      "The organizer is still finishing payment setup for this venue. Sales reopen automatically the moment setup is complete — please check back soon.",
  }
}
