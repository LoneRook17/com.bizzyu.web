// Wire types for the line-skip PaymentIntent checkout, pinned in
// V426_FASTFOLLOW.md §6. The services half (feat/lineskip-pi-flow) implements
// the same three shapes; anything here that drifts from that doc is a bug in
// this file, not a local improvement.

export interface LineSkipPiConfig {
  pi_flow_enabled: boolean
  publishable_key: string | null
}

export interface LineSkipPiBreakdown {
  base_cents: number
  fee_cents: number
  discount_cents: number
  total_cents: number
}

export interface LineSkipPaymentIntentResponse {
  pi_client_secret: string
  pi_id: string
  breakdown: LineSkipPiBreakdown
}

/**
 * Issued pass. The contract pins only `tickets[]`, so `uuid` is the sole field
 * this code depends on; everything else is optional and used to enrich the
 * success screen when the server sends it (mirroring the `complete-free`
 * payload). Absent fields fall back to state the buyer page already holds.
 */
export interface LineSkipTicket {
  id?: number
  uuid: string
  business_name?: string
  instance_date?: string
  start_time?: string
  end_time?: string
}

export type LineSkipCompleteStatus = 'fulfilled' | 'refunded_sold_out' | 'pending'

export interface LineSkipCompleteResponse {
  status: LineSkipCompleteStatus
  tickets: LineSkipTicket[]
  // Optional success-screen enrichment — see LineSkipTicket above.
  wallet_token?: string | null
  business_name?: string
  venue_name?: string
  venue_id?: number | null
  instance_date?: string
  start_time?: string
  end_time?: string
}

/** Thrown for 409 {code:'SOLD_OUT'} on payment-intent — the pinned sold-out arm. */
export class LineSkipSoldOutError extends Error {
  constructor(message = 'This night just sold out.') {
    super(message)
    this.name = 'LineSkipSoldOutError'
  }
}
