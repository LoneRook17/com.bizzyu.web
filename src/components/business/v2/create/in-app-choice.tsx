import type { CSSProperties } from "react"
import { Check, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/v2/utils"

/**
 * In-app Flutter create chrome.
 *
 * CreateChoicePage and the WC Sell tiles use the same paint: a near-black
 * card, a thin accent outline, a small solid icon tile, white title, grey
 * body. Selected is a colored check — never a neon-filled card.
 */

export const IN_APP_CHOICE_FILL = "#111114"
export const IN_APP_CHOICE_TITLE = "#FFFFFF"
export const IN_APP_CHOICE_BODY = "#9CA3AF"

export function inAppChoiceSurfaceStyle(accent: string, selected = false): CSSProperties {
  return {
    backgroundColor: IN_APP_CHOICE_FILL,
    borderColor: selected ? accent : `${accent}99`,
  }
}

export function InAppIconTile({
  accent,
  icon: Icon,
}: {
  accent: string
  icon: LucideIcon
}) {
  return (
    <span
      aria-hidden
      className="flex size-11 shrink-0 items-center justify-center rounded-xl"
      style={{ backgroundColor: accent }}
    >
      <Icon className="size-5 text-white" strokeWidth={2} />
    </span>
  )
}

export function InAppSelectedCheck({
  accent,
  selected,
  className,
}: {
  accent: string
  selected: boolean
  className?: string
}) {
  return (
    <Check
      aria-hidden
      className={cn("size-5 shrink-0 transition-opacity", selected ? "opacity-100" : "opacity-0", className)}
      style={{ color: accent }}
      strokeWidth={2.5}
    />
  )
}
