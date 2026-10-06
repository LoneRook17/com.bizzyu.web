import type { Business } from "./types"

/**
 * Knight Library — the white-label app on the shared Bizzy backend.
 *
 * The business dashboard shows Knight-only surfaces (the "Featured on Knight
 * app" section on /business/events) for exactly one business. Every other
 * business never mounts them and never calls their endpoints. DEV id 999935;
 * production must set NEXT_PUBLIC_KNIGHT_BUSINESS_ID.
 */
export const KNIGHT_BUSINESS_ID: number = (() => {
  const raw = process.env.NEXT_PUBLIC_KNIGHT_BUSINESS_ID
  const n = raw ? Number(raw) : NaN
  return Number.isInteger(n) && n > 0 ? n : 999935
})()

export function isKnightBusiness(
  business: Pick<Business, "business_id"> | null | undefined,
): boolean {
  return !!business && Number(business.business_id) === KNIGHT_BUSINESS_ID
}
