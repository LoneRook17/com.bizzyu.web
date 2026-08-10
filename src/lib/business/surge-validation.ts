/**
 * Pure surge-ladder helpers (S3) — no imports, so the Node built-in test runner
 * can exercise them directly. `surge.ts` re-exports these alongside the API.
 */

export type SurgeEntityType = 'event_ticket' | 'line_skip_night'

export interface StepInput {
  threshold_sold: number
  price_cents: number
}

export function isPositiveInt(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n > 0
}

export function fmtCents(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return '—'
  return `$${(cents / 100).toFixed(2)}`
}

/**
 * D8: strictly increasing thresholds AND prices, first step above the base,
 * positive integers, uncapped. Returns the first problem or null when valid.
 * Mirrors the server's `validateLadderShape` so the editor never submits a
 * ladder the API will reject.
 */
export function validateLadderSteps(baseCents: number, steps: StepInput[]): string | null {
  if (!Number.isInteger(baseCents) || baseCents < 0) return 'Base price must be a whole number of cents (≥ 0).'
  if (!Array.isArray(steps) || steps.length === 0) return 'Add at least one surge step.'
  let prevThreshold = 0
  let prevPrice = baseCents
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i]!
    const n = i + 1
    if (!isPositiveInt(s.threshold_sold)) return `Step ${n}: “when N sold” must be a positive whole number.`
    if (!isPositiveInt(s.price_cents)) return `Step ${n}: price must be a positive whole number of cents.`
    if (s.threshold_sold <= prevThreshold) return `Step ${n}: threshold (${s.threshold_sold}) must be greater than the previous step’s (${prevThreshold}).`
    if (s.price_cents <= prevPrice) return `Step ${n}: price (${fmtCents(s.price_cents)}) must be greater than ${i === 0 ? 'the base price' : 'the previous step'} (${fmtCents(prevPrice)}).`
    prevThreshold = s.threshold_sold
    prevPrice = s.price_cents
  }
  return null
}

/** price ÷ base, rounded to 1 decimal — the loud "10×" fat-finger preview (D8). */
export function stepMultiplier(baseCents: number, priceCents: number): number {
  if (baseCents <= 0) return 0
  return Math.round((priceCents / baseCents) * 10) / 10
}

/**
 * At or above this multiplier the editor stops being quiet: the step row turns
 * amber and a worded warning appears naming the actual dollar amounts (D8).
 *
 * 3× is deliberately low. This is not a judgement about what a business may
 * charge — they can save any ladder they like. It exists because the failure it
 * guards is a MISPLACED DECIMAL ("10.00" typed into a $1.00 base), and that
 * mistake multiplies what every remaining buyer pays. Cheap to dismiss when
 * intended, and the only thing standing between a typo and a real charge.
 */
export const LOUD_MULTIPLIER = 3

/**
 * Only owner + manager may configure surge (D18).
 *
 * Mirrors requireBusinessRole('owner','manager') on all seven services
 * `/business/surge` routes. This is a VISIBILITY gate, not an error gate — the
 * server is the real block, but a control that 403s on every click should never
 * have been drawn. Anything not explicitly owner/manager — staff, promoter,
 * blank, or some future role — is excluded.
 */
export function canConfigureSurge(role: string | null | undefined): boolean {
  return role === 'owner' || role === 'manager'
}

/** The tier fields the surge placement needs. Structural, so this module keeps
 *  its no-imports property and stays runnable under `node --test`. */
export interface SurgeableTier {
  ticket_id?: number
  name: string
  ticket_type: 'paid' | 'free' | 'guest'
  is_hidden?: boolean
}

/**
 * Which of an event's tiers get a surge card (D10).
 *
 * A ladder steps a PRICE up as a tier sells, so it is meaningless on a free or
 * guest tier, and unreachable on a hidden one (nobody can buy it, so no sale
 * can ever fire a step). A tier with no id has not been persisted yet and has
 * nothing for the API to key a ladder to.
 */
export function surgeableTiers<T extends SurgeableTier>(tickets: T[] | undefined | null): T[] {
  return (tickets ?? []).filter(
    (t) => t.ticket_type === 'paid' && !t.is_hidden && typeof t.ticket_id === 'number',
  )
}
