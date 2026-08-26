// P5: venue promo page Series block.
//
// GET /business/venues/:venueId/promo-codes stays Universal (venue-wide).
// Sibling GET /business/venues/:venueId/promo-codes/series is grouped by
// series: Weekly Cover (product_kind=weekly_cover) and named recurring
// events (product_kind=event). If that sibling is not live yet, the UI
// still mounts the section and renders empty.

import type { PromoCode, VenueSeriesPromoGroup } from "./types.ts"
import {
  EVENT_ACCENT,
  EVENT_TYPE_LABEL,
  ACCESS_ACCENT,
  WEEKLY_ACCESS_SECTION_LABEL,
  WEEKLY_ACCESS_TYPE_LABEL,
  isWeeklyCoverProduct,
} from "./door-access.ts"

export const SERIES_SECTION_TITLE = "Series codes"

export const SERIES_SECTION_DESCRIPTION =
  "These codes apply to every night of that Weekly Cover or named recurring event, not the whole venue."

export const SERIES_SECTION_EMPTY_TITLE = "No series codes yet"

export const SERIES_SECTION_EMPTY_DESCRIPTION =
  "When a Weekly Cover or named recurring event has its own codes, they show up here. They never mix into the Universal list above."

/** 400/404/405: sibling not registered, or Express ate "series" as :promoId. */
export function isMissingSeriesPromoEndpoint(status: number): boolean {
  return status === 400 || status === 404 || status === 405
}

export function seriesPromoListPath(venueId: number): string {
  return `/business/venues/${venueId}/promo-codes/series`
}

/**
 * Per-series REST root. Same shape as Universal
 * (`GET|POST {basePath}`, `GET {basePath}/{id}/breakdown`). Door Access
 * already serves WC series this way; named RC uses the same contract so
 * the panel does not fall back onto the venue-wide path.
 */
export function seriesPromoBasePath(seriesId: number): string {
  return `/business/door-access/${seriesId}/promo-codes`
}

export function seriesPromoManageHref(productKind: VenueSeriesPromoGroup["product_kind"], seriesId: number): string {
  return productKind === "weekly_cover"
    ? `/business/door-access/${seriesId}`
    : `/business/recurring/${seriesId}`
}

export function seriesKindChip(productKind: VenueSeriesPromoGroup["product_kind"]): {
  kind: "access" | "event"
  label: string
  ink: string
} {
  if (productKind === "weekly_cover") {
    return { kind: "access", label: WEEKLY_ACCESS_TYPE_LABEL, ink: ACCESS_ACCENT }
  }
  return { kind: "event", label: EVENT_TYPE_LABEL, ink: EVENT_ACCENT }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function readSeriesId(row: Record<string, unknown>): number | null {
  const raw = row.id ?? row.recurring_series_id ?? row.series_id
  const id = Number(raw)
  if (!Number.isFinite(id) || id <= 0) return null
  return id
}

function readProductKind(row: Record<string, unknown>): VenueSeriesPromoGroup["product_kind"] {
  if (isWeeklyCoverProduct({
    product_kind: typeof row.product_kind === "string" ? row.product_kind : null,
    access_kind: typeof row.access_kind === "string" ? row.access_kind : null,
  })) {
    return "weekly_cover"
  }
  if (row.product_kind === "event" || row.program_kind === "event") return "event"
  // Named RC: program_kind door_access is WC; anything else with a series
  // id on this payload is a green recurring event.
  if (row.program_kind === "door_access") return "weekly_cover"
  return "event"
}

function readCodes(row: Record<string, unknown>): PromoCode[] {
  const raw = row.promo_codes ?? row.codes
  return Array.isArray(raw) ? (raw as PromoCode[]) : []
}

function parseGroup(value: unknown): VenueSeriesPromoGroup | null {
  const row = asRecord(value)
  if (!row) return null
  const id = readSeriesId(row)
  if (id == null) return null
  const productKind = readProductKind(row)
  const rawName = String(row.name ?? row.series_name ?? "").trim()
  const name = rawName || (productKind === "weekly_cover" ? WEEKLY_ACCESS_SECTION_LABEL : `Series ${id}`)
  return {
    id,
    name,
    product_kind: productKind,
    promo_codes: readCodes(row),
  }
}

/**
 * Normalize the sibling payload. Accepts `{ series }`, `{ groups }`,
 * `{ promo_code_series }`, or a bare array. Anything else (including a
 * breakdown 400 body) is [].
 */
export function parseVenueSeriesPromoResponse(data: unknown): VenueSeriesPromoGroup[] {
  const rec = asRecord(data)
  const raw = Array.isArray(data)
    ? data
    : rec
      ? rec.series ?? rec.groups ?? rec.promo_code_series
      : null
  if (!Array.isArray(raw)) return []
  return raw.flatMap((row) => {
    const group = parseGroup(row)
    return group ? [group] : []
  })
}
