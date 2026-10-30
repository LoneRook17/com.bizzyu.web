import { WEEKLY_ACCESS_TYPE_LABEL } from "@/lib/business/door-access"
import { cn } from "@/lib/v2/utils"

/** "WEEKLY COVER" → "Weekly Cover". */
export const WEEKLY_COVER_CHIP_LABEL = WEEKLY_ACCESS_TYPE_LABEL.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())

/**
 * BETA visual polish: the one place pink appears on a mixed list. A tinted
 * chip, pink ink on a 12% pink wash, same radius as the status chips. Weekly
 * Cover rows carry this and nothing else pink. Light mode letters it in the
 * deep pink: #FF3ED1 on white is under 3:1.
 */
export function WeeklyCoverChip({ label = WEEKLY_COVER_CHIP_LABEL, className }: { label?: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-md bg-[#FF3ED1]/12 px-1.5 py-0.5 text-[11px] font-semibold text-[#C20C97] dark:bg-[#FF3ED1]/15 dark:text-[#FF3ED1]",
        className,
      )}
    >
      {label}
    </span>
  )
}
