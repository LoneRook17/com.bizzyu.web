/**
 * Dashboard-mode cache so the first-entry picker cannot infinite-loop when
 * PUT /preferences succeeds but GET /me still omits dashboard_mode.
 */

export type CachedDashboardMode = "deals" | "events" | "hybrid"

export const DASHBOARD_MODE_STORAGE_KEY = "bizzy.dashboard_mode"

export function parseDashboardMode(value: unknown): CachedDashboardMode | null {
  if (value === "deals" || value === "events" || value === "hybrid") return value
  return null
}

export function readCachedDashboardMode(
  storage?: { getItem(key: string): string | null } | null,
): CachedDashboardMode | null {
  if (!storage) return null
  try {
    return parseDashboardMode(storage.getItem(DASHBOARD_MODE_STORAGE_KEY))
  } catch {
    return null
  }
}

export function writeCachedDashboardMode(
  mode: CachedDashboardMode,
  storage?: { setItem(key: string, value: string): void } | null,
): void {
  if (!storage) return
  try {
    storage.setItem(DASHBOARD_MODE_STORAGE_KEY, mode)
  } catch {
    // private mode / quota — onboarding still applies the in-memory patch
  }
}

export function resolveDashboardMode(
  fromBusiness: unknown,
  fromCache: CachedDashboardMode | null = null,
): CachedDashboardMode | null {
  return parseDashboardMode(fromBusiness) ?? fromCache
}
