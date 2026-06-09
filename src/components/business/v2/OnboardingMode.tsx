"use client"

import { useState } from "react"
import { Tag, CalendarDays, LayoutGrid, Loader2, Check } from "lucide-react"
import { apiClient } from "@/lib/business/api-client"
import { useAuth } from "@/lib/business/auth-context"
import { MODE_CONFIG } from "@/lib/v2/mode"
import type { DashboardMode } from "@/lib/business/types"
import { cn } from "@/lib/v2/utils"

const OPTIONS: { mode: DashboardMode; icon: React.ElementType; popular?: boolean; bullets: string[] }[] = [
  {
    mode: "deals",
    icon: Tag,
    popular: true,
    bullets: ["Post exclusive student deals", "Track claims & redemptions", "Reach students near campus"],
  },
  {
    mode: "events",
    icon: CalendarDays,
    bullets: ["Sell tickets & line skips", "Door scanning & check-ins", "Promoters & SMS blasts"],
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
  const { user, refreshProfile } = useAuth()
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
      await refreshProfile()
    } catch {
      setError("Couldn't save your choice. Please try again.")
      setSaving(false)
      setSelected(null)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-4 py-12 text-neutral-900 antialiased dark:bg-neutral-950 dark:text-neutral-100">
      <div className="w-full max-w-3xl">
        <div className="mb-10 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/bizzy-logo.png" alt="Bizzy" className="mx-auto mb-6 h-12" />
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
            Welcome{firstName ? `, ${firstName}` : ""}! What will you use Bizzy for?
          </h1>
          <p className="mt-2 text-[15px] text-neutral-600 dark:text-neutral-400">
            We&apos;ll set up your dashboard around it. You can change this anytime in Settings.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {OPTIONS.map(({ mode, icon: Icon, popular, bullets }) => {
            const cfg = MODE_CONFIG[mode]
            const isSelected = selected === mode
            return (
              <button
                key={mode}
                type="button"
                disabled={saving}
                onClick={() => choose(mode)}
                className={cn(
                  "relative flex flex-col items-start rounded-xl border bg-white p-5 text-left shadow-sm outline-none transition-all dark:bg-neutral-900",
                  "hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-[#05EB54]/40",
                  isSelected
                    ? "border-[#05EB54] ring-2 ring-[#05EB54]/40"
                    : "border-neutral-200 hover:border-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-700",
                  saving && !isSelected && "opacity-50"
                )}
              >
                {popular && (
                  <span className="absolute -top-2.5 right-4 rounded-full bg-gradient-to-br from-[#2ECB4E] to-[#05EB54] px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-sm">
                    Most popular
                  </span>
                )}
                <span className="mb-3 flex size-10 items-center justify-center rounded-lg bg-green-50 text-[#05EB54] dark:bg-green-950/40">
                  {isSelected && saving ? <Loader2 className="size-5 animate-spin" /> : <Icon className="size-5" />}
                </span>
                <span className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-100">{cfg.label}</span>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {bullets.map((b) => (
                    <li key={b} className="flex items-start gap-1.5 text-[13px] leading-snug text-neutral-500 dark:text-neutral-400">
                      <Check className="mt-0.5 size-3.5 shrink-0 text-[#05EB54]" />
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
