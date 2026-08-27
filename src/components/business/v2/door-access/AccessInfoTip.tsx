"use client"

import { useState, type ReactNode } from "react"
import { Info } from "lucide-react"
import { cn } from "@/lib/v2/utils"

/**
 * Flutter (i) on Surge, Scan Window, and leftover last-page help.
 * Short/plain copy lives in the caller. No em dashes.
 */
export function AccessInfoTip({
  label,
  children,
  className,
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <span className={cn("relative inline-flex", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={label}
        className="inline-flex size-4 items-center justify-center rounded-full border border-neutral-400 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 dark:border-neutral-600"
      >
        <Info className="size-2.5" />
      </button>
      {open && (
        <span className="absolute left-5 top-0 z-30 w-64 rounded-lg border border-neutral-700 bg-neutral-900 p-3 text-[11px] leading-relaxed text-neutral-300 shadow-lg">
          {children}
        </span>
      )}
    </span>
  )
}
