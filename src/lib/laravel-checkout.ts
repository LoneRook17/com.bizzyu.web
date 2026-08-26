/**
 * Laravel ticket checkout origin for public guest links.
 *
 * Venue /event cards must not use same-origin `/checkout/:id` on this Next app
 * (Vercel l2gp would serve Next checkout). Live ticket checkout is Laravel:
 * GET /checkout/{eventId} in core `routes/web.php` (PublicController).
 *
 * Vercel env (project `com-bizzyu-web-l2gp`): CHECKOUT_REDIRECT_BASE_URL
 * Alias: LARAVEL_CHECKOUT_BASE_URL
 *
 * Missing env on this DEV deploy still hits DEV Laravel. Do not default to
 * prod bizzyu.com or https://bizzy-deals.com.
 */
export const DEV_LARAVEL_CHECKOUT_ORIGIN = "https://dev.bizzy-deals.com"

export function laravelCheckoutBaseUrl(): string {
  const raw =
    process.env.CHECKOUT_REDIRECT_BASE_URL ||
    process.env.LARAVEL_CHECKOUT_BASE_URL ||
    DEV_LARAVEL_CHECKOUT_ORIGIN
  return raw.replace(/\/$/, "")
}
