/**
 * "Is this event still selling?" for the public web surfaces.
 *
 * The decision lives on the server (services utils/eventSaleGuard; core
 * App\Services\EventSaleGuard): every online purchase path refuses an ended
 * or unpublished event with a coded error before any Stripe object exists,
 * and GET /ui/events/:id now carries `has_ended` + `sale_refusal` +
 * `sales_close_at_utc` from that same zone math. This module reads those
 * fields first and only derives the state itself for an older payload (status
 * + end_date_time + timezone), so the web can fail closed at /event/:id and
 * /event/:id/checkout and keep ended rows off the venue board without
 * re-deriving money logic.
 *
 * ONLINE GRACE. Online sales stay open ONLINE_SALE_GRACE_HOURS (5h) past the
 * listed end (the nightlife tail: hosts write "2am", the room pays covers
 * until 4–5am). So `has_ended` (the real end) must NEVER by itself hide the
 * buy controls: the sale gate is the server's `sale_refusal` (an explicit
 * null = still selling), then `sales_close_at_utc`, then the local derivation
 * with the same grace. eventHasEnded stays the real end for display only.
 *
 * The prod bug this closes on the web side: a two-day-old promoter link
 * bounced straight to a Laravel checkout that still sold (SALVAJE 2074).
 */

import { EVENT_TIMEZONE_FALLBACK, resolveEventTimezone } from "./event-time.ts"

export type EventSaleRefusalCode =
  | "event_not_published"
  | "event_cancelled"
  | "event_ended"
  | "ticket_sales_not_open"
  | "ticket_sales_closed"

export interface EventSaleClosed {
  code: EventSaleRefusalCode
  headline: string
  message: string
}

const SELLABLE_STATUSES = new Set(["published", "approved", "active"])
const FALLBACK_END_HOURS = 12
/** Online sales stay open this long after the LISTED end (twin of services ONLINE_SALE_GRACE_HOURS). */
export const ONLINE_SALE_GRACE_HOURS = 5
const NAIVE =
  /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?$/
const HAS_OFFSET = /(?:Z|[+-]\d{2}:?\d{2})$/i

const COPY: Record<EventSaleRefusalCode, { headline: string; message: string }> = {
  event_ended: { headline: "Event ended", message: "This event has ended. Tickets are no longer on sale." },
  event_cancelled: { headline: "Event cancelled", message: "This event has been cancelled and is no longer selling tickets." },
  event_not_published: { headline: "Not available", message: "This event is not available right now." },
  ticket_sales_not_open: { headline: "Not on sale yet", message: "Sales for this ticket have not opened yet." },
  ticket_sales_closed: { headline: "Sales closed", message: "Sales for this ticket have closed." },
}

/** Buyer-facing copy for a server code; unknown codes fall back to the server's text. */
export function saleClosedCopy(code: string | null | undefined, serverMessage?: string | null): EventSaleClosed {
  const known = code && code in COPY ? (code as EventSaleRefusalCode) : null
  if (known) {
    return { code: known, headline: COPY[known].headline, message: serverMessage?.trim() || COPY[known].message }
  }
  return {
    code: "event_not_published",
    headline: "Not available",
    message: serverMessage?.trim() || COPY.event_not_published.message,
  }
}

/** Wall clock in `zone` → absolute instant. Naive strings only; offsets parse directly. */
export function wallClockToInstant(raw: string | null | undefined, zone?: string | null): Date | null {
  const trimmed = String(raw ?? "").trim()
  if (!trimmed) return null
  if (HAS_OFFSET.test(trimmed)) {
    const d = new Date(trimmed.includes(" ") ? trimmed.replace(" ", "T") : trimmed)
    return Number.isNaN(d.getTime()) ? null : d
  }
  const m = NAIVE.exec(trimmed)
  if (!m) return null
  const [y, mo, d, hh, mm, ss] = [m[1], m[2], m[3], m[4], m[5], m[6] ?? "0"].map(Number)
  const resolved = resolveEventTimezone(zone)
  // Two-pass offset resolution: guess UTC, measure the zone's offset at that
  // instant, correct, and re-measure (handles DST edges).
  let guess = Date.UTC(y, mo - 1, d, hh, mm, ss)
  for (let i = 0; i < 2; i++) {
    const offset = zoneOffsetMs(new Date(guess), resolved)
    guess = Date.UTC(y, mo - 1, d, hh, mm, ss) - offset
  }
  return new Date(guess)
}

