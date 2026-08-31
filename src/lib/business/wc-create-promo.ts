/**
 * Program-scoped promo drafts for Weekly Cover CREATE.
 *
 * Same REST shape PromoCodesPanel already posts after a program exists:
 * POST /business/door-access/:id/promo-codes
 *   { code, discount_type, discount_value, max_redemptions, max_per_user, expires_at }
 *
 * Create has no series id yet, so the last page holds drafts and Publish
 * posts them after POST /business/door-access. Do not invent a second model.
 */

import { seriesPromoBasePath } from "./venue-series-promo.ts"

export interface WcPromoDraft {
  localId: string
  code: string
  discount_type: "percentage" | "flat"
  discount_value: string
  max_redemptions: string
  max_per_user: string
  expires_at: string
}

export function emptyWcPromoDraft(localId: string): WcPromoDraft {
  return {
    localId,
    code: "",
    discount_type: "percentage",
    discount_value: "",
    max_redemptions: "",
    max_per_user: "1",
    expires_at: "",
  }
}

export function wcPromoCreatePath(programId: number): string {
  // WC create is always a door-access program — never a named RC series.
  return seriesPromoBasePath("weekly_cover", programId)
}

/** After a series exists, POST ready drafts to the existing series promo API. */
export async function persistSeriesPromoDrafts(
  post: (path: string, body: unknown) => Promise<unknown>,
  seriesId: number,
  drafts: WcPromoDraft[],
): Promise<void> {
  for (const draft of readyWcPromoDrafts(drafts)) {
    await post(wcPromoCreatePath(seriesId), wcPromoCreatePayload(draft))
  }
}

export function wcPromoCreatePayload(draft: WcPromoDraft): {
  code: string
  discount_type: "percentage" | "flat"
  discount_value: number
  max_redemptions: number | null
  max_per_user: number
  expires_at: string | null
} {
  return {
    code: draft.code.trim().toUpperCase(),
    discount_type: draft.discount_type,
    discount_value: Number.parseFloat(draft.discount_value),
    max_redemptions: draft.max_redemptions ? Number.parseInt(draft.max_redemptions, 10) : null,
    max_per_user: Number.parseInt(draft.max_per_user, 10) || 1,
    expires_at: draft.expires_at || null,
  }
}

export function validateWcPromoDraft(draft: WcPromoDraft): string | null {
  if (draft.code.trim() === "") return "Add a code."
  const value = Number.parseFloat(draft.discount_value)
  if (!Number.isFinite(value) || value <= 0) return "Add a discount."
  if (draft.discount_type === "percentage" && value > 100) return "Percent can't be over 100."
  const maxUses = draft.max_redemptions ? Number.parseInt(draft.max_redemptions, 10) : null
  if (draft.max_redemptions && (!Number.isFinite(maxUses) || (maxUses ?? 0) < 1)) {
    return "Max uses must be blank or at least 1."
  }
  return null
}

/** Ready drafts only. Half-filled rows stay off the wire. */
export function readyWcPromoDrafts(drafts: WcPromoDraft[]): WcPromoDraft[] {
  return drafts.filter((d) => validateWcPromoDraft(d) == null)
}
