import { test } from "node:test"
import assert from "node:assert/strict"
import {
  clockFace,
  durationLabel,
  fmtFieldDate,
  parseClockEntry,
  sundayMonthCells,
  withPeriod,
} from "./clock-entry.ts"

test("clockFace shows a 24h value as typed-12h text plus a period", () => {
  assert.deepEqual(clockFace("19:00"), { text: "07:00", period: "PM" })
  assert.deepEqual(clockFace("00:30"), { text: "12:30", period: "AM" })
  assert.deepEqual(clockFace("12:15"), { text: "12:15", period: "PM" })
  assert.equal(clockFace(""), null)
  assert.equal(clockFace("25:00"), null)
})

test("parseClockEntry reads what a host types, with the selected period", () => {
  assert.deepEqual(parseClockEntry("7", "PM"), { value: "19:00", period: "PM" })
  assert.deepEqual(parseClockEntry("07:00", "PM"), { value: "19:00", period: "PM" })
  assert.deepEqual(parseClockEntry("730", "PM"), { value: "19:30", period: "PM" })
  assert.deepEqual(parseClockEntry("0130", "AM"), { value: "01:30", period: "AM" })
  assert.deepEqual(parseClockEntry("12:00", "AM"), { value: "00:00", period: "AM" }, "12 AM is midnight")
  assert.deepEqual(parseClockEntry("12", "PM"), { value: "12:00", period: "PM" }, "12 PM is noon")
})

test("parseClockEntry takes 24-hour text and lets the clock set the period", () => {
  assert.deepEqual(parseClockEntry("19:30", "AM"), { value: "19:30", period: "PM" })
  assert.deepEqual(parseClockEntry("0:15", "PM"), { value: "00:15", period: "AM" })
})

test("parseClockEntry rejects junk instead of guessing", () => {
  assert.equal(parseClockEntry("", "PM"), null)
  assert.equal(parseClockEntry("7:6", "PM"), null)
  assert.equal(parseClockEntry("7:75", "PM"), null)
  assert.equal(parseClockEntry("24:00", "PM"), null)
  assert.equal(parseClockEntry("7pm", "PM"), null)
})

test("withPeriod flips the half of the day and keeps the clock", () => {
  assert.equal(withPeriod("07:00", "PM"), "19:00")
  assert.equal(withPeriod("19:00", "AM"), "07:00")
  assert.equal(withPeriod("12:30", "AM"), "00:30")
  assert.equal(withPeriod("", "PM"), "")
})

test("durationLabel names the length of the night", () => {
  assert.equal(durationLabel("2026-10-30T19:00", "2026-10-31T01:00"), "6 hours")
  assert.equal(durationLabel("2026-10-30T21:00", "2026-10-31T01:30"), "4 hours 30 min")
  assert.equal(durationLabel("2026-10-30T21:00", "2026-10-30T21:45"), "45 min")
  assert.equal(durationLabel("2026-10-30T21:00", "2026-10-30T22:00"), "1 hour")
  assert.equal(durationLabel("2026-10-30T21:00", "2026-10-30T20:00"), "")
  assert.equal(durationLabel("", "2026-10-30T20:00"), "")
})

test("fmtFieldDate and the Sunday-first grid read calendar dates", () => {
  assert.equal(fmtFieldDate("2026-10-30"), "Fri, Oct 30, 2026")
  assert.equal(fmtFieldDate("nope"), "")
  const oct = sundayMonthCells(2026, 9)
  assert.equal(oct.slice(0, 4).every((c) => c === null), true, "Oct 1 2026 is a Thursday")
  assert.equal(oct[4], "2026-10-01")
  assert.equal(oct.at(-1), "2026-10-31")
})
