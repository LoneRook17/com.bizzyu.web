/**
 * Laravel ticket checkout origin for public guest links.
 *
 * Venue /event cards must not use same-origin `/checkout/:id` on this Next app
 * (Vercel l2gp would serve Next checkout). Live ticket checkout is Laravel:
 * GET /checkout/{eventId} in core `routes/web.php` (PublicController).
 *
 * Env (any of these, first wins):
 *   NEXT_PUBLIC_CHECKOUT_REDIRECT_BASE_URL  — required for "use client" callers
 *   CHECKOUT_REDIRECT_BASE_URL              — server-only (SSR / route handlers)
 *   LARAVEL_CHECKOUT_BASE_URL               — alias
 *
 * Vercel:
 *   prod `com-bizzyu-web`: https://bizzy-deals.com
 *   DEV  `com-bizzyu-web-l2gp`: https://dev.bizzy-deals.com
 *
 * Dashboard View / Event link call this from client components. Server-only
 * env is empty in the browser, so without NEXT_PUBLIC_* (or the host
 * fallback below) the old code fell through to DEV Laravel on prod.
 */
export const DEV_LARAVEL_CHECKOUT_ORIGIN = "https://dev.bizzy-deals.com"
export const PROD_LARAVEL_CHECKOUT_ORIGIN = "https://bizzy-deals.com"

function trimOrigin(raw: string): string {
  return raw.replace(/\/$/, "")
}

/** Browser host → Laravel origin when public env was not inlined. */
export function checkoutOriginFromHostname(hostname: string): string | null {
  const host = hostname.toLowerCase()
  if (host === "bizzyu.com" || host === "www.bizzyu.com") {
    return PROD_LARAVEL_CHECKOUT_ORIGIN
  }
  // DEV Vercel project / previews
  if (host.includes("l2gp") || host.endsWith(".vercel.app")) {
    return DEV_LARAVEL_CHECKOUT_ORIGIN
  }
  return null
}

export function laravelCheckoutBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_CHECKOUT_REDIRECT_BASE_URL ||
    process.env.CHECKOUT_REDIRECT_BASE_URL ||
    process.env.LARAVEL_CHECKOUT_BASE_URL

  if (raw && raw.trim()) return trimOrigin(raw.trim())

  if (typeof window !== "undefined") {
    const fromHost = checkoutOriginFromHostname(window.location.hostname)
    if (fromHost) return fromHost
  }

  // Server / SSR without env: prefer prod only on the production Vercel project.
  // Preview/DEV projects must keep the DEV Laravel fallback.
  if (process.env.VERCEL_ENV === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    const prodUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL.toLowerCase()
    if (prodUrl.includes("bizzyu.com") && !prodUrl.includes("l2gp")) {
      return PROD_LARAVEL_CHECKOUT_ORIGIN
    }
  }

  return DEV_LARAVEL_CHECKOUT_ORIGIN
}
