/**
 * Host Custom voter — same contract as Flutter
 * `lib/utils/host_custom_night.dart` `isHostCustomNight` (1277 lines on
 * LoneRook17/com.bizzyu.mobile.flutter `fall/integration`).
 *
 * This workspace token cannot read that private repo. Do not invent a second
 * voter from `is_customized` / `has_override` alone. Those flags are the
 * additive "Customized" / "Overridden" chips on a night row
 * (`nightChips` in door-access.ts). They are not the Flutter Custom chip.
 *
 * Locked product (do not change):
 * - Custom is ONLY a later edit of ONE calendar date that diverges from
 *   that weekday's SLOT (flyer, tickets, prices, doors, title).
 * - Setting Mon/Wed/Fri differently during CREATE is weekday templates,
 *   not Custom. Fresh create = zero Custom chips even when weekdays differ.
 * - A later series/program save must NOT change Custom nights and must NOT
 *   strip the chip.
 * - WC Custom stays a pink Weekly Cover (not a green named Event).
 * - Green RC Custom stays a green Custom occurrence.
 * - After green RC series-end, a leftover night is a standalone Event and
 *   DROPS the Custom chip (no longer in a series).
 * - `override_scope` weekday / program / series never chips.
 *
 * Wire that IS the one-date stamp (services door-access / #104):
 * `series_customized_at`. RecurringOccurrence.`is_customized` is documented
 * as that stamp's alias on green RC rows still in a series — not a WC chip.
 */

export const NEVER_CHIP_OVERRIDE_SCOPES = ["weekday", "program", "series"] as const
export type NeverChipOverrideScope = (typeof NEVER_CHIP_OVERRIDE_SCOPES)[number]

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
  /**
   * Green RC occurrence alias for `series_customized_at IS NOT NULL`.
   * Ignored for Weekly Cover chips (do not chip from this flag alone).
   */
  is_customized?: boolean | number | string | null
  override_scope?: string | null
  flyer_image_url_override?: string | null
  /** Calendar date `YYYY-MM-DD` — used with weekday SLOT / off-pattern. */
  occurrence_date?: string | null
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

export function isNeverChipOverrideScope(scope: unknown): boolean {
  const raw = String(scope ?? "").trim().toLowerCase()
  return (NEVER_CHIP_OVERRIDE_SCOPES as readonly string[]).includes(raw)
}

/**
 * Green RC leftover after series-end: standalone Event, drop Custom.
 * Weekly Cover program nights omit `recurring_series_id` and stay Custom
 * when the one-date stamp is present.
 */
export function isDetachedSeriesLeftover(input: HostCustomNightInput): boolean {
  if (isWeeklyCoverKind(input)) return false
  if (input.recurring_series_id === undefined) return false
  return seriesIdOf(input.recurring_series_id) == null
}

/**
 * Whether this night is Custom — a later one-date edit vs that weekday's
 * SLOT — the same way the Flutter app decides the pink/green Custom chip.
 *
 * Does not chip from `is_customized` / `has_override` on Weekly Cover.
 * Pass `differsFromWeekdaySlot` / `offPatternDate` from the SLOT helper
 * in weekly-cover-nights.ts (flyer, tickets, prices, doors, title).
 * Those hints are ignored for Weekly Cover unless `slotEstablished`.
 */
export type HostCustomSlotHint = {
  differsFromWeekdaySlot?: boolean
  offPatternDate?: boolean
  /**
   * False when days_of_week is empty / missing (no weekday SLOT).
   * Series 119: 0 weekday_templates + Sat-only nights must not chip.
   * Slot hints only count when this is true.
   */
  slotEstablished?: boolean
}

export function isHostCustomNight(
  input: HostCustomNightInput,
  slot?: HostCustomSlotHint,
): boolean {
  if (isNeverChipOverrideScope(input.override_scope)) return false
  if (isDetachedSeriesLeftover(input)) return false

  if (nonemptyStamp(input.series_customized_at)) return true
  if (nonemptyStamp(input.flyer_image_url_override)) return true

  const weeklyCover = isWeeklyCoverKind(input)
  if (!weeklyCover && seriesIdOf(input.recurring_series_id) != null && truthyFlag(input.is_customized)) {
    // Green RC occurrence alias: still in a series, stamp IS NOT NULL.
    return true
  }

  // Empty SLOT / Sat-only template / fresh weekday diffs: do not chip.
  // Custom is a later one-date edit, or a game day off the weekday pattern.
  if (slot?.slotEstablished === false) return false
  if (weeklyCover && slot?.slotEstablished !== true) {
    if (slot?.offPatternDate || slot?.differsFromWeekdaySlot) return false
  }
  if (slot?.offPatternDate) return true
  if (slot?.differsFromWeekdaySlot) return true

  return false
}

/** Chip paint: pink Weekly Cover vs green named-event Custom. */
export function hostCustomChipTone(
  input: HostCustomNightInput,
  slot?: HostCustomSlotHint,
): "wc" | "event" | null {
  if (!isHostCustomNight(input, slot)) return null
  return isWeeklyCoverKind(input) ? "wc" : "event"
}

export const HOST_CUSTOM_CHIP_LABEL = "Custom"
