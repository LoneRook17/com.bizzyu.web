// Door refusal copy for the guest check-in page.
//
// A guest scans a Weekly Cover pass with their phone camera, lands here, and
// staff tap Check In. When that tap fails the screen has to say WHY and WHAT
// TO DO, because the person reading it is working a door at 11pm and cannot
// go and look anything up. "ERROR" makes them guess, and guessing costs a
// paying guest or a free entry.
//
// The server now sends `reason` on every refusal: a distinct `code`, a
// `headline`, and one line of `guidance`. This module prefers that, and falls
// back to deriving the same shape locally when the server has not been
// upgraded yet. That fallback is not optional: web deploys and API deploys are
// separate, so this page WILL run against an older API, and on that day it
// still must not print "ERROR".
//
// House style on this surface: no em or en dashes (enforced by
// checkin-guest.test.ts against CheckinClient.tsx).

export interface CheckinRefusal {
  /** Machine-readable reason. Stable across copy edits. */
  code: string
  /** What happened. One short line, big type. */
  headline: string
  /** What to do about it. One line, smaller type. */
  guidance: string
}

/** The shape the redeem endpoint answers with. Every field may be absent. */
export interface CheckinRedeemPayload {
  status?: string | null
  reason_code?: string | null
  reason?: { code?: string; headline?: string; guidance?: string } | null
  error?: string | null
  message?: string | null
  /** Which side of the scan window was missed. Newer servers only. */
  window_side?: "not_open" | "closed" | string | null
  window_opens_at?: string | null
  window_closes_at?: string | null
  valid_from?: string | null
  valid_until?: string | null
  event_start?: string | null
  event_end?: string | null
  ticket?: { redeemed_at?: string | null; event_name?: string | null } | null
}

/** What the page already knows about the pass, for the fallback path. */
export interface CheckinFallbackContext {
  redeemedAt?: string | null
  eventName?: string | null
  eventStart?: string | null
  /** HTTP status, so a transport failure never reads as a bad pass. */
  httpStatus?: number | null
}

/** The one status that means "let them in". Never a refusal. */
export const CHECKIN_SUCCESS_STATUS = "redeemed_now"

function clean(value: string | null | undefined): string | null {
  const trimmed = String(value ?? "").trim()
  return trimmed.length > 0 ? trimmed : null
}

function parseServerTime(value: string | null | undefined): Date | null {
  const raw = clean(value)
  if (!raw) return null
  // MySQL hands back "YYYY-MM-DD HH:MM:SS". Safari refuses that with a space,
  // so normalise before parsing or the time silently vanishes on iPhones,
  // which is most of the door phones in question.
  const iso = raw.includes("T") ? raw : raw.replace(" ", "T")
  const parsed = new Date(iso)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function clockTime(date: Date): string {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
}

function calendarDay(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })
}

function isToday(date: Date): boolean {
  const now = new Date()
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  )
}

/**
 * Derive a refusal locally, for an API that predates `reason`.
 *
 * Deliberately narrower than the server: it can only use what the old
 * response actually carried. Where the old server collapsed two causes into
 * one status and sent nothing to tell them apart, this says the honest
 * ambiguous thing rather than inventing a specific one. Guessing "doors open
 * at 10" when it might be "the door closed at 2" is worse than not saying.
 */
