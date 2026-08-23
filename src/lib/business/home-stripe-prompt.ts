// DASH2-D — does Home show the quiet "Connect Stripe" card?
//
// THE GAP THIS CLOSES. A business with no connected Stripe had two possible
// Home pages, and only one of them said anything:
//   • escrow balance > 0 → BE-D's hero already leads the page with
//     "$X waiting for you" + "Connect Stripe to claim it". Covered.
//   • balance ZERO (nothing sold yet, or everything already paid out) → the
//     escrow panel renders nothing, and Home was silent. A host could run a
//     whole program without ever being told sales would be held.
//
// So the rule is: show the quiet card only when the BE-D hero ISN'T already
// carrying the Stripe CTA. Two Stripe CTAs stacked on one page is worse than
// none — the hero is the louder, more specific one and always wins.
//
// Pure so `npm test` can pin every shape without rendering React — same
// pattern as home-sections.ts next door.

export type HomeStripePromptInput = {
  /**
   * `null` = UNKNOWN (the profile read failed). Deliberately distinct from
   * `false`: a flaked fetch must never nag a business that IS connected, so
   * unknown stays quiet.
   */
  stripeOnboarded: boolean | null
  /**
   * Is the BE-D escrow panel rendering right now? True whenever
   * shouldRenderEscrowPanel() is true: any non-empty state, except a
   * paid banner whose 24h first-seen window has ended.
   */
  escrowPanelVisible: boolean
  /**
   * Stripe onboarding is an owner/manager action — the POST 403s for staff,
   * so nudging them would be a dead end.
   */
  canManagePayouts: boolean
}

export function shouldShowStripeConnectPrompt(input: HomeStripePromptInput): boolean {
  if (!input.canManagePayouts) return false
  // The hero owns the Stripe CTA whenever it is on screen.
  if (input.escrowPanelVisible) return false
  return input.stripeOnboarded === false
}

/** Owner/manager — the same gate every other write surface on this dashboard uses. */
export function canManagePayouts(role: string | null | undefined): boolean {
  return role === "owner" || role === "manager"
}
