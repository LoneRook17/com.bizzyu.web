// Dev-only mock of the line-skip PI contract, so the Elements UI is fully
// exercisable before the services half (feat/lineskip-pi-flow) reaches dev.
//
// This module is only ever reached from a `MOCK_ENABLED &&` branch in
// client.ts, where MOCK_ENABLED folds to a literal false at build time and the
// dynamic import behind it is dropped — so nothing here ships in a prod bundle.
// It is a mock of the SERVER only: Stripe Elements still mount for real against
// a real test publishable key, in deferred mode (no server PI to attach to).

import {
  LineSkipSoldOutError,
  type LineSkipCompleteResponse,
  type LineSkipPaymentIntentResponse,
  type LineSkipPiConfig,
} from './types'

/**
 * Which arm of the contract the mock should exercise. Chosen in the UI by the
 * dev-only scenario picker; `success` is the default so the happy path needs no
 * interaction.
 */
export type MockScenario =
  | 'success'
  | 'decline'
  | 'requires_action'
  | 'sold_out'
  | 'refunded_sold_out'
  | 'pending'

const SCENARIOS: MockScenario[] = [
  'success',
  'decline',
  'requires_action',
  'sold_out',
  'refunded_sold_out',
  'pending',
]

let scenario: MockScenario | null = null

/**
 * Seedable from `?mock_scenario=` so the arms that fire BEFORE the pay step
 * renders — the 409 at intent creation — are reachable without a picker to
 * click. The in-page picker overrides it from there.
 */
function initialScenario(): MockScenario {
  if (typeof window === 'undefined') return 'success'
  const q = new URLSearchParams(window.location.search).get('mock_scenario')
  return q && (SCENARIOS as string[]).includes(q) ? (q as MockScenario) : 'success'
}

export function setMockScenario(s: MockScenario) {
  scenario = s
}

export function getMockScenario(): MockScenario {
  if (scenario === null) scenario = initialScenario()
  return scenario
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function mockConfig(): LineSkipPiConfig {
  return {
    pi_flow_enabled: true,
    // A publishable key is public by design; the mock needs a real TEST one so
    // the Elements themselves are real. Unset = the caller falls back to the
    // session flow rather than mounting Elements against nothing.
    publishable_key: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || null,
  }
}

/** Mirrors the server's fee math closely enough to render an honest summary. */
export async function mockPaymentIntent(args: {
  base_cents: number
  discount_cents: number
  fee_cents: number
}): Promise<LineSkipPaymentIntentResponse> {
  await delay(400)
  if (getMockScenario() === 'sold_out') {
    throw new LineSkipSoldOutError('This night just sold out.')
  }
  const total = Math.max(0, args.base_cents - args.discount_cents) + args.fee_cents
  return {
    // Deliberately not a valid client secret: mock mode mounts Elements in
    // deferred mode and never hands this to Stripe.js. If it ever reaches
    // Stripe, the resulting error is the bug telling you the branch leaked.
    pi_client_secret: 'pi_mock_secret_not_for_stripe',
    pi_id: `pi_mock_${Math.random().toString(36).slice(2, 10)}`,
    breakdown: {
      base_cents: args.base_cents,
      discount_cents: args.discount_cents,
      fee_cents: args.fee_cents,
      total_cents: total,
    },
  }
}

/**
 * Stands in for stripe.confirmPayment. Returns the same discriminated shape the
 * live path narrows to, so the caller's branching is identical in both modes.
 */
export async function mockConfirm(): Promise<
  { ok: true } | { ok: false; message: string }
> {
  await delay(700)
  const active = getMockScenario()
  if (active === 'decline') {
    return { ok: false, message: 'Your card was declined.' }
  }
  if (active === 'requires_action') {
    // The real 3DS modal is Stripe-hosted and can't be faked; mock mode proves
    // the surrounding state machine (no page reset, retry stays available).
    // The genuine 3DS challenge is a LIVE-only proof.
    await delay(1200)
    return { ok: true }
  }
  return { ok: true }
}

export async function mockComplete(pi_id: string): Promise<LineSkipCompleteResponse> {
  await delay(500)
  const active = getMockScenario()
  if (active === 'refunded_sold_out') {
    return { status: 'refunded_sold_out', tickets: [] }
  }
  if (active === 'pending') {
    // Never resolves: the poll exhausting into the "check your texts" fallback
    // is the whole point of this arm.
    return { status: 'pending', tickets: [] }
  }
  return {
    status: 'fulfilled',
    tickets: [
      { id: 1, uuid: `mock-${pi_id.slice(-6)}-1` },
      { id: 2, uuid: `mock-${pi_id.slice(-6)}-2` },
    ].slice(0, 1),
    wallet_token: '',
    venue_name: '',
    business_name: '',
  }
}
