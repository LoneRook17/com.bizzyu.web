import { cn } from "@/lib/v2/utils"

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-neutral-900 sm:text-[28px] dark:text-neutral-100">{title}</h1>
        {description && <p className="mt-1 text-[15px] text-neutral-600 dark:text-neutral-400">{description}</p>}
      </div>
      {/* Below sm the actions take their own full-width row (mobile mocks). */}
      {actions && <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">{actions}</div>}
    </div>
  )
}
