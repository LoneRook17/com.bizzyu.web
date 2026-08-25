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
