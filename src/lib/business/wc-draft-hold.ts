/**
 * Unapproved-shop Weekly Cover is a draft. We approve the BUSINESS, not
 * each night. Do not paint this as manual review / In review / live.
 *
 * Leftover `pending_approval` from services #109/#110 is the same hold.
 * Display it as Draft. D3 still publishes those rows after business approve.
 */

export const WC_DRAFT_CHIP_LABEL = "Draft"

export const WC_DRAFT_REVIEW_BANNER =
  "This saves as a draft until your business is approved. We approve the business, not each Weekly Cover."

export const WC_DRAFT_CREATED_COPY =
  "Saved as a draft. It goes live once your business is approved. You can keep editing in the meantime."

export const WC_DRAFT_WAITING_COPY =
  "This is a draft, waiting on business approval. It is not live and not selling."

export function isWeeklyCoverHoldStatus(status: string | null | undefined): boolean {
  const s = (status ?? "").toLowerCase()
  return s === "draft" || s === "pending_approval"
}

export function weeklyCoverHoldChip(): { label: typeof WC_DRAFT_CHIP_LABEL; variant: "neutral" } {
  return { label: WC_DRAFT_CHIP_LABEL, variant: "neutral" }
}

export function draftNightEventIds(
  nights: Array<{ event_id?: number | null; status?: string | null }>,
): number[] {
  return queuedWeeklyCoverNightEventIds(nights, { includePendingApproval: false })
}

/**
 * Nights D3 should publish after the business is approved.
 * `draft` is the hold. Leftover `pending_approval` still promotes so an
 * older services stamp does not stay stuck.
 */
export function queuedWeeklyCoverNightEventIds(
  nights: Array<{ event_id?: number | null; status?: string | null }>,
  opts?: { includePendingApproval?: boolean },
): number[] {
  const includePending = opts?.includePendingApproval !== false
  const ids: number[] = []
  for (const night of nights) {
    const status = (night.status ?? "").toLowerCase()
    if (status === "draft" || (includePending && status === "pending_approval")) {
      const id = Number(night.event_id)
      if (Number.isFinite(id) && id > 0) ids.push(id)
    }
  }
  return ids
}
