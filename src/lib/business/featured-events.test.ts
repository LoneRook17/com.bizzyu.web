import test from "node:test"
import assert from "node:assert/strict"
import { moveRow, pinnable, rowStatus, whenLabel, type FeaturedEventRow } from "./featured-events.ts"

const ev = (id: number, start: string | null = "2026-10-20 21:00:00") => ({
  event_id: id,
  name: `E${id}`,
  start_date_time: start,
  end_date_time: null,
})

test("moveRow moves within bounds and clamps", () => {
  assert.deepEqual(moveRow([1, 2, 3, 4], 2, 0), [3, 1, 2, 4])
  assert.deepEqual(moveRow([1, 2, 3, 4], 0, 3), [2, 3, 4, 1])
  assert.deepEqual(moveRow([1, 2, 3], 0, -5), [1, 2, 3])
  assert.deepEqual(moveRow([1, 2, 3], 2, 99), [1, 2, 3])
  assert.deepEqual(moveRow([1, 2, 3], 7, 0), [1, 2, 3])
})

test("pinnable drops pinned ids and sorts by start", () => {
  const out = pinnable([ev(3, "2026-10-22 21:00:00"), ev(1, "2026-10-20 21:00:00"), ev(2, null)], [1])
  assert.deepEqual(out.map((e) => e.event_id), [2, 3])
})

test("rowStatus", () => {
  const base: FeaturedEventRow = { id: 1, event_id: 9, sort_order: 0, is_active: true, live: true, event: ev(9) }
  assert.equal(rowStatus(base), "live")
  assert.equal(rowStatus({ ...base, is_active: false }), "hidden")
  assert.equal(rowStatus({ ...base, live: false }), "not live")
  assert.equal(rowStatus({ ...base, event: null }), "missing")
})

test("whenLabel renders naive wall-clock without timezone shifting", () => {
  assert.match(whenLabel("2026-10-06 21:00:00"), /Tue, Oct 6 · 9:00 PM/)
  assert.match(whenLabel("2026-10-07T00:30:00"), /Wed, Oct 7 · 12:30 AM/)
  assert.equal(whenLabel(null), "—")
})
