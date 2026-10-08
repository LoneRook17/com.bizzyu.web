// Manage Event → Tracking Links (Wave 2B, dashboard surface for Tracking
// Links W1). Pure helpers + copy so the page stays a thin view and the rules
// are pinned by a node test.
//
// Backend contract (services routes/trackingLinks.ts, live on DEV):
//   GET   /business/events/:id/tracking-links            → { links: HostTrackingLink[] }
//   POST  /business/events/:id/tracking-links { label }  → 201 { link }
//   PATCH /business/events/:id/tracking-links/:linkId
//         { label?: string, archived?: boolean }         → { link }
// Owners/managers only (requireBusinessRole). Archived rows come back in the
// same list with `archived_at` set, so "show archived" is a client filter.

import type { HostTrackingLink } from "./types"

/** Mirrors services `TRACKING_LABEL_MAX` — the API refuses anything longer. */
export const TRACKING_LABEL_MAX = 80

export const TRACKING_LINKS_TITLE = "Tracking links"
export const TRACKING_LINKS_SUBTITLE = "Share links for flyers, bios and posts. See which one brings people in."

/** The one-line explainer behind the (i) icon. Luke's exact wording (Wave 2B). */
export const TRACKING_LINKS_TOOLTIP =
  "Each link tracks clicks and ticket purchases. If someone clicks more than one link, the last one they clicked gets credit."

export const TRACKING_LINKS_EMPTY_TITLE = "No tracking links yet"
export const TRACKING_LINKS_EMPTY_DESCRIPTION =
  "Make one per place you share the event, like a flyer or your Instagram bio, and see which one sells."

export const TRACKING_LINK_ARCHIVE_TITLE = "Archive this link?"
export const TRACKING_LINK_ARCHIVE_DESCRIPTION =
  "The link keeps working and keeps counting. It just moves out of the main list. You can unarchive it any time."

export type LabelCheck = { ok: true; label: string } | { ok: false; error: string }

/**
 * Client-side mirror of services `normalizeTrackingLabel`: trim, collapse
 * inner whitespace, require 1..TRACKING_LABEL_MAX characters. The server
 * re-validates; this just gives the operator the error before the round trip.
 */
export function checkTrackingLabel(raw: string): LabelCheck {
  const label = (raw ?? "").replace(/\s+/g, " ").trim()
  if (!label) return { ok: false, error: "Give the link a name." }
  if (label.length > TRACKING_LABEL_MAX) {
    return { ok: false, error: `Keep the name under ${TRACKING_LABEL_MAX} characters.` }
  }
  return { ok: true, label }
}

export function isArchived(link: Pick<HostTrackingLink, "archived_at">): boolean {
  return link.archived_at != null && link.archived_at !== ""
}

/**
 * Active first (API already orders archived last, newest first inside each
 * group — keep that order, just drop archived unless asked).
 */
export function visibleTrackingLinks(links: HostTrackingLink[], showArchived: boolean): HostTrackingLink[] {
  return showArchived ? links : links.filter((l) => !isArchived(l))
}

export function countArchived(links: HostTrackingLink[]): number {
  return links.filter(isArchived).length
}

/** Row label: the host's name, or the code when an older row has none. */
export function trackingLinkDisplayName(link: Pick<HostTrackingLink, "label" | "code">): string {
  const label = (link.label ?? "").trim()
  return label || link.code
}

/**
 * Replace one row in place (after POST/PATCH) so the table never flickers
 * through a reload. Unknown id → append (a fresh POST).
 */
export function upsertTrackingLink(links: HostTrackingLink[], link: HostTrackingLink): HostTrackingLink[] {
  const idx = links.findIndex((l) => l.id === link.id)
  if (idx === -1) return [link, ...links]
  const next = links.slice()
  next[idx] = link
  return next
}
