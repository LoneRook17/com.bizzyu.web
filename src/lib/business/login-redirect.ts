// Post-login destination resolution for the business dashboard.
//
// The middleware sends a logged-out visitor to /business/login?next=<where
// they were headed>, so an emailed deep link (e.g. the Stripe-reminder CTA at
// /business/settings?tab=payments) survives the login wall instead of dumping
// the user on the dashboard root.
//
// `next` arrives from the query string, so it is attacker-controllable and is
// treated as untrusted input. The ONLY thing accepted is a same-origin path
// inside the dashboard; everything else degrades to DEFAULT_POST_LOGIN_PATH,
// which is the behaviour this replaced. That makes the failure mode "user
// lands on the dashboard root", never "user is bounced to a phishing page
// wearing a bizzyu.com login referrer".
//
// Kept dependency-free so it runs under `node --test` (same constraint as
// login-error.ts) and can be imported from both client components and the
// auth context.

/** Where a login goes when there is no usable `next`. Pre-existing behaviour. */
export const DEFAULT_POST_LOGIN_PATH = "/business"

/** Only destinations under this prefix are honoured. */
const ALLOWED_PREFIX = "/business/"

/**
 * Resolve a trusted post-login path from an untrusted `next` value.
 *
 * Accepts only a same-origin absolute path beginning with exactly one "/" and
 * sitting under /business/. Rejects, in order:
 *  - empty / non-string
 *  - control characters (\n, \t, \0 …), which some browsers strip while
 *    parsing, letting "/\n/evil.com" read as protocol-relative
 *  - anything not starting with "/" — absolute URLs and scheme payloads
 *    ("https://evil.com", "javascript:alert(1)", "data:…")
 *  - "//host" (protocol-relative) and "/\host" (browsers normalise "\" to "/",
 *    so this is protocol-relative in disguise)
 *  - paths outside /business/
 *  - ".." traversal, which cannot leave the origin but can leave the dashboard
 */
export function safeNextPath(next: string | null | undefined): string {
  if (typeof next !== "string" || next === "") return DEFAULT_POST_LOGIN_PATH

  if (/[\u0000-\u001f\u007f]/.test(next)) return DEFAULT_POST_LOGIN_PATH

  if (!next.startsWith("/")) return DEFAULT_POST_LOGIN_PATH
  if (next.startsWith("//") || next.startsWith("/\\")) return DEFAULT_POST_LOGIN_PATH

  if (!next.startsWith(ALLOWED_PREFIX)) return DEFAULT_POST_LOGIN_PATH

  // Compare on the path only - a "?.." inside the query is not traversal.
  const pathOnly = next.split(/[?#]/)[0]
  if (pathOnly.split("/").includes("..")) return DEFAULT_POST_LOGIN_PATH

  return next
}
