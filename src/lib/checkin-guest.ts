// Guest camera check-in on /checkin/[uuid].
//
// Weekly Cover nights (access_kind door_access / weekly_cover, redemption
// camera_tap) are scanned with any phone camera. AASA excludes /checkin/* so
// the camera opens this web page, not the app. The page must redeem the
// ticket without a staff login. Event tickets share the same URL and the
// same public Check In control so a missing access_kind never hides the
// button on a WC guest ticket.

import { ACCESS_ACCENT, ACCESS_ACCENT_DEEP, isDoorAccessKind } from "./business/door-access.ts"
import { looksLikeWeeklyCoverName } from "./business/weekly-cover-label.ts"

export type GuestCheckinTicket = {
  access_kind?: string | null
  redemption_mode?: string | null
  is_redeemed?: boolean | number
  is_refunded?: boolean | number
  event_status?: string | null
  event_name?: string | null
  ticket_name?: string | null
}

export const EVENT_CHECKIN_ACCENT = "#05EB54"
export const EVENT_CHECKIN_ACCENT_DEEP = "#2ECB4E"

/** Type-row chip on the guest ticket. WC / Night Cover only. Events stay Entry. */
export const GUEST_CHECKIN_COVER_TYPE_LABEL = "Cover"
export const GUEST_CHECKIN_EVENT_TYPE_LABEL = "Entry"

type GuestCheckinKindFields = Pick<
  GuestCheckinTicket,
  "access_kind" | "redemption_mode" | "event_name" | "ticket_name"
>

/**
 * Public GET /checkin/:uuid often omits access_kind. Night Cover nights
 * still have to render as Cover, not a green Entry chip.
 */
export function looksLikeNightCoverName(name: string | null | undefined): boolean {
  return /night\s*cover/i.test(String(name ?? ""))
}

function looksLikeCoverCheckinName(name: string | null | undefined): boolean {
  return looksLikeWeeklyCoverName(name) || looksLikeNightCoverName(name)
}

export function isWeeklyCoverCheckinTicket(ticket: GuestCheckinKindFields): boolean {
  if (ticket.redemption_mode === "camera_tap") return true
  if (isDoorAccessKind(ticket.access_kind) || ticket.access_kind === "night_cover") return true
  return looksLikeCoverCheckinName(ticket.event_name) || looksLikeCoverCheckinName(ticket.ticket_name)
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
 * Anyone who opens /checkin/:uuid from a camera can check the guest in.
 * No staff privilege. WC and event tickets share this page.
 */
export function guestCameraCheckinEnabled(_ticket: GuestCheckinTicket = {}): boolean {
  return true
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

export function checkinRedeemPath(uuid: string): string {
  return `/checkin/${encodeURIComponent(uuid)}/redeem`
}

/** Copy for the public ticket page. Never says check-in is staff-only. */
export function guestCheckinFooterCopy(ticket: GuestCheckinKindFields): string {
  if (isWeeklyCoverCheckinTicket(ticket)) {
    return "Weekly Cover scans with any phone camera. Tap Check In. No staff login."
  }
  return "Scan with any phone camera, then tap Check In. No staff login."
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
