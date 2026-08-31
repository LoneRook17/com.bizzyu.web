/**
 * Surge ladders on plain event ticket tiers (O4).
 *
 * The Weekly Cover lane already speaks this contract (weekly-cover-nights.ts);
 * this module is the same read/write/validate trio for the event create/edit
 * form, whose tier state is a served `TicketTier` row rather than a
 * `NightTierDraft`.
 *
 * Contract, same as the app and the WC dialog:
 *  - WRITE `{after_sold, price_usd}` rungs; surge off travels as an EXPLICIT
 *    `surge_enabled: false` + `surge_steps: []` — omission means "leave the
 *    stored ladder alone", so a form that only sends surge when enabled could
 *    never turn it off.
 *  - READ `{threshold_sold, price_cents, price_usd}` (what services echoes)
 *    as well as the write spelling.
 *  - VALIDATE a NEW ladder against the price currently in the box, but an
 *    EXISTING ladder against the stored `surge_base_price_usd` — the tier's
 *    `price_usd` has already moved for a part-way-fired ladder.
 */

import type { TicketTier } from "./types"
import {
  surgeStepsFromWire,
  trimMoney,
  type SurgeStepDraft,
  type SurgeStepWire,
} from "./weekly-cover-nights.ts"

export type { SurgeStepDraft, SurgeStepWire }

function parseThreshold(input: string): number {
  const n = parseInt(input, 10)
  return Number.isFinite(n) && n > 0 ? n : 0
}

function parsePrice(input: string): number {
  const n = parseFloat(input)
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0
}

/**
 * Normalize a served ticket row into form state: draft rungs + the on flag.
 * A ladder that came back is ON whatever the flag says (MySQL hands booleans
 * back as 1/0), matching tierFromWire in the WC lane.
 */
export function tierWithSurgeDrafts(tier: TicketTier): TicketTier {
  const steps = surgeStepsFromWire(tier.surge_steps)
  return {
    ...tier,
    surge_enabled: !!tier.surge_enabled || steps.length > 0,
    surge: steps,
    surge_base_price_usd:
      tier.surge_base_price_usd == null ? null : Number(tier.surge_base_price_usd),
  }
}

/** Seed one rung when the toggle flips on: +10 sold, base + $5. */
export function seededSurgeStep(tier: TicketTier): SurgeStepDraft {
  const base = Number(tier.price_usd) || 0
  return { afterSoldInput: "10", priceInput: trimMoney(base > 0 ? base + 5 : 15) }
}

/** Seed the next rung after the last one: +10 sold, +$5. */
export function nextSurgeStep(tier: TicketTier): SurgeStepDraft {
  const rungs = tier.surge ?? []
  const last = rungs[rungs.length - 1]
  const lastPrice = last ? parsePrice(last.priceInput) : Number(tier.price_usd) || 0
  const lastThreshold = last ? parseThreshold(last.afterSoldInput) : 0
  return {
    afterSoldInput: String(lastThreshold > 0 ? lastThreshold + 10 : 10),
    priceInput: trimMoney(lastPrice > 0 ? lastPrice + 5 : 15),
  }
}

/**
 * The two wire keys for a tier payload. Always both, so off is an explicit
 * clear. Rungs with a blank threshold or price are dropped, same as the WC
 * `surgeStepsToWire`.
 */
export function tierSurgeToWire(tier: TicketTier): {
  surge_enabled: boolean
  surge_steps: SurgeStepWire[]
} {
  const steps = !tier.surge_enabled
    ? []
    : (tier.surge ?? [])
        .map((step) => ({
          after_sold: parseThreshold(step.afterSoldInput),
          price_usd: parsePrice(step.priceInput),
        }))
        .filter((step) => step.after_sold > 0 && step.price_usd > 0)
  return { surge_enabled: steps.length > 0, surge_steps: steps }
}

/**
 * The core ladder check, shared by the event tier form and the recurring
 * (RC) tier editor. One error string or null. Mirrors the WC night validator
 * and the server's validateSurgeLadder: surge needs a PAID price to anchor
 * to, at least one jump, strictly increasing thresholds and prices, first
 * jump above the base.
 *
 * The paid-price rule exists because the checkbox is now ALWAYS visible
 * (Luke, 2026-08-29) — a host can check surge before typing a price, and the
 * refusal happens here at save with inline copy, never by hiding the box.
 */
export function validateSurgeDrafts(opts: {
  name: string
  enabled: boolean | undefined
  rungs: SurgeStepDraft[]
  /** The price surge anchors to (stored ladder base, else the price box). */
  basePriceUsd: number
  /** False for a free tier — surge cannot ride a free ticket. */
  isPaid: boolean
}): string | null {
  if (!opts.enabled) return null
  const name = opts.name.trim() || "This tier"
  if (!opts.isPaid || opts.basePriceUsd <= 0) {
    return `"${name}": set a paid ticket price before adding surge.`
  }
  const rungs = opts.rungs
  if (rungs.length === 0) return `"${name}": surge needs at least one price jump.`
  const base = opts.basePriceUsd
  let previousThreshold = 0
  let previousPrice = base
  for (let i = 0; i < rungs.length; i++) {
    const after = parseThreshold(rungs[i].afterSoldInput)
    const price = parsePrice(rungs[i].priceInput)
    if (after <= 0) return `"${name}": jump ${i + 1} needs a positive number sold.`
    if (after <= previousThreshold) {
      return `"${name}": jump ${i + 1} has to come after ${previousThreshold} sold, not ${after}.`
    }
    if (price <= 0) return `"${name}": jump ${i + 1} needs a price.`
    if (i === 0 && price <= base) {
      return `"${name}": the first jump has to be more than the starting price.`
    }
    if (i > 0 && price <= previousPrice) {
      return `"${name}": jump ${i + 1} has to raise the price.`
    }
    previousThreshold = after
    previousPrice = price
  }
  return null
}

/** The event form's tier check. A stored ladder keeps its own base; only a
 * first-time ladder anchors to the price box. */
export function validateTierSurge(tier: TicketTier): string | null {
  const base =
    tier.surge_base_price_usd != null && tier.surge_base_price_usd > 0
      ? tier.surge_base_price_usd
      : Number(tier.price_usd) || 0
  return validateSurgeDrafts({
    name: tier.name,
    enabled: tier.surge_enabled,
    rungs: tier.surge ?? [],
    basePriceUsd: base,
    isPaid: tier.ticket_type === "paid",
  })
}

/** The RC series tier editor's check — rows hold text inputs. */
export function validateRecurringTierSurge(row: {
  name: string
  ticket_type: "paid" | "free"
  priceInput: string
  surge_enabled?: boolean
  surge?: SurgeStepDraft[]
}): string | null {
  return validateSurgeDrafts({
    name: row.name,
    enabled: row.surge_enabled,
    rungs: row.surge ?? [],
    basePriceUsd: parsePrice(row.priceInput),
    isPaid: row.ticket_type === "paid",
  })
}
