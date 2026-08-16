// How a non-OK response from POST /line-skips/checkout/payment-intent becomes
// an error the checkout page can branch on (LSK-18).
//
// The bug this guards: this mapping used to live inline in client.ts and
// collapsed EVERY non-OK response into `new Error(data.message)`. That threw
// away the `code` the services API sends for a paused venue
// (`venue_stripe_account_not_ready`), so the page's catch had nothing to branch
// on and a blocked venue rendered a raw error string in the generic banner —
// while the session and free checkout paths, which read the body directly and
// call parseVenueStripeBlock, showed the friendly "ticket sales are paused"
// screen for the very same server response.
//
// Pure + fetch-free so it is unit-testable with `node --test`, matching
// element-binding.ts. client.ts is transport only and calls straight into this.

// Explicit .ts extensions so `node --test` can load this module directly,
// matching payouts-reconcile.ts and the rest of the unit-tested lib modules.
import { parseVenueStripeBlock } from '../venue-stripe-block.ts'

import { LineSkipSoldOutError, LineSkipVenueBlockedError } from './types.ts'

/**
 * The error to throw for a payment-intent response, or null when the response
 * is fine and the caller should use the body.
 *
 * Order matters: the sold-out arm is the pinned 409 contract and is checked
 * first, then the venue block, then the generic fallback. A blocked venue must
 * never reach the generic arm — that is the whole defect.
 */
export function paymentIntentError(status: number, data: unknown): Error | null {
  const body = (data ?? {}) as Record<string, unknown>
  const message = typeof body.message === 'string' ? body.message : undefined

  if (status === 409 && body.code === 'SOLD_OUT') {
    return new LineSkipSoldOutError(message)
  }

  const ok = status >= 200 && status < 300
  if (ok) return null

  // Same parse the session and free paths run, so all three land on an
  // identical block for an identical response.
  const block = parseVenueStripeBlock(body)
  if (block) {
    return new LineSkipVenueBlockedError(block, message)
  }

  return new Error(message || 'Could not start payment')
}
