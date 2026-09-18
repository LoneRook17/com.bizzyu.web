// Settings tab visibility by role (Tipping Slice 1 leftover).
//
// The settings page listed every tab for every role. Staff opened Settings,
// saw Tipping, and the tab's GET /business/tipping came back 403 (the API is
// owner/manager only) — rendered as a red "refresh and try again" error that
// nothing on the page could fix. Product intent: roles that can't edit
// tipping don't get a Tipping tab at all — not a disabled form, not an error.
//
// Dependency-free so it runs under the repo's `node --test` convention.

import { canEditTipping } from "./tipping.ts"

export type SettingsTab = "profile" | "preferences" | "payments" | "tipping" | "venues" | "security"

export const ALL_SETTINGS_TABS: readonly SettingsTab[] = [
  "profile",
  "preferences",
  "payments",
  "tipping",
  "venues",
  "security",
]

/** Where a deep link lands when the requested tab is missing or hidden. */
export const DEFAULT_SETTINGS_TAB: SettingsTab = "profile"

/**
 * Tabs the settings page renders for this role, in display order. Tipping is
 * gated by the same owner/manager predicate as PUT /business/tipping so the
 * tab is only ever shown to someone the API will actually answer.
 */
export function visibleSettingsTabs(role: string | null | undefined): SettingsTab[] {
  return ALL_SETTINGS_TABS.filter((tab) => tab !== "tipping" || canEditTipping(role))
}

/**
 * The tab to open for `requested` (a ?tab= value, or a Tabs onValueChange
 * string). Anything that isn't a tab this role can see — unknown, null, or a
 * ?tab=tipping deep link for staff — falls back to Profile, so a hidden tab
 * is never the active value and its content never mounts.
 */
export function resolveSettingsTab(
  requested: string | null | undefined,
  role: string | null | undefined
): SettingsTab {
  const visible = visibleSettingsTabs(role)
  return visible.includes(requested as SettingsTab) ? (requested as SettingsTab) : DEFAULT_SETTINGS_TAB
}
