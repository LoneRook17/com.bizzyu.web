import { canAccessPayouts, type BusinessRole } from "./payouts-access.ts"
import { isWeeklyCoverProduct } from "./door-access.ts"
import {
  isApprovedCanceledStatus,
  weeklyCoverNightNeedsPendingCancel,
} from "./weekly-cover-visibility.ts"

export type PaletteItemKind = "page" | "event" | "deal"

export interface PaletteItem {
  id: string
  kind: PaletteItemKind
  label: string
  href: string
  hint?: string
  keywords?: string
}

export type DashboardFeature = "showDeals" | "showEvents"

export interface PaletteNavContext {
  showDeals: boolean
  showEvents: boolean
  isPending: boolean
  role?: BusinessRole
  canViewPayouts?: boolean
}

interface PageDef {
  label: string
  href: string
  keywords: string
  feature?: DashboardFeature
  lockWhenPending?: boolean
  show?: (ctx: PaletteNavContext) => boolean
}

/**
 * Destinations the sidebar Search / ⌘K palette can jump to.
 * Mirrors the v2 rail plus Help; visibility matches Sidebar.tsx.
 */
export const PALETTE_PAGES: PageDef[] = [
  { label: "Home", href: "/business", keywords: "home dashboard" },
  { label: "Events", href: "/business/events", keywords: "events shows tickets nights", feature: "showEvents" },
  { label: "Deals", href: "/business/deals", keywords: "deals offers specials", feature: "showDeals" },
  { label: "Marketing", href: "/business/marketing", keywords: "marketing campaigns attendees blasts", lockWhenPending: true },
  { label: "Analytics", href: "/business/analytics", keywords: "analytics stats reports", lockWhenPending: true },
  { label: "Universal promo codes", href: "/business/promo-codes", keywords: "promo codes coupons discounts", feature: "showEvents" },
  {
    label: "Payouts",
    href: "/business/payouts",
    keywords: "payouts money bank",
    lockWhenPending: true,
    show: (ctx) => canAccessPayouts(ctx.role, ctx.canViewPayouts),
  },
  { label: "Team", href: "/business/team", keywords: "team members staff invite" },
  { label: "Settings", href: "/business/settings", keywords: "settings profile venues" },
  { label: "Help & tutorials", href: "/business/help", keywords: "help docs support tutorials" },
]

export const EMPTY_QUERY_RECORD_LIMIT = 8

export const PALETTE_GROUP_ORDER: PaletteItemKind[] = ["page", "event", "deal"]

export const PALETTE_GROUP_LABELS: Record<PaletteItemKind, string> = {
  page: "Pages",
  event: "Events",
  deal: "Deals",
}

export function isCommandPaletteHotkey(event: {
  key: string
  metaKey: boolean
  ctrlKey: boolean
  altKey?: boolean
  repeat?: boolean
}): boolean {
  if (event.repeat) return false
  if (event.altKey) return false
  if (event.key.toLowerCase() !== "k") return false
  return event.metaKey || event.ctrlKey
}

export function itemMatchesQuery(item: PaletteItem, query: string): boolean {
  const tokens = query.toLowerCase().trim().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return true
  const hay = [item.label, item.hint, item.keywords].filter(Boolean).join(" ").toLowerCase()
  return tokens.every((token) => hay.includes(token))
}

export function buildPageItems(ctx: PaletteNavContext): PaletteItem[] {
  return PALETTE_PAGES.filter((page) => {
    if (page.feature === "showDeals" && !ctx.showDeals) return false
    if (page.feature === "showEvents" && !ctx.showEvents) return false
    if (page.lockWhenPending && ctx.isPending) return false
    if (page.show && !page.show(ctx)) return false
    return true
  }).map((page) => ({
    id: `page:${page.href}`,
    kind: "page" as const,
    label: page.label,
    href: page.href,
    keywords: page.keywords,
  }))
}

export function eventHint(event: { venue_name?: string; status?: string }): string | undefined {
  const parts: string[] = []
  if (event.venue_name) parts.push(event.venue_name)
  if (event.status === "draft") parts.push("Draft")
  return parts.length > 0 ? parts.join(" · ") : undefined
}

export function buildEventItems(
  events: Array<{
    event_id: number
    name: string
    venue_name?: string
    status?: string
    product_kind?: string | null
    access_kind?: string | null
    recurring_series_id?: number | string | null
    ticket_sales_count?: number | null
    passes_sold?: number | null
    paid_orders?: number | null
    total_revenue?: number | string | null
    cancellation_status?: string | null
  }>,
  inactiveSeriesIds: readonly number[] = [],
): PaletteItem[] {
  const inactive = new Set(inactiveSeriesIds)
  return events
    .filter((event) => {
      if (isApprovedCanceledStatus(event.status)) return false
      if (isWeeklyCoverProduct(event)) return false
      const seriesId = Number(event.recurring_series_id)
      if (Number.isFinite(seriesId) && inactive.has(seriesId)) {
        return weeklyCoverNightNeedsPendingCancel(event, false)
      }
      return true
    })
    .map((event) => ({
      id: `event:${event.event_id}`,
      kind: "event" as const,
      label: event.name,
      href: `/business/events/${event.event_id}`,
      hint: eventHint(event),
      keywords: [event.name, event.venue_name, event.status].filter(Boolean).join(" "),
    }))
}

export function buildDealItems(
  deals: Array<{ id: number; deal_title: string; venue_name?: string; deal_category?: string }>,
): PaletteItem[] {
  return deals.map((deal) => ({
    id: `deal:${deal.id}`,
    kind: "deal" as const,
    label: deal.deal_title,
    href: `/business/deals/${deal.id}`,
    hint: deal.venue_name || deal.deal_category,
    keywords: [deal.deal_title, deal.venue_name, deal.deal_category].filter(Boolean).join(" "),
  }))
}

export function dedupeItems(items: PaletteItem[]): PaletteItem[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    if (seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
}

export function filterPaletteItems(items: PaletteItem[], query: string): PaletteItem[] {
  const matched = items.filter((item) => itemMatchesQuery(item, query))
  if (query.trim()) return matched

  const pages = matched.filter((item) => item.kind === "page")
  const events = matched.filter((item) => item.kind === "event").slice(0, EMPTY_QUERY_RECORD_LIMIT)
  const deals = matched.filter((item) => item.kind === "deal").slice(0, EMPTY_QUERY_RECORD_LIMIT)
  return [...pages, ...events, ...deals]
}

export function groupPaletteItems(items: PaletteItem[]): {
  kind: PaletteItemKind
  label: string
  items: PaletteItem[]
}[] {
  return PALETTE_GROUP_ORDER
    .map((kind) => ({
      kind,
      label: PALETTE_GROUP_LABELS[kind],
      items: items.filter((item) => item.kind === kind),
    }))
    .filter((group) => group.items.length > 0)
}
