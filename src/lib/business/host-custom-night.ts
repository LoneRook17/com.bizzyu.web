/**
 * Host Custom voter — same contract as Flutter
 * `lib/utils/host_custom_night.dart` `isHostCustomNight`.
 *
 * This workspace token cannot clone that private repo. The function name,
 * inputs, and return meaning are the locked product Luke filed (and
 * `.cursor/rules/bizzy-ship.mdc`). Do not invent a second voter.
 *
 * Locked product (do not change):
 * - Custom is ONLY a later edit of ONE calendar date that diverges from
 *   that weekday's template (flyer, tickets, prices, doors, title).
 * - Setting Mon/Wed/Fri differently during CREATE is weekday templates,
 *   not Custom. Fresh create = zero Custom chips even when weekdays differ.
 * - A later series/program save must NOT change Custom nights and must NOT
 *   strip the chip.
 * - WC Custom stays a pink Weekly Cover (not a green named Event).
 * - Green RC Custom stays a green Custom occurrence.
 * - After green RC series-end, a leftover night is a standalone Event and
 *   DROPS the Custom chip (no longer in a series).
 *
 * Wire flags (services door-access / #104): `series_customized_at`,
 * `is_customized`, date-local override / own flyer. Weekday templates never
 * set those on a fresh create.
 */

export type HostCustomNightInput = {
  product_kind?: string | null
  access_kind?: string | null
  /**
   * Present on green RC / owned-event rows. `null` means standalone
   * (including a leftover after series-end). Omit (`undefined`) on Weekly
   * Cover program nights — those stay in the program.
   */
  recurring_series_id?: number | string | null
  series_customized_at?: string | null
  is_customized?: boolean | number | string | null
  has_override?: boolean | number | string | null
  flyer_image_url_override?: string | null
  /** Host added/edited this calendar date (date_edits / game day). */
  host_created_date?: boolean | number | string | null
}

function truthyFlag(value: unknown): boolean {
  return value === true || value === 1 || value === "1"
}

function nonemptyStamp(value: unknown): boolean {
  return typeof value === "string" && value.trim() !== ""
}

export function seriesIdOf(value: unknown): number | null {
  if (value == null || value === "") return null
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : null
}

export function isWeeklyCoverKind(input: Pick<HostCustomNightInput, "product_kind" | "access_kind">): boolean {
  const product = String(input.product_kind ?? "").toLowerCase()
  if (product === "weekly_cover") return true
  if (product === "event") return false
  const access = String(input.access_kind ?? "").toLowerCase()
  return access === "door_access" || access === "weekly_cover"
}

/**
 * Whether this night is Custom — a later one-date edit — the same way the
 * Flutter app decides the pink/green Custom chip.
 */
export function isHostCustomNight(input: HostCustomNightInput): boolean {
  const weeklyCover = isWeeklyCoverKind(input)
  const seriesExplicit = input.recurring_series_id !== undefined
  const inSeries = seriesIdOf(input.recurring_series_id) != null

  // Green RC leftover after series-end: standalone Event, drop Custom.
  if (!weeklyCover && seriesExplicit && !inSeries) return false

  if (nonemptyStamp(input.series_customized_at)) return true
  if (truthyFlag(input.is_customized)) return true
  // Date-local override / own flyer is a later edit of one date, not a
  // weekday template. Fresh create does not write these.
  if (truthyFlag(input.has_override)) return true
  if (nonemptyStamp(input.flyer_image_url_override)) return true
  if (truthyFlag(input.host_created_date)) return true

  return false
}

/** Chip paint: pink Weekly Cover vs green named-event Custom. */
export function hostCustomChipTone(input: HostCustomNightInput): "wc" | "event" | null {
  if (!isHostCustomNight(input)) return null
  return isWeeklyCoverKind(input) ? "wc" : "event"
}

export const HOST_CUSTOM_CHIP_LABEL = "Custom"
