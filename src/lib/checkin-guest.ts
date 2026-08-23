// Guest camera check-in on /checkin/[uuid].
//
// Weekly Cover nights (access_kind door_access / weekly_cover, redemption
// camera_tap) are scanned with any phone camera. AASA excludes /checkin/* so
// the camera opens this web page, not the app. The page must redeem the
// ticket without a staff login. Event tickets share the same URL and the
// same public Check In control so a missing access_kind never hides the
// button on a WC guest ticket.

import { isDoorAccessKind } from "./business/door-access.ts"

export type GuestCheckinTicket = {
  access_kind?: string | null
  redemption_mode?: string | null
  is_redeemed?: boolean | number
  is_refunded?: boolean | number
  event_status?: string | null
}

export function isWeeklyCoverCheckinTicket(
  ticket: Pick<GuestCheckinTicket, "access_kind" | "redemption_mode">,
): boolean {
  if (ticket.redemption_mode === "camera_tap") return true
  return isDoorAccessKind(ticket.access_kind)
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
