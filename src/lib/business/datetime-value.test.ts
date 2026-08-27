import { test } from "node:test"
import assert from "node:assert/strict"
import {
  isIsoDateString,
  isIsoTimeString,
  joinDateTimeLocal,
  monthCells,
  parseDateTimeLocal,
  shiftMonth,
} from "./datetime-value.ts"

test("datetime-local splits without Date() timezone skew", () => {
  assert.deepEqual(parseDateTimeLocal("2026-08-29T21:00"), { date: "2026-08-29", time: "21:00" })
  assert.deepEqual(parseDateTimeLocal("2026-08-29 21:00:00"), { date: "2026-08-29", time: "21:00" })
  assert.equal(parseDateTimeLocal("not-a-date"), null)
})

test("joinDateTimeLocal rebuilds the event-form value", () => {
  assert.equal(joinDateTimeLocal("2026-08-29", "21:00"), "2026-08-29T21:00")
  assert.equal(joinDateTimeLocal("2026-08-29", ""), "2026-08-29T00:00")
})

test("iso date/time guards reject junk", () => {
  assert.equal(isIsoDateString("2026-08-29"), true)
  assert.equal(isIsoDateString("2026-02-31"), false)
  assert.equal(isIsoTimeString("02:00"), true)
  assert.equal(isIsoTimeString("25:00"), false)
})

test("month grid is Monday-first and has no UTC midnight shift", () => {
  // 2026-08-01 is Saturday → 5 leading blanks in a Monday-first grid.
  const cells = monthCells(2026, 7)
  assert.equal(cells[0], null)
  assert.equal(cells[5], "2026-08-01")
  assert.ok(cells.includes("2026-08-29"))
})

test("shiftMonth walks year boundaries", () => {
  assert.deepEqual(shiftMonth(2026, 0, -1), { year: 2025, monthIndex: 11 })
  assert.deepEqual(shiftMonth(2026, 11, 1), { year: 2027, monthIndex: 0 })
})
