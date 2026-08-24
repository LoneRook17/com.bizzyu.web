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
  guestCheckinWindowBlocks,
  guestCheckinWindowNotice,
  guestCheckinWindowState,
  guestTicketIsRedeemable,
  GUEST_CHECKIN_SCANNER_ONLY_BODY,
  GUEST_CHECKIN_SCANNER_ONLY_HEADLINE,
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
  const nightCover = { access_kind: "night_cover" }
  assert.equal(guestCameraCheckinEnabled(wc), true)
  assert.equal(guestCameraCheckinEnabled(alias), true)
  assert.equal(guestCameraCheckinEnabled(nightCover), true)
})

test("camera check-in is WC only: an event ticket is a dead end, not a live button", () => {
  const event = { access_kind: "event", redemption_mode: "native_scan" }
  assert.equal(
    guestCameraCheckinEnabled(event),
    false,
    "the server refuses camera_tap for event tickets, so the page must not offer it",
  )
  assert.equal(guestCameraCheckinEnabled({ access_kind: "event" }), false)
  assert.equal(guestCameraCheckinEnabled({}), false, "an unidentifiable pass is not camera-eligible")
})

test("a nullable access_kind still reaches WC check-in through the name fallback", () => {
  // The whole reason this gate reuses isWeeklyCoverCheckinTicket instead of
  // testing access_kind: older rows have it NULL and a raw test would brick
  // check-in on a real Weekly Cover night.
  assert.equal(
    guestCameraCheckinEnabled({ access_kind: null, event_name: "The Dungeon Weekly Cover" }),
    true,
  )
  assert.equal(guestCameraCheckinEnabled({ event_name: "Night Cover", ticket_name: "Cover" }), true)
  assert.equal(guestCameraCheckinEnabled({ redemption_mode: "camera_tap" }), true)
  assert.equal(
    guestCameraCheckinEnabled({ access_kind: null, event_name: "Rumble", ticket_name: "General" }),
    false,
  )
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
  // The event branch used to promise the same camera check-in on the one kind
  // of pass this page is not allowed to redeem. It now names the app scanner.
  const named = guestCheckinFooterCopy({ access_kind: "event" })
  assert.ok(!named.includes("phone camera"), "must not advertise a camera check-in it cannot do")
  assert.ok(!named.toLowerCase().includes("handled by staff"))
  assert.match(named, /Bizzy scanner/)
  assert.equal(named, GUEST_CHECKIN_SCANNER_ONLY_BODY)
})

test("the scanner-only dead end tells the reader where check-in really happens", () => {
  assert.match(GUEST_CHECKIN_SCANNER_ONLY_HEADLINE, /Bizzy app/)
  assert.match(GUEST_CHECKIN_SCANNER_ONLY_BODY, /Bizzy scanner/)
  assert.ok(!GUEST_CHECKIN_SCANNER_ONLY_BODY.toLowerCase().includes("handled by staff"))
  for (const copy of [GUEST_CHECKIN_SCANNER_ONLY_HEADLINE, GUEST_CHECKIN_SCANNER_ONLY_BODY]) {
    assert.ok(!copy.includes("—") && !copy.includes("–"), "no em or en dashes")
  }

  const client = readFileSync(join(SRC, "app/checkin/[uuid]/CheckinClient.tsx"), "utf8")
  assert.ok(
    client.includes("GUEST_CHECKIN_SCANNER_ONLY_HEADLINE"),
    "the dead end renders the shared copy",
  )
  assert.ok(
    client.includes("cameraEligible") && client.includes("passIsGood"),
    "camera eligibility and pass state stay separate, so redeemed and refunded keep their screens",
  )
})

// A 9:00 PM Eastern night. Scanning opens 3h before doors and closes 4h after
// the 2:00 AM end. Wall clocks in the event's zone, exactly as the server
// sends them.
const NIGHT = {
  access_kind: "door_access",
  doors_open: "2026-08-24 21:00:00",
  scan_opens_at: "2026-08-24 18:00:00",
  window_closes_at: "2026-08-25 06:00:00",
  event_timezone: "America/New_York",
}

test("the scan window is read as a wall clock in the event's zone", () => {
  // 3:00 PM Eastern, six hours before doors.
  assert.equal(guestCheckinWindowState(NIGHT, new Date("2026-08-24T19:00:00Z")), "not_open")
  // 8:30 PM Eastern, inside the window.
  assert.equal(guestCheckinWindowState(NIGHT, new Date("2026-08-25T00:30:00Z")), "open")
  // 11:00 AM Eastern the next day, after the window shut.
  assert.equal(guestCheckinWindowState(NIGHT, new Date("2026-08-25T15:00:00Z")), "closed")
  // The boundaries themselves are inside the window.
  assert.equal(guestCheckinWindowState(NIGHT, new Date("2026-08-24T22:00:00Z")), "open")
  assert.equal(guestCheckinWindowState(NIGHT, new Date("2026-08-25T10:00:00Z")), "open")
})

