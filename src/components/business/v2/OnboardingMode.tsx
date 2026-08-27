"use client"

import { useState } from "react"
import { Tag, CalendarDays, LayoutGrid, Loader2, Check } from "lucide-react"
import { apiClient } from "@/lib/business/api-client"
import { useAuth } from "@/lib/business/auth-context"
import { MODE_CONFIG } from "@/lib/v2/mode"
import { writeCachedDashboardMode } from "@/lib/v2/mode-cache"
import type { DashboardMode } from "@/lib/business/types"
import { cn } from "@/lib/v2/utils"

const OPTIONS: { mode: DashboardMode; icon: React.ElementType; bullets: string[] }[] = [
  {
    mode: "deals",
    icon: Tag,
    bullets: ["Post exclusive student deals", "Track claims & redemptions", "Reach students near campus"],
  },
  {
    mode: "events",
    icon: CalendarDays,
    bullets: ["Sell tickets & weekly cover", "Door scanning & check-ins", "Promoters & SMS blasts"],
  },
  {
    mode: "hybrid",
    icon: LayoutGrid,
    bullets: ["Everything Bizzy offers", "Deals and events side by side", "Switch focus anytime"],
  },
]

/**
 * Full-screen first-entry takeover shown when business.dashboard_mode is NULL.
 * One question; the answer shapes the whole dashboard and is changeable
 * forever in Settings → Dashboard preferences.
 */
export default function OnboardingMode() {
  const { user, refreshProfile, applyBusinessPatch } = useAuth()
  const [selected, setSelected] = useState<DashboardMode | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const firstName = user?.full_name?.split(" ")[0]

  const choose = async (mode: DashboardMode) => {
    if (saving) return
    setSelected(mode)
    setSaving(true)
    setError("")
    try {
      await apiClient.put("/business/profile/preferences", { dashboard_mode: mode })
      writeCachedDashboardMode(mode, typeof window === "undefined" ? null : window.sessionStorage)
      applyBusinessPatch({ dashboard_mode: mode })
      await refreshProfile()
      applyBusinessPatch({ dashboard_mode: mode })
    } catch {
      setError("Couldn't save your choice. Please try again.")
      setSelected(null)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-4 py-12 text-neutral-900 antialiased dark:bg-neutral-950 dark:text-neutral-100">
      <div className="w-full max-w-4xl">
        <div className="mb-12 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/bizzy-logo.png" alt="Bizzy" className="mx-auto mb-8 h-16" />
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100 sm:text-4xl">
            Welcome{firstName ? `, ${firstName}` : ""}! What will you use Bizzy for?
          </h1>
          <p className="mt-3 text-base text-neutral-600 dark:text-neutral-400 sm:text-lg">
            We&apos;ll set up your dashboard around it. You can change this anytime in Settings.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {OPTIONS.map(({ mode, icon: Icon, bullets }) => {
            const cfg = MODE_CONFIG[mode]
            const isSelected = selected === mode
            const isHybrid = mode === "hybrid"
            return (
              <button
                key={mode}
                type="button"
                disabled={saving}
                onClick={() => choose(mode)}
                className={cn(
                  "relative flex flex-col items-start rounded-2xl border bg-white p-7 text-left shadow-sm outline-none transition-all dark:bg-neutral-900",
                  "hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-[#05EB54]/40",
                  isHybrid && "sm:col-span-2 sm:items-center sm:text-center",
                  isSelected
                    ? "border-[#05EB54] ring-2 ring-[#05EB54]/40"
                    : "border-neutral-200 hover:border-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-700",
                  saving && !isSelected && "opacity-50"
                )}
              >
                <span className={cn("mb-4 flex size-14 items-center justify-center rounded-xl bg-green-50 text-[#05EB54] dark:bg-green-950/40", isHybrid && "sm:mx-auto")}>
                  {isSelected && saving ? <Loader2 className="size-7 animate-spin" /> : <Icon className="size-7" />}
                </span>
                <span className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">{cfg.label}</span>
                <ul className={cn("mt-3 flex flex-col gap-2", isHybrid && "sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-6")}>
                  {bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-[15px] leading-snug text-neutral-500 dark:text-neutral-400">
                      <Check className="mt-0.5 size-4 shrink-0 text-[#05EB54]" />
                      {b}
                    </li>
                  ))}
                </ul>
              </button>
            )
          })}
        </div>

        {error && (
          <p className="mt-5 text-center text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    </div>
  )
}
