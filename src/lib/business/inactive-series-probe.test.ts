import test from "node:test"
import assert from "node:assert/strict"
import { probeInactiveSeriesIds } from "./inactive-series-probe.ts"

test("probeInactiveSeriesIds asks every series FK and only keeps explicit offs", async () => {
  const calls: number[] = []
  const ids = await probeInactiveSeriesIds(
    [
      { recurring_series_id: 66 },
      { recurring_series_id: 66 },
      { recurring_series_id: 23 },
      { recurring_series_id: null },
    ],
    async (id) => {
      calls.push(id)
      if (id === 66) return { series: { is_active: 0 } }
      return { series: { name: "Trivia" } }
    },
  )
  assert.deepEqual([...calls].sort((a, b) => a - b), [23, 66])
  assert.deepEqual(ids, [66])
})

test("probeInactiveSeriesIds treats 404 as unknown, not deleted", async () => {
  const ids = await probeInactiveSeriesIds([{ recurring_series_id: 23 }], async () => {
    throw new Error("404")
  })
  assert.deepEqual(ids, [])
})
