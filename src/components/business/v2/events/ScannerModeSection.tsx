"use client"

import { REDEMPTION_MODE_OPTIONS, type RedemptionMode } from "@/lib/business/constants"
import { cn } from "@/lib/v2/utils"

interface ScannerModeSectionProps {
  value: RedemptionMode
  onChange: (mode: RedemptionMode) => void
}

/**
 * 5.0 D11 / D-F10.1 — "How will you check people in?"
 *
 * Lives in step 2 (Tickets & access) of the creation flow, exactly where the app
 * puts it, and uses the same two modes the Door Access spine already defines
 * (services `DoorAccessProgramService.REDEMPTION_MODES`). One vocabulary across
 * events and access programs, so the door tooling can branch on one field.
 */
export function ScannerModeSection({ value, onChange }: ScannerModeSectionProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {REDEMPTION_MODE_OPTIONS.map((opt) => {
        const selected = value === opt.value
        return (
          <label
            key={opt.value}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors",
              selected
                ? "border-[#05EB54] bg-green-50/60 dark:border-[#05EB54] dark:bg-green-950/30"
                : "border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
            )}
          >
            <input
              type="radio"
              name="redemption_mode"
              className="mt-0.5 text-[#05EB54] focus:ring-[#05EB54]"
              checked={selected}
              onChange={() => onChange(opt.value)}
            />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-neutral-900 dark:text-neutral-100">{opt.label}</span>
              <span className="mt-0.5 block text-[13px] text-neutral-500 dark:text-neutral-400">{opt.hint}</span>
            </span>
          </label>
        )
      })}
    </div>
  )
}
