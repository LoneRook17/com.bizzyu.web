// Never-blank promoter Name cell for event analytics.
//
// New tracking_links persist promoter_name as "" on purpose (legacy column).
// promoter_user_id is the identity, but the insights payload still sends
// promoter_name (often empty) plus code. The Name column used to bind
// promoter_name only, so a row with sales and commission could render blank.
//
// Priority, most-specific first. Empty and whitespace-only strings are missing.
//   1. display name / promoter_name
//   2. first + last (either side is enough)
//   3. email local-part
//   4. tracking / promo code
//   5. "Promoter"

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

function firstPresent(...values: Array<string | null | undefined>): string {
  for (const value of values) {
    const text = clean(value)
    if (text) return text
  }
  return ""
}

function firstLastName(link: PromoterNameSource): string {
  const first = clean(link.first_name)
  const last = clean(link.last_name)
  return [first, last].filter(Boolean).join(" ")
}

function emailLocalPart(email: string | null | undefined): string {
  const trimmed = clean(email)
  if (!trimmed) return ""
  const at = trimmed.indexOf("@")
  if (at <= 0) return ""
  return trimmed.slice(0, at).trim()
}

/**
 * Resolve what Promoter Performance shows in the Name cell.
 * Always returns a non-empty string.
 */
export function promoterDisplayName(link: PromoterNameSource): string {
  const display = firstPresent(
    link.display_name,
    link.promoter_name,
    link.full_name,
    link.name,
  )
  if (display) return display

  const combined = firstLastName(link)
  if (combined) return combined

  const local = emailLocalPart(link.email)
  if (local) return local

  const code = firstPresent(link.code, link.promo_code)
  if (code) return code

  return PROMOTER_NAME_FALLBACK
}
