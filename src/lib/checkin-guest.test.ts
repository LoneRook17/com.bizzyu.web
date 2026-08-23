// Guest camera check-in on the public /checkin ticket page.
// Runnable with the Node built-in test runner: `npm test`.

import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  checkinRedeemPath,
  checkinRedeemStatusLabel,
  EVENT_CHECKIN_ACCENT,
  GUEST_CHECKIN_COVER_TYPE_LABEL,
  GUEST_CHECKIN_EVENT_TYPE_LABEL,
  guestCameraCheckinEnabled,
  guestCheckinAccent,
  guestCheckinFooterCopy,
  guestCheckinTypeLabel,
  guestTicketIsRedeemable,
  isWeeklyCoverCheckinTicket,
  looksLikeNightCoverName,
} from "./checkin-guest.ts"
import { ACCESS_ACCENT, ACCESS_ACCENT_DEEP } from "./business/door-access.ts"

const SRC = join(process.cwd(), "src")

test("Weekly Cover / door_access / camera_tap tickets are camera check-in tickets", () => {
  assert.equal(isWeeklyCoverCheckinTicket({ access_kind: "door_access" }), true)
  assert.equal(isWeeklyCoverCheckinTicket({ access_kind: "weekly_cover" }), true)
  assert.equal(isWeeklyCoverCheckinTicket({ access_kind: "night_cover" }), true)
  assert.equal(isWeeklyCoverCheckinTicket({ redemption_mode: "camera_tap" }), true)
  assert.equal(isWeeklyCoverCheckinTicket({ access_kind: "event" }), false)
  assert.equal(isWeeklyCoverCheckinTicket({ redemption_mode: "native_scan" }), false)
  assert.equal(
    isWeeklyCoverCheckinTicket({
      access_kind: "event",
      event_name: "The Dungeon Weekly Cover (Escrow Test)",
    }),
    true,
    "mis-tagged WC nights still check in as Weekly Cover",
  )
})

test("Night Cover nights are Cover tickets even when the public API omits access_kind", () => {
  assert.equal(looksLikeNightCoverName("Night Cover"), true)
  assert.equal(looksLikeNightCoverName("Friday Night Cover"), true)
  assert.equal(looksLikeNightCoverName("Cover"), false)
  const live = { event_name: "Night Cover", ticket_name: "Cover" }
  assert.equal(isWeeklyCoverCheckinTicket(live), true)
  assert.deepEqual(guestCheckinAccent(live), {
    accent: ACCESS_ACCENT,
    accentDeep: ACCESS_ACCENT_DEEP,
  })
  assert.equal(guestCheckinTypeLabel(live), GUEST_CHECKIN_COVER_TYPE_LABEL)
  assert.equal(
    isWeeklyCoverCheckinTicket({ event_name: "Rumble", ticket_name: "Cover" }),
    false,
    "a generic Cover tier on a named event stays Entry",
  )
})

test("Weekly Cover check-in chrome is pink Cover, named events stay green Entry", () => {
  assert.deepEqual(guestCheckinAccent({ access_kind: "door_access" }), {
    accent: ACCESS_ACCENT,
    accentDeep: ACCESS_ACCENT_DEEP,
  })
  assert.deepEqual(
    guestCheckinAccent({ event_name: "The Dungeon Weekly Cover (Escrow Test)" }),
    { accent: ACCESS_ACCENT, accentDeep: ACCESS_ACCENT_DEEP },
  )
  assert.equal(guestCheckinAccent({ access_kind: "event" }).accent, EVENT_CHECKIN_ACCENT)
  assert.equal(guestCheckinTypeLabel({ access_kind: "door_access" }), "Cover")
  assert.equal(guestCheckinTypeLabel({ access_kind: "weekly_cover" }), "Cover")
  assert.equal(guestCheckinTypeLabel({ event_name: "Night Cover" }), "Cover")
  assert.equal(guestCheckinTypeLabel({ access_kind: "event" }), GUEST_CHECKIN_EVENT_TYPE_LABEL)
  assert.equal(GUEST_CHECKIN_COVER_TYPE_LABEL, "Cover")
  const client = readFileSync(join(SRC, "app/checkin/[uuid]/CheckinClient.tsx"), "utf8")
  assert.ok(client.includes("guestCheckinAccent"), "guest ticket page uses the WC pink accent")
  assert.ok(client.includes("guestCheckinTypeLabel"), "type chip is Cover vs Entry from the helper")
  assert.ok(!client.includes("WEEKLY_ACCESS_TYPE_LABEL"), "type chip must say Cover, not WEEKLY COVER")
  assert.ok(client.includes("Check In"), "Check In control stays on the WC ticket page")
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

test("footer copy names the working camera scan, never a staff-only dead end", () => {
  const weekly = guestCheckinFooterCopy({ access_kind: "door_access" })
  assert.match(weekly, /Weekly Cover/)
  assert.match(weekly, /phone camera/)
  assert.ok(!weekly.toLowerCase().includes("handled by staff"))
  const night = guestCheckinFooterCopy({ event_name: "Night Cover", ticket_name: "Cover" })
  assert.match(night, /phone camera/)
  assert.ok(!night.toLowerCase().includes("handled by staff"))
  const named = guestCheckinFooterCopy({ access_kind: "event" })
  assert.match(named, /phone camera/)
  assert.match(named, /Scan with any phone camera/)
  assert.ok(!named.toLowerCase().includes("handled by staff"))
  assert.ok(!named.includes("Bizzy scanner"))
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
  assert.ok(client.includes("guestCheckinFooterCopy"), "footer must follow the working scan, not a dead end")
  assert.ok(!client.includes("handled by staff"), "must not dead-end on staff-only copy")
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
