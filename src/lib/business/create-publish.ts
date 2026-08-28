/**
 * Create-flow publish vs draft.
 *
 * Publish is the default CTA and must POST as live. The only client path that
 * asks the API to keep a draft is the explicit "Save as draft" button, which
 * sends `save_as_draft: true`. Stripe Connect is not a draft reason —
 * approved/verified hosts publish even without it. Pending-approval businesses
 * can still default-draft (server-side), but `willDraft` is never true just
 * because `!stripeOnboarded`.
 */

/** Pending-approval can still default-draft. Stripe Connect is not a reason. */
export function willDraftOnCreate(isPending: boolean): boolean {
  return isPending
}

/**
 * Only the Save as draft button adds this flag. Publish omits it entirely so
 * the request cannot be mistaken for a draft save.
 */
export function applySaveAsDraftFlag<T extends Record<string, unknown>>(
  payload: T,
  saveAsDraft: boolean,
): T {
  if (!saveAsDraft) return payload
  return { ...payload, save_as_draft: true }
}

/** Promoter toggle is UI-gated on a paid tier only — not on Stripe. */
export function promoterToggleDisabled(hasPaidTier: boolean): boolean {
  return !hasPaidTier
}

/**
 * Wire/API promoter flag. Only explicit on values count.
 * MySQL 0, "0", "false", null, and missing are off — `!!value` is not safe
 * (`!!"false"` is true) and was lighting Get paid / commission extras
 * on events whose Promoter toggle is off.
 */
export function isPromotionEnabled(value: unknown): boolean {
  return value === true || value === 1 || value === "1"
}

/**
 * Get-paid / commission / payout extra chrome. The Promoter toggle stays
 * visible; this is only the extra block under it.
 */
export function promoterExtrasVisible(enabled: unknown, toggleDisabled: boolean): boolean {
  return isPromotionEnabled(enabled) && !toggleDisabled
}

/**
 * Leftover services copy from `validateAndNormalizePromotion` when the host
 * has no Connect payout path. Flutter create already accepts escrow promoter.
 * Dash used to hard-gate the toggle on this; D4 removed that. The same text
 * still comes back as a 400 on dash-only `validate-step` and can land in the
 * Review `serverError` box. It is not a product block — Settings "Connected"
 * is promoter payout onboarding, not this gate.
 */
export function isLeftoverPromoterPayoutPathError(message: string): boolean {
  const text = message.trim().toLowerCase()
  if (!text) return false
  const mentionsPromoter = text.includes("promoter")
  const mentionsPayoutPath = text.includes("payout path")
  const mentionsConnectBefore =
    text.includes("connect stripe before enabling") ||
    text.includes("connect stripe to enable")
  return mentionsPromoter && (mentionsPayoutPath || mentionsConnectBefore)
}

/** Review/Continue must not upsell Connect for the leftover promoter gate. */
export function shouldOfferStripeConnectForError(message: string): boolean {
  if (isLeftoverPromoterPayoutPathError(message)) return false
  return /stripe connect/i.test(message)
}
