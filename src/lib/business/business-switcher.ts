// Dashboard business switcher: the pure parts, kept out of the React tree so
// they can be unit-tested with the Node test runner.
//
// A user who belongs to more than one business picks which one the dashboard
// session is for. The server re-mints both session tokens for the target
// business (POST /business/auth/switch); the client then drops the stored
// venue selection, which belongs to the business being left, and hard-navigates
// to /business so every provider reloads against the new session.

import type { BusinessSummary } from "./types"

/** localStorage key venue-context.tsx persists the selected venue under. */
export const SELECTED_VENUE_STORAGE_KEY = "bizzy_selected_venue_id"

export const SWITCH_BUSINESS_PATH = "/business/auth/switch"
export const POST_SWITCH_PATH = "/business"

/**
 * `available_businesses` from GET /business/auth/me, as a list. A services
 * build that predates the switcher omits the field; that reads as "none".
 */
export function readAvailableBusinesses(value: unknown): BusinessSummary[] {
  return Array.isArray(value) ? (value as BusinessSummary[]) : []
}

/**
 * The switcher renders only for a user with more than one business. With zero
 * or one, the sidebar is exactly what it was before the switcher existed.
 */
export function showBusinessSwitcher(businesses: readonly BusinessSummary[]): boolean {
  return businesses.length > 1
}

export interface SwitchBusinessDeps {
  post: (path: string, body: { business_id: number }) => Promise<unknown>
  storage: Pick<Storage, "removeItem"> | null
  navigate: (path: string) => void
}

/**
 * Switch the session to `businessId`.
 *
 * Fail closed: if the POST rejects, this rejects too and does nothing else —
 * no storage change, no navigation, and never a session clear. The caller is
 * still signed in to the business it was on.
 */
export async function performBusinessSwitch(businessId: number, deps: SwitchBusinessDeps): Promise<void> {
  await deps.post(SWITCH_BUSINESS_PATH, { business_id: businessId })
  try {
    deps.storage?.removeItem(SELECTED_VENUE_STORAGE_KEY)
  } catch {
    // Storage can throw (private mode, blocked site data). The venue context
    // clamps an out-of-scope stored id back to "All venues" on load anyway.
  }
  deps.navigate(POST_SWITCH_PATH)
}
