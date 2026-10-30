import { cn } from "@/lib/v2/utils"

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  footnote,
  className,
}: {
  icon?: React.ElementType
  title: string
  description?: React.ReactNode
  action?: React.ReactNode
  /** A quiet line under a hairline ("Start with a draft…"). */
  footnote?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        // BETA visual polish: a solid surface, never a dotted outline.
        "flex flex-col items-center justify-center rounded-[10px] border border-neutral-200 bg-white px-6 py-14 text-center dark:border-neutral-800 dark:bg-neutral-900",
        className
      )}
    >
      {Icon && (
        <div className="mb-4 flex size-12 items-center justify-center rounded-[10px] border border-neutral-200 bg-neutral-50 text-neutral-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300">
          <Icon className="size-5" />
        </div>
      )}
      <h3 className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">{title}</h3>
      {description && <div className="mt-1.5 max-w-sm text-sm text-neutral-500 dark:text-neutral-400">{description}</div>}
      {action && <div className="mt-4">{action}</div>}
      {footnote && (
        <div className="mt-6 w-full max-w-xs border-t border-neutral-200 pt-4 text-[13px] text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
          {footnote}
        </div>
      )}
    </div>
  )
}
