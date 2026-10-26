/**
 * Dashboard logout flow (audit F38).
 *
 * Before: `authPost("/business/auth/logout")` errors were swallowed, local
 * state was wiped and the page hard-navigated to /business/login — so a
 * network blip or a 5xx left the httpOnly biz_token / biz_refresh cookies
 * alive on the server while the UI looked logged out.
 *
 * Now: the server clear is tried, retried once after a short delay, and if it
 * still fails the user is TOLD and stays signed in. That is the only honest
 * outcome: the session cookies are httpOnly (the browser can't drop them from
 * JS), the middleware trusts them, and it bounces /business/login back to
 * /business whenever they exist — so "clear local and go to login" would just
 * land the user back on the dashboard with no message. The services logout
 * route has no auth guard and clears cookies unconditionally, so any error
 * here really does mean nothing was cleared.
 *
 * `clearBizSession()` (the non-httpOnly biz_session marker, multi-variant)
 * always runs; React state is only dropped and navigation only happens after
 * the server confirmed.
 *
 * Dependency-injected and dependency-free so it runs under `node --test`.
 */

export type LogoutOutcome = "server_cleared" | "server_failed"

export const LOGOUT_RETRY_DELAY_MS = 400

export const LOGOUT_FAILED_MESSAGE =
  "Sign-out failed: the server didn't confirm. You're still signed in here. Check your connection and try again."

export interface LogoutDeps {
  /** POST /business/auth/logout. Rejects on network error or non-2xx. */
  serverLogout: () => Promise<unknown>
  /** Multi-variant biz_session cookie clear. Always runs. */
  clearBizSession: () => void
  /** Drop React auth state. Runs only once the server confirmed. */
  clearState: () => void
  /** Hard navigation to the login page. Runs only once the server confirmed. */
  navigate: () => void
  /** Surface a failure to the user (toast / inline). */
  notify: (message: string) => void
  /** Report the underlying error (console). */
  report?: (error: unknown) => void
  sleep?: (ms: number) => Promise<void>
  retryDelayMs?: number
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export async function runLogout(deps: LogoutDeps): Promise<{ outcome: LogoutOutcome; attempts: number }> {
  const sleep = deps.sleep ?? defaultSleep
  const delay = deps.retryDelayMs ?? LOGOUT_RETRY_DELAY_MS
  let attempts = 0
  let lastError: unknown = null

  for (let i = 0; i < 2; i++) {
    attempts++
    try {
      await deps.serverLogout()
      lastError = null
      break
    } catch (e) {
      lastError = e
      if (i === 0) await sleep(delay)
    }
  }

  deps.clearBizSession()

  if (lastError !== null) {
    deps.report?.(lastError)
    deps.notify(LOGOUT_FAILED_MESSAGE)
    return { outcome: "server_failed", attempts }
  }

  deps.clearState()
  deps.navigate()
  return { outcome: "server_cleared", attempts }
}
