"use client"

import { useAuth } from "@/lib/business/auth-context"
import type { DashboardMode } from "@/lib/business/types"

/**
 * Single source of truth for what each dashboard mode shows.
 *
 * Mode semantics:
 * - 'deals'  — deals only (the majority of businesses). Events + Line skips hidden.
 * - 'events' — events & tickets. Deals hidden.
 * - 'hybrid' — everything (the original dashboard).
 *
 * Hidden ≠ deleted: routes still render if URL-typed; pages can use
 * `useDashboardMode()` to show a "turn this on in Settings" empty state.
 */
export const MODE_CONFIG: Record<
  DashboardMode,
  {
    label: string
    description: string
    showDeals: boolean
    showEvents: boolean
    showLineSkips: boolean
  }
> = {
  deals: {
    label: "Deals only",
    description: "Post exclusive student deals",
    showDeals: true,
    showEvents: false,
    showLineSkips: false,
  },
  events: {
    label: "Events only",
    description: "Sell tickets, scan, and promote events",
    showDeals: false,
    showEvents: true,
    showLineSkips: true,
  },
  hybrid: {
    label: "Both (Events & Deals)",
    description: "Run deals and events together",
    showDeals: true,
    showEvents: true,
    showLineSkips: true,
  },
}

/**
 * The business's dashboard mode.
 * - `mode` falls back to 'hybrid' when unset so nothing is ever wrongly hidden.
 * - `needsOnboarding` is true when the questionnaire hasn't been answered AND
 *   the current user can actually answer it. PUT /business/profile/preferences
 *   is owner/manager-only, so staff/promoters must never be shown the
 *   onboarding takeover — for them it's an inescapable dead end (no sidebar,
 *   no business switcher, and every option 403s). They fall back to 'hybrid'.
 */
export function useDashboardMode(): {
  mode: DashboardMode
  needsOnboarding: boolean
  config: (typeof MODE_CONFIG)[DashboardMode]
} {
  const { business, user } = useAuth()
  const raw = business?.dashboard_mode ?? null
  const mode: DashboardMode = raw ?? "hybrid"
  const canConfigure = user?.business_role === "owner" || user?.business_role === "manager"
  return {
    mode,
    needsOnboarding: !!business && raw === null && canConfigure,
    config: MODE_CONFIG[mode],
  }
}
