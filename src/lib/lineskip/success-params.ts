// TF-DRIVE-W1 — line-skip success-arrival detection.
//
// The LIVE checkout (PI/Elements flow) and the free-checkout flow both land the
// buyer back on the VENUE page `/lineskip/[slug]` carrying a success param —
// `purchase_success=1` (paid) or `free_success=1` (free) — NOT the separate
// `/lineskip/[slug]/success` route (that one is the Stripe Checkout-Session
// landing, keyed on `session_id`). The success screen AND the confetti burst
// both gate on this predicate, so confetti never fires on the plain venue page.
//
// Import-pure (no React, no DOM beyond URLSearchParams) so the gate is asserted
// in a test rather than eyeballed.

/**
 * True when a URL search string carries a line-skip purchase confirmation:
 * the paid PI flow's `purchase_success=1` or the free-checkout `free_success=1`.
 * Accepts a raw `location.search` (with or without the leading `?`).
 */
export function isLineSkipSuccessArrival(search: string): boolean {
  const params = new URLSearchParams(search)
  return params.get("purchase_success") === "1" || params.get("free_success") === "1"
}
