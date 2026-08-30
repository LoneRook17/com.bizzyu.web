// Fold a promo code's per-event breakdown rows into per-PROGRAM groups.
//
// The server returns one row per event the code reaches — for a venue with a
// Weekly Cover program that is every single night, which read as a wall of
// near-identical lines. Rows carrying a `recurring_series_id` fold into ONE
// group per program ("Thirsty Thursdays · Weekly Cover · 14 nights · 62 uses");
// rows without one stay as standalone one-off entries. Pure data, no React —
// modeled on groupEventRows (events-list.ts): order-preserving Map grouping,
// where a group sits where its FIRST row appeared, so the server's
// usage-descending order still ranks the list.
//
// SUM()-derived numbers may serialize as strings ("3", "25.00") — every sum
// here coerces with Number() first, same rule as the panel.

import type { PromoEventBreakdownRow } from "./types.ts"
import { WEEKLY_ACCESS_SECTION_LABEL } from "./weekly-cover-label.ts"

export interface PromoBreakdownGroup {
  /** The program's recurring_series_id, or null for a standalone one-off entry. */
  seriesId: number | null
  /** Program name — or the event's own name for a one-off. */
  label: string
  /** recurring_event_series.program_kind ('door_access', 'event', …); null for one-offs. */
  kind: string | null
  /** The rows folded into this group. A one-off entry holds exactly its own row. */
  nights: PromoEventBreakdownRow[]
  /** Paid/completed redemptions summed across `nights`. */
  uses: number
  /** Revenue summed across `nights`. */
  revenue: number
}

function rowSeriesId(row: PromoEventBreakdownRow): number | null {
  const raw = row.recurring_series_id
  if (raw == null) return null
  const id = Number(raw)
  return Number.isFinite(id) && id > 0 ? id : null
}

function oneOffLabel(row: PromoEventBreakdownRow): string {
  const name = (row.event_name ?? "").trim()
  return name || `#${row.event_id}`
}

/**
 * Order-preserving fold: one group per distinct recurring_series_id, one
 * standalone entry per series-less row. Never drops a row and never re-sorts —
 * sum(groups[].uses) === sum(rows[].redemptions) by construction, so the
 * panel's reconciliation footnote keeps meaning what it says.
 */
export function groupPromoBreakdownRows(rows: PromoEventBreakdownRow[]): PromoBreakdownGroup[] {
  const groups: PromoBreakdownGroup[] = []
  const groupIndex = new Map<number, number>()

  for (const row of rows) {
    const uses = Number(row.redemptions ?? 0) || 0
    const revenue = Number(row.revenue_generated ?? 0) || 0
    const seriesId = rowSeriesId(row)

    if (seriesId === null) {
      groups.push({
        seriesId: null,
        label: oneOffLabel(row),
        kind: null,
        nights: [row],
        uses,
        revenue,
      })
      continue
    }

    const existing = groupIndex.get(seriesId)
    if (existing != null) {
      const group = groups[existing]
      group.nights.push(row)
      group.uses += uses
      group.revenue += revenue
      // First non-empty name wins; fill in if the first row lacked one.
      if (group.label === `Series ${seriesId}`) {
        const name = (row.series_name ?? "").trim()
        if (name) group.label = name
      }
      if (group.kind === null && row.program_kind != null) group.kind = row.program_kind
      continue
    }

    groupIndex.set(seriesId, groups.length)
    groups.push({
      seriesId,
      label: (row.series_name ?? "").trim() || `Series ${seriesId}`,
      kind: row.program_kind ?? null,
      nights: [row],
      uses,
      revenue,
    })
  }

  return groups
}

/**
 * Display label for a group's program kind on the breakdown line.
 * 'door_access' is a Weekly Cover program; anything else with a series id is a
 * named recurring event. One-offs (kind null) show no kind label.
 */
export function promoBreakdownKindLabel(kind: string | null): string | null {
  if (kind === null) return null
  return kind === "door_access" || kind === "weekly_cover"
    ? WEEKLY_ACCESS_SECTION_LABEL
    : "Recurring event"
}
