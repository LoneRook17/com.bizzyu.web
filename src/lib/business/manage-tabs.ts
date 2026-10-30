/**
 * BETA biz-dash shell, slice 1 (Luke, decisions locked 2026-10-29).
 *
 * The per-event Manage surface is an OVERVIEW plus five top tabs:
 *   Overview · Tickets · Guests/Check-in · Promo & tracking · Settings
 *
 * This module is the route map. Every tile the old manage hub showed is
 * reachable through exactly one tab, and every destination below already
 * existed before the shell; the tabs re-route, they do not rebuild. Pure, so
 * the map is pinned by `manage-tabs.test.ts` and the REPORT can quote it.
 */

export type ManageTabKey = "overview" | "tickets" | "guests" | "promote" | "settings"

export interface ManageTab {
  key: ManageTabKey
  label: string
  /** Where the tab lands. */
  href: string
  /** Every path under /manage this tab owns. Prefix match, longest wins. */
  matches: string[]
}

export interface ManageSubLink {
  label: string
  href: string
}

export function manageBase(eventId: string | number): string {
  return `/business/events/${eventId}/manage`
}

/**
 * The five tabs. Labels follow the brief verbatim. A Weekly Cover night gets
 * the same five; its door surface is the redemption list, which the Guests
 * tab lands on either way (checkins is that list, rendered pink there).
 */
export function manageTabs(eventId: string | number): ManageTab[] {
  const base = manageBase(eventId)
  return [
    { key: "overview", label: "Overview", href: base, matches: [base] },
    { key: "tickets", label: "Tickets", href: `${base}/tickets`, matches: [`${base}/tickets`] },
    {
      key: "guests",
      label: "Guests",
      href: `${base}/checkins`,
      matches: [`${base}/checkins`, `${base}/scanner`],
    },
    {
      key: "promote",
      label: "Promo & tracking",
      href: `${base}/promote`,
      matches: [
        `${base}/promote`,
        `${base}/promo-codes`,
        `${base}/promoters`,
        `${base}/tracking-links`,
        `${base}/announcements`,
      ],
    },
    {
      key: "settings",
      label: "Settings",
      href: `${base}/settings`,
      matches: [`${base}/settings`, `${base}/team`],
    },
  ]
}

/** Which tab owns `pathname`. Longest matching prefix wins; Overview is the floor. */
export function activeManageTab(pathname: string, eventId: string | number): ManageTabKey {
  const path = pathname.replace(/\/+$/, "")
  let best: { key: ManageTabKey; len: number } = { key: "overview", len: 0 }
  for (const tab of manageTabs(eventId)) {
    for (const m of tab.matches) {
      if (path === m || path.startsWith(`${m}/`)) {
        if (m.length > best.len) best = { key: tab.key, len: m.length }
      }
    }
  }
  return best.key
}

export interface ManageSubNavContext {
  /** product_kind weekly_cover (or the access_kind fallback). */
  isDoorAccess: boolean
  /** owner / manager. */
  canEdit: boolean
  /** The night's program is still active (WC only; true for events). */
  seriesActive: boolean
}

/**
 * The compact second row under the tabs, for tabs that own more than one
 * page. Returns [] for single-page tabs so the layout renders nothing there.
 * Visibility rules are the SAME ones the old tiles used (`show:`), so a
 * staff member never sees a link that 403s.
 */
export function manageSubNav(
  tab: ManageTabKey,
  eventId: string | number,
  ctx: ManageSubNavContext,
): ManageSubLink[] {
  const base = manageBase(eventId)
  switch (tab) {
    case "guests":
      return [
        { label: ctx.isDoorAccess ? "Redemption list" : "Check-in history", href: `${base}/checkins` },
        { label: "Scan", href: `${base}/scanner` },
      ]
    case "promote":
      return [
        { label: "Promo & tracking", href: `${base}/promote` },
        ...(ctx.canEdit && ctx.seriesActive ? [{ label: "Promo codes", href: `${base}/promo-codes` }] : []),
        { label: "Promoters", href: `${base}/promoters` },
        ...(ctx.canEdit ? [{ label: "Tracking links", href: `${base}/tracking-links` }] : []),
        { label: "Announcements", href: `${base}/announcements` },
      ]
    case "settings":
      return [
        { label: "Settings", href: `${base}/settings` },
        { label: "Managers & co-hosts", href: `${base}/team` },
      ]
    default:
      return []
  }
}

/**
 * Old manage-hub tile → new tab. Documentation as data: the REPORT's route
 * map is generated from this, and the test pins that nothing was dropped.
 */
export const MANAGE_TILE_TO_TAB: Record<string, ManageTabKey> = {
  "Edit event": "settings",
  "Edit night": "settings",
  "Manage Tickets": "tickets",
  "Managers & co-hosts": "settings",
  "Event analytics": "overview",
  "Promo codes": "promote",
  Promoters: "promote",
  "Tracking links": "promote",
  Announcements: "promote",
  Scan: "guests",
  "Check-in history": "guests",
  "Redemption list": "guests",
}
