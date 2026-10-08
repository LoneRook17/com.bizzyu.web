/**
 * Shared helpers for the two public landing pages that hand off to Laravel
 * checkout: /event/:id (server redirect) and /event/:id/checkout (meta-refresh).
 *
 * Both pages must forward the FULL query string (?ref=<tracking code> plus any
 * other params such as ?ticket_id= or campaign tags) and log the ?ref click
 * exactly once per real navigation. Keeping the logic here lets both pages
 * share one implementation and lets the forwarding be unit-tested without
 * rendering a Next page.
 */

export type SearchParams = Record<string, string | string[] | undefined>

const API_URL = process.env.INTERNAL_API_URL || "http://localhost:3000"

// Link-preview scrapers fetch landing URLs (for OG tags) when a link is pasted
// into a chat — logging those would inflate click counts, so we skip known
// bot/preview user-agents and only count real navigations.
export const CLICK_BOT_UA =
  /bot|crawler|spider|facebookexternalhit|facebot|slackbot|whatsapp|telegram|discord|twitterbot|linkedinbot|pinterest|embedly|iframely|applebot|bingbot|googlebot|skypeuripreview|vkshare|redditbot|preview/i

// Mirrors the services /p/:code param guard. Other ?ref values (e.g. an
// event-share user id) are left for the endpoint to 404 → harmless no-op.
export const TRACKING_CODE_RE = /^[A-Za-z0-9-]{1,64}$/

/** Serialise Next `searchParams` back into a query string, preserving repeats. */
export function buildQueryString(sp: SearchParams | undefined | null): string {
  const params = new URLSearchParams()
  if (!sp) return ""
  for (const [key, value] of Object.entries(sp)) {
    if (value === undefined) continue
    if (Array.isArray(value)) {
      for (const v of value) params.append(key, v)
    } else {
      params.set(key, value)
    }
  }
  return params.toString()
}

/** First `?ref=` value, or undefined. */
export function refFromSearchParams(sp: SearchParams | undefined | null): string | undefined {
  const raw = sp?.ref
  return Array.isArray(raw) ? raw[0] : raw
}

/**
 * Mint a click idempotency token (32 hex chars; matches the services
 * `^[A-Za-z0-9_-]{8,64}$` guard). ONE WRITER PER HOP: this landing logs the
 * click with the token, then forwards it to Laravel checkout as `?clk=` so
 * Laravel's own click writer INSERT IGNOREs it — one chain, one row.
 */
export function mintClickToken(): string {
  return crypto.randomUUID().replace(/-/g, "")
}

/**
 * Laravel checkout URL for an event, carrying every incoming query param,
 * plus `clk=<token>` when this hop logged a click under that token.
 */
export function buildCheckoutTarget(
  laravelBase: string,
  eventId: string | number,
  sp: SearchParams | undefined | null,
  clickToken?: string | null,
): string {
  const params = new URLSearchParams(buildQueryString(sp))
  if (clickToken) params.set("clk", clickToken)
  const qs = params.toString()
  return `${laravelBase}/checkout/${eventId}${qs ? `?${qs}` : ""}`
}

/** Pure decision: should this (ref, user-agent) pair be logged as a click? */
export function shouldLogClick(ref: string | undefined, userAgent: string | null): ref is string {
  if (!ref) return false
  if (!TRACKING_CODE_RE.test(ref)) return false
  if (userAgent && CLICK_BOT_UA.test(userAgent)) return false
  return true
}

/**
 * Promoter / tracking click logging. Web landings are the ONLY click-logging
 * seam for non-app visitors (the in-app iOS tap logs its own click via
 * POST /p/:code). POST (not the GET redirect) logs the click and returns JSON
 * without a 302; a NULL idempotency token always logs (one real load = one
 * click). Best-effort: never lets a failure break the redirect.
 */
export async function logPromoterClick(
  ref: string | undefined,
  userAgent: string | null,
  clickToken: string | null = null,
  fetchImpl: typeof fetch = fetch,
  apiUrl: string = API_URL,
): Promise<boolean> {
  if (!shouldLogClick(ref, userAgent)) return false
  try {
    const ctl = new AbortController()
    const timer = setTimeout(() => ctl.abort(), 2000)
    try {
      await fetchImpl(`${apiUrl}/p/${encodeURIComponent(ref)}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(userAgent ? { "user-agent": userAgent } : {}),
        },
        // The token travels on to Laravel as ?clk= (buildCheckoutTarget) so
        // the second hop dedups instead of logging a second row.
        body: JSON.stringify(clickToken ? { idempotency_token: clickToken } : {}),
        cache: "no-store",
        signal: ctl.signal,
      })
      return true
    } finally {
      clearTimeout(timer)
    }
  } catch {
    return false
  }
}
