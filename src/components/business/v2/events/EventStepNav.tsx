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
  /**
   * D2-A: both creation paths run the same three-step spine, so the nav is
   * shared and only the middle label differs (an event sells tickets, a
   * program sells access). Defaults to the event steps — no existing caller
   * changes.
   */
  steps?: readonly { key: string; label: string }[]
  /**
   * The path's accent (F9 / D-P5): green for events, magenta for access.
   * A hex string rather than a class because Tailwind cannot build an
   * arbitrary-value class from a runtime variable.
   */
  accent?: string
}

/**
 * 5.0 F10 — the three-step creation spine: Details → Tickets & access → Review.
 * Mirrors the app's step semantics so a host who learns one surface knows the
 * other. Editing an existing event does NOT use this; edit stays a single form.
 */
export function EventStepNav({
  current,
  furthest,
  onJump,
  steps = EVENT_CREATE_STEPS,
  accent = "#05EB54",
}: EventStepNavProps) {
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-2">
      {steps.map((step, i) => {
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
                  ? "font-semibold"
                  : reachable
                    ? "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
                    : "cursor-not-allowed text-neutral-400 dark:text-neutral-600"
              )}
              // 1a / 33 are the hex alphas standing in for /10 and /20.
              style={active ? { color: accent, backgroundColor: `${accent}1a` } : undefined}
            >
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                  !active && !done && "bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
                )}
                style={
                  active
                    ? { backgroundColor: accent, color: "#000" }
                    : done
                      ? { backgroundColor: `${accent}33`, color: accent }
                      : undefined
                }
              >
                {done ? <Check className="size-3" /> : i + 1}
              </span>
              {step.label}
            </button>
            {i < steps.length - 1 && (
              <span className="hidden h-px w-6 bg-neutral-200 dark:bg-neutral-800 sm:block" />
            )}
          </li>
        )
      })}
    </ol>
  )
}
