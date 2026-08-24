"use client"

import { ACCESS_ACCENT } from "@/lib/business/door-access"

/**
 * Flutter WC create screens 2-9 show a pink bar. Screen 1 is the Event vs
 * Weekly Cover choice on `/business/create` (and the venue picker we skip).
 * Fill is `step / 9` so Review lands at 100%.
 */
export function WcProgressBar({ step }: { step: number }) {
  const clamped = Math.min(9, Math.max(2, step))
  const pct = (clamped / 9) * 100
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={9}
      aria-valuenow={clamped}
      aria-label={`Step ${clamped} of 9`}
    >
      <div
        className="h-full rounded-full transition-[width] duration-300"
        style={{ width: `${pct}%`, backgroundColor: ACCESS_ACCENT }}
      />
    </div>
  )
}
