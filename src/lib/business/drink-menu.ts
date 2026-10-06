/**
 * Knight drink menu — pure helpers for the dashboard Drinks tab.
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

/** Effective price shown in the editor (item override or section label). */
export function effectivePrice(item: DrinkMenuItem, section: DrinkMenuSection): string {
  const p = (item.price ?? "").trim()
  return p !== "" ? p : section.price_label
}
