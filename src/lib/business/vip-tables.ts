/**
 * VIP tables + bottle service — dashboard types and API paths.
 *
 * Everything here talks to services /business/vip-tables/* (biz_token). A
 * table on sale is a hidden ticket tier underneath, but the dashboard never
 * sees that: it works in tables, packages and bottles.
 */
import type { BusinessRole } from "@/lib/business/tipping"

export const VIP_API = "/business/vip-tables"

export type VipSettings = {
  is_enabled: boolean
  fee_percentage: number
  fee_flat_usd: number
  fee_is_default: boolean
}

export type VipFloorPlanTable = {
  id: number
  label: string
  guest_limit: number
  zone: string | null
  photo_url: string | null
  shape: "rect" | "circle"
  pos_x: number
  pos_y: number
  width: number
  height: number
  rotation: number
  default_package_id: number | null
  sort_order: number
}

export type VipFloorFeature = {
  type: "bar" | "dj" | "stage" | "dance_floor" | "entrance" | "restroom" | "zone" | "other"
  label: string
  x: number
  y: number
  w: number
  h: number
}

export type VipFloorPlan = {
  id: number
  venue_id: number | null
  name: string | null
  image_url: string | null
  image_width: number
  image_height: number
  features?: VipFloorFeature[]
  tables: VipFloorPlanTable[]
}

export type VipPackage = {
  id: number
  name: string
  description: string | null
  price_cents: number
  included_bottles: number
  photo_url: string | null
}

export type VipBottle = {
  id: number
  category: string
  name: string
  size_label: string | null
  menu_price_cents: number
  included_eligible: boolean
  upcharge_cents: number
  in_stock: boolean
  sort_order: number
}

export type VipEventTableState = "open" | "held" | "sold" | "blocked" | "off"

export type VipBookingBottle = {
  name: string
  size_label: string | null
  kind: "included" | "extra"
  quantity: number
  unit_price_cents: number
}

export type VipEventTable = {
  event_table_id: number
  vip_table_id: number
  label: string
  zone: string | null
  photo_url: string | null
  shape: "rect" | "circle"
  pos_x: number
  pos_y: number
  width: number
  height: number
  guest_limit: number
  price_cents: number
  package_id: number | null
  package_name: string
  included_bottles: number
  on_sale: boolean
  is_blocked: boolean
  block_note: string | null
  share_url: string
  state: VipEventTableState
  booking: {
    uuid: string
    host_name: string | null
    host_phone: string | null
    package_name: string
    subtotal_cents: number
    fee_cents: number
    total_cents: number
    paid_at: string | null
    bottles: VipBookingBottle[]
    passes_claimed: number
    checked_in: number
  } | null
}

export type VipEventTables = {
  enabled: boolean
  business_enabled: boolean
  event_id: number
  share_url: string
  sales_cutoff_at: string | null
  arrival_deadline_text: string | null
  tables: VipEventTable[]
}

/** One row of the per-event editor: a floor-plan table + what the venue set for this event. */
export type VipEventTableDraft = {
  vip_table_id: number
  label: string
  guest_limit: number
  zone: string | null
  listed: boolean
  package_id: number | null
  price_cents: number | null
  on_sale: boolean
}

export function canManageVipTables(role: BusinessRole | string | null | undefined): boolean {
  return role === "owner" || role === "manager"
}

export function formatCents(cents: number | null | undefined): string {
  const n = (Number(cents) || 0) / 100
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`
}

/** "600" or "600.00" → 60000; blank/invalid → null. */
export function dollarsToCents(value: string): number | null {
  const trimmed = value.trim().replace(/[$,]/g, "")
  if (!trimmed) return null
  const n = Number(trimmed)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 100)
}

export function centsToDollarsInput(cents: number | null | undefined): string {
  if (cents == null) return ""
  return (cents / 100).toFixed(2).replace(/\.00$/, "")
}

/**
 * Merge the venue's floor plan with what is already listed for an event into
 * editor rows: every table on the map appears once, listed or not.
 */
export function buildEventTableDrafts(plan: VipFloorPlan | null, listing: VipEventTables | null): VipEventTableDraft[] {
  if (!plan) return []
  return plan.tables.map((t) => {
    const listed = listing?.tables.find((x) => x.vip_table_id === t.id)
    return {
      vip_table_id: t.id,
      label: t.label,
      guest_limit: t.guest_limit,
      zone: t.zone,
      listed: !!listed,
      package_id: listed ? listed.package_id : t.default_package_id,
      price_cents: listed ? listed.price_cents : null,
      on_sale: listed ? listed.on_sale : true,
    }
  })
}

export const VIP_STATE_LABEL: Record<VipEventTableState, string> = {
  open: "Open",
  held: "On hold",
  sold: "Sold",
  blocked: "Blocked",
  off: "Off sale",
}
