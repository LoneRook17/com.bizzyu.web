/**
 * BETA biz-dash visual polish: the desktop top bar reads "Venue › Page". The
 * page half comes from the first path segment under /business, so a deep
 * route (an event's Manage tabs, a deal's edit page) still names the section
 * the sidebar highlights. Weekly Cover, series and the create chooser live
 * inside Events, so they read as Events too.
 */
const SECTION_LABELS: Record<string, string> = {
  events: "Events",
  "door-access": "Events",
  recurring: "Events",
  create: "Events",
  "line-skips": "Events",
  deals: "Deals",
  drinks: "Lib Menu",
  marketing: "Marketing",
  analytics: "Analytics",
  "promo-codes": "Universal promo codes",
  payouts: "Payouts",
  team: "Team",
  settings: "Settings",
  help: "Help & tutorials",
  scanner: "Scanner",
}

export function shellPageLabel(pathname: string): string {
  const parts = pathname.replace(/\/+$/, "").split("/").filter(Boolean)
  if (parts[0] !== "business" || parts.length === 1) return "Home"
  return SECTION_LABELS[parts[1]] ?? "Home"
}

const ROLE_FOOTER_LABELS: Record<string, string> = {
  owner: "Workspace owner",
  manager: "Manager",
  staff: "Staff",
  promoter: "Promoter",
}

/** The line under the name in the sidebar footer. Unknown roles fall back to the email. */
export function shellRoleLabel(role: string | null | undefined, email?: string | null): string {
  return (role && ROLE_FOOTER_LABELS[role]) || email || ""
}