test("an older API response that omits the window behaves exactly as before", () => {
  assert.equal(guestCheckinWindowState({}), "unknown")
  assert.equal(guestCheckinWindowState({ access_kind: "door_access" }), "unknown")
  assert.equal(guestCheckinWindowState({ doors_open: "2026-08-24 21:00:00" }), "unknown")
  assert.equal(guestCheckinWindowBlocks("unknown"), false, "unknown is treated as open")
  assert.equal(guestCheckinWindowBlocks("open"), false)
  assert.equal(guestCheckinWindowBlocks("not_open"), true)
  assert.equal(guestCheckinWindowBlocks("closed"), true)
  assert.equal(guestCheckinWindowNotice({}), null)
  // Half a window is still usable: only the side that was sent can block.
  const closesOnly = { window_closes_at: "2026-08-25 06:00:00", event_timezone: "America/New_York" }
  assert.equal(guestCheckinWindowState(closesOnly, new Date("2026-08-24T19:00:00Z")), "open")
  assert.equal(guestCheckinWindowState(closesOnly, new Date("2026-08-25T15:00:00Z")), "closed")
})

test("the too-early notice quotes doors and scan-open as two separate facts", () => {
  const notice = guestCheckinWindowNotice(NIGHT, new Date("2026-08-24T19:00:00Z"))
  assert.ok(notice)
  assert.equal(notice.state, "not_open")
  assert.match(notice.headline, /not open yet/i)
  assert.match(notice.detail, /Doors open at 9:00 PM/)
  assert.match(notice.detail, /Check in opens at 6:00 PM/)
  // The 5:00 PM / 9:00 PM bug: scan_opens_at must never be printed as doors.
  assert.ok(
    !/Doors open at 6:00 PM/.test(notice.detail),
    "scan_opens_at is not doors and must never be labelled as doors",
  )
})

test("wall clocks print as written, whatever timezone the reader is in", () => {
  // Same digits, a zone half a world away. A 9:00 PM night stays 9:00 PM.
  const auckland = { ...NIGHT, event_timezone: "Pacific/Auckland" }
  const notice = guestCheckinWindowNotice(auckland, new Date("2026-08-24T03:00:00Z"))
  assert.ok(notice)
  assert.match(notice.detail, /Doors open at 9:00 PM/)
  assert.match(notice.detail, /Check in opens at 6:00 PM/)
  // An unparseable zone falls back to the reader's clock rather than throwing.
  assert.doesNotThrow(() => guestCheckinWindowState({ ...NIGHT, event_timezone: "Not/AZone" }))
})

test("the closed notice says the door shut, and names the day when it was not today", () => {
  const sameDay = guestCheckinWindowNotice(NIGHT, new Date("2026-08-25T15:00:00Z"))
  assert.ok(sameDay)
  assert.equal(sameDay.state, "closed")
  assert.match(sameDay.headline, /closed/i)
  assert.match(sameDay.detail, /Check in closed at 6:00 AM/)
  assert.ok(!/ on \w{3}, Aug/.test(sameDay.detail), "no day qualifier when it closed today")

  const laterDay = guestCheckinWindowNotice(NIGHT, new Date("2026-08-26T15:00:00Z"))
  assert.ok(laterDay)
  assert.match(laterDay.detail, / on \w{3}, Aug 25/)
})

test("the guest page disables the CTA out of window instead of hiding or reddening it", () => {
  const client = readFileSync(join(SRC, "app/checkin/[uuid]/CheckinClient.tsx"), "utf8")
  assert.ok(client.includes("guestCheckinWindowNotice"), "the window comes from the shared helper")
  assert.ok(client.includes("disabled={outOfWindow}"), "the CTA renders visibly disabled")
  assert.ok(client.includes("{canCheckIn && ("), "the CTA is still hidden for a bad pass")
  assert.ok(
    !client.includes("new Date(ticket.scan_opens_at") &&
      !client.includes("new Date(ticket.doors_open") &&
      !client.includes("new Date(ticket.window_closes_at"),
    "window stamps are wall clocks and must never be parsed as instants",
  )

  const start = client.indexOf("{windowNotice && (")
  assert.ok(start > 0, "the notice renders on the first screen")
  const noticeBlock = client.slice(start, start + 500)
  assert.ok(!noticeBlock.includes("red-"), "the window notice is neutral, never red")
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
  assert.ok(client.includes("guestCameraCheckinEnabled"), "camera eligibility decides the screen")
  assert.ok(client.includes("guestTicketIsRedeemable"), "pass state is a separate gate from the kind")
  assert.ok(client.includes("Check In"), "a WC guest must see a Check In control")
  assert.ok(client.includes("guestCheckinFooterCopy"), "footer must follow the working scan, not a dead end")
  assert.ok(!client.includes("handled by staff"), "must not dead-end on staff-only copy")
  // The scanner-only copy is real, but it belongs to the event dead end and
  // lives in checkin-guest.ts. It must never be inlined onto the WC screens.
  assert.ok(!client.includes("Bizzy scanner"), "WC check-in must not be described as scanner-only")
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
