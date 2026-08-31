// Never-blank promoter Name cell for event analytics.
//
// Name must be a person's name, never a tracking slug/code.
// Services persist promoter_name as "" on new tracking_links (legacy column)
// and may still COALESCE the slug onto promoter_name or send `code` as
// `{promoterslug}-{eventslug}` from buildPromoterCode. Treat those as missing.
//
// Priority, most-specific first. Empty, whitespace, and tracking slugs are missing.
//   1. display_name
//   2. full_name / name if they look like a person name
//   3. first + last (either side is enough); title-case if stored lowercase
//   4. promoter_name only if it is a human name (not a slug/code)
//   5. email local-part only if it is not the same slug
//   6. "Promoter"
//
// Never shown: tracking `code` / `promo_code`, username-event slugs
// (e.g. foo-promotertester, reggieblack-promotertester).

export const PROMOTER_NAME_FALLBACK = "Promoter"

/** Identity fields the insights tracking-link row may already carry. */
export type PromoterNameSource = {
  display_name?: string | null
  promoter_name?: string | null
  full_name?: string | null
  name?: string | null
  first_name?: string | null
  last_name?: string | null
  email?: string | null
  code?: string | null
  promo_code?: string | null
}

function clean(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : ""
}

function trackingCodes(link: PromoterNameSource): string[] {
  return [clean(link.code), clean(link.promo_code)]
    .filter(Boolean)
    .map((code) => code.toLowerCase())
}

/**
 * Tracking slugs look like `{promoterslug}-{eventslug}` from services
 * `buildPromoterCode`. Also skip anything equal to the row's code / promo_code.
 *
 * Given names (first/last) still skip code matches and `*-promotertester`,
 * but a hyphenated token like "mary-jane" is a person name, not an event slug.
 */
function isTrackingSlug(
  value: string,
  codes: string[],
  opts: { givenName?: boolean } = {},
): boolean {
  const text = value.trim()
  if (!text) return true
  const lowered = text.toLowerCase()
  if (codes.includes(lowered)) return true
  // Spaces mean a person name (e.g. "reggie black"), not a tracking code.
  if (/\s/.test(text)) return false
  // Hyphenated *-promotertester (QA / default test event).
  if (/^.+-promotertester$/i.test(text)) return true
  if (opts.givenName) return false
  // Compact username-event slug: lowercase alphanumerics joined by hyphens.
  if (/^[a-z0-9]+(?:-[a-z0-9]+)+$/.test(text)) return true
  return false
}

/** Title-case a token only when the stored value is entirely lowercase. */
function titleCasePart(part: string): string {
  if (!part) return part
  if (part !== part.toLowerCase() || !/[a-z]/.test(part)) return part
  return part.charAt(0).toUpperCase() + part.slice(1)
}

function titleCaseIfLower(value: string): string {
  return value
    .split(/\s+/)
    .map((word) => word.split("-").map(titleCasePart).join("-"))
    .join(" ")
}

function humanName(
  value: string | null | undefined,
  codes: string[],
  opts: { givenName?: boolean } = {},
): string {
  const text = clean(value)
  if (!text || isTrackingSlug(text, codes, opts)) return ""
  return titleCaseIfLower(text)
}

function firstLastName(link: PromoterNameSource, codes: string[]): string {
  const first = humanName(link.first_name, codes, { givenName: true })
  const last = humanName(link.last_name, codes, { givenName: true })
  return [first, last].filter(Boolean).join(" ")
}

function emailLocalPart(email: string | null | undefined, codes: string[]): string {
  const trimmed = clean(email)
  if (!trimmed) return ""
  const at = trimmed.indexOf("@")
  if (at <= 0) return ""
  const local = trimmed.slice(0, at).trim()
  if (!local || isTrackingSlug(local, codes)) return ""
  return local
}

/**
 * Resolve what Promoter Performance shows in the Name cell.
 * Always returns a non-empty string. Never returns a tracking slug.
 */
export function promoterDisplayName(link: PromoterNameSource): string {
  const codes = trackingCodes(link)

  const display = humanName(link.display_name, codes)
  if (display) return display

  const full = humanName(link.full_name, codes) || humanName(link.name, codes)
  if (full) return full

  const combined = firstLastName(link, codes)
  if (combined) return combined

  const promoter = humanName(link.promoter_name, codes)
  if (promoter) return promoter

  const local = emailLocalPart(link.email, codes)
  if (local) return local

  return PROMOTER_NAME_FALLBACK
}
