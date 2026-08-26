"use client"

import type { ReactNode } from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"
import { cn } from "@/lib/v2/utils"

/**
 * Flutter WC create switch: a smooth pill, pink when on. Replaces the square
 * checkbox on Weekly Cover create (weekday editor, promoter, custom
 * description). Event create keeps its own green checkboxes.
 */
export function AccessPillToggle({
  id,
  checked,
  onCheckedChange,
  disabled,
  label,
  info,
  className,
}: {
  id?: string
  checked: boolean
  onCheckedChange: (on: boolean) => void
  disabled?: boolean
  label: ReactNode
  info?: ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <span className="flex min-w-0 items-center gap-1.5 text-[13px] font-medium text-neutral-700 dark:text-neutral-200">
        {id ? (
          <label htmlFor={id} className={cn(disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer")}>
            {label}
          </label>
        ) : (
          <span className={disabled ? "opacity-60" : undefined}>{label}</span>
        )}
        {info}
      </span>
      <SwitchPrimitive.Root
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        className={cn(
          "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors outline-none focus-visible:ring-2 focus-visible:ring-access focus-visible:ring-offset-1 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-offset-neutral-950",
          checked ? "bg-access" : "bg-neutral-300 dark:bg-neutral-600"
        )}
      >
        <SwitchPrimitive.Thumb
          className={cn(
            "pointer-events-none block size-5 rounded-full bg-white shadow-sm ring-0 transition-transform",
            checked ? "translate-x-5" : "translate-x-0"
          )}
        />
      </SwitchPrimitive.Root>
    </div>
  )
}
