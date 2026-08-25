/**
 * Web checkout fail-closed for a host-ended Weekly Cover series.
 *
 * Guest app lists omit those nights because the series is inactive. Web
 * /checkout/:id and /event/:id → Laravel still sold them from leftover
 * published stamps. Direct URL must not sell cover or Skip the Line.
 *
 * Pure — `node --test` can load this without the `@/` alias.
 */

import { isDoorAccessKind, isWeeklyCoverProduct } from "../business/door-access.ts"
import {
  readSeriesActiveFromPublicEvent,
  weeklyCoverWebSaleOpen,
} from "../business/weekly-cover-visibility.ts"

export function eventRecordFromPayload(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== "object") return null
  const row = payload as Record<string, unknown>
  if (row.event && typeof row.event === "object") return row.event as Record<string, unknown>
  return row
}

export function publicEventIdsFromPayloads(...groups: unknown[]): Set<number> {
  const ids = new Set<number>()
  for (const group of groups) {
    const rows = Array.isArray(group)
      ? group
      : group && typeof group === "object" && Array.isArray((group as { events?: unknown }).events)
        ? (group as { events: unknown[] }).events
        : []
    for (const row of rows) {
      if (!row || typeof row !== "object") continue
      const id = Number((row as { event_id?: unknown }).event_id)
      if (Number.isFinite(id) && id > 0) ids.add(id)
    }
  }
  return ids
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) return null
  return res.json()
}

/** Venue-scoped published lists — the same catalogs the guest app hides ended WC from. */
export async function loadVenuePublicEventIdSet(
  apiBase: string,
  venueId: number | string | null | undefined,
): Promise<Set<number> | null> {
  if (venueId == null || venueId === "") return null
  try {
    const base = apiBase.replace(/\/$/, "")
    const [catalog, venue] = await Promise.all([
      fetchJson(`${base}/ui/events`),
      fetchJson(`${base}/ui/venues/venue/${venueId}`),
    ])
    const catalogRows = Array.isArray(catalog) ? catalog : []
    const forVenue = catalogRows.filter((row) => {
      if (!row || typeof row !== "object") return false
      return Number((row as { venue_id?: unknown }).venue_id) === Number(venueId)
    })
    return publicEventIdsFromPayloads(venue, forVenue)
  } catch {
    return null
  }
}

/** Event row or nested series/program stamp. Never the night's name. */
export function isWeeklyCoverPublicPayload(payload: unknown): boolean {
  const event = eventRecordFromPayload(payload)
  if (!event) return false
  if (isWeeklyCoverProduct(event)) return true
  const row = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null
  for (const nestKey of ["series", "recurring_series", "program"] as const) {
    const nest = event[nestKey] ?? row?.[nestKey]
    if (!nest || typeof nest !== "object") continue
    const nested = nest as Record<string, unknown>
    if (isWeeklyCoverProduct(nested)) return true
    if (isDoorAccessKind(nested.program_kind) || isDoorAccessKind(nested.access_kind)) return true
  }
  return false
}

export function weeklyCoverSaleOpenForPayloads(args: {
  checkoutPayload?: unknown
  uiPayload?: unknown
  publicListIds?: Set<number> | null
}): boolean {
  const checkoutEvent = eventRecordFromPayload(args.checkoutPayload)
  const uiEvent = eventRecordFromPayload(args.uiPayload)
  const event = checkoutEvent ?? uiEvent
  if (!event) return true
  const isWeeklyCover =
    isWeeklyCoverPublicPayload(args.checkoutPayload) ||
    isWeeklyCoverPublicPayload(args.uiPayload) ||
    isWeeklyCoverProduct(event) ||
    (uiEvent != null && isWeeklyCoverProduct(uiEvent))
  const seriesActive =
    readSeriesActiveFromPublicEvent(args.checkoutPayload) ??
    readSeriesActiveFromPublicEvent(args.uiPayload)
  const eventId = Number(event.event_id)
  const listedOnPublicCatalog =
    args.publicListIds != null && Number.isFinite(eventId) && eventId > 0
      ? args.publicListIds.has(eventId)
      : null
  return weeklyCoverWebSaleOpen({
    isWeeklyCover,
    seriesActive,
    listedOnPublicCatalog,
  })
}
