/**
 * Shape validation for the public Resend forms (audit F30): contact,
 * events-contact and the deal-submission signup flow.
 *
 * Each parser takes the raw JSON body and returns either a typed object built
 * ONLY from known keys (anything else in the body is dropped) with every
 * string trimmed, control characters removed and lengths capped, or an
 * `Invalid` with the HTTP status the route should answer:
 *   400 — a required field is missing (unchanged from before)
 *   422 — the email does not look like an email
 *
 * Capping instead of rejecting over-long text keeps a real visitor's long
 * message from bouncing; the mail just carries the first N characters.
 *
 * Dependency-free (type-only imports) so it runs under `node --test`.
 */
import type { BusinessInfo, DealAvailability, DealInfo, MediaInfo } from "../types.ts"

export const LIMITS = {
  short: 200, // names, titles, selects
  email: 254,
  phone: 40,
  medium: 500, // addresses, savings, one-line descriptions
  long: 5000, // free-text message / details
  // A data: URL for an uploaded image. The platform body limit is the real cap;
  // this only stops a string from being treated as "short".
  media: 12_000_000,
} as const

export type Invalid = { ok: false; status: 400 | 422; error: string }

const MISSING: Invalid = { ok: false, status: 400, error: "Missing required fields" }
const BAD_EMAIL: Invalid = { ok: false, status: 422, error: "Enter a valid email address" }

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g

/** Multi-line text: keep newlines, strip other control characters, cap. */
export function text(raw: unknown, max: number): string {
  if (typeof raw !== "string") return ""
  return raw.replace(/\r\n?/g, "\n").replace(CONTROL_CHARS, "").trim().slice(0, max)
}

/** Single-line text: collapse all whitespace (including newlines) to one space. */
export function line(raw: unknown, max: number): string {
  if (typeof raw !== "string") return ""
  return raw.replace(CONTROL_CHARS, "").replace(/\s+/g, " ").trim().slice(0, max)
}

/**
 * "Looks like an email": one @, something on both sides, a dot in the domain,
 * no whitespace, within the RFC length. Deliberately loose — the goal is to
 * reject garbage and injected text, not to validate deliverability.
 */
export function isEmailLike(value: string): boolean {
  if (!value || value.length > LIMITS.email) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function email(raw: unknown): string | null {
  const v = line(raw, LIMITS.email)
  return isEmailLike(v) ? v : null
}

// ---------------------------------------------------------------- contact

export interface ContactData {
  name: string
  email: string
  type: string
  message: string
}

export function parseContact(body: unknown): { ok: true; data: ContactData } | Invalid {
  const b = (body ?? {}) as Record<string, unknown>
  const name = line(b.name, LIMITS.short)
  const type = line(b.type, LIMITS.short)
  const message = text(b.message, LIMITS.long)
  const rawEmail = line(b.email, LIMITS.email)
  if (!name || !rawEmail || !type || !message) return MISSING
  const em = email(rawEmail)
  if (!em) return BAD_EMAIL
  return { ok: true, data: { name, email: em, type, message } }
}

// --------------------------------------------------------- events-contact

export interface EventsContactData {
  venueName: string
  contactName: string
  email: string
  phone: string
  venueType: string
  eventTypes: string
  frequency: string
  details: string
}

/** eventTypes may arrive as a string or an array of strings (multi-select). */
function joinList(raw: unknown, max: number): string {
  if (Array.isArray(raw)) {
    return raw
      .filter((v): v is string => typeof v === "string")
      .map((v) => line(v, LIMITS.short))
      .filter(Boolean)
      .join(", ")
      .slice(0, max)
  }
  return line(raw, max)
}

export function parseEventsContact(body: unknown): { ok: true; data: EventsContactData } | Invalid {
  const b = (body ?? {}) as Record<string, unknown>
  const venueName = line(b.venueName, LIMITS.short)
  const contactName = line(b.contactName, LIMITS.short)
  const rawEmail = line(b.email, LIMITS.email)
  const phone = line(b.phone, LIMITS.phone)
  const venueType = line(b.venueType, LIMITS.short)
  const eventTypes = joinList(b.eventTypes, LIMITS.medium)
  const frequency = line(b.frequency, LIMITS.short)
  const details = text(b.details, LIMITS.long)
  if (!venueName || !contactName || !rawEmail || !venueType || !eventTypes || !frequency) return MISSING
  const em = email(rawEmail)
  if (!em) return BAD_EMAIL
  return {
    ok: true,
    data: { venueName, contactName, email: em, phone, venueType, eventTypes, frequency, details },
  }
}

// ------------------------------------------------------------ submissions

export interface SubmissionData {
  business: BusinessInfo
  deal: DealInfo
  media: MediaInfo
}

function availability(raw: unknown): DealAvailability {
  const a = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>
  const days = Array.isArray(a.days)
    ? a.days
        .map((d) => Number(d))
        .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
        .filter((d, i, arr) => arr.indexOf(d) === i)
        .slice(0, 7)
    : []
  return {
    enabled: a.enabled === true,
    startTime: line(a.startTime, 10),
    endTime: line(a.endTime, 10),
    days,
  }
}

/** Only a data: image URL or an http(s) URL is forwarded; anything else is dropped. */
function mediaUrl(raw: unknown): string {
  if (typeof raw !== "string") return ""
  const v = raw.trim().slice(0, LIMITS.media)
  if (/^data:image\/\w+;base64,/.test(v)) return v
  if (/^https?:\/\//i.test(v) && v.length <= LIMITS.medium && !/\s/.test(v)) return v
  return ""
}

export function parseSubmission(body: unknown): { ok: true; data: SubmissionData } | Invalid {
  const b = (body ?? {}) as Record<string, unknown>
  const biz = (b.business && typeof b.business === "object" ? b.business : {}) as Record<string, unknown>
  const deal = (b.deal && typeof b.deal === "object" ? b.deal : {}) as Record<string, unknown>
  const media = (b.media && typeof b.media === "object" ? b.media : {}) as Record<string, unknown>

  const business: BusinessInfo = {
    businessName: line(biz.businessName, LIMITS.short),
    contactName: line(biz.contactName, LIMITS.short),
    email: line(biz.email, LIMITS.email),
    phone: line(biz.phone, LIMITS.phone),
    address: line(biz.address, LIMITS.medium),
    website: line(biz.website, LIMITS.medium),
    instagram: line(biz.instagram, LIMITS.short),
    campus: line(biz.campus, LIMITS.short),
  }
  const dealInfo: DealInfo = {
    title: line(deal.title, LIMITS.short),
    description: text(deal.description, LIMITS.long),
    category: line(deal.category, LIMITS.short),
    redemptionFrequency: line(deal.redemptionFrequency, LIMITS.short),
    limitedSupplyCount: line(deal.limitedSupplyCount, 20),
    estimatedSavings: line(deal.estimatedSavings, LIMITS.short),
    startDate: line(deal.startDate, 40),
    endDate: line(deal.endDate, 40),
    availability: availability(deal.availability),
  }
  const mediaInfo: MediaInfo = {
    logoUrl: mediaUrl(media.logoUrl),
    dealImageUrl: mediaUrl(media.dealImageUrl),
  }

  if (!business.businessName || !business.email || !dealInfo.title) return MISSING
  const em = email(business.email)
  if (!em) return BAD_EMAIL
  business.email = em
  return { ok: true, data: { business, deal: dealInfo, media: mediaInfo } }
}
