// Transport for the line-skip PI contract (V426_FASTFOLLOW.md §6).
//
// Every call routes through here so the buyer page never knows whether it is
// talking to dev services or the mock.
//
// Each mock branch tests `process.env.NEXT_PUBLIC_LINESKIP_PI_MOCK` inline
// rather than the exported MOCK_ENABLED. That is deliberate and load-bearing:
// only a literal compare inside the same module folds at build time, which is
// what drops the dynamic import — and the mock chunk with it — from a prod
// build. Routing these through the imported constant does NOT fold, and the
// mock ships (verified against the built output, both ways). next.config.ts
// defaults the var so the compare always has a literal to fold against.
// MOCK_ENABLED stays exported for plain runtime checks that gate no import.

import { getApiBaseUrl } from '@/lib/api-url'

import {
  LineSkipSoldOutError,
  type LineSkipCompleteResponse,
  type LineSkipPaymentIntentResponse,
  type LineSkipPiConfig,
} from './types'

const API_URL = getApiBaseUrl()

export const MOCK_ENABLED = process.env.NEXT_PUBLIC_LINESKIP_PI_MOCK === '1'

export interface PaymentIntentArgs {
  instance_id: number
  quantity: number
  /** E.164, per the contract. */
  phone_number: string
  promo_code?: string | null
  // ── Additive, NOT in the pinned contract ──────────────────────────────────
  // The server cannot issue a pass without a name (`complete-free` requires
  // attendee_name) and cannot honour the SMS opt-in without the flag, yet the
  // pinned payment-intent body lists neither. Sent additively rather than
  // dropped; flagged to the services half for alignment. Extra keys are inert
  // if that side ends up collecting them elsewhere.
  attendee_name: string
  sms_opt_in: boolean
}

export async function fetchPiConfig(instanceId: number): Promise<LineSkipPiConfig> {
  if (process.env.NEXT_PUBLIC_LINESKIP_PI_MOCK === '1') {
    const { mockConfig } = await import('./mock')
    return mockConfig()
  }
  const res = await fetch(`${API_URL}/line-skips/checkout/config?instance_id=${instanceId}`)
  if (!res.ok) {
    // A config that won't load is not a reason to strand the buyer: the caller
    // treats a throw as "flag off" and keeps today's session flow.
    throw new Error('config unavailable')
  }
  const data = await res.json()
  return {
    pi_flow_enabled: Boolean(data.pi_flow_enabled),
    publishable_key: data.publishable_key ?? null,
  }
}

export async function createPaymentIntent(
  args: PaymentIntentArgs,
  // Mock-only: the fee math the page already computed, so the mocked breakdown
  // matches what the buyer was quoted. Ignored on the live path, where the
  // server's breakdown is authoritative.
  mockAmounts?: { base_cents: number; discount_cents: number; fee_cents: number }
): Promise<LineSkipPaymentIntentResponse> {
  if (process.env.NEXT_PUBLIC_LINESKIP_PI_MOCK === '1') {
    const { mockPaymentIntent } = await import('./mock')
    return mockPaymentIntent(mockAmounts ?? { base_cents: 0, discount_cents: 0, fee_cents: 0 })
  }
  const res = await fetch(`${API_URL}/line-skips/checkout/payment-intent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  })
  const data = await res.json().catch(() => ({}))
  if (res.status === 409 && data?.code === 'SOLD_OUT') {
    throw new LineSkipSoldOutError(data.message)
  }
  if (!res.ok) {
    throw new Error(data?.message || 'Could not start payment')
  }
  return data as LineSkipPaymentIntentResponse
}

export async function completePayment(pi_id: string): Promise<LineSkipCompleteResponse> {
  if (process.env.NEXT_PUBLIC_LINESKIP_PI_MOCK === '1') {
    const { mockComplete } = await import('./mock')
    return mockComplete(pi_id)
  }
  const res = await fetch(`${API_URL}/line-skips/checkout/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pi_id }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data?.message || 'Could not confirm your purchase')
  }
  return data as LineSkipCompleteResponse
}

/**
 * Poll `complete` while the webhook races us to fulfilment. Deliberately short:
 * a buyer who is already charged should reach either their passes or the
 * "check your texts" fallback quickly, never an open-ended spinner.
 */
export async function pollComplete(
  pi_id: string,
  { attempts = 5, intervalMs = 1500 } = {}
): Promise<LineSkipCompleteResponse> {
  let last: LineSkipCompleteResponse = { status: 'pending', tickets: [] }
  for (let i = 0; i < attempts; i++) {
    await new Promise((r) => setTimeout(r, intervalMs))
    try {
      last = await completePayment(pi_id)
      if (last.status !== 'pending') return last
    } catch {
      // Keep polling — a transient failure mid-poll is not a verdict.
    }
  }
  return last
}
