import { wallClockStamp, nowWallClockStamp, stampClock } from "./wall-clock.ts"

// Guest camera check-in on /checkin/[uuid].
//
// Weekly Cover nights (access_kind door_access / weekly_cover, redemption
// camera_tap) are scanned with any phone camera. AASA excludes /checkin/* so
// the camera opens this web page, not the app. The page must redeem the
// ticket without a staff login.
//
// Ordinary event tickets land on the same URL but CANNOT be redeemed here:
// the server refuses the camera_tap surface for them ("ordinary event tickets
// stay scanner-only"). They therefore get a static dead end pointing at the
// in-app scanner, not a live Check In that only fails after the press.
//
// Camera eligibility is a KIND question and is answered by
// isWeeklyCoverCheckinTicket, never by a raw access_kind test: product_kind
// is the explicit stamp when services sends it, and an older payload without
// it falls back to access_kind (isDoorAccessKind). The Weekly Cover NAME
// fallback is gone — a pass is what the wire says it is.

import { ACCESS_ACCENT, ACCESS_ACCENT_DEEP, isWeeklyCoverProduct } from "./business/door-access.ts"

export type GuestCheckinTicket = {
  access_kind?: string | null
  /** Services' explicit product stamp. Missing on older payloads. */
  product_kind?: string | null
  redemption_mode?: string | null
  is_redeemed?: boolean | number
  is_refunded?: boolean | number
  event_status?: string | null
  event_name?: string | null
  ticket_name?: string | null
  /**
   * Event-level scan window, from GET /checkin/:uuid. All four are optional:
   * an older API omits them and the page must then behave exactly as it did
   * before the window existed.
   *
   * Wall-clock strings in `event_timezone`, same shape as
   * `events.start_date_time`. `doors_open` is the night start. `scan_opens_at`
   * is doors minus the scan lead and is NEVER doors.
   */
  doors_open?: string | null
  scan_opens_at?: string | null
  window_closes_at?: string | null
  event_timezone?: string | null
}

/**
 * Can we scan right now?
 *
 * `unknown` means the server did not say, and is treated as open everywhere:
 * a briefly-enabled button the server then refuses is the accepted failure
 * mode, a wrongly-disabled button is not.
 */
export type GuestCheckinWindowState = "open" | "not_open" | "closed" | "unknown"

export const EVENT_CHECKIN_ACCENT = "#05EB54"
export const EVENT_CHECKIN_ACCENT_DEEP = "#2ECB4E"

/** Type-row chip on the guest ticket. WC / Night Cover only. Events stay Entry. */
export const GUEST_CHECKIN_COVER_TYPE_LABEL = "Cover"
export const GUEST_CHECKIN_EVENT_TYPE_LABEL = "Entry"

type GuestCheckinKindFields = Pick<
  GuestCheckinTicket,
  "access_kind" | "product_kind" | "redemption_mode" | "event_name" | "ticket_name"
>

/**
 * Public GET /checkin/:uuid often omits access_kind. Night Cover nights
 * still have to render as Cover, not a green Entry chip. (Night Cover is a
 * separate product — product_kind covers Weekly Cover only.)
 */
export function looksLikeNightCoverName(name: string | null | undefined): boolean {
  return /night\s*cover/i.test(String(name ?? ""))
}

export function isWeeklyCoverCheckinTicket(ticket: GuestCheckinKindFields): boolean {
  if (ticket.redemption_mode === "camera_tap") return true
  if (ticket.access_kind === "night_cover") return true
  if (looksLikeNightCoverName(ticket.event_name) || looksLikeNightCoverName(ticket.ticket_name)) {
    return true
  }
  // Weekly Cover: product_kind decides when present; an old payload falls
  // back to access_kind ONLY. No /weekly\s*cover/i name fallback.
  return isWeeklyCoverProduct(ticket)
}

