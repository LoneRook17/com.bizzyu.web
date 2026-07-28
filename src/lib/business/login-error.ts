// Login-failure copy resolution, shared by the active login page and the
// _legacy twin. Pure (no api-client import — its import chain doesn't resolve
// under `node --test`, same constraint as deal-stats.ts) → unit-testable.
//
// The status split is deliberate and load-bearing:
//   401 (wrong password / unknown email) → the GENERIC line, never the server
//       message, so the form can't be used to probe which emails exist.
//   403 → the server's message VERBATIM. Services uses 403 for "we know who
//       you are, but you can't log in here" and puts the reason in `message`:
//       unverified email, and since TF-CLEANUP-S (dev :194) the no-membership
//       case — "No business account is associated with this login." (a removed
//       user or a promoter). That reason must reach the user, not be flattened
//       into "invalid password" — their password was RIGHT.
export const GENERIC_CREDENTIALS_ERROR = "Invalid email or password."
export const VERIFY_EMAIL_ERROR = "Please verify your email before logging in."
export const FALLBACK_LOGIN_ERROR = "Something went wrong. Please try again."

export function loginErrorMessage(err: unknown): string {
  const status = (err as { status?: number } | null)?.status
  const message = err instanceof Error ? err.message : ""

  if (status === 403 && message.toLowerCase().includes("verify")) return VERIFY_EMAIL_ERROR
  if (status === 403 && message) return message
  if (status === 401) return GENERIC_CREDENTIALS_ERROR
  if (status != null && message) return message
  return FALLBACK_LOGIN_ERROR
}
