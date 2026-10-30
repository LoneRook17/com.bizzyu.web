"use client"

import { useEffect, useState } from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/v2/utils"

/**
 * BETA shell: the editor's step rail — Details → Tickets → Publish.
 *
 * One component, two modes:
 *   • "steps"   — create. The rail IS the wizard: a step is reachable once the
 *                 host has cleared it (furthest), forward jumps stay gated.
 *   • "anchors" — edit. Every section renders on one page; the rail scrolls
 *                 to the section and follows the viewport (IntersectionObserver).
 *
 * Desktop: a sticky vertical rail, numbered circles on one connecting line
 * (mock 04). Mobile: the same three steps in a row, joined by short rules.
 * Green is reserved for the step's primary CTA, so the active circle is the
 * pale mint the Live chip uses, never a solid green fill.
 */
export const EDITOR_STEPS = [
  { key: "details", label: "Details", hint: "Event information" },
  { key: "tickets", label: "Tickets", hint: "Pricing & capacity" },
  { key: "publish", label: "Publish", hint: "Review & go live" },
] as const

export type EditorStepKey = (typeof EDITOR_STEPS)[number]["key"]

export function editorSectionId(key: EditorStepKey): string {
  return `editor-${key}`
}

export function useActiveEditorSection(enabled: boolean): number {
  const [active, setActive] = useState(0)
  useEffect(() => {
    if (!enabled || typeof window === "undefined" || !("IntersectionObserver" in window)) return
    const els = EDITOR_STEPS.map((s) => document.getElementById(editorSectionId(s.key))).filter(
      (el): el is HTMLElement => !!el,
    )
    if (els.length === 0) return
    const visible = new Map<string, number>()
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) visible.set(e.target.id, e.isIntersecting ? e.intersectionRatio : 0)
        let bestIdx = 0
        let best = -1
        EDITOR_STEPS.forEach((s, i) => {
          const r = visible.get(editorSectionId(s.key)) ?? 0
          if (r > best) {
            best = r
            bestIdx = i
          }
        })
        if (best > 0) setActive(bestIdx)
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [enabled])
  return active
}

export function EditorStepRail({
  mode,
  current,
  furthest,
  onJump,
  className,
}: {
  mode: "steps" | "anchors"
  current: number
  /** steps mode only: the furthest step the host has cleared. */
  furthest?: number
  onJump: (index: number) => void
  className?: string
}) {
  return (
    <ol
      className={cn(
        "flex items-center gap-2 overflow-x-auto lg:sticky lg:top-20 lg:flex-col lg:items-stretch lg:gap-0 lg:overflow-visible",
        className,
      )}
      aria-label="Editor steps"
    >
      {EDITOR_STEPS.map((step, i) => {
        const active = i === current
        const done = mode === "steps" ? i < current : false
        const reachable = mode === "anchors" || i <= (furthest ?? 0)
        const last = i === EDITOR_STEPS.length - 1
        return (
          <li key={step.key} className="relative flex shrink-0 items-center gap-2 lg:block lg:pb-6 lg:last:pb-0">
            {/* Desktop connector: from under this circle down to the next. */}
            {!last && (
              <span aria-hidden className="absolute left-[15px] top-8 hidden h-[calc(100%-2rem)] w-px bg-neutral-200 lg:block dark:bg-neutral-800" />
            )}
            <button
              type="button"
              disabled={!reachable}
              aria-current={active ? "step" : undefined}
              onClick={() => reachable && onJump(i)}
              className={cn(
                "flex items-center gap-2.5 rounded-lg py-0.5 pr-1 text-left text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#05EB54]/40 lg:items-start lg:gap-3",
                reachable ? "cursor-pointer" : "cursor-not-allowed",
              )}
            >
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border text-[12px] font-semibold tabular-nums lg:size-8",
                  active
                    ? "border-[#0A8038]/30 bg-[#DDF7E6] text-[#0A8038] dark:border-[#05EB54]/40"
                    : done
                      ? "border-[#0A8038]/30 bg-transparent text-[#0A8038] dark:border-[#05EB54]/40 dark:text-[#05EB54]"
                      : "border-neutral-300 bg-white text-neutral-500 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-400",
                )}
              >
                {done ? <Check className="size-3.5" /> : i + 1}
              </span>
              <span className="min-w-0 lg:pt-1">
                <span
                  className={cn(
                    "block whitespace-nowrap text-[13px] lg:text-sm",
                    active ? "font-semibold text-neutral-900 dark:text-neutral-100" : reachable ? "font-medium text-neutral-600 dark:text-neutral-300" : "text-neutral-400 dark:text-neutral-600",
                  )}
                >
                  {step.label}
                </span>
                <span className="hidden text-[12px] text-neutral-500 dark:text-neutral-400 lg:block">{step.hint}</span>
              </span>
            </button>
            {/* Phone connector between steps. */}
            {!last && <span aria-hidden className="h-px w-5 bg-neutral-300 lg:hidden dark:bg-neutral-700" />}
          </li>
        )
      })}
    </ol>
  )
}