function fallbackRefusal(
  payload: CheckinRedeemPayload,
  ctx: CheckinFallbackContext,
): CheckinRefusal {
  const status = clean(payload.status) ?? ""
  const http = ctx.httpStatus ?? null

  switch (status) {
    case "already_redeemed": {
      const at = parseServerTime(payload.ticket?.redeemed_at ?? ctx.redeemedAt)
      const when = at ? (isToday(at) ? `at ${clockTime(at)}` : `on ${calendarDay(at)}`) : null
      return {
        code: "checked_in_already",
        headline: when ? `Already checked in ${when}` : "Already checked in",
        guidance: "This pass has been used. One entry per pass, so do not admit again without a manager.",
      }
    }

    case "refunded":
      return {
        code: "pass_refunded",
        headline: "This pass was refunded",
        guidance: "The guest got their money back, so it no longer admits. They can buy again at the door.",
      }

    case "event_cancelled":
      return {
        code: "event_cancelled",
        headline: "This event was cancelled",
        guidance: "The event is off and refunds are handled automatically. Do not admit.",
      }

    case "ticket_belongs_to_another_event": {
      // The old server sent no date for the pass's own night, so "wrong night"
      // cannot be distinguished from "wrong event" here. Say the true, wider
      // thing.
      const start = parseServerTime(ctx.eventStart)
      return {
        code: "wrong_event",
        headline: start ? `This pass is for ${calendarDay(start)}` : "This pass is for another event",
        guidance: "Not tonight's door. Check the date and venue printed on the pass.",
      }
    }

    case "event_not_active": {
      // The collapse, seen from the client side: one status, two opposite
      // instructions, and no field saying which. Newer servers send
      // `window_side`; use it when it is there.
      const opens = parseServerTime(payload.window_opens_at ?? payload.event_start)
      const closes = parseServerTime(payload.window_closes_at ?? payload.event_end)

      if (payload.window_side === "not_open") {
        return {
          code: "scan_window_not_open",
          headline: opens ? `Doors open at ${clockTime(opens)}` : "Doors are not open yet",
          guidance: "Scanning has not started. The pass is good, so ask them to come back later.",
        }
      }
      if (payload.window_side === "closed") {
        return {
          code: "scan_window_closed",
          headline: closes ? `Scanning closed at ${clockTime(closes)}` : "Scanning has closed",
          guidance: "This door has closed for the night. A manager can still admit them manually.",
        }
      }
      return {
        code: "scan_window_unknown",
        headline: "Outside the scan window",
        guidance: opens
          ? `This door runs around ${clockTime(opens)}. The pass is good, so check the time with a manager.`
          : "Scanning is not open right now. The pass is good, so check the time with a manager.",
      }
    }

    case "ticket_not_yet_valid": {
      const from = parseServerTime(payload.valid_from)
      return {
        code: "pass_not_yet_valid",
        headline: from ? `Valid from ${clockTime(from)}` : "This pass is not active yet",
        guidance: "This ticket type has not started. Ask them to come back later.",
      }
    }

    case "ticket_window_closed": {
      const until = parseServerTime(payload.valid_until)
      return {
        code: "pass_expired",
        headline: until ? `Expired at ${clockTime(until)}` : "This pass has expired",
        guidance: "This ticket type has ended. A manager can still admit them manually.",
      }
    }

    case "wrong_redemption_surface":
      return {
        code: "wrong_scanner_surface",
        headline: "Wrong scanner for this pass",
        guidance:
          clean(payload.message) ??
          clean(payload.error) ??
          "This pass is scanned at the other door surface. The pass is good and nothing was used up.",
      }

    case "invalid":
      return {
        code: "pass_not_found",
        headline: "Not a Bizzy pass",
        guidance: "This code is not one of ours. Check they scanned the pass and not a flyer.",
      }

    default:
      break
  }

  // No usable status. Lean on the HTTP code, and never call a pass invalid on
  // the strength of a failure we cannot explain.
  if (http === 403) {
    return {
      code: "not_permitted",
      headline: clean(payload.error) ?? "Cannot check in here",
      guidance: clean(payload.message) ?? "The pass is fine. This door is not set up to check it in.",
    }
  }
  if (http === 404) {
    return {
      code: "pass_not_found",
      headline: "Not a Bizzy pass",
      guidance: "This code is not one of ours. Check they scanned the pass and not a flyer.",
    }
  }

  return {
    code: "server_error",
    headline: "Check-in did not go through",
    guidance: "This is on us, not the pass. Try once more. If it fails again, admit them and note the name.",
  }
}

/**
 * The refusal to show, or null when the guest is admitted.
 *
 * Server copy always wins when present, so wording can be fixed by deploying
 * the API alone. `code` is the only thing the UI should branch on.
 */
export function resolveCheckinRefusal(
  payload: CheckinRedeemPayload,
  ctx: CheckinFallbackContext = {},
): CheckinRefusal | null {
  if (clean(payload.status) === CHECKIN_SUCCESS_STATUS) return null

  const served = payload.reason
  const headline = clean(served?.headline)
  const guidance = clean(served?.guidance)
  if (headline && guidance) {
    return {
      code: clean(served?.code) ?? clean(payload.reason_code) ?? "unknown",
      headline,
      guidance,
    }
  }

  return fallbackRefusal(payload, ctx)
}

/**
 * A refusal for a request that never reached a verdict (network drop, CORS,
 * the API being down). Kept separate from `resolveCheckinRefusal` so this case
 * can never be confused with a decision about the pass.
 */
export function checkinTransportRefusal(): CheckinRefusal {
  return {
    code: "connection_failed",
    headline: "Could not reach Bizzy",
    guidance: "The pass was not used up. Check the signal and try once more.",
  }
}