export function guestCheckinAccent(ticket: GuestCheckinKindFields): {
  accent: string
  accentDeep: string
} {
  if (isWeeklyCoverCheckinTicket(ticket)) {
    return { accent: ACCESS_ACCENT, accentDeep: ACCESS_ACCENT_DEEP }
  }
  return { accent: EVENT_CHECKIN_ACCENT, accentDeep: EVENT_CHECKIN_ACCENT_DEEP }
}

export function guestCheckinTypeLabel(ticket: GuestCheckinKindFields): string {
  return isWeeklyCoverCheckinTicket(ticket)
    ? GUEST_CHECKIN_COVER_TYPE_LABEL
    : GUEST_CHECKIN_EVENT_TYPE_LABEL
}

/**
 * Can THIS pass be checked in from a phone camera, by anyone, with no staff
 * privilege? Weekly Cover / Night Cover / door access only.
 *
 * It used to return an unconditional `true`, ignoring its argument, so an
 * ordinary event ticket rendered a fully live Check In that the server then
 * refused after the tap (`wrong_redemption_surface`). The page was correct and
 * advertising the opposite.
 */
export function guestCameraCheckinEnabled(ticket: GuestCheckinTicket = {}): boolean {
  return isWeeklyCoverCheckinTicket(ticket)
}

export function guestTicketIsRedeemable(ticket: GuestCheckinTicket): boolean {
  if (truthyFlag(ticket.is_redeemed) || truthyFlag(ticket.is_refunded)) return false
  const status = (ticket.event_status ?? "").toLowerCase()
  if (status === "cancelled" || status === "canceled") return false
  return true
}

function truthyFlag(value: boolean | number | undefined): boolean {
  return value === true || value === 1
}

// ---------------------------------------------------------------------------
// Scan window
//
// Deliberately NOT folded into guestTicketIsRedeemable. That function answers
// "is this pass good", which is a property of the pass; this one answers "can
// we scan right now", which is a property of the clock. Keeping them apart is
// what lets a good pass render a visibly DISABLED button while a redeemed or
// refunded one keeps its existing hidden-button screen.
//
// The stamps are wall-clock strings in the event's zone, so they are compared
// as wall clocks: `now` is rendered into the same zone and the two are matched
// digit for digit. Handing them to `new Date()` would drag an Eastern night
// into the viewer's timezone, which is the class of bug this whole surface
// keeps getting bitten by.
// ---------------------------------------------------------------------------

/**
 * Where the clock sits against the event's scan window.
 *
 * Absent fields degrade to `unknown`, which every caller treats as open.
 */
export function guestCheckinWindowState(
  ticket: GuestCheckinTicket,
  now: Date = new Date(),
): GuestCheckinWindowState {
  const opens = wallClockStamp(ticket.scan_opens_at)
  const closes = wallClockStamp(ticket.window_closes_at)
  if (!opens && !closes) return "unknown"

  const current = nowWallClockStamp(ticket.event_timezone, now)
  if (!current) return "unknown"

  if (opens && current < opens) return "not_open"
  if (closes && current > closes) return "closed"
  return "open"
}

/** True when the window is a reason to disable the CTA. `unknown` never is. */
export function guestCheckinWindowBlocks(
  state: GuestCheckinWindowState,
): state is "not_open" | "closed" {
  return state === "not_open" || state === "closed"
}

/** 12-hour clock as written on the stamp. Never converted. */
/** "Fri, Aug 22", added only when the stamp is not today in the event's zone. */
function stampDayQualifier(stamp: string | null, current: string | null): string {
  if (!stamp || !current || stamp.slice(0, 10) === current.slice(0, 10)) return ""
  const year = Number(stamp.slice(0, 4))
  const month = Number(stamp.slice(5, 7))
  const day = Number(stamp.slice(8, 10))
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return ""
  // Built and read back in UTC so the calendar date cannot shift a day.
  const date = new Date(Date.UTC(year, month - 1, day))
  if (Number.isNaN(date.getTime())) return ""
  return ` on ${date.toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
  })}`
}

