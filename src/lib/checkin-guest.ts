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

export function isWeeklyCoverCheckinTicket(
  ticket: Pick<GuestCheckinTicket, "access_kind" | "redemption_mode" | "event_name" | "ticket_name">,
): boolean {
  if (ticket.redemption_mode === "camera_tap") return true
  if (isDoorAccessKind(ticket.access_kind)) return true
  return looksLikeWeeklyCoverName(ticket.event_name) || looksLikeWeeklyCoverName(ticket.ticket_name)
}

export function guestCheckinAccent(
  ticket: Pick<GuestCheckinTicket, "access_kind" | "redemption_mode" | "event_name" | "ticket_name">,
): { accent: string; accentDeep: string } {
  if (isWeeklyCoverCheckinTicket(ticket)) {
    return { accent: ACCESS_ACCENT, accentDeep: ACCESS_ACCENT_DEEP }
  }
  return { accent: EVENT_CHECKIN_ACCENT, accentDeep: EVENT_CHECKIN_ACCENT_DEEP }
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
export function guestCheckinFooterCopy(
  ticket: Pick<GuestCheckinTicket, "access_kind" | "redemption_mode" | "event_name" | "ticket_name">,
): string {
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
