import { KNIGHT_BUSINESS_ID } from "./business/knight.ts"
import { KNIGHT_VENUE_ID } from "./knight-venue-theme.ts"

/**
 * Knight Library venue links (2026-10-08).
 *
 * `https://knightlibrary.app/v` is the ONE link for the Knight Library venue:
 * the Knight app claims it (AASA on knightlibrary.app), so a phone with the
 * app opens the app to Home; without the app, the link 302s to the
 * Knight-themed bizzyu.com/venue/:id page. It never names Bizzy, never
 * fires `bizzy://`, and never hands off to the Bizzy app.
 *
 * Used by the public venue page's "Open in Knight Library" button and by the
 * business dashboard's Venue pages card (QR / Copy link / Open page), for
 * exactly one venue (NEXT_PUBLIC_KNIGHT_VENUE_ID) while the admin
 * "Knight app-only tickets" toggle is ON. Every other venue keeps
 * `${origin}/venue/:id`.
 */
export const KNIGHT_VENUE_APP_LINK = "https://knightlibrary.app/v"

export function isKnightVenueId(venueId: number | string | null | undefined): boolean {
  if (venueId == null || venueId === "") return false
  const n = Number(venueId)
  return Number.isInteger(n) && n > 0 && n === KNIGHT_VENUE_ID
}

export function isKnightBusinessId(businessId: number | string | null | undefined): boolean {
  if (businessId == null || businessId === "") return false
  const n = Number(businessId)
  return Number.isInteger(n) && n > 0 && n === KNIGHT_BUSINESS_ID
}

/**
 * The shareable link for a venue page card. Knight venue + toggle ON →
 * the Knight app link; anything else → the public page on this origin,
 * exactly the string the dashboard has always shown.
 */
export function venueShareUrl(input: {
  venueId: number | string
  origin: string
  knightAppOnlyTickets?: boolean | null | undefined
}): string {
  if (isKnightVenueId(input.venueId) && input.knightAppOnlyTickets === true) return KNIGHT_VENUE_APP_LINK
  return `${input.origin}/venue/${input.venueId}`
}

/** Download file name for the venue QR PNG. */
export function venueQrFileName(venueName: string, knight: boolean): string {
  const slug = venueName.toLowerCase().replace(/[^a-z0-9]+/g, "-")
  return `${slug}-${knight ? "knight-library" : "bizzy"}-qr.png`
}

/**
 * Tap handler companion for the "Open in Knight Library" anchor
 * (href = KNIGHT_VENUE_APP_LINK). With the app installed iOS takes the
 * universal link and the page is backgrounded; without it Safari would just
 * follow the 302 back to this page, so after `delayMs` with the page still
 * visible we go to the App Store instead. Only ever called when
 * NEXT_PUBLIC_KNIGHT_APP_STORE_URL is set (the button is hidden otherwise).
 */
export function scheduleAppStoreFallback(
  appStoreUrl: string,
  delayMs = 1600,
  win: Pick<Window, "setTimeout" | "location" | "document"> | undefined = typeof window === "undefined" ? undefined : window,
): void {
  if (!win) return
  win.setTimeout(() => {
    if (win.document.visibilityState === "visible") win.location.href = appStoreUrl
  }, delayMs)
}
