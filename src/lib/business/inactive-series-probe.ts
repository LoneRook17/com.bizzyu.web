/**
 * Resolve is_active for every recurring_series_id on a dash page.
 *
 * Skipping ids that were merely "known" on a list left series 66 live when
 * the list omitted the flag or nights were not WC-stamped. A 404 / omitted
 * flag stays unknown (series-23 fallback), never inferred.
 *
 * Pure fetch-injection so `node --test` can load this without api-client.
 */

import { recurringSeriesIdsOnEvents } from "./events-list.ts"
import { seriesActiveFromRecurringResponse } from "./weekly-cover-visibility.ts"

export async function probeInactiveSeriesIds(
  events: readonly { recurring_series_id?: number | string | null }[],
  fetchSeries: (id: number) => Promise<unknown>,
): Promise<number[]> {
  const ids = recurringSeriesIdsOnEvents(events)
  if (ids.length === 0) return []
  const rows = await Promise.all(
    ids.map((id) =>
      fetchSeries(id)
        .then((data) => (seriesActiveFromRecurringResponse(data) === false ? id : null))
        .catch(() => null),
    ),
  )
  return [...new Set(rows.filter((id): id is number => id != null))]
}
