"use client"

import { useState } from "react"
import { Tag, CalendarDays, LayoutGrid, Sun, Moon, Monitor, Check, Loader2 } from "lucide-react"
import { apiClient } from "@/lib/business/api-client"
import { useAuth } from "@/lib/business/auth-context"
import { useDashboardMode, MODE_CONFIG } from "@/lib/v2/mode"
import { useTheme, type ThemePreference } from "@/lib/v2/theme"
import type { DashboardMode } from "@/lib/business/types"
import { cn } from "@/lib/v2/utils"

const MODE_ICONS: Record<DashboardMode, React.ElementType> = {
  deals: Tag,
  events: CalendarDays,
  hybrid: LayoutGrid,
}

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: React.ElementType }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
]

/** Dashboard mode picker - card chrome is provided by the settings page. */
export default function DashboardPreferences({ disabled }: { disabled?: boolean }) {
  const { refreshProfile } = useAuth()
  const { mode } = useDashboardMode()
  const [savingMode, setSavingMode] = useState<DashboardMode | null>(null)
  const [error, setError] = useState("")

  const changeMode = async (next: DashboardMode) => {
    if (disabled || savingMode || next === mode) return
    setSavingMode(next)
    setError("")
    try {
      await apiClient.put("/business/profile/preferences", { dashboard_mode: next })
      await refreshProfile()
    } catch {
      setError("Couldn't save. Please try again.")
    } finally {
      setSavingMode(null)
    }
  }

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-3">
        {(Object.keys(MODE_CONFIG) as DashboardMode[]).map((m) => {
          const cfg = MODE_CONFIG[m]
          const Icon = MODE_ICONS[m]
          const active = mode === m
          const saving = savingMode === m
          return (
            <button
              key={m}
              type="button"
              disabled={disabled || !!savingMode}
              onClick={() => changeMode(m)}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-3.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#05EB54]/40",
                active
                  ? "border-[#05EB54] bg-green-50/60 dark:bg-green-950/30"
                  : "border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:border-neutral-700 dark:hover:bg-neutral-800/40",
                disabled && "cursor-not-allowed opacity-60"
              )}
            >
              <span className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg", active ? "bg-[#05EB54]/15 text-[#05EB54]" : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400")}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Icon className="size-4" />}
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  {cfg.label}
                  {active && <Check className="size-3.5 text-[#05EB54]" />}
                </span>
                <span className="mt-0.5 block text-xs leading-snug text-neutral-500 dark:text-neutral-400">{cfg.description}</span>
              </span>
            </button>
          )
        })}
      </div>
      {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}

/** Light / Dark / System theme picker - card chrome is provided by the settings page. */
export function AppearanceSettings() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="inline-flex items-center gap-1 rounded-lg bg-neutral-100 p-1 dark:bg-neutral-800">
      {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => setTheme(value)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium outline-none transition-colors cursor-pointer",
            theme === value
              ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-950 dark:text-neutral-100"
              : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
          )}
        >
          <Icon className="size-4" /> {label}
        </button>
      ))}
    </div>
  )
}
