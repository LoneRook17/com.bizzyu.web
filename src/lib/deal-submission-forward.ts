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

/** Warning when the forward host is missing or not the TrustHosts allowlist. */
export function adminApiUrlWarning(adminApiUrl: string | undefined | null): string | null {
  const origin = normalizeOrigin(adminApiUrl)
  if (!origin) {
    return "ADMIN_API_URL is unset. /post-a-deal cannot save the deal to Laravel."
  }
  if (origin !== TRUSTED_DEAL_SUBMISSIONS_ORIGIN) {
    return `ADMIN_API_URL is ${origin}, not ${TRUSTED_DEAL_SUBMISSIONS_ORIGIN}. Laravel TrustHosts returns 404 Bad hostname provided for any other host.`
  }
  return null
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
