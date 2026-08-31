// Deduped Stripe onboard/complete: Payments refresh must POST complete so
// escrow claims run, and must never start a new Connect account.

import { test, beforeEach, afterEach } from "node:test"
import assert from "node:assert/strict"
import {
  PROFILE_STRIPE_ONBOARD_COMPLETE,
  accountStripeOnboardCompletePath,
  completeAccountStripeOnboardOnce,
  completeProfileStripeOnboardOnce,
  isProfileReadyForEscrowClaim,
  resetAccountStripeOnboardComplete,
  resetStripeOnboardCompleteDedupe,
  setStripeOnboardCompletePosterForTests,
} from "./stripe-onboard-complete.ts"

beforeEach(() => {
  resetStripeOnboardCompleteDedupe()
  setStripeOnboardCompletePosterForTests(null)
})

afterEach(() => {
  resetStripeOnboardCompleteDedupe()
  setStripeOnboardCompletePosterForTests(null)
})

test("isProfileReadyForEscrowClaim requires onboarded and rejects reconnect / disabled flags", () => {
  assert.equal(isProfileReadyForEscrowClaim({ stripe_connect_onboarded: true }), true)
  assert.equal(
    isProfileReadyForEscrowClaim({
      stripe_connect_onboarded: true,
      charges_enabled: true,
      payouts_enabled: true,
    }),
    true,
  )
  assert.equal(isProfileReadyForEscrowClaim({ stripe_connect_onboarded: false }), false)
  assert.equal(isProfileReadyForEscrowClaim({}), false)
  assert.equal(
    isProfileReadyForEscrowClaim({ stripe_connect_onboarded: true, stripe_reconnect_required: true }),
    false,
  )
  assert.equal(
    isProfileReadyForEscrowClaim({
      stripe_connect_onboarded: true,
      charges_enabled: false,
      payouts_enabled: true,
    }),
    false,
  )
  assert.equal(
    isProfileReadyForEscrowClaim({
      stripe_connect_onboarded: true,
      charges_enabled: true,
      payouts_enabled: false,
    }),
    false,
  )
})

test("completeProfileStripeOnboardOnce POSTs the existing complete path once", async () => {
  const paths: string[] = []
  setStripeOnboardCompletePosterForTests(async (path) => {
    paths.push(path)
    return { onboarded: true, charges_enabled: true, payouts_enabled: true }
  })

  const first = await completeProfileStripeOnboardOnce()
  const second = await completeProfileStripeOnboardOnce()

  assert.equal(paths.length, 1)
  assert.equal(paths[0], PROFILE_STRIPE_ONBOARD_COMPLETE)
  assert.ok(!paths[0].includes("stripe-onboard?"))
  assert.equal(paths[0].endsWith("/complete"), true)
  assert.equal(first.onboarded, true)
  assert.equal(first.fromCache, false)
  assert.equal(second.onboarded, true)
  assert.equal(second.fromCache, true)
})

test("in-flight profile complete is shared, not posted twice", async () => {
  let resolvePost!: (value: { onboarded: boolean }) => void
  const paths: string[] = []
  setStripeOnboardCompletePosterForTests(
    () =>
      new Promise((resolve) => {
        paths.push("post")
        resolvePost = resolve
      }),
  )

  const a = completeProfileStripeOnboardOnce()
  const b = completeProfileStripeOnboardOnce()
  resolvePost({ onboarded: true })
  const [first, second] = await Promise.all([a, b])
  assert.equal(first.onboarded, true)
  assert.equal(second.onboarded, true)
  assert.equal(first.fromCache, false)
  assert.equal(second.fromCache, false)
  assert.equal(paths.length, 1)
})

test("a failed profile complete is not cached so the next visit can retry", async () => {
  let calls = 0
  setStripeOnboardCompletePosterForTests(async () => {
    calls += 1
    if (calls === 1) throw new Error("network")
    return { onboarded: true }
  })

  await assert.rejects(() => completeProfileStripeOnboardOnce(), /network/)
  const retry = await completeProfileStripeOnboardOnce()
  assert.equal(calls, 2)
  assert.equal(retry.onboarded, true)
})

test("completeAccountStripeOnboardOnce POSTs /:id/onboard/complete once per account", async () => {
  const paths: string[] = []
  setStripeOnboardCompletePosterForTests(async (path) => {
    paths.push(path)
    return { onboarded: true, charges_enabled: true, payouts_enabled: true }
  })

  await completeAccountStripeOnboardOnce(7)
  await completeAccountStripeOnboardOnce(7)
  await completeAccountStripeOnboardOnce(8)

  assert.deepEqual(paths, [
    accountStripeOnboardCompletePath(7),
    accountStripeOnboardCompletePath(8),
  ])
  assert.ok(paths.every((p) => p.endsWith("/onboard/complete")))
  assert.ok(paths.every((p) => !p.endsWith("/onboard")))
})

test("resetting an account dedupe allows Check again to POST complete again", async () => {
  const paths: string[] = []
  setStripeOnboardCompletePosterForTests(async (path) => {
    paths.push(path)
    return { onboarded: true }
  })
  await completeAccountStripeOnboardOnce(3)
  resetAccountStripeOnboardComplete(3)
  await completeAccountStripeOnboardOnce(3)
  assert.equal(paths.length, 2)
})
