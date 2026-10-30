import type React from "react"
import { cn } from "@/lib/v2/utils"

export interface Metric {
  label: string
  value: string | number
  sub?: string
  /** A chip at the cell's right edge (Weekly Cover's "Next night"). */
  aside?: React.ReactNode
}

/**
 * BETA shell: the compact metric strip that replaced the row of equal
 * airy tiles. One container, hairlines between cells (each cell draws its
 * right and bottom edge; the grid overhangs the clipped container by 1px so
 * the outer edges never double up), 12-16 padding, value at 2xl. Cells are
 * at least 160px so a figure like $171,782.00 never truncates; the row wraps
 * on a phone and the leftover space stays white.
 */
export function MetricStrip({ metrics, className }: { metrics: Metric[]; className?: string }) {
  if (metrics.length === 0) return null
  return (
    <div className={cn("overflow-hidden rounded-[10px] border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900", className)}>
      <div className="-mb-px -mr-px grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))]">
        {metrics.map((m) => (
          <div key={m.label} className="flex min-w-0 items-start gap-3 border-b border-r border-neutral-200 px-4 py-3.5 dark:border-neutral-800">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] text-neutral-500 dark:text-neutral-400" title={m.label}>{m.label}</p>
              <p className="mt-1.5 whitespace-nowrap text-[26px] font-semibold leading-none tracking-tight tabular-nums text-neutral-900 sm:text-[28px] dark:text-neutral-100">{m.value}</p>
              {m.sub && <p className="mt-2 truncate text-[12px] text-neutral-500 dark:text-neutral-400">{m.sub}</p>}
            </div>
            {m.aside && <div className="shrink-0 self-center">{m.aside}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}
