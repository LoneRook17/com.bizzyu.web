import type { CSSProperties } from "react"
import { Check, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/v2/utils"

/**
 * Dashboard create chrome.
 *
 * Same structure as Flutter CreateChoicePage / WC Sell: thin accent outline,
 * solid icon tile, colored check. Never a neon-filled card.
 *
 * Dark is the shipped in-app paint. Light is the dashboard counterpart.
 * Tokens switch through the existing `.v2-dark` / `dark:` ThemeProvider —
 * no extra theme switcher.
 *
 * Light (default, no `.v2-dark`):
 *   fill  #FFFFFF  (dash card white)
 *   title #171717  (neutral-900 / ink-adjacent)
 *   body  #525252  (neutral-600)
 *
 * Dark (`.v2-dark`):
 *   fill  #111114  charcoal
 *   title #FFFFFF
 *   body  #9CA3AF  (neutral-400)
 */

export const IN_APP_CHOICE_FILL = "#111114"
export const IN_APP_CHOICE_TITLE = "#FFFFFF"
export const IN_APP_CHOICE_BODY = "#9CA3AF"

export const IN_APP_CHOICE_FILL_LIGHT = "#FFFFFF"
export const IN_APP_CHOICE_TITLE_LIGHT = "#171717"
export const IN_APP_CHOICE_BODY_LIGHT = "#525252"

/** White in light, charcoal in dark. Border color stays on the accent style. */
export const IN_APP_CHOICE_SURFACE_CLASS = "bg-white dark:bg-[#111114]"

export const IN_APP_CHOICE_TITLE_CLASS = "text-neutral-900 dark:text-white"

export const IN_APP_CHOICE_BODY_CLASS = "text-neutral-600 dark:text-neutral-400"

export function inAppChoiceSurfaceStyle(accent: string, selected = false): CSSProperties {
  return {
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
