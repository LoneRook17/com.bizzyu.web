import { cn } from "@/lib/v2/utils"

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-md bg-neutral-200/70", className)} {...props} />
}

export { Skeleton }
