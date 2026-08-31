/**
 * Weekly Cover cancel visibility (host dash + guest lists).
 *
 * Host series delete sets recurring_event_series.is_active=0. Core can leave
 * stamped nights `published`, and the dash used to keep listing them because
 * GET /business/events + the door-access fallback ignore series activity.
 *
 * Binding:
 *   1. Series cancel, 0 sales: program + every night card gone. Not buyable
 *      or editable as live.
 *   2. Series cancel, some sales: unsold night cards gone. Sold nights stay
 *      with pending-cancellation treatment until admin refund completes
 *      (same as a one-off).
 *   3. Single night cancel: only that night leaves after approve. Series stays.
 *
 * Guest lists hide unpublished / canceled WC nights. A published night of a
 * deleted series is a dash problem (is_active); guest status filtering cannot
 * see the series flag on public payloads.
 *
 * Pure — `node --test` can load this without the `@/` alias.
 */

export const LIVE_EVENT_STATUSES = new Set(["published", "approved", "active"])

const APPROVED_CANCELED_STATUSES = new Set([
  "cancelled",
  "canceled",
  "deleted",
  "unpublished",
  "pending_deletion",
])

export type WeeklyCoverVisibilityNight = {
  status?: string | null
  ticket_sales_count?: number | null
  passes_sold?: number | null
  paid_orders?: number | null
  total_revenue?: number | string | null
  cancellation_status?: string | null
}

export function isSeriesActive(is_active: unknown): boolean {
  return !(is_active === false || is_active === 0 || is_active === "0")
}

/** Explicit 0/false/"0" → false, explicit 1/true/"1" → true, else unknown. */
export function readIsActiveFlag(value: unknown): boolean | null {
  if (value === false || value === 0 || value === "0") return false
  if (value === true || value === 1 || value === "1") return true
  return null
}

/**
 * Series activity on a public event / checkout payload.
 * Does NOT read a top-level event `is_active` — that is the night, not the series.
 */
export function readSeriesActiveFromPublicEvent(payload: unknown): boolean | null {
  if (!payload || typeof payload !== "object") return null
  const row = payload as Record<string, unknown>
  const event =
    row.event && typeof row.event === "object" ? (row.event as Record<string, unknown>) : row
  for (const key of ["series_is_active", "recurring_series_is_active", "is_series_active"] as const) {
    const parsed = readIsActiveFlag(event[key] ?? row[key])
    if (parsed !== null) return parsed
  }
  for (const nestKey of ["series", "recurring_series", "program"] as const) {
    const nest = event[nestKey] ?? row[nestKey]
    if (nest && typeof nest === "object") {
      const parsed = readIsActiveFlag((nest as Record<string, unknown>).is_active)
      if (parsed !== null) return parsed
    }
  }
  return null
}

/** GET /business/recurring-series/:id — `{ series }` or a bare series row. */
export function seriesActiveFromRecurringResponse(data: unknown): boolean | null {
  if (!data || typeof data !== "object") return null
  const row = data as Record<string, unknown>
  const series = row.series
  if (series && typeof series === "object") {
    return readIsActiveFlag((series as Record<string, unknown>).is_active)
  }
  return readIsActiveFlag(row.is_active)
}

export function unwrapRecurringSeriesRow(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== "object") return null
  const row = data as Record<string, unknown>
  if (row.series && typeof row.series === "object") return row.series as Record<string, unknown>
  return row
}

/**
 * Web checkout / /event/:id → Laravel.
 * Host-ended WC is never buyable (cover, skip, or both). Guest catalog omission
 * is the same signal the app uses when the detail payload omits series_is_active.
 * Catalog unknown does not fail a live WC night (outage must not blank checkout).
 */
export function weeklyCoverWebSaleOpen(input: {
  isWeeklyCover: boolean
  seriesActive: boolean | null
  listedOnPublicCatalog?: boolean | null
}): boolean {
  if (!input.isWeeklyCover) return true
  if (input.seriesActive === false) return false
  if (input.listedOnPublicCatalog === false) return false
  return true
}

export function normalizeEventStatus(status: string | null | undefined): string {
  return String(status ?? "").trim().toLowerCase()
}

/** Single-night cancel after admin approve (rule 3), or a hard-deleted stamp. */
export function isApprovedCanceledStatus(status: string | null | undefined): boolean {
  return APPROVED_CANCELED_STATUSES.has(normalizeEventStatus(status))
}

export function isLiveEventStatus(status: string | null | undefined): boolean {
  const s = normalizeEventStatus(status)
  if (s === "") return true
  return LIVE_EVENT_STATUSES.has(s)
}

export function weeklyCoverNightHasSales(night: WeeklyCoverVisibilityNight): boolean {
  const sold = Number(night.ticket_sales_count ?? night.passes_sold ?? 0)
  if (Number.isFinite(sold) && sold > 0) return true
  const orders = Number(night.paid_orders ?? 0)
  if (Number.isFinite(orders) && orders > 0) return true
  const revenue = Number(night.total_revenue ?? 0)
  return Number.isFinite(revenue) && revenue > 0
}

/**
 * Should this WC night appear on the host dash?
 *
 * `seriesActive` is only false when a payload said is_active=0. Unknown
 * (omitted series, program_kind=event) stays true so series 23 still lists.
 */
export function weeklyCoverNightVisibleOnDash(
  night: WeeklyCoverVisibilityNight,
  seriesActive: boolean,
): boolean {
  if (isApprovedCanceledStatus(night.status)) return false
  if (seriesActive) return true
  return weeklyCoverNightHasSales(night)
}

/** Inactive series never keep a program / Ended row. Sold nights are one-offs. */
export function weeklyCoverProgramVisibleOnDash(program: { is_active?: unknown }): boolean {
  return isSeriesActive(program.is_active)
}

/**
 * Sold night of a host-deleted series, or an explicit pending request.
 * After approve (status cancelled) this is false — the night has left.
 */
export function weeklyCoverNightNeedsPendingCancel(
  night: WeeklyCoverVisibilityNight,
  seriesActive: boolean,
): boolean {
  if (isApprovedCanceledStatus(night.status)) return false
  if (night.cancellation_status === "pending") return true
  return !seriesActive && weeklyCoverNightHasSales(night)
}

/** Guest venue / public lists: unpublished and canceled WC nights stay off. */
export function shouldListWeeklyCoverNightOnGuest(
  status: string | null | undefined,
): boolean {
  return isLiveEventStatus(status) && !isApprovedCanceledStatus(status)
}

/**
 * Lookahead /ui/events/:id must not resurrect a host-ended series the
 * guest catalog already omitted. Unknown series activity is allowed when
 * the night was already listed, or when it is unpublished (draft escrow
 * lookahead). A leftover published night is not filled back in.
 */
export function shouldKeepLookaheadWeeklyCoverNight(
  seriesActive: boolean | null,
  onPublishedList: boolean,
  status?: string | null,
): boolean {
  if (seriesActive === false) return false
  if (seriesActive === true) return true
  if (onPublishedList) return true
  return !isLiveEventStatus(status)
}

export function inactiveSeriesIdSet(
  programs: readonly { id?: number; is_active?: unknown }[],
  series: readonly { id?: number; is_active?: unknown }[] = [],
): Set<number> {
  const ids = new Set<number>()
  for (const row of [...programs, ...series]) {
    const id = Number(row.id)
    if (!Number.isFinite(id) || id <= 0) continue
    if (!isSeriesActive(row.is_active)) ids.add(id)
  }
  return ids
}
