import { cn } from "@/lib/v2/utils"
import { ISO_DAYS } from "./schedule"

/**
 * Read-only Mon…Sun chip row with the schedule's nights highlighted.
 * `days` are ISO weekdays (1 = Mon … 7 = Sun).
 */
export function WeekdayChips({ days, size = "md" }: { days: number[]; size?: "sm" | "md" }) {
  return (
    <span className="inline-flex flex-wrap gap-1" aria-label={`Runs on: ${days.join(", ")}`}>
      {ISO_DAYS.map((d) => {
        const active = days.includes(d.value)
        return (
          <span
            key={d.value}
            title={d.full}
            className={cn(
              "inline-flex items-center justify-center rounded-md font-semibold",
              size === "sm" ? "h-5 w-7 text-[10px]" : "h-6 w-8 text-[11px]",
              active
                ? "bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-400"
                : "bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-600"
            )}
          >
            {d.label}
          </span>
        )
      })}
    </span>
  )
}
