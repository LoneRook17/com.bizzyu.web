"use client"

import { Check } from "lucide-react"
import { cn } from "@/lib/v2/utils"

export const EVENT_CREATE_STEPS = [
  { key: "details", label: "Details" },
  { key: "tickets", label: "Tickets & access" },
  { key: "review", label: "Review" },
] as const

export type EventCreateStep = (typeof EVENT_CREATE_STEPS)[number]["key"]

interface EventStepNavProps {
  current: number
  // Steps the user has already cleared, so they can jump back without
  // re-walking the flow. Forward jumps stay gated on validation.
  furthest: number
  onJump: (index: number) => void
}

/**
 * 5.0 F10 — the three-step creation spine: Details → Tickets & access → Review.
 * Mirrors the app's step semantics so a host who learns one surface knows the
 * other. Editing an existing event does NOT use this; edit stays a single form.
 */
export function EventStepNav({ current, furthest, onJump }: EventStepNavProps) {
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-2">
      {EVENT_CREATE_STEPS.map((step, i) => {
        const done = i < current
        const active = i === current
        const reachable = i <= furthest
        return (
          <li key={step.key} className="flex items-center gap-2">
            <button
              type="button"
              disabled={!reachable}
              onClick={() => reachable && onJump(i)}
              className={cn(
                "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition-colors",
                active
                  ? "bg-[#05EB54]/10 font-semibold text-[#05EB54]"
                  : reachable
                    ? "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
                    : "cursor-not-allowed text-neutral-400 dark:text-neutral-600"
              )}
            >
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                  active
                    ? "bg-[#05EB54] text-black"
                    : done
                      ? "bg-[#05EB54]/20 text-[#05EB54]"
                      : "bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
                )}
              >
                {done ? <Check className="size-3" /> : i + 1}
              </span>
              {step.label}
            </button>
            {i < EVENT_CREATE_STEPS.length - 1 && (
              <span className="hidden h-px w-6 bg-neutral-200 dark:bg-neutral-800 sm:block" />
            )}
          </li>
        )
      })}
    </ol>
  )
}
