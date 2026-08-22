// Deduped POST of the existing Stripe onboard/complete endpoints.
//
// services :259+ runs `runEscrowClaimsForOnboardedAccount` on both:
//   POST /business/profile/stripe-onboard/complete
//   POST /business/stripe-accounts/:id/onboard/complete
// Settings → Payments refresh used to skip complete, so an onboarded host
// with available_cents never triggered the claim. This module is the one
// client-side kick: call complete, once, and NEVER start a new Connect
// account (do not POST /stripe-onboard or /:id/onboard).

export const PROFILE_STRIPE_ONBOARD_COMPLETE = "/business/profile/stripe-onboard/complete"

export function accountStripeOnboardCompletePath(accountId: number): string {
  return `/business/stripe-accounts/${accountId}/onboard/complete`
}

export type StripeOnboardCompleteResult = {
  onboarded: boolean
  charges_enabled?: boolean
  payouts_enabled?: boolean
  id?: number
  stripe_connect_id?: string
  reconnect_required?: boolean
}

export type StripeOnboardCompleteOnceResult = StripeOnboardCompleteResult & {
  fromCache: boolean
}

type CompletePoster = (path: string) => Promise<StripeOnboardCompleteResult>

let testPoster: CompletePoster | null = null

let profileInFlight: Promise<StripeOnboardCompleteResult> | null = null
let profileDone: StripeOnboardCompleteResult | null = null

const accountInFlight = new Map<number, Promise<StripeOnboardCompleteResult>>()
const accountDone = new Map<number, StripeOnboardCompleteResult>()

export function setStripeOnboardCompletePosterForTests(fn: CompletePoster | null): void {
  testPoster = fn
}

export function resetStripeOnboardCompleteDedupe(): void {
  profileInFlight = null
  profileDone = null
  accountInFlight.clear()
  accountDone.clear()
}

export function resetAccountStripeOnboardComplete(accountId: number): void {
  accountInFlight.delete(accountId)
  accountDone.delete(accountId)
}

export function resetProfileStripeOnboardComplete(): void {
  profileInFlight = null
  profileDone = null
}

/**
 * Profile is ready for the claim kick: onboarded, not needing reconnect, and
 * (when the live flags are present) charges + payouts both on. A legacy
 * profile that only sends `stripe_connect_onboarded` is treated as ready.
 */
export function isProfileReadyForEscrowClaim(profile: {
  stripe_connect_onboarded?: boolean
  stripe_reconnect_required?: boolean
  charges_enabled?: boolean
  payouts_enabled?: boolean
}): boolean {
  if (profile.stripe_connect_onboarded !== true) return false
  if (profile.stripe_reconnect_required === true) return false
  if (profile.charges_enabled === false || profile.payouts_enabled === false) return false
  return true
}

async function postComplete(path: string): Promise<StripeOnboardCompleteResult> {
  if (testPoster) return testPoster(path)
  const { apiClient } = await import("./api-client.ts")
  return apiClient.post<StripeOnboardCompleteResult>(path)
}

/** POST profile complete at most once per success. Failures are not cached. */
export function completeProfileStripeOnboardOnce(): Promise<StripeOnboardCompleteOnceResult> {
  if (profileDone) return Promise.resolve({ ...profileDone, fromCache: true })
  if (profileInFlight) {
    return profileInFlight.then((value) => ({ ...value, fromCache: false }))
  }
  profileInFlight = postComplete(PROFILE_STRIPE_ONBOARD_COMPLETE)
    .then((value) => {
      profileDone = value
      return value
    })
    .finally(() => {
      profileInFlight = null
    })
  return profileInFlight.then((value) => ({ ...value, fromCache: false }))
}

/** POST per-account complete at most once per success. Failures are not cached. */
export function completeAccountStripeOnboardOnce(accountId: number): Promise<StripeOnboardCompleteOnceResult> {
  const cached = accountDone.get(accountId)
  if (cached) return Promise.resolve({ ...cached, fromCache: true })
  const existing = accountInFlight.get(accountId)
  if (existing) return existing.then((value) => ({ ...value, fromCache: false }))
  const pending = postComplete(accountStripeOnboardCompletePath(accountId))
    .then((value) => {
      accountDone.set(accountId, value)
      return value
    })
    .finally(() => {
      accountInFlight.delete(accountId)
    })
  accountInFlight.set(accountId, pending)
  return pending.then((value) => ({ ...value, fromCache: false }))
}
