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
