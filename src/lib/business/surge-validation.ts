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

/** Only owner + manager may configure surge (D18). */
export function canConfigureSurge(role: string | null | undefined): boolean {
  return role === 'owner' || role === 'manager'
}
