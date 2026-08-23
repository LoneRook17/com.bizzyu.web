import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import {
  checkinTransportRefusal,
  resolveCheckinRefusal,
  CHECKIN_SUCCESS_STATUS,
} from "./checkin-refusal.ts"

const SRC = join(process.cwd(), "src")

test("a redeemed pass is not a refusal", () => {
  assert.equal(resolveCheckinRefusal({ status: CHECKIN_SUCCESS_STATUS }), null)
})

test("server copy wins, so wording can be fixed by deploying the API alone", () => {
  const refusal = resolveCheckinRefusal({
    status: "already_redeemed",
    reason_code: "checked_in_already",
    reason: {
      code: "checked_in_already",
      headline: "Already checked in at 11:42 PM",
      guidance: "Scanned by Sam. One entry per pass.",
    },
  })
  assert.equal(refusal?.code, "checked_in_already")
  assert.equal(refusal?.headline, "Already checked in at 11:42 PM")
  assert.equal(refusal?.guidance, "Scanned by Sam. One entry per pass.")
})

test("a half-built server reason falls back rather than rendering a blank line", () => {
  // headline without guidance is worse than the local copy: the door gets the
  // what and never the what-next.
  const refusal = resolveCheckinRefusal({
    status: "refunded",
    reason: { code: "pass_refunded", headline: "This pass was refunded" },
  })
  assert.equal(refusal?.code, "pass_refunded")
  assert.ok((refusal?.guidance.length ?? 0) > 0)
})

test("an older API with no reason still names the time of the first check-in", () => {
  const now = new Date()
  now.setHours(23, 42, 0, 0)
  const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")} 23:42:00`

  const refusal = resolveCheckinRefusal({
    status: "already_redeemed",
    ticket: { redeemed_at: stamp },
  })
  assert.equal(refusal?.code, "checked_in_already")
  assert.match(refusal?.headline ?? "", /Already checked in at .*11:42/)
})

test("a check-in from an earlier night carries the date, not just a bare time", () => {
  const refusal = resolveCheckinRefusal({
    status: "already_redeemed",
    ticket: { redeemed_at: "2026-08-15 23:42:00" },
  })
  assert.match(refusal?.headline ?? "", /Aug 15/)
})

test("the two sides of the scan window never render as the same sentence", () => {
  const early = resolveCheckinRefusal({
    status: "event_not_active",
    window_side: "not_open",
    window_opens_at: "2026-08-29 22:00:00",
  })
  const late = resolveCheckinRefusal({
    status: "event_not_active",
    window_side: "closed",
    window_closes_at: "2026-08-30 02:00:00",
  })

  assert.equal(early?.code, "scan_window_not_open")
  assert.equal(late?.code, "scan_window_closed")
  assert.notEqual(early?.headline, late?.headline)
  assert.match(early?.headline ?? "", /Doors open at .*10:00/)
  assert.match(late?.headline ?? "", /closed at .*2:00/)
})

test("an old server that sends no window side says the honest ambiguous thing", () => {
  // It must NOT guess "doors open at" when the guest may in fact be hours
  // late. A wrong specific instruction is worse than a vague true one.
  const refusal = resolveCheckinRefusal({
    status: "event_not_active",
    event_start: "2026-08-29 22:00:00",
  })
  assert.equal(refusal?.code, "scan_window_unknown")
  assert.ok(!/Doors open at/.test(refusal?.headline ?? ""))
})

test("scheduled tier bounds read as two different refusals", () => {
  const early = resolveCheckinRefusal({
    status: "ticket_not_yet_valid",
    valid_from: "2026-08-29 22:00:00",
  })
  const over = resolveCheckinRefusal({
    status: "ticket_window_closed",
    valid_until: "2026-08-30 01:00:00",
  })
  assert.equal(early?.code, "pass_not_yet_valid")
  assert.equal(over?.code, "pass_expired")
  assert.notEqual(early?.headline, over?.headline)
})

test("a failure we cannot explain never calls the pass invalid", () => {
  const unknown = resolveCheckinRefusal({}, { httpStatus: 500 })
  assert.equal(unknown?.code, "server_error")
  assert.ok(!/invalid/i.test(unknown?.headline ?? ""))
  assert.ok(!/invalid/i.test(unknown?.guidance ?? ""))

  const dropped = checkinTransportRefusal()
  assert.equal(dropped.code, "connection_failed")
  assert.ok(!/invalid/i.test(dropped.headline))
  // The pass is untouched when the request never landed, and staff need to
  // know that before they decide whether to re-scan.
  assert.match(dropped.guidance, /not used up/i)
})

test("a door-side 403 blames the door, not the guest", () => {
  const refusal = resolveCheckinRefusal({ error: "This door code is for another event" }, { httpStatus: 403 })
  assert.equal(refusal?.code, "not_permitted")
  assert.match(refusal?.guidance ?? "", /pass is fine/i)
})

test("every refusal carries both lines, and neither leaks internals", () => {
  const payloads = [
    { status: "already_redeemed" },
    { status: "refunded" },
    { status: "event_cancelled" },
    { status: "ticket_belongs_to_another_event" },
    { status: "event_not_active", window_side: "not_open" },
    { status: "event_not_active", window_side: "closed" },
    { status: "event_not_active" },
    { status: "ticket_not_yet_valid" },
    { status: "ticket_window_closed" },
    { status: "wrong_redemption_surface" },
    { status: "invalid" },
    {},
  ]

  const codes = new Set<string>()
  for (const payload of payloads) {
    const refusal = resolveCheckinRefusal(payload, { httpStatus: 400 })
    assert.ok(refusal, `${JSON.stringify(payload)} must refuse`)
    assert.ok(refusal!.headline.trim().length > 0, "headline required")
    assert.ok(refusal!.guidance.trim().length > 0, "guidance required")
    // Read over the guest's shoulder: no ids, no SQL, no null/undefined holes.
    for (const banned of ["null", "undefined", "NaN", "SELECT", "event_id", "user_id"]) {
      assert.ok(
        !refusal!.headline.includes(banned) && !refusal!.guidance.includes(banned),
        `${banned} must not reach the door screen`,
      )
    }
    codes.add(refusal!.code)
  }

  // The point of the change: distinct causes get distinct codes.
  assert.ok(codes.size >= 10, `expected distinct codes, got ${codes.size}`)
})

test("the check-in page renders guidance, not just a status word", () => {
  const client = readFileSync(join(SRC, "app/checkin/[uuid]/CheckinClient.tsx"), "utf8")
  assert.ok(client.includes("resolveCheckinRefusal"), "refusals must go through the shared resolver")
  assert.ok(client.includes("refusal?.guidance") || client.includes("refusal.guidance"), "guidance must render")
  assert.ok(client.includes("checkinTransportRefusal"), "a dropped request must not read as a bad pass")
  // Success path and its accents are untouched.
  assert.ok(client.includes("checkinRedeemStatusLabel"), "ENTRY label stays on the success overlay")
  assert.ok(client.includes("guestCheckinAccent"), "Door Access pink vs events green stays")
})
