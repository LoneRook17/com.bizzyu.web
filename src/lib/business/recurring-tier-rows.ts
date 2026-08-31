/**
 * The RC (named recurring series) tier-row model and its template converters ;
 * pure, so tests and the editor component share one implementation. The UI
 * lives in components/business/v2/recurring/RecurringTierEditor.tsx, which
 * re-exports everything here.
 */

import type { RecurringTemplateTicket } from "./types"
import {
  parsePrice,
  surgeStepsFromWire,
  type SurgeStepDraft,
} from "./weekly-cover-nights.ts"

export interface RecurringTierRow {
  /** Present when editing an existing door-access template tier. */
  tier_key?: string
  name: string
  description: string
  ticket_type: "paid" | "free"
  priceInput: string
  quantityInput: string
  maxPerPersonInput: string
  valid_from_time: string // "HH:MM" or ""
  valid_until_time: string
  valid_from_day_offset: number
  valid_until_day_offset: number
  /**
   * Named-series surge (RC). OPTIONAL on purpose: rows minted by surfaces
   * that do not carry surge (the WC night page's draftTierToRow) leave these
   * undefined, and `tierRowsToTemplate` then OMITS the wire keys; omission
   * means "keep the stored ladder", so those surfaces cannot clear one by
   * accident. RC create/edit rows always set both.
   */
  surge_enabled?: boolean
  surge?: SurgeStepDraft[]
  /**
   * Per-tier 21+ (WC night page only for now). OPTIONAL for the same reason
   * as surge: rows minted without it leave the stored flag alone, and
   * `tierRowsToTemplate` never writes it.
   */
  is_21_plus?: boolean
}

export const EMPTY_RECURRING_TIER: RecurringTierRow = {
  name: "",
  description: "",
  ticket_type: "paid",
  priceInput: "0",
  quantityInput: "0",
  maxPerPersonInput: "0",
  valid_from_time: "",
  valid_until_time: "",
  valid_from_day_offset: 0,
  valid_until_day_offset: 0,
  surge_enabled: false,
  surge: [],
}

export function templateToTierRows(template: RecurringTemplateTicket[]): RecurringTierRow[] {
  return [...template]
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((t) => {
      const surge = surgeStepsFromWire(t.surge_steps)
      return {
        ...(t.tier_key ? { tier_key: t.tier_key } : {}),
        name: t.name,
        description: t.description ?? "",
        ticket_type: t.ticket_type,
        priceInput: String(t.price_usd ?? 0),
        quantityInput: String(t.quantity ?? 0),
        maxPerPersonInput: String(t.max_per_person ?? 0),
        valid_from_time: t.valid_from_time?.slice(0, 5) ?? "",
        valid_until_time: t.valid_until_time?.slice(0, 5) ?? "",
        valid_from_day_offset: t.valid_from_day_offset ?? 0,
        valid_until_day_offset: t.valid_until_day_offset ?? 0,
        // A ladder that came back is on, whatever the flag says.
        surge_enabled: !!t.surge_enabled || surge.length > 0,
        surge,
      }
    })
}

export function tierRowsToTemplate(rows: RecurringTierRow[]): RecurringTemplateTicket[] {
  return rows.map((r, i) => {
    const surgeSteps = !r.surge_enabled
      ? []
      : (r.surge ?? [])
          .map((step) => ({
            after_sold: parseInt(step.afterSoldInput, 10) || 0,
            price_usd: parsePrice(step.priceInput),
          }))
          .filter((step) => step.after_sold > 0 && step.price_usd > 0)
    return {
      ...(r.tier_key ? { tier_key: r.tier_key } : {}),
      name: r.name.trim(),
      description: r.description.trim() || null,
      price_usd: r.ticket_type === "free" ? 0 : parseFloat(r.priceInput) || 0,
      quantity: parseInt(r.quantityInput) || 0,
      max_per_person: parseInt(r.maxPerPersonInput) || 0,
      ticket_type: r.ticket_type,
      is_hidden: 0,
      sort_order: i + 1,
      valid_from_time: r.valid_from_time || null,
      valid_until_time: r.valid_until_time || null,
      valid_from_day_offset: r.valid_from_time ? r.valid_from_day_offset : 0,
      valid_until_day_offset: r.valid_until_time ? r.valid_until_day_offset : 0,
      // Both keys or neither: rows without surge state (the WC night page's
      // adapter) omit them so a stored ladder is kept; RC rows always carry
      // them so surge off travels as an explicit clear.
      ...(r.surge_enabled !== undefined
        ? { surge_enabled: surgeSteps.length > 0, surge_steps: surgeSteps }
        : {}),
    }
  })
}
