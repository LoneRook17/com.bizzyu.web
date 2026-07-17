// How the line-skip Payment Element is allowed to mount (F1d).
//
// The bug this guards: a Stripe <Elements> provider mounted in DEFERRED mode
// (`mode:'payment'`, no clientSecret) renders the connected account's
// DASHBOARD-DEFAULT payment methods — including ACH "Direct debit" — instead of
// the methods the PaymentIntent actually allows. Every line-skip PI is
// `payment_method_types:['card']` (verified server-side, F1c), so the Element
// must ONLY ever render bound to that PI's clientSecret. Deferred mode is a
// dev-only affordance for the mock flow, where no real PI exists.
//
// Pure + React-free so it is unit-testable with `node --test`.

export type ElementsMode =
  | { kind: 'skeleton' } // live, secret not here yet — show a loader, NOT dashboard defaults
  | { kind: 'bound'; clientSecret: string } // bound to the PI: renders only the PI's methods
  | { kind: 'deferred' } // mock only: no PI to bind to

/**
 * Decide how the Payment Element must mount.
 * - A real clientSecret always wins → `bound` (renders exactly the PI's methods).
 * - Otherwise, in mock mode → `deferred` (dev tool; there is no PI to bind to).
 * - Otherwise (live, no secret) → `skeleton`. NEVER deferred in live mode: that
 *   is precisely what leaks the dashboard-default ACH tab onto a card-only PI.
 */
export function resolveElementsMode(args: {
  clientSecret: string | null
  mock: boolean
}): ElementsMode {
  if (args.clientSecret) return { kind: 'bound', clientSecret: args.clientSecret }
  if (args.mock) return { kind: 'deferred' }
  return { kind: 'skeleton' }
}

/**
 * React key for the <Elements> provider. Stripe treats options.clientSecret as
 * immutable, so a secret that arrives (or changes) after mount is ignored unless
 * the provider is re-created. Keying on the secret forces that clean remount, so
 * the Element is always bound to the current PI — closing any mount-order race.
 */
export function elementsKey(clientSecret: string | null): string {
  return clientSecret ?? 'deferred'
}
