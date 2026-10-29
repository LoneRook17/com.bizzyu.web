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
 * Desktop: sticky left column. Mobile: a horizontal pill row above the form.
 * Green is reserved for the step's primary CTA, so the rail itself uses the
 * brand's green TEXT token (#0A8038) for the active item, never a green fill.
 */
export const EDITOR_STEPS = [
  { key: "details", label: "Details", hint: "Name, when, where, artwork" },
  { key: "tickets", label: "Tickets", hint: "Tiers, promoters, stock alerts" },
  { key: "publish", label: "Publish", hint: "Followers, go live" },
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
        "flex gap-1 overflow-x-auto lg:sticky lg:top-6 lg:flex-col lg:gap-0.5 lg:overflow-visible",
        className,
      )}
      aria-label="Editor steps"
    >
      {EDITOR_STEPS.map((step, i) => {
        const active = i === current
        const done = mode === "steps" ? i < current : false
        const reachable = mode === "anchors" || i <= (furthest ?? 0)
        return (
          <li key={step.key} className="shrink-0">
            <button
              type="button"
              disabled={!reachable}
              aria-current={active ? "step" : undefined}
              onClick={() => reachable && onJump(i)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left text-sm transition-colors",
                active
                  ? "bg-[#0A8038]/10 text-[#0A8038] dark:bg-[#05EB54]/10 dark:text-[#05EB54]"
                  : reachable
                    ? "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
                    : "cursor-not-allowed text-neutral-400 dark:text-neutral-600",
              )}
            >
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                  active
                    ? "bg-[#0A8038] text-white dark:bg-[#05EB54] dark:text-neutral-950"
                    : done
                      ? "bg-[#0A8038]/15 text-[#0A8038] dark:bg-[#05EB54]/20 dark:text-[#05EB54]"
                      : "bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
                )}
              >
                {done ? <Check className="size-3" /> : i + 1}
              </span>
              <span className="min-w-0">
                <span className={cn("block whitespace-nowrap", active && "font-semibold")}>{step.label}</span>
                <span className="hidden text-[12px] text-neutral-500 dark:text-neutral-400 lg:block">{step.hint}</span>
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}
