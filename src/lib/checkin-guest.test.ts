// Guest camera check-in on the public /checkin ticket page.
// Runnable with the Node built-in test runner: `npm test`.

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  checkinRedeemPath,
  checkinRedeemStatusLabel,
  guestCameraCheckinEnabled,
  guestTicketIsRedeemable,
  isWeeklyCoverCheckinTicket,
} from "./checkin-guest.ts"

const SRC = join(process.cwd(), "src")

test("Weekly Cover / door_access / camera_tap tickets are camera check-in tickets", () => {
  assert.equal(isWeeklyCoverCheckinTicket({ access_kind: "door_access" }), true)
  assert.equal(isWeeklyCoverCheckinTicket({ access_kind: "weekly_cover" }), true)
  assert.equal(isWeeklyCoverCheckinTicket({ redemption_mode: "camera_tap" }), true)
  assert.equal(isWeeklyCoverCheckinTicket({ access_kind: "event" }), false)
  assert.equal(isWeeklyCoverCheckinTicket({ redemption_mode: "native_scan" }), false)
})

test("anyone with a camera can check in a WC ticket (no staff privilege)", () => {
  const wc = { access_kind: "door_access", redemption_mode: "camera_tap" }
  const alias = { access_kind: "weekly_cover" }
  const omitted = {}
  const event = { access_kind: "event", redemption_mode: "native_scan" }
  assert.equal(guestCameraCheckinEnabled(wc), true)
  assert.equal(guestCameraCheckinEnabled(alias), true)
  assert.equal(guestCameraCheckinEnabled(omitted), true, "missing kind must not hide WC check-in")
  assert.equal(guestCameraCheckinEnabled(event), true, "event tickets reuse the same public control")
})

test("a redeemed, refunded, or cancelled ticket is not tap-redeemable", () => {
  assert.equal(guestTicketIsRedeemable({}), true)
  assert.equal(guestTicketIsRedeemable({ is_redeemed: false, is_refunded: false }), true)
  assert.equal(guestTicketIsRedeemable({ is_redeemed: true }), false)
  assert.equal(guestTicketIsRedeemable({ is_redeemed: 1 }), false)
  assert.equal(guestTicketIsRedeemable({ is_refunded: true }), false)
  assert.equal(guestTicketIsRedeemable({ event_status: "cancelled" }), false)
  assert.equal(guestTicketIsRedeemable({ event_status: "Canceled" }), false)
})

test("redeem path is the public checkin endpoint, not a staff scanner route", () => {
  assert.equal(checkinRedeemPath("abc-123"), "/checkin/abc-123/redeem")
  assert.ok(!checkinRedeemPath("abc-123").includes("/business/"))
  assert.ok(!checkinRedeemPath("abc-123").includes("/scanner/"))
})

test("redeem status labels match the original event check-in overlays", () => {
  assert.equal(checkinRedeemStatusLabel("redeemed_now"), "ENTRY")
  assert.equal(checkinRedeemStatusLabel("already_redeemed"), "ALREADY SCANNED")
  assert.equal(checkinRedeemStatusLabel("event_not_active"), "EVENT NOT ACTIVE")
  assert.equal(checkinRedeemStatusLabel("unknown"), "ERROR")
})

test("the guest ticket page posts a public redeem and never asks for staff login", () => {
  const client = readFileSync(join(SRC, "app/checkin/[uuid]/CheckinClient.tsx"), "utf8")
  const aasa = readFileSync(join(process.cwd(), "public/.well-known/apple-app-site-association"), "utf8")

  assert.ok(client.includes("checkinRedeemPath"), "must POST the shared public redeem path")
  assert.ok(client.includes("guestCameraCheckinEnabled"), "WC and event tickets share guest check-in")
  assert.ok(client.includes("guestTicketIsRedeemable"), "redeem button is gated on ticket state only")
  assert.ok(client.includes("Check In"), "guest must see a Check In control")
  assert.ok(!client.includes("Bizzy scanner"), "must not say check-in is staff/scanner only")
  assert.ok(!client.includes("Staff login"), "must not require staff login")
  assert.ok(!client.includes("Log in to Check In"), "must not require staff login")
  assert.ok(!client.includes("/business/auth/"), "must not hit staff auth")
  assert.ok(!client.includes("credentials: \"include\""), "camera-tap redeem is unauthenticated")
  assert.ok(!client.includes("\u2014") && !client.includes("\u2013"), "no em or en dashes")

  assert.ok(
    aasa.includes('"/": "/checkin/*", "exclude": true') || aasa.includes('"/": "/checkin/*","exclude": true'),
    "camera scan must stay on the web ticket page, not the app",
  )
})

test("door-access routing helpers used by #54/#56 are untouched by check-in", () => {
  const guest = readFileSync(join(SRC, "lib/checkin-guest.ts"), "utf8")
  const client = readFileSync(join(SRC, "app/checkin/[uuid]/CheckinClient.tsx"), "utf8")
  for (const src of [guest, client]) {
    assert.ok(!src.includes("programHref"), "check-in must not rewrite door-access routes")
    assert.ok(!src.includes("eventListHref"), "check-in must not rewrite events-list routes")
    assert.ok(!src.includes("workingProgramIdForEventGroup"), "check-in must not remap program ids")
  }
})