function zoneOffsetMs(instant: Date, zone: string): number {
  let fmt: Intl.DateTimeFormat
  try {
    fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
  } catch {
    fmt = new Intl.DateTimeFormat("en-US", { timeZone: EVENT_TIMEZONE_FALLBACK, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" })
  }
  const parts = fmt.formatToParts(instant)
  const at = (t: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === t)?.value ?? "0")
  const hour = at("hour") === 24 ? 0 : at("hour")
  const asUtc = Date.UTC(at("year"), at("month") - 1, at("day"), hour, at("minute"), at("second"))
  return asUtc - instant.getTime()
}

export interface SaleStateInput {
  status?: string | null
  cancellation_status?: string | null
  start_date_time?: string | null
  end_date_time?: string | null
  timezone?: string | null
  /** Server-derived (services GET /ui/events/:id). Wins when present. */
  has_ended?: boolean | null
  sale_refusal?: { code?: string | null; message?: string | null } | null
  /** Server-derived: the instant online sales close (listed end + grace). */
  sales_close_at_utc?: string | null
}

/** The instant the event ends (end, else start + 12h, overnight end read as next day). */
export function eventEndInstant(event: SaleStateInput): Date | null {
  const zone = event.timezone ?? null
  const start = wallClockToInstant(event.start_date_time, zone)
  const end = wallClockToInstant(event.end_date_time, zone)
  if (end) {
    if (start && end.getTime() <= start.getTime()) return new Date(end.getTime() + 24 * 3600 * 1000)
    return end
  }
  if (start) return new Date(start.getTime() + FALLBACK_END_HOURS * 3600 * 1000)
  return null
}

export function eventHasEnded(event: SaleStateInput, now: Date = new Date()): boolean {
  if (typeof event.has_ended === "boolean") return event.has_ended
  const end = eventEndInstant(event)
  return end != null && now.getTime() >= end.getTime()
}

/**
 * The instant ONLINE sales close: the server's `sales_close_at_utc` when the
 * payload carries it, else the listed end + ONLINE_SALE_GRACE_HOURS (a missing
 * listed end keeps the start + 12h fallback with no grace on top).
 */
export function eventSalesCloseInstant(event: SaleStateInput): Date | null {
  const server = String(event.sales_close_at_utc ?? "").trim()
  if (server) {
    const d = new Date(server)
    if (!Number.isNaN(d.getTime())) return d
  }
  const end = eventEndInstant(event)
  if (!end) return null
  const listedEnd = wallClockToInstant(event.end_date_time, event.timezone ?? null)
  return listedEnd ? new Date(end.getTime() + ONLINE_SALE_GRACE_HOURS * 3600 * 1000) : end
}

/** True once online sales have closed (the real end + grace), never from `has_ended` alone. */
export function eventSalesClosed(event: SaleStateInput, now: Date = new Date()): boolean {
  const close = eventSalesCloseInstant(event)
  return close != null && now.getTime() >= close.getTime()
}

/**
 * null when the event is selling; otherwise the closed state to render.
 * Server verdict first (a code closes; an explicit null means the server
 * judged it still selling — inside the grace `has_ended` is true while this
 * is null, and the sale goes ahead); a missing `status` on an old payload is
 * NOT a refusal (the server decides at purchase time either way).
 */
export function eventSaleState(event: SaleStateInput | null | undefined, now: Date = new Date()): EventSaleClosed | null {
  if (!event) return null
  const server = event.sale_refusal
  if (server && server.code) return saleClosedCopy(server.code, server.message)
  if (server === null) return null
  const cancellation = String(event.cancellation_status ?? "none").toLowerCase()
  if (cancellation === "processing" || cancellation === "approved") return saleClosedCopy("event_cancelled")
  const status = String(event.status ?? "").trim().toLowerCase()
  if (status && !SELLABLE_STATUSES.has(status)) return saleClosedCopy("event_not_published")
  if (eventSalesClosed(event, now)) return saleClosedCopy("event_ended")
  return null
}
