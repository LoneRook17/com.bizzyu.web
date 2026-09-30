// Host for the public /post-a-deal form's forward to Laravel
// POST /api/deal-submissions.
//
// This route used to read ADMIN_API_URL. That var is left untouched in Vercel
// because other config may still set it. Nothing else in this repo reads it
// (see the inventory in the PR). The deal forward uses its own var, and falls
// back to the trusted prod origin when that var is unset.

export const TRUSTED_DEAL_SUBMISSIONS_ORIGIN = "https://bizzy-deals.com"

/** Origin only, no trailing slash, never taken from the request. */
export function dealSubmissionsApiOrigin(raw?: string | null): string {
  const configured = (raw ?? "").trim().replace(/\/+$/, "")
  return configured || TRUSTED_DEAL_SUBMISSIONS_ORIGIN
}
