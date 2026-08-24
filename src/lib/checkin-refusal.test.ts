import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import {
  checkinTransportRefusal,
  resolveCheckinRefusal,
  CHECKIN_SUCCESS_STATUS,
  OUTSIDE_REDEMPTION_WINDOW_HEADLINE,
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
    event_start: "2026-08-29 22:00:00",
  })
  const late = resolveCheckinRefusal({
    status: "event_not_active",
    window_side: "closed",
    window_closes_at: "2026-08-30 02:00:00",
  })

  assert.equal(early?.code, "scan_window_not_open")
  assert.equal(late?.code, "scan_window_closed")
  assert.notEqual(early?.headline, late?.headline)
  assert.equal(early?.headline, OUTSIDE_REDEMPTION_WINDOW_HEADLINE)
  assert.match(late?.headline ?? "", /closed at .*2:00/)
})

test("too-early copy uses night-start doors, not the 5pm scan-window clock", () => {
  // Luke's Weekly Cover night: doors 9:00 PM. The API (and the old local
  // copy) printed window_opens_at / a 17:00 default as "Doors open at 5:00 PM".
  const refusal = resolveCheckinRefusal(
    {
      status: "event_not_active",
      window_side: "not_open",
      window_opens_at: "2026-08-26 17:00:00",
      event_start: "2026-08-26 21:00:00",
      reason: {
        code: "scan_window_not_open",
        headline: "Doors open at 5:00 PM",
        guidance: "Scanning starts at 5:00 PM. The pass is good, so ask them to come back then.",
      },
    },
    { eventStart: "2026-08-26 21:00:00" },
  )

  assert.equal(refusal?.code, "scan_window_not_open")
  assert.equal(refusal?.headline, "Outside of Redemption Window")
  assert.ok(!/Widnow/.test(refusal?.headline ?? ""))
  assert.match(refusal?.guidance ?? "", /Doors open at 9:00 PM/)
  assert.match(refusal?.guidance ?? "", /3 hours before doors open/)
  assert.ok(!/5:00/.test(refusal?.headline ?? ""))
  assert.ok(!/5:00/.test(refusal?.guidance ?? ""))
  assert.ok(!/Scanning starts at/.test(refusal?.guidance ?? ""))
  assert.ok(!(refusal?.headline ?? "").includes("\u2014"))
  assert.ok(!(refusal?.guidance ?? "").includes("\u2014"))
})

test("a date-only ticket start does not hide a 21:00 event_start", () => {
  const refusal = resolveCheckinRefusal(
    {
      status: "event_not_active",
      window_side: "not_open",
      window_opens_at: "2026-08-26 17:00:00",
      event_start: "2026-08-26 21:00:00",
    },
    { eventStart: "2026-08-26" },
  )
  assert.match(refusal?.guidance ?? "", /Doors open at 9:00 PM/)
})

test("too-early doors come from the ticket night start when the redeem body only has the window clock", () => {
  const refusal = resolveCheckinRefusal(
    {
      status: "event_not_active",
      window_side: "not_open",
      window_opens_at: "2026-08-26 17:00:00",
    },
    { eventStart: "2026-08-26 21:00:00" },
  )
  assert.equal(refusal?.headline, OUTSIDE_REDEMPTION_WINDOW_HEADLINE)
  assert.match(refusal?.guidance ?? "", /Doors open at 9:00 PM/)
  assert.ok(!/5:00/.test(refusal?.guidance ?? ""))
})

test("a 21:00 door stamp stays 9:00 PM even when the API tags it UTC", () => {
  const refusal = resolveCheckinRefusal({
    status: "event_not_active",
    reason_code: "scan_window_not_open",
    event_start: "2026-08-26T21:00:00.000Z",
  })
  assert.equal(refusal?.headline, OUTSIDE_REDEMPTION_WINDOW_HEADLINE)
  assert.match(refusal?.guidance ?? "", /Doors open at 9:00 PM/)
})

test("without a night-start field, too-early copy does not invent doors from the window", () => {
  const refusal = resolveCheckinRefusal({
    status: "event_not_active",
    window_side: "not_open",
    window_opens_at: "2026-08-26 17:00:00",
  })
  assert.equal(refusal?.headline, OUTSIDE_REDEMPTION_WINDOW_HEADLINE)
  assert.match(refusal?.guidance ?? "", /3 hours before doors open/)
  assert.ok(!/Doors open at/.test(refusal?.guidance ?? ""))
  assert.ok(!/5:00/.test(refusal?.guidance ?? ""))
  assert.ok(!/8:00/.test(refusal?.guidance ?? ""), "must not add 3 hours onto the 17:00 window")
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
  const refusal = readFileSync(join(SRC, "lib/checkin-refusal.ts"), "utf8")
  assert.ok(client.includes("resolveCheckinRefusal"), "refusals must go through the shared resolver")
  assert.ok(client.includes("refusal?.guidance") || client.includes("refusal.guidance"), "guidance must render")
  assert.ok(client.includes("checkinTransportRefusal"), "a dropped request must not read as a bad pass")
  // Success path and its accents are untouched.
  assert.ok(client.includes("checkinRedeemStatusLabel"), "ENTRY label stays on the success overlay")
  assert.ok(client.includes("guestCheckinAccent"), "Door Access pink vs events green stays")
  assert.ok(
    client.includes("event_start: data.event_start ?? ticket?.start_date_time"),
    "night start from the ticket must reach the resolver as doors",
  )
  assert.ok(refusal.includes("Outside of Redemption Window"), "too-early title is Luke's copy")
  assert.ok(!refusal.includes("Widnow"), "Window is spelled correctly")
  assert.ok(!refusal.includes("\u2014") && !refusal.includes("\u2013"), "no em or en dashes in refusal copy")
  assert.ok(!client.includes("\u2014") && !client.includes("\u2013"), "no em or en dashes on the check-in page")
})
