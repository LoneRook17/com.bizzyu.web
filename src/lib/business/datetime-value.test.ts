import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import {
  isIsoDateString,
  isIsoTimeString,
  joinDateTimeLocal,
  monthCells,
  parseDateTimeLocal,
  shiftMonth,
  splitDateTimeLocal,
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

test("splitDateTimeLocal is the host-facing date + time pair", () => {
  assert.deepEqual(splitDateTimeLocal("2026-08-29T21:00"), { date: "2026-08-29", time: "21:00" })
  assert.deepEqual(splitDateTimeLocal("2026-08-29"), { date: "2026-08-29", time: "" })
  assert.deepEqual(splitDateTimeLocal("21:00"), { date: "", time: "21:00" })
  assert.deepEqual(splitDateTimeLocal("T21:00"), { date: "", time: "21:00" })
  assert.deepEqual(splitDateTimeLocal(""), { date: "", time: "" })
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

test("dash create/edit Starts and Ends are DateField + TimeField, not an ISO blob", () => {
  const widget = readFileSync(
    fileURLToPath(new URL("../../components/business/v2/ui/date-time-field.tsx", import.meta.url)),
    "utf8",
  )
  const eventForm = readFileSync(
    fileURLToPath(new URL("../../components/business/v2/events/EventForm.tsx", import.meta.url)),
    "utf8",
  )
  const scanWindow = readFileSync(
    fileURLToPath(new URL("../../components/business/v2/events/ScanWindowSection.tsx", import.meta.url)),
    "utf8",
  )
  const wcEditor = readFileSync(
    fileURLToPath(new URL("../../components/business/v2/door-access/NightEditorDialog.tsx", import.meta.url)),
    "utf8",
  )

  const datetimeFn = widget.slice(widget.indexOf("export function DateTimeField"))
  assert.ok(datetimeFn.includes("<DateField"), "combined control is the existing date widget")
  assert.ok(datetimeFn.includes("<TimeField"), "combined control is the existing time widget")
  assert.ok(!datetimeFn.includes("YYYY-MM-DDTHH:MM"), "host never sees a datetime-local placeholder")
  assert.ok(!widget.includes("datetime-local"), "typed+picker widgets, not native datetime-local")

  assert.ok(eventForm.includes("DateTimeField"), "green event create/edit still uses the shared control")
  assert.ok(!eventForm.includes("YYYY-MM-DDTHH:MM"), "event form does not show an ISO T string")
  assert.ok(!eventForm.includes("datetime-local"))

  assert.ok(scanWindow.includes("DateTimeField"), "ticket scan windows use the same split widgets")
  assert.ok(!scanWindow.includes("YYYY-MM-DDTHH:MM"))
  assert.ok(!scanWindow.includes("datetime-local"))

  assert.ok(wcEditor.includes("TimeField"), "WC hours stay a time widget")
  assert.ok(!wcEditor.includes("DateTimeField"), "WC nights do not use a combined datetime")
  assert.ok(!wcEditor.includes("YYYY-MM-DDTHH:MM"))
  assert.ok(!wcEditor.includes("datetime-local"))
})
