import { KNIGHT_BUSINESS_ID } from "./business/knight.ts"

/**
 * Knight Library venue page theme (2026-10-08).
 *
 * The public /venue/:id page wears the Knight Library chrome (Knight logo,
 * gold on black, "Open in Knight Library") for EXACTLY one venue, and only
 * while the admin "Knight app-only tickets" toggle is ON. The toggle rides on
 * the public venue payload as `venue.knight_app_only_tickets`, stamped by
 * services on the Knight venue alone. Every other venue, and the Knight venue
 * with the toggle OFF, renders the Bizzy page exactly as before.
 *
 * Identity: NEXT_PUBLIC_KNIGHT_VENUE_ID (DEV default 990227; production must
 * set it to the Knight Library venue id) OR the existing
 * NEXT_PUBLIC_KNIGHT_BUSINESS_ID. Ids only, never a name.
 *
 * The tokens mirror core's CheckoutAccent Knight branch (the app-only web
 * checkout) so the hop checkout → venue page reads as one product.
 */
export const KNIGHT_VENUE_ID: number = (() => {
  const raw = process.env.NEXT_PUBLIC_KNIGHT_VENUE_ID
  const n = raw ? Number(raw) : NaN
  return Number.isInteger(n) && n > 0 ? n : 990227
})()

export type VenueBrand = "knight" | "bizzy"

export interface VenueBrandInput {
  venueId: number | string | null | undefined
  businessId?: number | string | null | undefined
  /** `venue.knight_app_only_tickets` from GET /ui/venues/venue/:id. */
  knightAppOnlyTickets?: boolean | null | undefined
}

function positiveId(value: number | string | null | undefined): number | null {
  if (value == null || value === "") return null
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : null
}

export function isKnightVenueIdentity(input: Pick<VenueBrandInput, "venueId" | "businessId">): boolean {
  return (
    positiveId(input.venueId) === KNIGHT_VENUE_ID ||
    positiveId(input.businessId) === KNIGHT_BUSINESS_ID
  )
}

/** 'knight' iff the venue is Knight Library's AND the toggle is ON (boolean true). */
export function resolveVenueBrand(input: VenueBrandInput): VenueBrand {
  if (!isKnightVenueIdentity(input)) return "bizzy"
  return input.knightAppOnlyTickets === true ? "knight" : "bizzy"
}

/**
 * The Knight app's App Store link for the "Open in Knight Library" button.
 * Unset (or not an https URL) → null, and the page HIDES the button rather
 * than linking anywhere else (never the Bizzy App Store).
 */
export function knightAppStoreUrl(raw: string | undefined = process.env.NEXT_PUBLIC_KNIGHT_APP_STORE_URL): string | null {
  const url = (raw ?? "").trim()
  return /^https:\/\/\S+$/i.test(url) ? url : null
}

/** CheckoutAccent (core) Knight tokens: BrandConfig appBlack / surface / hairline / gold. */
export const KNIGHT_THEME = {
  name: "Knight Library",
  siteUrl: "https://knightlibrary.app",
  logo: "/images/knight-library-logo.png",
  bg: "#050505",
  surface: "#141414",
  border: "#292721",
  accent: "#D1AD63",
  accentBright: "#e2c580",
  accentRgb: "209, 173, 99",
  /** Compact on purpose: it is spliced into the page's rgba(...) literal. */
  veilRgb: "5,5,5",
  rowBg: "#141414",
  rowBorder: "#292721",
  fontStack: 'Inter, -apple-system, BlinkMacSystemFont, ui-sans-serif, sans-serif',
} as const

/** The values the Bizzy venue page has always used (VenuePageClient). */
export const BIZZY_VENUE_THEME = {
  name: "Bizzy",
  siteUrl: "https://bizzyu.com",
  logo: "/images/bizzy-logo.png",
  bg: "#0a0a0f",
  accent: "#05EB54",
  accentRgb: "5, 235, 84",
  veilRgb: "10,10,15",
  rowBg: "#18181F",
  rowBorder: "#2A2A33",
  fontStack: '-apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, ui-sans-serif, sans-serif',
} as const