export type GuestCheckinWindowNotice = {
  state: "not_open" | "closed"
  headline: string
  detail: string
}

/**
 * The neutral first-screen notice for an out-of-window pass. Not a refusal:
 * the pass is good and nothing here is red.
 *
 * Doors and scan-open are quoted as two separate facts. `scan_opens_at` is
 * doors minus a lead, and printing it as "Doors open at 5:00 PM" on a 9:00 PM
 * night is the exact mislabel this surface already had to fix once.
 */
export function guestCheckinWindowNotice(
  ticket: GuestCheckinTicket,
  now: Date = new Date(),
): GuestCheckinWindowNotice | null {
  const state = guestCheckinWindowState(ticket, now)
  if (!guestCheckinWindowBlocks(state)) return null

  const current = nowWallClockStamp(ticket.event_timezone, now)
  const doorsStamp = wallClockStamp(ticket.doors_open)
  const opensStamp = wallClockStamp(ticket.scan_opens_at)
  const closesStamp = wallClockStamp(ticket.window_closes_at)

  if (state === "not_open") {
    const doors = stampClock(doorsStamp)
    const opens = stampClock(opensStamp)
    const doorsLine = doors ? `Doors open at ${doors}${stampDayQualifier(doorsStamp, current)}.` : ""
    const opensLine = opens
      ? `Check in opens at ${opens}${stampDayQualifier(opensStamp, current)}.`
      : "Check in opens closer to doors."
    return {
      state,
      headline: "Check in is not open yet",
      detail: [doorsLine, opensLine].filter(Boolean).join(" "),
    }
  }

  const closed = stampClock(closesStamp)
  return {
    state,
    headline: "Check in has closed",
    detail: closed
      ? `Check in closed at ${closed}${stampDayQualifier(closesStamp, current)}. This pass can no longer be scanned here.`
      : "This pass can no longer be scanned here.",
  }
}

export function checkinRedeemPath(uuid: string): string {
  return `/checkin/${encodeURIComponent(uuid)}/redeem`
}

/**
 * The static dead end an ordinary event ticket gets. No pass details, nothing
 * tappable: this page cannot redeem it and must not imply that it can.
 *
 * The strings live here rather than in CheckinClient.tsx so the page's own
 * "never claims to be scanner-only" assertions still read true of the WC path
 * they were written for.
 */
export const GUEST_CHECKIN_SCANNER_ONLY_HEADLINE = "Scan this ticket in the Bizzy app"
export const GUEST_CHECKIN_SCANNER_ONLY_BODY =
  "Event tickets are checked in with the Bizzy scanner in the app. Ask the door team to scan this ticket there."

/**
 * Copy for the public ticket page.
 *
 * The Weekly Cover branch describes the check-in this page really performs.
 * The event branch used to promise the same camera check-in, on the one kind
 * of pass this page is not allowed to redeem.
 */
export function guestCheckinFooterCopy(ticket: GuestCheckinKindFields): string {
  if (isWeeklyCoverCheckinTicket(ticket)) {
    return "Weekly Cover scans with any phone camera. Tap Check In. No staff login."
  }
  return GUEST_CHECKIN_SCANNER_ONLY_BODY
}

export function checkinRedeemStatusLabel(status: string): string {
  if (status === "redeemed_now") return "ENTRY"
  const labels: Record<string, string> = {
    already_redeemed: "ALREADY SCANNED",
    invalid: "INVALID TICKET",
    refunded: "REFUNDED",
    event_cancelled: "EVENT CANCELLED",
    ticket_belongs_to_another_event: "WRONG EVENT",
    event_not_active: "EVENT NOT ACTIVE",
    not_active: "NOT ACTIVE",
    cancelled: "CANCELLED",
  }
  return labels[status] || "ERROR"
}
