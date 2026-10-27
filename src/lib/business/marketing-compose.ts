/**
 * The marketing composer contract, shared by the venue blast composer, the
 * per-event Announce and the (unrouted) legacy modal — the SAME rules the app's
 * BlastComposerSheet enforces (2026-10-27 parity):
 *
 *   • texts cap at 160 (one GSM-7 segment before the opt-out line the server
 *     appends); announcements at 280 — never 400;
 *   • emojis are stripped as typed/pasted on BOTH channels (an emoji forces
 *     UCS-2: 70-char segments and a double bill); a short hint says why;
 *   • a staged flow — compose → review → sending → sent — so a blast can
 *     never go out from the textarea in one click, and never twice;
 *   • `Add event link` drops the PROD public event page into the message.
 *
 * Pure functions only; the React components render them.
 */

import type { BlastChannel } from "@/components/business/dashboard/marketing/types"

export const SMS_MAX = 160
export const ANNOUNCEMENT_MAX = 280
export const SMS_SUFFIX = "\nReply STOP to opt out · Bizzy"
export const EMOJI_HINT = "Emojis aren't supported here."
export const LINK_NO_ROOM_HINT = "Not enough room for the link."

export function charLimitFor(channel: BlastChannel): number {
  return channel === "sms" ? SMS_MAX : ANNOUNCEMENT_MAX
}

/**
 * Same ranges as the app's NoEmojiTextInputFormatter: emoticons, pictographs,
 * transport, flags, skin tones, ZWJ, variation selectors, keycaps, dingbats,
 * misc symbols and tag characters. Accented letters, currency and punctuation
 * survive.
 */
const EMOJI_RE =
  /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}\u{20E3}\u{E0020}-\u{E007F}\u{1F3FB}-\u{1F3FF}]/gu

export function hasMarketingEmoji(text: string): boolean {
  EMOJI_RE.lastIndex = 0
  return EMOJI_RE.test(text)
}

/** Strip emoji; `stripped` says whether anything was removed (for the hint). */
export function stripMarketingEmoji(text: string): { text: string; stripped: boolean } {
  const cleaned = text.replace(EMOJI_RE, "")
  return { text: cleaned, stripped: cleaned !== text }
}

/**
 * What a keystroke/paste becomes: emoji gone, hard-capped at the channel
 * limit. The cursor is re-derived from the kept prefix so it stays on the
 * text the user still sees.
 */
export function sanitizeMarketingInput(
  raw: string,
  limit: number,
  cursor: number = raw.length,
): { text: string; cursor: number; strippedEmoji: boolean } {
  const { text: noEmoji, stripped } = stripMarketingEmoji(raw)
  const prefix = stripMarketingEmoji(raw.slice(0, Math.max(0, Math.min(cursor, raw.length)))).text
  const text = Array.from(noEmoji).slice(0, limit).join("")
  const cursorOut = Math.min(Array.from(prefix).length, Array.from(text).length)
  return { text, cursor: charIndexToUnitIndex(text, cursorOut), strippedEmoji: stripped }
}

/** Count code points (what the app's LengthLimitingTextInputFormatter counts). */
export function marketingLength(text: string): number {
  return Array.from(text).length
}

function charIndexToUnitIndex(text: string, codePoints: number): number {
  return Array.from(text).slice(0, codePoints).join("").length
}

// ─── Add event link ──────────────────────────────────────────────────────

/**
 * The inserted link is ALWAYS the production public event page — the page
 * the app's share, the host's Event Link row, the OG unfurl and the AASA
 * deep link are built for. Deliberately NOT `NEXT_PUBLIC_WEB_BASE_URL`: the
 * DEV twin would otherwise put a `vercel.app` host into a real text message.
 * Marketing copy goes to customers; it is prod or nothing. (Decision
 * 2026-10-27 — see the app's marketing_event_link.dart twin.)
 */
export const MARKETING_PUBLIC_WEB_HOST = "https://bizzyu.com"

/** Bare `/event/{id}` — no utm/ref, so an operator's blast is never promoter-attributed. */
export function marketingEventLinkUrl(eventId: number | string): string {
  return `${MARKETING_PUBLIC_WEB_HOST}/event/${eventId}`
}

/**
 * Insert `link` at [selStart, selEnd) (replacing the selection), padding a
 * single space on either side where the neighbour is not whitespace, cursor
 * after the link. `null` when the result would exceed `limit` — the caller
 * shows LINK_NO_ROOM_HINT rather than a truncated (dead) URL.
 */
