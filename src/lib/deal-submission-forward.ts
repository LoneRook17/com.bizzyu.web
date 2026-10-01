// /post-a-deal forwards to Laravel POST /api/deal-submissions.
// TrustHosts (enabled on the prod app) rejects any host other than
// bizzy-deals.com with 404 "Bad hostname provided." Without
// Accept: application/json that 404 is an HTML error page.

export const TRUSTED_DEAL_SUBMISSIONS_ORIGIN = "https://bizzy-deals.com"

export const DEAL_SUBMISSIONS_FORWARD_HEADERS = {
  "Content-Type": "application/json",
  Accept: "application/json",
} as const

export const FORWARD_SAVE_ERROR =
  "We couldn't save this deal. Please try again, or email Partnerships@BizzyU.com."

export function normalizeOrigin(raw: string | undefined | null): string {
  return (raw ?? "").trim().replace(/\/+$/, "")
}

/**
 * Where this route POSTs the deal. Always the trusted prod origin unless
 * DEAL_SUBMISSIONS_API_URL is set. The shared admin-host env var is not consulted.
 */
export function dealSubmissionsForwardOrigin(override?: string | null): string {
  return normalizeOrigin(override) || TRUSTED_DEAL_SUBMISSIONS_ORIGIN
}

export function submissionEmailSubject(
  failedSave: boolean,
  title: string,
  businessName: string,
): string {
  const base = `New Deal Submission: ${title}: ${businessName}`
  return failedSave ? `[NOT SAVED] ${base}` : base
}

/** Cap logged upstream bodies so an HTML 404 page cannot flood the log. */
export function forwardFailureLog(status: number, body: string): { status: number; body: string } {
  return { status, body: body.slice(0, 2000) }
}
