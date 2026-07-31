"use client"

import * as SwitchPrimitive from "@radix-ui/react-switch"
import { Info, Loader2 } from "lucide-react"
import { cn } from "@/lib/v2/utils"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/business/v2/ui/tooltip"
import { PAYOUTS_ACCESS_TOGGLE, type PayoutsToggleState } from "@/lib/business/team-payouts-access"

/**
 * The owner-only "Payouts access" control for a team-member row
 * (PAYOUTS-PER-PERSON-ACCESS). Rendered ONLY when the viewer is the owner — the
 * parent passes `state` from payoutsToggleState(), which returns "hidden" for
 * every non-owner viewer and every legacy/absent grant, so a non-owner never
 * sees this at all.
 *
 *   owner  → a disabled "Owner" chip (inherent access, nothing to flip)
 *   on/off → a real Radix switch (role="switch", keyboard-operable) + an (i)
 *            info tooltip (Radix — opens on hover AND keyboard focus).
 */
export default function PayoutsAccessControl({
  state,
  saving,
  onChange,
}: {
  state: PayoutsToggleState
  saving?: boolean
  onChange?: (enabled: boolean) => void
}) {
  if (state === "hidden") return null

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">{PAYOUTS_ACCESS_TOGGLE.label}</span>
      <PayoutsAccessInfo />
      {state === "owner" ? (
        <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[11px] font-medium text-purple-700 dark:bg-purple-950/40 dark:text-purple-400">
          {PAYOUTS_ACCESS_TOGGLE.ownerLabel}
        </span>
      ) : (
        <span className="inline-flex items-center gap-1">
          <SwitchPrimitive.Root
            checked={state === "on"}
            disabled={saving}
            onCheckedChange={(v) => onChange?.(v)}
            aria-label={PAYOUTS_ACCESS_TOGGLE.label}
            className={cn(
              "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#05EB54] focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50",
              state === "on" ? "bg-[#05EB54]" : "bg-neutral-200 dark:bg-neutral-700",
            )}
          >
            <SwitchPrimitive.Thumb
              className={cn(
                "pointer-events-none block size-4 rounded-full bg-white shadow-sm ring-0 transition-transform",
                state === "on" ? "translate-x-4" : "translate-x-0",
              )}
            />
          </SwitchPrimitive.Root>
          {saving && <Loader2 className="size-3.5 animate-spin text-neutral-400" aria-hidden />}
        </span>
      )}
    </div>
  )
}

/** The (i) affordance — Radix Tooltip, so it opens on BOTH hover and keyboard
 *  focus (the trigger is a real <button>, in the tab order). Self-contained
 *  provider so callers don't need to wrap the tree. */
function PayoutsAccessInfo() {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="About payouts access"
            className="inline-flex size-4 items-center justify-center rounded-full border border-neutral-300 text-neutral-500 outline-none transition-colors hover:bg-neutral-100 focus-visible:ring-2 focus-visible:ring-[#05EB54] dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            <Info className="size-2.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-[240px] text-center font-normal leading-relaxed">
          {PAYOUTS_ACCESS_TOGGLE.tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