export function insertMarketingLink(
  text: string,
  link: string,
  selStart: number,
  selEnd: number,
  limit: number,
): { text: string; cursor: number } | null {
  const start = clamp(Math.min(selStart, selEnd), 0, text.length)
  const end = clamp(Math.max(selStart, selEnd), 0, text.length)
  const before = text.slice(0, start)
  const after = text.slice(end)
  const needsLead = before.length > 0 && !/\s$/.test(before)
  const needsTrail = after.length > 0 && !/^\s/.test(after)
  const insert = `${needsLead ? " " : ""}${link}${needsTrail ? " " : ""}`
  const next = `${before}${insert}${after}`
  if (marketingLength(next) > limit) return null
  return { text: next, cursor: before.length + insert.length }
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Number.isFinite(n) ? n : hi))
}

/** A row the venue-wide link picker can offer: it needs a public page (an id). */
export function linkableMarketingRows<T extends { eventId: number | null }>(rows: T[]): Array<T & { eventId: number }> {
  return rows.filter((r): r is T & { eventId: number } => r.eventId != null)
}

// ─── Stages ──────────────────────────────────────────────────────────────

export type ComposerStage = "compose" | "review" | "sending" | "sent"

export type ComposerEvent =
  /** `Review & send` from compose (only when the message is sendable). */
  | "review"
  /** `Edit message`, or any edit to the text while reviewing. */
  | "edit"
  /** `Send to N …` from review. */
  | "send"
  /** The server accepted (2xx). Terminal: only Done remains. */
  | "sent"
  /** A real (non-timeout) error: back to compose with the error shown. */
  | "fail"

/**
 * The only legal moves. Anything else returns the stage unchanged — so a
 * stray click can never skip review or re-send after `sent`.
 */
export function composerTransition(stage: ComposerStage, event: ComposerEvent): ComposerStage {
  switch (stage) {
    case "compose":
      return event === "review" ? "review" : "compose"
    case "review":
      if (event === "send") return "sending"
      if (event === "edit") return "compose"
      return "review"
    case "sending":
      if (event === "sent") return "sent"
      if (event === "fail") return "compose"
      return "sending"
    case "sent":
      return "sent"
  }
}

/** Compose primary enabled: text within the cap, audience known and reachable. */
export function canReview(input: {
  text: string
  limit: number
  previewLoading: boolean
  reachable: number | null
  locked: boolean
  mustPickVenue?: boolean
}): boolean {
  const trimmed = input.text.trim()
  return (
    !input.locked &&
    !input.previewLoading &&
    !(input.mustPickVenue ?? false) &&
    trimmed.length > 0 &&
    marketingLength(input.text) <= input.limit &&
    (input.reachable ?? 0) > 0
  )
}

export type Cohort = "followers" | "ticket holders" | "attendees"

export function cohortNoun(cohort: Cohort, n: number): string {
  if (n === 1) {
    if (cohort === "followers") return "follower"
    if (cohort === "ticket holders") return "ticket holder"
    return "attendee"
  }
  return cohort
}

/** Review primary: `Send to 12 ticket holders`. */
export function reviewButtonLabel(cohort: Cohort, n: number): string {
  return `Send to ${n} ${cohortNoun(cohort, n)}`
}

/** Compose reach line: `Sending to 8 of 10 followers with SMS opted-in.` */
export function reachLine(input: {
  channel: BlastChannel
  cohort: Cohort
  reachable: number
  total: number
}): string {
  const how = input.channel === "sms" ? "SMS opted-in" : "push enabled"
  return `Sending to ${input.reachable} of ${input.total} ${cohortNoun(input.cohort, input.total)} with ${how}.`
}

/** Sent panel: `On its way to 12 ticket holders.` */
export function sentLine(cohort: Cohort, n: number): string {
  return `On its way to ${n} ${cohortNoun(cohort, n)}.`
}

export function channelLabel(channel: BlastChannel): string {
  return channel === "sms" ? "Text Blast" : "Announcement"
}

/** The review card's quota note — same wording as the app. */
export function quotaNote(channel: BlastChannel, scope: "venue" | "account"): string {
  const tail = scope === "venue" ? " for this venue" : ""
  return channel === "sms"
    ? `Uses this week's text blast${tail}.`
    : `Uses 1 of this week's 2 announcements${tail}.`
}

/** `1d 3h` / `2h 5m` / `4m 10s` / `30s` / `now` — the reset countdown. */
export function formatCountdown(totalSeconds: number): string {
  if (totalSeconds <= 0) return "now"
  const d = Math.floor(totalSeconds / 86400)
  const h = Math.floor((totalSeconds % 86400) / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

/** The cooldown note — same wording as the app's sheet. */
export function cooldownNote(channel: BlastChannel, scope: "venue" | "account", seconds: number): string {
  const tail = scope === "venue" ? " for this venue" : ""
  const when = `Resets Monday (in ${formatCountdown(seconds)}).`
  return channel === "sms"
    ? `This week's text blast is used${tail}. ${when}`
    : `Both of this week's announcements are used${tail}. ${when}`
}

/** A client-generated UUIDv4 the server dedupes a retry on (same contract as the app). */
export function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID()
  // Non-secure fallback for very old runtimes: still unique enough for a retry dedupe.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16)
  })
}
