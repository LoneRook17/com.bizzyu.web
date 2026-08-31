import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import {
  CLOCK_HOURS_12,
  CLOCK_MINUTES_15,
  clock12hSlots,
  formatClock12h,
  formatDateUs,
  isIsoDateString,
  isIsoTimeString,
  joinClock12hParts,
  joinDateTimeLocal,
  monthCells,
  parseClock12h,
  parseDateTimeLocal,
  parseDateUs,
  shiftMonth,
  snapMinute15,
  splitClock12hParts,
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

test("date display is American month-day-year, not ISO or day-first", () => {
  assert.equal(formatDateUs("2026-08-27"), "8/27/2026")
  assert.equal(formatDateUs("2026-01-05"), "1/5/2026")
  assert.equal(formatDateUs(""), "")
  assert.equal(parseDateUs("8/27/2026"), "2026-08-27")
  assert.equal(parseDateUs("5/6/2026"), "2026-05-06", "ambiguous numeric is month-first")
  assert.equal(parseDateUs("08/27/26"), "2026-08-27")
  assert.equal(parseDateUs("8-27-2026"), "2026-08-27")
  assert.equal(parseDateUs("Aug 27, 2026"), "2026-08-27")
  assert.equal(parseDateUs("August 27 2026"), "2026-08-27")
  assert.equal(parseDateUs("2026-08-27"), "2026-08-27")
  assert.equal(parseDateUs("27/8/2026"), null, "day-first numeric is rejected")
  assert.equal(parseDateUs("27 Aug 2026"), null, "day-first month name is rejected")
  assert.equal(parseDateUs("2/30/2026"), null)
})

test("clock 12-hour format and parse do not show 24-hour blobs", () => {
  assert.equal(formatClock12h("19:52"), "7:52 PM")
  assert.equal(formatClock12h("07:52"), "7:52 AM")
  assert.equal(formatClock12h("00:00"), "12:00 AM")
  assert.equal(formatClock12h("12:00"), "12:00 PM")
  assert.equal(formatClock12h("19:52:00"), "7:52 PM")
  assert.equal(parseClock12h("7:52 PM"), "19:52")
  assert.equal(parseClock12h("7:52PM"), "19:52")
  assert.equal(parseClock12h("7 pm"), "19:00")
  assert.equal(parseClock12h("12:00 AM"), "00:00")
  assert.equal(parseClock12h("12:00 PM"), "12:00")
  assert.equal(parseClock12h("19:52"), "19:52")
  assert.equal(parseClock12h("not-a-time"), null)
  assert.equal(clock12hSlots().length, 96)
  assert.equal(clock12hSlots()[0], "00:00")
  assert.equal(clock12hSlots()[78], "19:30")
})

test("clock wheels are hour + 15-minute + AM/PM, not a 96-slot list", () => {
  assert.deepEqual(splitClock12hParts("19:00"), { hour12: 7, minute: 0, period: "PM" })
  assert.deepEqual(splitClock12hParts("00:15"), { hour12: 12, minute: 15, period: "AM" })
  assert.deepEqual(splitClock12hParts("12:45"), { hour12: 12, minute: 45, period: "PM" })
  assert.equal(joinClock12hParts(7, 0, "PM"), "19:00")
  assert.equal(joinClock12hParts(12, 15, "AM"), "00:15")
  assert.equal(joinClock12hParts(12, 0, "PM"), "12:00")
  assert.equal(snapMinute15(7), 0)
  assert.equal(snapMinute15(8), 15)
  assert.equal(snapMinute15(52), 45)
  assert.equal(CLOCK_HOURS_12.length, 12)
  assert.deepEqual([...CLOCK_MINUTES_15], [0, 15, 30, 45])
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
  const dateFn = widget.slice(widget.indexOf("export function DateField"), widget.indexOf("function TimeWheels"))
  const timeFn = widget.slice(widget.indexOf("export function TimeField"))
  assert.ok(datetimeFn.includes("<DateField"), "combined control is the existing date widget")
  assert.ok(datetimeFn.includes("<TimeField"), "combined control is the existing time widget")
  assert.ok(!datetimeFn.includes("YYYY-MM-DDTHH:MM"), "host never sees a datetime-local placeholder")
  assert.ok(!widget.includes("datetime-local"), "typed+picker widgets, not native datetime-local")
  assert.ok(!dateFn.includes('placeholder="YYYY-MM-DD"'), "date field is not ISO")
  assert.ok(dateFn.includes("8/27/2026"), "date field is American month-day-year")
  assert.ok(dateFn.includes("formatDateUs"), "date field displays M/D/YYYY")
  assert.ok(dateFn.includes("parseDateUs"), "date field accepts American typed dates")
  assert.ok(!timeFn.includes('type="time"'), "time picker is not a native 12-hour input")
  assert.ok(timeFn.includes("7:00 PM"), "time field is 12-hour")
  assert.ok(!timeFn.includes("HH:MM"), "time field does not show a 24-hour placeholder")
  assert.ok(widget.includes("TimeWheels"), "clock button opens hour + minute + AM/PM wheels")
  assert.ok(widget.includes("CLOCK_HOURS_12"), "hour wheel is 1-12")
  assert.ok(widget.includes("CLOCK_MINUTES_15"), "minute wheel snaps to 15 minutes")
  assert.ok(!widget.includes("clock12hSlots"), "picker is not a 96-row 15-minute dump")
  // The default prop keeps 7:00 PM as the standing hint; callers may swap in
  // another 12-hour example ("2:00 AM" on event Ends) without losing it.
  assert.ok(timeFn.includes("placeholder = \"7:00 PM\""), "typed 12-hour input stays")

  assert.ok(eventForm.includes("DateTimeField"), "green event create/edit still uses the shared control")
  assert.ok(!eventForm.includes("YYYY-MM-DDTHH:MM"), "event form does not show an ISO T string")
  assert.ok(!eventForm.includes("datetime-local"))
  assert.ok(eventForm.includes("showTemplatePicker={isEditing}"), "one-off create hides the flyer template picker")
  assert.ok(!eventForm.includes("No flyer? Pick a template."), "event form itself does not mount the create picker copy")
  assert.ok(!eventForm.includes("we use Classic"), "create copy must not promise Classic")
  assert.ok(eventForm.includes("venue photo"), "create empty-state is the venue photo")

  const artwork = readFileSync(
    fileURLToPath(new URL("../../components/business/v2/events/ArtworkSection.tsx", import.meta.url)),
    "utf8",
  )
  assert.ok(artwork.includes("showTemplatePicker"), "template cards are gated, not removed from edit")
  assert.ok(artwork.includes('showTemplatePicker = false'), "create default is no template picker")
  assert.ok(!artwork.includes("we use Classic"), "artwork empty-state is not Classic")
  assert.ok(artwork.includes("venuePhotoUrl"), "empty-state preview is the venue photo")

  assert.ok(scanWindow.includes("DateTimeField"), "ticket scan windows use the same split widgets")
  assert.ok(!scanWindow.includes("YYYY-MM-DDTHH:MM"))
  assert.ok(!scanWindow.includes("datetime-local"))

  assert.ok(wcEditor.includes("TimeField"), "WC hours stay a time widget")
  assert.ok(!wcEditor.includes("DateTimeField"), "WC nights do not use a combined datetime")
  assert.ok(!wcEditor.includes("DateField"), "WC hours show no date field")
  assert.ok(!wcEditor.includes("YYYY-MM-DDTHH:MM"))
  assert.ok(!wcEditor.includes("datetime-local"))
  assert.ok(!wcEditor.includes('type="time"'), "WC hours do not mount a native time wheel")
})
