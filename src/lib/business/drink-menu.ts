/**
 * Knight drink menu — pure helpers for the dashboard Lib Menu tab.
 *
 * Rows come from services `GET /business/drink-menu` (same tables as Laravel
 * admin + public GET). Knight-only surface.
 */

export interface DrinkMenuItem {
  id: number
  section_id: number
  name: string
  ingredients: string | null
  price: string | null
  sort_order: number
  is_active: boolean
}

export interface DrinkMenuSection {
  id: number
  title: string
  price_label: string
  kind: "shot" | "bucket" | "custom" | string
  sort_order: number
  is_active: boolean
  items: DrinkMenuItem[]
}

export interface DrinkMenuPayload {
  sections: DrinkMenuSection[]
  knight_only?: boolean
}

/** New id order after moving the row at `from` to `to` (clamped). */
export function moveRow(ids: number[], from: number, to: number): number[] {
  if (from < 0 || from >= ids.length) return ids.slice()
  const dest = Math.max(0, Math.min(ids.length - 1, to))
  if (dest === from) return ids.slice()
  const next = ids.slice()
  const [id] = next.splice(from, 1)
  next.splice(dest, 0, id)
  return next
}

/**
 * Price rule shared by the dashboards and the services writer.
 *
 *   "5" / "$5" / "$ 5"      → "$5"
 *   "25.5" / "25.50"        → "$25.50"      "0.99" → "$0.99"
 *   "CUSTOM", "MP", "2 for $10" → exactly as typed (trimmed)
 *   "" → ""
 *
 * A plain number or "$" + number is normalized; anything else is text.
 */
export function normalizePrice(input: string | null | undefined): string {
  const raw = (input ?? "").trim()
  if (raw === "") return ""
  const m = /^\$?\s*(\d+(?:\.\d+)?)$/.exec(raw)
  if (!m) return raw
  const n = Number(m[1])
  if (!Number.isFinite(n)) return raw
  return Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`
}

/** Effective price shown in the editor (item override or section label). */
export function effectivePrice(item: DrinkMenuItem, section: DrinkMenuSection): string {
  const p = normalizePrice(item.price)
  return p !== "" ? p : normalizePrice(section.price_label)
}
