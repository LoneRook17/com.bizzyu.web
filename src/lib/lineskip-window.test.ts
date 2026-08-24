// Round 2, Part 2. The /ls/[uuid] redemption window.
//
// The bug these lock down: the page printed instance_start_time (doors) under a
// "Redemption opens at" label, so on a 9:00 PM night it claimed check-in opened
// at 9:00 PM when it had actually opened at 6:00 PM. Same mislabel class the
// guest check-in page was fixed for.

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import {
  lineSkipWindowState,
  lineSkipWindowNotice,
  lineSkipWindowStamps,
  LINE_SKIP_OPENS_HOURS_BEFORE_DOORS,
} from "./lineskip-window.ts"

/** A 9 PM to 2 AM night on 2026-08-29. */
const night = {
  instance_date: "2026-08-29",
  instance_start_time: "21:00:00",
  instance_end_time: "02:00:00",
}

/** Build a real instant that reads as the given Eastern wall clock. */
function easternAt(iso: string): Date {
  // 2026-08-29 is EDT (UTC-4).
  return new Date(`${iso}-04:00`)
}

test("redemption opens three hours before doors, not at doors", () => {
  const { doors, opens } = lineSkipWindowStamps(night)
  assert.equal(doors, "2026-08-29 21:00:00")
  assert.equal(opens, "2026-08-29 18:00:00")
  assert.equal(LINE_SKIP_OPENS_HOURS_BEFORE_DOORS, 3)
})

test("an overnight end rolls to the next day", () => {
  const { closes } = lineSkipWindowStamps(night)
  assert.equal(closes, "2026-08-30 02:00:00")
})

test("more than three hours before doors is not_open", () => {
  assert.equal(lineSkipWindowState(night, easternAt("2026-08-29T17:59:00")), "not_open")
})

test("exactly at the open boundary is open", () => {
  assert.equal(lineSkipWindowState(night, easternAt("2026-08-29T18:00:00")), "open")
})

test("during the night is open", () => {
  assert.equal(lineSkipWindowState(night, easternAt("2026-08-29T23:30:00")), "open")
})

test("after the overnight close is closed", () => {
  assert.equal(lineSkipWindowState(night, easternAt("2026-08-30T02:00:01")), "closed")
})

test("the not_open notice names the real check-in time, never doors as the opener", () => {
  const notice = lineSkipWindowNotice(night, easternAt("2026-08-29T15:00:00"))
  assert.ok(notice)
  assert.match(notice.detail, /Check-in opens at 6:00 PM/)
  // The regression: 9:00 PM must never be presented as the check-in time.
  assert.doesNotMatch(notice.detail, /Check-in opens at 9:00 PM/)
  // Doors may still be quoted, but only as doors.
  assert.match(notice.detail, /Doors are at 9:00 PM/)
})

test("the closed notice names the real close time", () => {
  const notice = lineSkipWindowNotice(night, easternAt("2026-08-30T05:00:00"))
  assert.ok(notice)
  assert.match(notice.detail, /Check-in closed at 2:00 AM/)
})

test("an open window produces no notice", () => {
  assert.equal(lineSkipWindowNotice(night, easternAt("2026-08-29T22:00:00")), null)
})

test("unparseable input degrades to open, never to a disabled button", () => {
  assert.equal(lineSkipWindowState({}), "unknown")
  assert.equal(lineSkipWindowNotice({}), null)
  assert.equal(
    lineSkipWindowState({ instance_date: "nope", instance_start_time: "", instance_end_time: "" }),
    "unknown",
  )
})

test("a viewer outside Eastern gets the same answer as one inside it", () => {
  // The old code compared an Eastern `now` against a start parsed in the
  // VIEWER's zone, so this is exactly what used to break.
  const instant = easternAt("2026-08-29T17:00:00")
  assert.equal(lineSkipWindowState(night, instant), "not_open")
  const during = easternAt("2026-08-29T22:00:00")
  assert.equal(lineSkipWindowState(night, during), "open")
})

test("the client gates the confirm button on the window, not just on redeeming", () => {
  const client = readFileSync(
    join(import.meta.dirname, "../app/ls/[uuid]/LineSkipScanClient.tsx"),
    "utf8",
  )
  assert.match(client, /disabled=\{redeeming \|\| outsideWindow\}/)
  // And the old mislabel must not come back.
  assert.doesNotMatch(client, /Redemption opens at \{formatTime\(ticket\.instance_start_time\)\}/)
})
